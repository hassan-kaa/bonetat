import "server-only";
import type { DeviceKind } from "@prisma/client";
import { prisma } from "./prisma";
import { BRAND_LINES } from "./brands";
import { CURATED_MODELS } from "../data/curated-models";
import { CURATED_LAPTOPS } from "../data/curated-laptops";
import { cleanModelName, isAccessory, isRefurbished, normalize } from "./icecat-match";
import { canonicalKey, modelName, splitModel } from "./product-identity";
import { slugify } from "./utils";
import { laptopModels, readLaptopListings } from "./sources/tunisianet-laptops";

// The full catalog, built in advance so a store just picks its model. Three sources, each used
// for what it does well; a model already in the catalog is never duplicated (canonical key):
//   1. curated list (src/data/curated-models.ts): phones, tablets, watches, Apple, consoles
//   2. Icecat reference catalog: laptops above all (only names with a recognised line)
//   3. Wikidata (CC0): older phones and tablets, names only
//   4. Tunisianet's laptop listings: current laptops as sold here (LOQ, Vivobook Go, Dell Pro…)
//   5. Manufacturer references: every Lenovo laptop since about 2017, verified on PSREF (npm run sync:psref)

export const CATEGORY_FOR: Record<DeviceKind, (brand: string) => string> = {
  PHONE: (b) => (b === "Apple" ? "iphone" : "android"),
  TABLET: (b) => (b === "Apple" ? "ipad" : "tablettes-android"),
  LAPTOP: (b) => (b === "Apple" ? "macbook" : "ordinateurs"),
  WATCH: () => "montres",
  CONSOLE: () => "consoles",
  OTHER: () => "ordinateurs",
};

export type CatalogModel = { brand: string; line: string; modelNumber: string; kind: DeviceKind; source: string };

/** What a store types to find a product, plus the short names shops use ("ps5" for PlayStation 5) */
export const productSearchText = (p: { brand: string; model: string; line?: string | null }) => {
  const text = normalize(`${p.brand} ${p.line ?? ""} ${p.model}`);
  const ps = text.match(/playstation (\d)/);
  return ps ? `${text} ps${ps[1]}` : text;
};

/**
 * Not a model a shop would pick: a bundle ("PS4 + GTA V", "PS3 Slim / Tekken 6", "Switch Lite & Tomodachi Life"),
 * an accessory ("Joy-Con", "PlayStation Move"), a shop's wording ("Wi-Fi grau", "(ENERGY STAR)"), foreign
 * words ("bärbar dator", "筆記型電腦") or a name a parser cut ("IdeaPad 320 (15 )", "X1 Carbon Gen)").
 */
const JUNK = [
  /\+|:/, /\s[/&]\s/, /\bincl\b/i, /\bbund(le)?\b/i, /\bedici[oó]n\b|\bedition\b/i, /\bpack\b/i, /joy.?con/i, /\bmoves?\b/i,
  /\bgrau\b|\bsilber\b/i, /\bwi-?fi\b/i, /\(energy star\)/i, /arbejdsstation|arbetsstation|bærbar|bärbar/i, /[\u4e00-\u9fff]/,
  /core 2 duo/i, /\)$/, /ngai\b|laptopai/i,
];
const isBundle = (name: string) => JUNK.some((r) => r.test(name));

function curatedModels(): CatalogModel[] {
  return [...Object.entries(CURATED_MODELS), ...Object.entries(CURATED_LAPTOPS)].flatMap(([brand, lines]) =>
    Object.entries(lines).flatMap(([line, [kind, numbers]]) => numbers.map((modelNumber) => ({ brand, line, modelNumber, kind, source: "curated" })))
  );
}

