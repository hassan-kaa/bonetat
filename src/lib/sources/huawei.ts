import "server-only";
import type { ColorFamily } from "@prisma/client";
import { prisma } from "../prisma";
import { slugify } from "../utils";
import { recordSource, storeOfficialPhoto } from "../catalog-photos";

// Official Huawei watch photos from consumer.huawei.com/fr (allowed by its robots.txt), one per color.
// Each product page names its images its own way ("list/46mm-black.png", "design/…-46-mm-blue-2x.png",
// "id/…-case-strap-black-1.png"), so the shot is picked by file name: the photos wait for a look on
// /admin/catalog/review instead of going online at once. Older models (GT 2 and 3, Fit 2, Band 8 and 9)
// are no longer on the site.

const SITE = "https://consumer.huawei.com";
const PAUSE_MS = 1000;
const USER_AGENT = "Mozilla/5.0 (compatible; BonetatCatalog/1.0; +catalog photos)";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Catalog model → its page under consumer.huawei.com/fr/wearables/ */
export const HUAWEI_WATCHES: Record<string, string> = {
  "Watch GT 4": "watch-gt4", "Watch GT 5": "watch-gt5", "Watch GT 5 Pro": "watch-gt5-pro",
  "Watch GT 6": "watch-gt6", "Watch GT 6 Pro": "watch-gt6-pro", "Watch GT 7": "watch-gt7", "Watch GT 7 Pro": "watch-gt7-pro",
  "Watch GT Runner 2": "watch-gt-runner-2",
  "Watch Fit 3": "watch-fit3", "Watch Fit 4": "watch-fit4", "Watch Fit 4 Pro": "watch-fit4-pro", "Watch Fit 5": "watch-fit5", "Watch Fit 5 Pro": "watch-fit5-pro",
  "Watch 5": "watch-5", "Watch 6": "watch-6", "Watch 6 Pro": "watch-6-pro", "Watch D2": "watch-d2", "Watch D3": "watch-d3",
  "Watch Ultimate 2": "watch-ultimate-2", "Band 10": "band10", "Band 11": "band11", "Band 11 Pro": "band11-pro",
};

