import "server-only";
import { createGunzip } from "node:zlib";
import { mkdir, readFile, stat, writeFile, rename } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { brandMatches, kindForCategory, type IndexRow } from "./icecat-match";
import { IcecatError, fetchIcecatProduct, type IcecatProduct } from "./icecat";

// The Open Icecat index lists every product of the free catalog (31 M rows, 281 MB gzipped).
// We stream it once, keep only our brands' rows (a few MB) and cache that for a week.
// Product details (title, colors, gallery) are cached per product too: re-running the
// sync never calls Icecat twice for the same product (their fair use policy).

const INDEX_URL = "https://data.icecat.biz/export/freexml/EN/files.index.csv.gz";
const CACHE_DIR = path.join(process.cwd(), ".cache", "icecat");
const INDEX_FILE = path.join(CACHE_DIR, "index.tsv");
/** Which brands the cached index was filtered for: a new brand in the catalog forces a re-download */
const BRANDS_FILE = path.join(CACHE_DIR, "index.brands.json");
const INDEX_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
/** Bumped when the cached file's columns change, so an old cache is re-downloaded */
const INDEX_FORMAT = 2;

function basicAuth(): string {
  const { ICECAT_USERNAME, ICECAT_PASSWORD } = process.env;
  if (!ICECAT_USERNAME || !ICECAT_PASSWORD) throw new IcecatError("ICECAT_USERNAME et ICECAT_PASSWORD sont nécessaires pour l’index Icecat");
  return "Basic " + Buffer.from(`${ICECAT_USERNAME}:${ICECAT_PASSWORD}`).toString("base64");
}

/** Download the full index and keep the devices (phones, tablets, laptops, watches, consoles) of these brands that Icecat lets us use (Limited = No) */
export async function downloadIndex(brands: string[], log: (m: string) => void = () => {}): Promise<number> {
  const res = await fetch(INDEX_URL, { headers: { Authorization: basicAuth() } });
  if (!res.ok || !res.body) throw new IcecatError(`Index Icecat inaccessible (HTTP ${res.status}). Vérifiez le mot de passe.`);
  await mkdir(CACHE_DIR, { recursive: true });
  const tmp = `${INDEX_FILE}.tmp`;
  const out = createWriteStream(tmp);
  let header: string[] | null = null;
  let col: Record<string, number> = {};
  let rest = "";
  let seen = 0;
  let kept = 0;

  const lines = Readable.fromWeb(res.body as WebReadableStream).pipe(createGunzip());
  for await (const chunk of lines) {
    const parts = (rest + chunk.toString("utf8")).split("\n");
    rest = parts.pop() ?? "";
    for (const line of parts) {
      const c = line.split("\t");
      if (!header) {
        header = c;
        col = Object.fromEntries(c.map((name, i) => [name.trim(), i]));
        out.write("icecatId\tproductCode\tbrand\tmodelName\tonMarket\tquality\tpicWidth\tpicHeight\tkind\n");
        continue;
      }
      if (++seen % 2_000_000 === 0) log(`  index : ${(seen / 1e6).toFixed(0)} M lignes lues, ${kept} gardées`);
      const brand = c[col.m_supplier_name] ?? "";
      const kind = kindForCategory(c[col.catid]);
      if (!kind || c[col.Limited] === "Yes" || !brands.some((b) => brandMatches(b, brand))) continue;
      kept++;
      out.write(
        [c[col.product_id], c[col.prod_id], brand, c[col.model_name], c[col.on_market], c[col.quality], c[col.high_pic_width] || "0", c[col.high_pic_height] || "0", kind]
          .map((v) => (v ?? "").replace(/[\t\n]/g, " "))
          .join("\t") + "\n"
      );
    }
  }
  await new Promise<void>((resolve, reject) => out.end((err?: Error | null) => (err ? reject(err) : resolve())));
  await rename(tmp, INDEX_FILE);
  await writeFile(BRANDS_FILE, JSON.stringify({ version: INDEX_FORMAT, brands: brands.map((b) => b.toLowerCase()) }));
  return kept;
}

/** The cached index, downloaded first if missing or older than a week */
export async function loadIndex(brands: string[], opts: { refresh?: boolean; log?: (m: string) => void } = {}): Promise<IndexRow[]> {
  const age = await stat(INDEX_FILE).then((s) => Date.now() - s.mtimeMs).catch(() => Infinity);
  const cache: { version?: number; brands?: string[] } = await readFile(BRANDS_FILE, "utf8").then((t) => JSON.parse(t)).catch(() => ({}));
  const stale = cache.version !== INDEX_FORMAT || brands.some((b) => !(cache.brands ?? []).includes(b.toLowerCase()));
  if (opts.refresh || age > INDEX_MAX_AGE_MS || stale) {
    opts.log?.("Téléchargement de l’index Icecat (quelques minutes)…");
    const kept = await downloadIndex(brands, opts.log);
    opts.log?.(`Index en cache : ${kept} produits de nos marques.`);
  }
  const text = await readFile(INDEX_FILE, "utf8");
  const seen = new Set<string>();
  return text
    .split("\n")
    .slice(1)
    .filter((l) => {
      // The index repeats a product once per market: keep the first
      const id = l.slice(0, l.indexOf("\t"));
      if (!l || seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .map((l) => {
      const [icecatId, productCode, brand, modelName, onMarket, quality, w, h, kind] = l.split("\t");
      return { icecatId: Number(icecatId), productCode, brand, modelName, onMarket: onMarket === "1", quality, picWidth: Number(w) || 0, picHeight: Number(h) || 0, kind: kind as IndexRow["kind"] };
    });
}

/** Icecat product details, from the disk cache when we already asked once */
export async function cachedIcecatProduct(icecatId: number): Promise<IcecatProduct> {
  const file = path.join(CACHE_DIR, "products", `${icecatId}-FR.json`);
  const hit = await readFile(file, "utf8").then((t) => JSON.parse(t) as IcecatProduct).catch(() => null);
  if (hit) return hit;
  const product = await fetchIcecatProduct({ icecatId });
  // Best effort: on a read-only disk (serverless hosting) the cache is simply skipped
  await mkdir(path.dirname(file), { recursive: true })
    .then(() => writeFile(file, JSON.stringify(product)))
    .catch(() => {});
  return product;
}
