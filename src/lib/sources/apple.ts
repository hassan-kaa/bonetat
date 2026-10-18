import "server-only";
import { prisma } from "../prisma";
import { slugify } from "../utils";
import { recordSource, storeOfficialPhoto } from "../catalog-photos";
import { APPLE_IPHONES, type AppleColor, type AppleModel } from "./apple-iphones";
import { APPLE_MACBOOKS, type AppleMacModel } from "./apple-macbooks";
import { APPLE_IPADS, type AppleIpadModel } from "./apple-ipads";

// Official product photos, one per color, from Apple's own store image server. Apple keeps the
// renders of what it still sells there as transparent PNGs (iPhones also on the refurbished store).
// A name that doesn't exist answers 404, so a wrong guess never brings a wrong image. Probes use a
// 40 px thumbnail and a pause, to stay light on Apple's servers.
//
// Two naming schemes, one pipeline:
//   iPhone   refurb-{slug}-{token}-{date}  ·  {base}-finish-select-{date}[-{size}]-{token}  ·  {slug}-{token}-select-{year}
//   MacBook  {stem}-{token}-{date}   ("mbp14-spaceblack-select-202410": the date is the chassis generation)
// Everything after a name is found is shared: ensureFinish → normalize → R2 → approve → cover.

const IMAGES = "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is";
const REFURB_DATES = ["202509", "202412", "202502", "202409", "202311"];
const PAUSE_MS = 300;
const USER_AGENT = "BonetatCatalog/1.0 (+catalog photos; contact: bonetat.tn)";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const modelSlug = (model: string) => slugify(model); // "iPhone 15 Pro Max" → "iphone-15-pro-max"

/** Apple's shorter spellings of some colors in file names ("iphone-11-pro-space-select-2019") */
const COLOR_SHORT: Record<string, string[]> = {
  red: ["product-red", "productred"],
  "space-gray": ["space"],
  "pacific-blue": ["blue"],
  "sierra-blue": ["sierra", "blue"],
  "alpine-green": ["alpine", "green"],
  "sky-blue": ["blue"],
  "rose-gold": ["rose"],
};

/** How Apple may spell a color in a file name: "midnight-green" → midnightgreen, midnight-green */
function colorTokens(en: string): string[] {
  return [...new Set([en.replace(/-/g, ""), en, ...(COLOR_SHORT[en] ?? [])])];
}

/** Every image name Apple may have used for this iPhone and color, most likely first */
export function candidates(m: AppleModel, color: AppleColor): string[] {
  const slug = modelSlug(m.model);
  const out: string[] = [];
  for (const tok of colorTokens(color.en)) {
    for (const d of REFURB_DATES) out.push(`refurb-${slug}-${tok}-${d}`);
    for (const d of m.dates) {
      for (const size of m.sizes) out.push(`${m.base}-finish-select-${d}-${size}-${tok}`);
      out.push(`${m.base}-finish-select-${d}-${tok}`);
    }
    // Older store names: launch year, or the next one for colors added later (12 mini purple, 2021)
    for (const stem of new Set([slug, m.base])) {
      for (const y of [m.year, m.year + 1]) out.push(`${stem}-${tok}-select-${y}`);
      for (const d of m.dates) out.push(`${stem}-${tok}-select-${d}`);
      out.push(`${stem}-${tok}-select`, `${stem}-${tok}-hero`);
    }
    out.push(`${slug.replace(/-/g, "")}-${tok}-select-${m.year}`);
  }
  return [...new Set(out)];
}

/** Every image name Apple may have used for this MacBook and color: {stem}-{token}-{date}, own chassis first */
export function macCandidates(m: AppleMacModel, color: AppleColor): string[] {
  const out: string[] = [];
  for (const tok of colorTokens(color.en)) for (const d of m.dates) out.push(`${m.stem}-${tok}-select-${d}`);
  return [...new Set(out)];
}

/** Every image name Apple may have used for this iPad and color: its templates with the color filled in */
export function ipadCandidates(m: AppleIpadModel, color: AppleColor): string[] {
  return [...new Set(m.templates.flatMap((t) => colorTokens(color.en).map((tok) => t.replace("{c}", tok))))];
}

async function exists(name: string): Promise<boolean> {
  const res = await fetch(`${IMAGES}/${name}?wid=40&hei=40&fmt=png-alpha`, { headers: { "User-Agent": USER_AGENT } });
  await res.arrayBuffer();
  await sleep(PAUSE_MS);
  return res.ok;
}

/** The first official image name that exists for this model and color, or null */
async function firstExisting(names: string[]): Promise<string | null> {
  for (const name of names) if (await exists(name)) return name;
  return null;
}

/** The first official image name that exists for this iPhone and color, or null */
export async function findImage(m: AppleModel, color: AppleColor): Promise<string | null> {
  return firstExisting(candidates(m, color));
}