/** Color words in Huawei's file names → French name and family. Longest first when matching. */
const COLORS: Record<string, [string, ColorFamily]> = {
  "ceramic-white": ["Blanc céramique", "WHITE"], "mocha-gold": ["Or moka", "GOLD"], lightgold: ["Or clair", "GOLD"],
  black: ["Noir", "BLACK"], white: ["Blanc", "WHITE"], blue: ["Bleu", "BLUE"], brown: ["Marron", "OTHER"],
  green: ["Vert", "GREEN"], grey: ["Gris", "GREY"], gray: ["Gris", "GREY"], gold: ["Or", "GOLD"], silver: ["Argent", "SILVER"],
  titanium: ["Titane", "SILVER"], purple: ["Violet", "PURPLE"], pink: ["Rose", "PINK"], orange: ["Orange", "ORANGE"],
  yellow: ["Jaune", "YELLOW"], beige: ["Beige", "WHITE"], red: ["Rouge", "RED"],
};
const COLOR_WORDS = Object.keys(COLORS).sort((a, b) => b.length - a.length);
/** Lifestyle, detail and low-quality variants: never the product shot */
const NOT_A_SHOT = /blur|thumb|-xs|-bg|mob|watch-face|close-up|side|before|bluetooth|calling|-pad|polymer|leather|nylon|-[2-9](?:-2x)?\.png$/;
const PNG = /(?:https:\/\/consumer\.huawei\.com)?(\/(?:dam\/)?content\/dam\/huawei-cbg-site\/[^"'\s(),]+?\.png)/g;

export type HuaweiShot = { color: string; family: ColorFamily; path: string };

/** The best image per color on one product page: big design shots first, the small store thumbnails last */
export function pickShots(html: string, slug: string): HuaweiShot[] {
  const paths = [...new Set([...html.matchAll(PNG)].map((m) => m[1].replace(/^\/dam/, "")))].filter((p) => p.includes(`/${slug}/`));
  const best = new Map<ColorFamily, HuaweiShot & { score: number }>();
  for (const path of paths) {
    const file = path.split("/").pop()!.toLowerCase();
    if (NOT_A_SHOT.test(file) || /\/(before|after|golf|scene|kv)\//.test(path)) continue;
    const word = COLOR_WORDS.find((w) => new RegExp(`(^|[-_])${w}([-_.]|$)`).test(file));
    if (!word) continue;
    const [color, family] = COLORS[word];
    const score = (file.includes("-2x") ? 3 : 0) + (/\/design\/|-design-|\/id\//.test(path) ? 2 : 0) + (/46-?mm/.test(file) ? 1 : 0);
    const prev = best.get(family);
    if (!prev || score > prev.score) best.set(family, { color, family, path, score });
  }
  return [...best.values()].map(({ color, family, path }) => ({ color, family, path }));
}

async function fetchText(url: string) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  await sleep(PAUSE_MS);
  return res.ok ? res.text() : "";
}

/** Huawei serves some images under "/dam/content/dam/…", others under "/content/dam/…": try both */
async function download(path: string): Promise<Buffer> {
  for (const url of [`${SITE}/dam${path}`, `${SITE}${path}`]) {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    const buf = Buffer.from(await res.arrayBuffer());
    await sleep(PAUSE_MS);
    if (res.ok && buf.subarray(0, 4).toString("hex") === "89504e47") return buf;
  }
  throw new Error(`Huawei image ${path}: not found`);
}

async function ensureFinish(productId: string, shot: HuaweiShot) {
  const finishes = await prisma.finish.findMany({ where: { productId } });
  const found = finishes.find((f) => f.nameFr.toLowerCase() === shot.color.toLowerCase()) ?? finishes.find((f) => f.family === shot.family);
  if (found) return found;
  const HEX: Partial<Record<ColorFamily, string>> = { BLACK: "#202125", WHITE: "#F1F0EB", GREY: "#6B6E75", SILVER: "#D9DCE2", GOLD: "#EAD7BF", BLUE: "#2F5C8F", GREEN: "#5E8C6A", PURPLE: "#9C8CC4", PINK: "#F2D4D7", RED: "#B3202D", YELLOW: "#F4D35E", ORANGE: "#F28C38", OTHER: "#8A6A4F" };
  return prisma.finish.create({
    data: { productId, slug: slugify(shot.color), nameFr: shot.color, hex: HEX[shot.family] ?? "#9AA0A6", family: shot.family, aliases: [], position: finishes.length },
  });
}

export type HuaweiPlan = { model: string; productId: string | null; shots: HuaweiShot[] }[];

/** What each catalog model would get, without importing */
export async function planHuaweiWatches(): Promise<HuaweiPlan> {
  const plan: HuaweiPlan = [];
  for (const [model, slug] of Object.entries(HUAWEI_WATCHES)) {
    const product = await prisma.product.findFirst({ where: { brand: "Huawei", model, status: { not: "MERGED" } }, select: { id: true } });
    const html = await fetchText(`${SITE}/fr/wearables/${slug}/`);
    plan.push({ model, productId: product?.id ?? null, shots: pickShots(html, slug) });
  }
  return plan;
}

/** Import the planned photos as drafts (validated on /admin/catalog/review) */
export async function importHuaweiWatches(plan: HuaweiPlan, log: (m: string) => void = () => {}) {
  const counts = { imported: 0, duplicate: 0, "rejected-before": 0, already: 0, error: 0 };
  for (const p of plan) {
    if (!p.productId) continue;
    for (const shot of p.shots) {
      const finish = await ensureFinish(p.productId, shot);
      if (await prisma.catalogImage.count({ where: { finishId: finish.id, status: { in: ["APPROVED", "DRAFT"] } } })) {
        counts.already++;
        continue;
      }
      const externalId = `${HUAWEI_WATCHES[p.model]}/${slugify(shot.color)}`;
      try {
        const r = await storeOfficialPhoto({
          productId: p.productId,
          finishId: finish.id,
          angle: "FRONT",
          source: "BRAND_SITE",
          sourceRef: `huawei:${shot.path.split("/").pop()}`,
          sourceUrl: `${SITE}${shot.path}`,
          download: () => download(shot.path),
          approve: false,
        });
        counts[r]++;
        await recordSource("huawei", externalId, { url: `${SITE}${shot.path}`, productId: p.productId, finishId: finish.id, outcome: r === "imported" ? "imported" : `skipped:${r}` });
        log(`  ${p.model} ${finish.nameFr}: ${r}`);
      } catch (e) {
        counts.error++;
        await recordSource("huawei", externalId, { productId: p.productId, outcome: "error", detail: (e as Error).message });
      }
    }
  }
  return counts;
}