/** Icecat reference rows whose cleaned name starts with a line we know: a wrong name is worse than a missing one */
async function icecatModels(): Promise<CatalogModel[]> {
  const rows = await prisma.referenceProduct.findMany({ select: { brand: true, modelName: true, kind: true } });
  const brandOf = (b: string) => Object.keys(BRAND_LINES).find((x) => x.toLowerCase() === b.toLowerCase() || (x === "Sony" && b === "Sony Interactive Entertainment"));
  const out: CatalogModel[] = [];
  for (const r of rows) {
    // Consoles come from the curated list only: Icecat names their bundles after the game ("PS4 Uncharted 3")
    if (r.kind === "CONSOLE") continue;
    const brand = brandOf(r.brand);
    if (!brand) continue;
    const name = cleanModelName(r.modelName, brand);
    if (!name || isAccessory(name) || isRefurbished(name) || isBundle(name)) continue; // Icecat
    const known = BRAND_LINES[brand].some((l) => normalize(name).startsWith(normalize(l)));
    if (!known) continue;
    const split = splitModel(name, BRAND_LINES[brand]);
    if (split) out.push({ brand, ...split, kind: r.kind, source: "icecat" });
  }
  return out;
}

/** Phones and tablets on Wikidata (CC0), names only, since 2017. Cached for a week. */
async function wikidataModels(log: (m: string) => void): Promise<CatalogModel[]> {
  const { mkdir, readFile, stat, writeFile } = await import("node:fs/promises");
  const file = `${process.cwd()}/.cache/wikidata-devices.json`;
  const age = await stat(file).then((s) => Date.now() - s.mtimeMs).catch(() => Infinity);
  let rows: { name: string; maker: string; kind: DeviceKind }[];
  if (age < 7 * 24 * 3600 * 1000) rows = JSON.parse(await readFile(file, "utf8"));
  else {
    log("Wikidata : téléchargement des modèles…");
    const query = `SELECT ?itemLabel ?mfrLabel ?type WHERE {
      VALUES (?type ?k) { (wd:Q22645 "PHONE") (wd:Q19723451 "PHONE") (wd:Q155972 "TABLET") }
      ?item wdt:P31 ?type; wdt:P176 ?mfr; wdt:P577 ?date. FILTER(YEAR(?date) >= 2017)
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`;
    const res = await fetch(`https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}`, {
      headers: { Accept: "application/sparql-results+json", "User-Agent": "Bonetat-catalog/1.0 (catalog build)" },
      signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok) {
      log(`Wikidata indisponible (HTTP ${res.status}) : ignoré`);
      return [];
    }
    const json = (await res.json()) as { results: { bindings: { itemLabel: { value: string }; mfrLabel: { value: string }; type: { value: string } }[] } };
    rows = json.results.bindings.map((b) => ({ name: b.itemLabel.value, maker: b.mfrLabel.value, kind: b.type.value.endsWith("Q155972") ? "TABLET" : "PHONE" }));
    await mkdir(`${process.cwd()}/.cache`, { recursive: true });
    await writeFile(file, JSON.stringify(rows));
  }
  const out: CatalogModel[] = [];
  for (const r of rows) {
    if (/^Q\d+$/.test(r.name)) continue; // no English label
    const brand = Object.keys(BRAND_LINES).find((b) => normalize(r.maker).split(" ")[0] === normalize(b));
    if (!brand) continue;
    const name = cleanModelName(r.name.replace(/\(\d{4}\)/, ""), brand);
    if (!name || isBundle(name) || !BRAND_LINES[brand].some((l) => normalize(name).startsWith(normalize(l)))) continue;
    const split = splitModel(name, BRAND_LINES[brand]);
    if (split) out.push({ brand, ...split, kind: r.kind, source: "wikidata" });
  }
  return out;
}

/** Current laptop families from Tunisianet's titles (sources/tunisianet-laptops.ts). Cached for a week. */
async function tunisianetLaptops(log: (m: string) => void): Promise<CatalogModel[]> {
  const { mkdir, readFile, stat, writeFile } = await import("node:fs/promises");
  const file = `${process.cwd()}/.cache/tunisianet-laptops.json`;
  const age = await stat(file).then((s) => Date.now() - s.mtimeMs).catch(() => Infinity);
  let titles: string[];
  if (age < 7 * 24 * 3600 * 1000) titles = JSON.parse(await readFile(file, "utf8"));
  else {
    log("Tunisianet : lecture des PC portables…");
    titles = (await readLaptopListings(log)).map((l) => l.title);
    await mkdir(`${process.cwd()}/.cache`, { recursive: true });
    await writeFile(file, JSON.stringify(titles));
  }
  return laptopModels(titles.map((title) => ({ title }))).map((m) => ({ ...m, source: "tunisianet" }));
}

/** Lenovo laptops verified on PSREF (written by `npm run sync:psref`); nothing when it hasn't been run */
async function psrefLaptops(): Promise<CatalogModel[]> {
  const { readFile } = await import("node:fs/promises");
  const rows: { brand: string; line: string; modelNumber: string }[] = await readFile(`${process.cwd()}/.cache/lenovo-psref.json`, "utf8")
    .then((t) => JSON.parse(t))
    .catch(() => []);
  return rows.map((r) => ({ ...r, kind: "LAPTOP" as const, source: "psref" }));
}

/** Build (or extend) the catalog. Existing products are never changed; only missing models are added. */
export async function buildCatalog(log: (m: string) => void = () => {}) {
  const categories = new Map((await prisma.category.findMany()).map((c) => [c.slug, c.id]));
  const brandIds = new Map((await prisma.brand.findMany()).map((b) => [b.name, b.id]));
  const existing = await prisma.product.findMany({ select: { canonicalKey: true, slug: true } });
  const keys = new Set(existing.map((p) => p.canonicalKey));
  const slugs = new Set(existing.map((p) => p.slug));

  const sources = [curatedModels(), await tunisianetLaptops(log), await psrefLaptops(), await icecatModels(), await wikidataModels(log)];
  const counts: Record<string, number> = {};
  const toCreate = [];
  const lines = new Map<string, { brandId: string; name: string; kind: DeviceKind }>();
  for (const m of sources.flat()) {
    const key = canonicalKey(m);
    if (keys.has(key)) continue;
    keys.add(key);
    const model = modelName(m.line, m.modelNumber);
    let slug = slugify(`${m.brand === "Apple" ? "" : m.brand} ${model}`);
    for (let i = 2; slugs.has(slug); i++) slug = `${slugify(`${m.brand === "Apple" ? "" : m.brand} ${model}`)}-${i}`;
    slugs.add(slug);
    const categoryId = categories.get(CATEGORY_FOR[m.kind](m.brand));
    if (!categoryId) continue;
    const brandId = brandIds.get(m.brand);
    if (brandId) lines.set(`${brandId}|${slugify(m.line)}`, { brandId, name: m.line, kind: m.kind });
    toCreate.push({
      slug, categoryId, brand: m.brand, model, line: m.line, modelNumber: m.modelNumber, kind: m.kind,
      canonicalKey: key, source: m.source, description: "", searchText: productSearchText({ brand: m.brand, model, line: m.line }),
    });
    counts[m.source] = (counts[m.source] ?? 0) + 1;
  }
  for (const l of lines.values()) {
    await prisma.productLine.upsert({
      where: { brandId_slug: { brandId: l.brandId, slug: slugify(l.name) } },
      update: {},
      create: { brandId: l.brandId, name: l.name, slug: slugify(l.name), kind: l.kind },
    });
  }
  for (let i = 0; i < toCreate.length; i += 2000) {
    await prisma.product.createMany({ data: toCreate.slice(i, i + 2000), skipDuplicates: true });
  }
  // Every product's search text follows the current rules (seed and store-created ones included)
  const all = await prisma.product.findMany({ select: { id: true, brand: true, model: true, line: true, searchText: true } });
  for (const p of all) {
    const text = productSearchText(p);
    if (text !== p.searchText) await prisma.product.update({ where: { id: p.id }, data: { searchText: text } });
  }
  return { added: counts, total: await prisma.product.count({ where: { status: { not: "MERGED" } } }) };
}
