import "server-only";
import type { ColorFamily } from "@prisma/client";
import { prisma } from "../prisma";
import { slugify } from "../utils";
import { familyOf } from "../icecat-match";
import { recordSource, storeOfficialPhoto } from "../catalog-photos";

// Photos of the brands without an official source we can read (Xiaomi, Samsung, Oppo…) from Tunisianet's
// listings: one photo per model and color, the listing's main image at 1000 px.
// Guarded because it is a retailer, not the brand:
//   • the model is matched on the listing TITLE, word for word ("Note 13 Pro+" never feeds "Note 13 Pro")
//   • bundle listings are skipped: their visuals carry the gift ("+ Écouteurs … Offerts")
//   • every photo is source RETAILER, so all of them can be withdrawn in one command
//   • one page every 2 seconds, listing pages only (allowed by their robots.txt)

const BASE = "https://www.tunisianet.com.tn";
const CATEGORIES = ["596-smartphone-tunisie", "515-tablette", "650-smartwatch"];
/** Accessories listed among the watches: never a device photo */
const ACCESSORY = /\b(strap|bracelets? (fashion |en tpu |sport )?pour|ceinture|chargeurs?|station de charge|c[âa]bles?|films?|protections?|coques?|bo[iî]tiers? pour|verre)\b/i;
/** A watch accessory, not a watch: judged on the title before any "+", unless it opens with a device word */
const isAccessory = (title: string) =>
  !/^(montre|smart ?watch|smartwatch|band\b|apple watch)/i.test(title.trim()) && ACCESSORY.test(title.split("+")[0]);
const PAUSE_MS = 2000;
const USER_AGENT = "Mozilla/5.0 (compatible; BonetatCatalog/1.0; +catalog photos)";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A listing whose visual advertises something else than the device alone */
const BUNDLE =
  /\b(offerts?|pack|cadeau|bundle|coffret)\b|(\+|\bavec\b).{0,40}\b(ecouteurs?|écouteurs?|montre|chargeur|buds|airdots|coque|power ?bank|clavier|keyboard|stylet|pen|étui|etui|cover)\b/i;
/** Brand words as Tunisianet writes them, mapped to our catalog brand */
const BRANDS: Record<string, string> = { xiaomi: "Xiaomi", redmi: "Xiaomi", poco: "Xiaomi", samsung: "Samsung", oppo: "Oppo", apple: "Apple", garmin: "Garmin" };

/** Apple's English case colors, as apple.com/fr names them */
const COLOR_FR: Record<string, string> = {
  "jet black": "Noir de jais", "space grey": "Gris sidéral", "space gray": "Gris sidéral", "space black": "Noir sidéral",
  "rose gold": "Or rose", midnight: "Minuit", starlight: "Lumière stellaire", silver: "Argent", gold: "Or",
  natural: "Naturel", slate: "Ardoise", black: "Noir", white: "Blanc", pink: "Rose", blue: "Bleu", green: "Vert",
};
/** Case materials: the color is what comes before them ("Jet Black Aluminium Case") */
const MATERIAL = /\s+(?:aluminium|aluminum|titanium|titane|acier|stainless steel|ceramic)\b.*$/i;

export type Listing = { id: string; title: string; url: string; image: string; priceDt: number | null; tablet: boolean; watch: boolean };

/** Models below this new price are not worth a photo here: budget phones barely resell (decided 2026-10-15) */
export const MIN_PRICE_DT = 800;

/** A listing page, retried after a pause when the connection drops (a long crawl sometimes gets reset) */
async function fetchPage(url: string, tries = 4): Promise<string> {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (res.ok) return await res.text();
      if (i >= tries) throw new Error(`${url}: HTTP ${res.status}`);
    } catch (e) {
      if (i >= tries) throw e;
    }
    await sleep(15_000 * i);
  }
}