async function download(name: string): Promise<Buffer> {
  const res = await fetch(`${IMAGES}/${name}?wid=2000&hei=2000&fmt=png-alpha`, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Apple image ${name}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** The product's color, found by name, slug or English name; created when missing */
async function ensureFinish(productId: string, color: AppleColor) {
  const finishes = await prisma.finish.findMany({ where: { productId } });
  const slug = slugify(color.fr);
  const english = color.en.replace(/-/g, " ");
  const found = finishes.find(
    (f) => f.slug === slug || f.nameFr.toLowerCase() === color.fr.toLowerCase() || f.aliases.some((a) => a.toLowerCase() === english)
  );
  if (found) {
    if (!found.aliases.some((a) => a.toLowerCase() === english)) {
      await prisma.finish.update({ where: { id: found.id }, data: { aliases: { push: english } } });
    }
    return found;
  }
  return prisma.finish.create({
    data: { productId, slug, nameFr: color.fr, hex: color.hex, family: color.family, aliases: [english], position: finishes.length },
  });
}

export type AppleSyncReport = { model: string; color: string; result: string }[];

/** One catalog product to feed with Apple's official photos, whatever the device type */
type AppleEntry = {
  /** products.model */
  model: string;
  colors: AppleColor[];
  /** Every image name Apple may have used for this color, most likely first */
  names: (color: AppleColor) => string[];
};

/** The one sync loop: per color, ensure the finish, skip if already live, else fetch + approve. */
async function syncEntries(entries: AppleEntry[], log: (m: string) => void): Promise<AppleSyncReport> {
  const report: AppleSyncReport = [];
  for (const e of entries) {
    const product = await prisma.product.findFirst({ where: { brand: "Apple", model: e.model, status: { not: "MERGED" } } });
    if (!product) {
      log(`✗ ${e.model}: not in the catalog`);
      report.push({ model: e.model, color: "—", result: "model missing" });
      continue;
    }
    for (const color of e.colors) {
      const finish = await ensureFinish(product.id, color);
      const externalId = `${modelSlug(e.model)}/${color.en}`;
      const live = await prisma.catalogImage.count({ where: { finishId: finish.id, status: "APPROVED", source: "BRAND_SITE" } });
      if (live) {
        report.push({ model: e.model, color: color.fr, result: "already" });
        continue;
      }
      const name = await firstExisting(e.names(color));
      if (!name) {
        await recordSource("apple", externalId, { productId: product.id, finishId: finish.id, outcome: "no-match" });
        log(`  ${e.model} ${color.fr}: no official image found`);
        report.push({ model: e.model, color: color.fr, result: "not found" });
        continue;
      }
      const url = `${IMAGES}/${name}`;
      try {
        const r = await storeOfficialPhoto({
          productId: product.id,
          finishId: finish.id,
          angle: "FRONT",
          source: "BRAND_SITE",
          sourceRef: `apple:${name}`,
          sourceUrl: url,
          download: () => download(name),
          approve: true,
        });
        await recordSource("apple", externalId, { url, productId: product.id, finishId: finish.id, outcome: r === "imported" ? "imported" : `skipped:${r}` });
        log(`  ${e.model} ${color.fr}: ${r} (${name})`);
        report.push({ model: e.model, color: color.fr, result: r });
      } catch (e2) {
        await recordSource("apple", externalId, { url, productId: product.id, finishId: finish.id, outcome: "error", detail: (e2 as Error).message });
        report.push({ model: e.model, color: color.fr, result: "error" });
      }
    }

    // The model's photo whatever the color: the first color's photo, sharing its file
    const hasCover = await prisma.catalogImage.count({ where: { productId: product.id, finishId: null, status: "APPROVED" } });
    const first = await prisma.catalogImage.findFirst({
      where: { productId: product.id, finishId: { not: null }, status: "APPROVED", source: "BRAND_SITE" },
      orderBy: { createdAt: "asc" },
    });
    if (!hasCover && first) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, finishId, createdAt, ...rest } = first;
      await prisma.catalogImage.create({ data: { ...rest, finishId: null } });
    }
  }
  return report;
}

const match = (only?: string) => (model: string) => !only || model.toLowerCase() === only.toLowerCase();

export async function syncAppleIphones(opts: { only?: string; log?: (m: string) => void } = {}): Promise<AppleSyncReport> {
  const keep = match(opts.only);
  const entries: AppleEntry[] = APPLE_IPHONES.filter((m) => keep(m.model)).map((m) => ({ model: m.model, colors: m.colors, names: (c) => candidates(m, c) }));
  return syncEntries(entries, opts.log ?? (() => {}));
}

export async function syncAppleMacbooks(opts: { only?: string; log?: (m: string) => void } = {}): Promise<AppleSyncReport> {
  const keep = match(opts.only);
  const entries: AppleEntry[] = APPLE_MACBOOKS.filter((m) => keep(m.model)).map((m) => ({ model: m.model, colors: m.colors, names: (c) => macCandidates(m, c) }));
  return syncEntries(entries, opts.log ?? (() => {}));
}

export async function syncAppleIpads(opts: { only?: string; log?: (m: string) => void } = {}): Promise<AppleSyncReport> {
  const keep = match(opts.only);
  const entries: AppleEntry[] = APPLE_IPADS.filter((m) => keep(m.model)).map((m) => ({ model: m.model, colors: m.colors, names: (c) => ipadCandidates(m, c) }));
  return syncEntries(entries, opts.log ?? (() => {}));
}