/** Everything the categories list (title, product page, main image): phones, tablets and watches by default */
export async function readListings(log: (m: string) => void = () => {}, categories = CATEGORIES): Promise<Listing[]> {
  const out: Listing[] = [];
  for (const cat of categories) {
    for (let page = 1; page < 60; page++) {
      const html = await fetchPage(`${BASE}/${cat}${page > 1 ? `?page=${page}` : ""}`);
      await sleep(PAUSE_MS);
      const articles = html.match(/<article[^>]*product-miniature[\s\S]*?<\/article>/g) ?? [];
      for (const a of articles) {
        const id = a.match(/data-id-product="(\d+)"/)?.[1];
        const link = a.match(/product-title[^>]*>\s*<a href="([^"]+)"[^>]*>([^<]+)<\/a>/);
        const img = a.match(/(https:\/\/www\.tunisianet\.com\.tn\/\d+)-home_default\/([^"]+\.jpg)/);
        // "1 299,000 DT": thousands separated by spaces, millimes after the comma
        const price = a.match(/class="[^"]*price[^"]*"[^>]*>\s*([\d\s\u00a0\u202f.]+),\d{3}/)?.[1].replace(/[\s\u00a0\u202f.]/g, "");
        if (id && link && img) {
          out.push({ id, url: link[1], title: decode(link[2]).trim(), image: `${img[1]}-large_default/${img[2]}`, priceDt: price ? Number(price) : null, tablet: cat.includes("tablette"), watch: cat.includes("smartwatch") });
        }
      }
      log(`  ${cat} page ${page}: ${articles.length} listings`);
      if (!articles.length || !html.includes(`page=${page + 1}`)) break;
    }
  }
  return out;
}

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#039;|&apos;/g, "'").replace(/&quot;/g, '"');

/** Model words only: no storage, network, SIM or color noise; "+" kept as "plus" (Pro+ ≠ Pro) */
export function modelKey(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\+/g, " plus ")
    .replace(/\b(smartphone|tablette|telephone|portable|montre|connectee|smart ?watch|dual ?sim|5g|4g|lte|nfc|wi-?fi|cellular|gps)\b/g, " ")
    .replace(/\b\d{2}\s*mm\b/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type ParsedTitle = { brand: string; model: string; color: string };

/**
 * "Smartphone XIAOMI Redmi Note 13 8Go 256Go - Noir" → { brand Xiaomi, model "redmi note 13", color "Noir" }.
 * The model is what sits between the brand and the first memory size; the color is the last segment.
 */
export function parseTitle(title: string): ParsedTitle | null {
  let t = title.replace(/\s+/g, " ").trim();
  // No separator at all ("BAND XIAOMI SMART BAND 8 GRAPHITE BLACK"): the color is the last word or two
  let trailing: string | null = null;
  if (!/\s[-|/]|[-|/]\s|\|/.test(t)) {
    const m = t.match(/\s((?:[a-zA-Zéè]+\s)?[a-zA-Zéè]+)$/);
    if (m && familyOf(m[1]) && !/\d/.test(m[1])) {
      trailing = m[1];
      t = t.slice(0, -m[0].length);
    }
  }
  const brandWord = Object.keys(BRANDS).find((b) => new RegExp(`\\b${b}\\b`, "i").test(t));
  if (!brandWord) return null;
  const afterBrand = t.slice(t.toLowerCase().indexOf(brandWord) + (brandWord === "redmi" || brandWord === "poco" ? 0 : brandWord.length));
  // Screen sizes ("11''", "12.1 pouces") and a RAM figure left before the storage ("A26 12Go") aren't the model
  const cleaned = afterBrand.replace(/\b\d{1,2}(?:[.,]\d)?\s*(?:''|"|”|″|pouces?|inch(?:es)?)/gi, " ");
  // The model ends at the memory, a separator, or for watches the GPS/size/case words
  let model = cleaned.split(/\b\d+\s*(?:go|gb|to|tb)\b|[|/]|\b(?:gps|cellular|lte|avec|with|bo[iî]tier)\b|\b\d{2}\s*mm\b/i)[0].trim();
  // A trailing bare number after a model number is a RAM size cut from its "Go" ("Galaxy A26 12")
  while (/\d\S*\s+\d{1,2}$/.test(model)) model = model.replace(/\s+\d{1,2}$/, "");
  let color = trailing ?? t.split(/\s[-|/]\s?|\s?[-|/]\s|\|/).pop()?.replace(/\b\d+\s*(go|gb)\b/gi, "").trim() ?? "";
  // Watches: the case color, before its material ("… 46mm Jet Black Aluminium Case with Black Sport Band")
  const caseColor = t.match(/(?:\d{2}\s*mm|\/)\s*([A-Za-zéè ]{3,24}?)\s+(?:aluminium|aluminum|titanium|titane|acier|stainless steel)\b/i)?.[1];
  if (caseColor) color = caseColor;
  color = color.replace(MATERIAL, "").replace(/\s*(?:\+|\bavec\b).*$/i, "").trim(); // "Purple + Bracelet en TPU"
  color = color.replace(/^(mint|sky|ice|deep|light|dark|rose|space)(green|blue|grey|gray|pink|black|white|gold)$/i, "$1 $2"); // "MINTGREEN"
  if (!familyOf(color)) return null;
  return { brand: BRANDS[brandWord], model: modelKey(model), color: COLOR_FR[color.toLowerCase()] ?? titleCase(color) };
}

const titleCase = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()).trim();

/** Tunisianet's name → the catalog model, when the title doesn't carry it ("Apple Watch SE" at 1 199 DT is the SE 2) */
const MODEL_ALIASES: Record<string, string> = {
  "Apple|watch se": "Apple Watch SE 2",
  "Xiaomi|smart band 2 ap": "Redmi Smart Band 2",
};

export type Planned = { listing: Listing; productId: string; model: string; color: string; family: ColorFamily; /** no color in the title: the model's photo */ modelPhoto?: boolean };
export type Plan = { planned: Planned[]; skipped: { title: string; why: string }[] };

/** Which listing feeds which catalog model and color, without importing anything */
export async function planTunisianet(listings: Listing[], brands: string[]): Promise<Plan> {
  const products = await prisma.product.findMany({
    where: { brand: { in: brands }, status: { not: "MERGED" } },
    select: { id: true, brand: true, model: true },
  });
  const byKey = new Map(products.map((p) => [`${p.brand}|${modelKey(p.model)}`, p]));
  // Catalog models are written without the brand line sometimes ("Galaxy A15"): index both forms
  for (const p of products) byKey.set(`${p.brand}|${modelKey(`${p.brand} ${p.model}`)}`, p);

  const planned: Planned[] = [];
  const skipped: Plan["skipped"] = [];
  const seen = new Set<string>();
  for (const l of listings) {
    // Apple and Xiaomi watches come in packs too (+ earbuds, + strap): kept, the review grid catches the extra item
    const watchPack = l.watch && /\b(apple|xiaomi|redmi)\b/i.test(l.title) && !isAccessory(l.title);
    if (BUNDLE.test(l.title) && !watchPack) {
      skipped.push({ title: l.title, why: "pack / cadeau" });
      continue;
    }
    if (l.watch && isAccessory(l.title)) continue;
    // The 800 DT floor is for phones and tablets: a good watch costs 200 to 450 DT
    if (!l.watch && l.priceDt !== null && l.priceDt < MIN_PRICE_DT) {
      skipped.push({ title: l.title, why: `moins de ${MIN_PRICE_DT} DT` });
      continue;
    }
    const p = parseTitle(l.title);
    if (!p || !brands.includes(p.brand)) continue;
    // Apple: watches only (iPhone, iPad and MacBook have Apple's own photos)
    if (p.brand === "Apple" && !l.watch) continue;
    // The tablet category only feeds tablet models: a "Galaxy S10 Ultra 14.6''" listing is the Tab, not the phone
    if (l.tablet && !/\b(tab|pad)\b/.test(p.model)) {
      skipped.push({ title: l.title, why: "tablette sans « Tab/Pad » dans le titre" });
      continue;
    }
    const product =
      byKey.get(`${p.brand}|${p.model}`) ??
      byKey.get(`${p.brand}|${modelKey(`${p.brand} ${p.model}`)}`) ??
      // "SMART WATCH XIAOMI S4": the catalog calls it "Xiaomi Watch S4"
      (l.watch && p.brand === "Xiaomi" ? byKey.get(`${p.brand}|${modelKey(`xiaomi watch ${p.model}`)}`) : undefined) ??
      (MODEL_ALIASES[`${p.brand}|${p.model}`] ? byKey.get(`${p.brand}|${modelKey(MODEL_ALIASES[`${p.brand}|${p.model}`])}`) : undefined);
    if (!product) {
      skipped.push({ title: l.title, why: `modèle absent du catalogue (${p.model})` });
      continue;
    }
    const family = familyOf(p.color)!;
    const key = `${product.id}|${family}`;
    if (seen.has(key)) continue; // one photo per model and color family (storage variants share it)
    seen.add(key);
    planned.push({ listing: l, productId: product.id, model: product.model, color: p.color, family });
  }
  return { planned, skipped };
}

const FAMILY_FR: Record<ColorFamily, string> = {
  BLACK: "Noir", WHITE: "Blanc", GREY: "Gris", SILVER: "Argent", GOLD: "Or", BLUE: "Bleu", GREEN: "Vert",
  PURPLE: "Violet", PINK: "Rose", RED: "Rouge", YELLOW: "Jaune", ORANGE: "Orange", OTHER: "Autre",
};
const FAMILY_HEX: Record<ColorFamily, string> = {
  BLACK: "#202125", WHITE: "#F1F0EB", GREY: "#6B6E75", SILVER: "#D9DCE2", GOLD: "#EAD7BF", BLUE: "#2F5C8F", GREEN: "#C4E6D2",
  PURPLE: "#CFC6E6", PINK: "#F2D4D7", RED: "#B3202D", YELLOW: "#F4D35E", ORANGE: "#F28C38", OTHER: "#9AA0A6",
};

/** The model's color for this listing: same name or alias, else the color of the same family, else a new one */
async function ensureFinish(productId: string, color: string, family: ColorFamily) {
  const finishes = await prisma.finish.findMany({ where: { productId } });
  const lower = color.toLowerCase();
  const found =
    finishes.find((f) => f.nameFr.toLowerCase() === lower || f.aliases.some((a) => a.toLowerCase() === lower)) ??
    finishes.find((f) => f.family === family);
  if (found) {
    if (found.nameFr.toLowerCase() !== lower && !found.aliases.some((a) => a.toLowerCase() === lower)) {
      await prisma.finish.update({ where: { id: found.id }, data: { aliases: { push: color } } });
    }
    return found;
  }
  // A plain English family word becomes French ("Black" → "Noir"); any other name is kept ("Minuit", "Bleu nuit")
  const plain = /^(black|white|grey|gray|silver|gold|blue|green|purple|pink|red|yellow|orange)$/i.test(color);
  const name = plain ? FAMILY_FR[family] : color;
  return prisma.finish.create({
    data: { productId, slug: slugify(name), nameFr: name, hex: FAMILY_HEX[family], family, aliases: name === color ? [] : [color], position: finishes.length },
  });
}

/** Import the planned photos (published), then give each model its photo whatever the color */
export async function importTunisianet(plan: Planned[], log: (m: string) => void = () => {}) {
  const counts = { imported: 0, duplicate: 0, "rejected-before": 0, already: 0, error: 0 };
  const touched = new Set<string>();
  for (const p of plan) {
    const finish = p.modelPhoto ? null : await ensureFinish(p.productId, p.color, p.family);
    if (await prisma.catalogImage.count({ where: { productId: p.productId, finishId: finish?.id ?? null, status: { in: ["APPROVED", "DRAFT"] } } })) {
      counts.already++;
      continue;
    }
    try {
      const r = await storeOfficialPhoto({
        productId: p.productId,
        finishId: finish?.id ?? null,
        angle: "FRONT",
        source: "RETAILER",
        sourceRef: `tunisianet:${p.listing.id}`,
        sourceUrl: p.listing.image,
        download: async () => {
          const res = await fetch(p.listing.image, { headers: { "User-Agent": USER_AGENT } });
          if (!res.ok) throw new Error(`${res.status}`);
          await sleep(PAUSE_MS);
          return Buffer.from(await res.arrayBuffer());
        },
        // Pending: a retailer's visual can carry a promotion only the eye sees ("+ Chargeur Offert").
        // Validated on /admin/catalog/review.
        approve: false,
      });
      counts[r]++;
      touched.add(p.productId);
      await recordSource("tunisianet", p.listing.id, { url: p.listing.url, productId: p.productId, finishId: finish?.id ?? null, outcome: r === "imported" ? "imported" : `skipped:${r}` });
      log(`  ${p.model} ${finish?.nameFr ?? "(photo du modèle)"}: ${r}`);
    } catch (e) {
      counts.error++;
      await recordSource("tunisianet", p.listing.id, { url: p.listing.url, productId: p.productId, outcome: "error", detail: (e as Error).message });
    }
  }
  return counts;
}
