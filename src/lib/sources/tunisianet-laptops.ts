import "server-only";
import type { DeviceKind } from "@prisma/client";
import { prisma } from "../prisma";
import { BRAND_LINES } from "../brands";
import { familyOf } from "../icecat-match";
import { modelName, splitModel } from "../product-identity";
import { readListings, type Listing, type Plan, type Planned } from "./tunisianet";

// Laptops as Tunisian shops sell them, named from Tunisianet's listing titles. Icecat's index names
// laptops by SKU ("K53SV-SX542V") and misses most current ones (LOQ, Vivobook Go, Dell Pro…), so the
// titles are the better source for what shops will resell next. One model per family, never per SKU:
//   "Pc Portable HP Laptop 15-fd0418nk / i5 …"       → HP Laptop 15-fd0000 (HP's own series name)
//   "Pc Portable Asus Vivobook Go 15 E510KA-BR1365W"  → Asus Vivobook Go 15 E510KA
//   "Pc Portable Dell Pro 15 Essential PV15250"       → Dell Pro 15 Essential
// Only names whose line is in BRAND_LINES are kept. Apple stays with the curated list (exact chip names).

/** Consumer, gaming, the parent "ordinateur portable" and "PC portable pro" (EliteBook, ThinkPad, Latitude…) */
export const LAPTOP_CATEGORIES = ["301-pc-portable-tunisie", "681-pc-portable-gamer", "702-ordinateur-portable", "703-pc-portable-pro"];

const BRAND_WORDS: Record<string, string> = {
  lenovo: "Lenovo", hp: "HP", dell: "Dell", asus: "Asus", msi: "MSI", gigabyte: "Gigabyte", acer: "Acer",
  chuwi: "Chuwi", huawei: "Huawei", honor: "Honor", samsung: "Samsung", microsoft: "Microsoft", lg: "LG", razer: "Razer",
};

/** Where the model name stops: processor, memory, screen size, OS, accessories */
const SPECS = /\s(?:[iu][3579]-|ultra \d|core\b|ryzen|intel|amd|celeron|pentium|snapdragon|\d+\s*(?:go|gb|to|tb)\b|rtx|gtx|win(?:dows)?\b|avec\b|with\b|\d{1,2}(?:[.,]\d)?\s*(?:"|''|”|″|pouces?))/i;
/** HP's SKU "15-fd0418nk" belongs to the series HP itself calls "15-fd0000" */
const HP_SKU = /\b(\d{2})-([a-z]{2})(\d)\d{3}[a-z]{2}\b/i;
/** Words that stay as written: acronyms, and short platform codes like "IAL", "BZH" */
const KEEP_CASE = /^(OLED|AI|HX|[A-Z0-9]{1,3})$/;
const CAPITALIZE = /^(PRO|MAX|PLUS)$/;

const fixCase = (w: string) =>
  CAPITALIZE.test(w) || (!KEEP_CASE.test(w) && /^[A-Z]{4,}$/.test(w)) ? w[0] + w.slice(1).toLowerCase() : w;

/** The family name hidden in an HP title: "OmniBook 5 Flip 2-in-1 Laptop 14-fp0005nk" → "OmniBook 5 Flip 14-fp0000" */
function hpName(rest: string): string {
  const sku = rest.match(HP_SKU);
  if (!sku) return rest;
  const series = `${sku[1]}-${sku[2].toLowerCase()}${sku[3]}000`;
  const before = rest
    .slice(0, sku.index)
    .replace(/flipngai/i, "Flip")
    .replace(/\b(gaming|laptop|next gen|ai|2-in-1)\b/gi, " ")
    .trim();
  return `${before || "Laptop"} ${series}`;
}

export type LaptopModel = { brand: string; line: string; modelNumber: string };

/** A listing title → the laptop family it sells, or null (pack, unknown brand or line, Apple) */
export function parseLaptopTitle(title: string): LaptopModel | null {
  if (/\bpack\b/i.test(title)) return null;
  const head = title.split("/")[0].replace(/\s+/g, " ").trim();
  const m = head.match(new RegExp(`\\b(${Object.keys(BRAND_WORDS).join("|")})\\s+(.+)$`, "i"));
  if (!m) return null;
  const brand = BRAND_WORDS[m[1].toLowerCase()];
  let rest = ` ${m[2].replace(new RegExp(`^${m[1]}\\s+`, "i"), "")}`.split(SPECS)[0].trim(); // "Asus ASUS ExpertBook"
  if (brand === "HP") rest = hpName(rest);
  rest = rest
    .replace(/\b2-en-1\b/gi, "2-in-1")
    .replace(/\b(aura )?edition\b/gi, "")
    .replace(/-[A-Z0-9]{4,}\b/g, "") // a SKU suffix: "E510KA-BR1365W", "A2XWIG-015FR"
    .replace(/\b\d{2}[A-Z0-9]{8}\b/g, "") // a Lenovo part number: "82XV010FTR"
    .replace(/\s+/g, " ")
    .trim();
  if (brand === "Dell") {
    rest = rest.replace(/\b[A-Z]{2}\d{5}\b/g, "").trim(); // "PV15250", "PB14250": the configuration code
    if (/^\d/.test(rest)) rest = `Dell ${rest}`; // the 2025 "Dell 16", "Dell 14 Plus"
  }
  if (brand === "Gigabyte") rest = rest.replace(/^gaming\s+/i, "");
  rest = rest.replace(/^(ThinkBook \d+) Gen (\d+)/i, "$1 G$2"); // ThinkBook writes "G8", ThinkPad "Gen 3"
  const name = rest.split(" ").filter(Boolean).map(fixCase).join(" ");
  const lines = BRAND_LINES[brand] ?? [];
  const n = name.toLowerCase();
  if (!lines.some((l) => n === l.toLowerCase() || n.startsWith(`${l.toLowerCase()} `))) return null;
  const split = splitModel(name, lines);
  return split ? { brand, ...split } : null;
}

/** Every laptop family Tunisianet lists, deduplicated by name */
export function laptopModels(listings: Pick<Listing, "title">[]): (LaptopModel & { kind: DeviceKind })[] {
  const seen = new Map<string, LaptopModel & { kind: DeviceKind }>();
  for (const l of listings) {
    const m = parseLaptopTitle(l.title);
    if (m) seen.set(`${m.brand}|${m.line}|${m.modelNumber}`.toLowerCase(), { ...m, kind: "LAPTOP" });
  }
  return [...seen.values()];
}

export const readLaptopListings = (log: (m: string) => void = () => {}) => readListings(log, LAPTOP_CATEGORIES);

/** A pack whose visual shows other products (printer, headset, gift): never used */
const LAPTOP_PACK = /\b(pack|offerte?s?|cadeau|imprimante|casque)\b/i;
/** Sold with a bag or a mouse: the bag may be in the photo, so used only when no clean listing exists, and reviewed */
const WITH_ACCESSORY = /\b(sacoche|sac à dos|souris)\b/i;

/** The color a laptop title names, usually in its last segments ("… / Windows 11 / Gris") */
function laptopColor(title: string): string | null {
  for (const seg of title.split("/").reverse()) {
    const c = seg.replace(/\bavec\b.*$/i, "").trim();
    if (c && c.split(" ").length <= 3 && familyOf(c)) return c;
  }
  return null;
}

/**
 * Which laptop listing feeds which catalog model and color: one photo per model and color family, for models
 * without any photo yet (a model that has one, from any source, is left alone). Clean listings win over the
 * ones sold with a bag; a title without a color gives the model's photo when no color photo is found.
 */
export async function planTunisianetLaptops(listings: Listing[]): Promise<Plan> {
  const products = await prisma.product.findMany({
    where: { kind: "LAPTOP", status: { not: "MERGED" } },
    select: { id: true, brand: true, model: true, _count: { select: { images: { where: { status: { in: ["APPROVED", "DRAFT"] } } } } } },
  });
  const byName = new Map(products.map((p) => [`${p.brand}|${p.model}`.toLowerCase(), p]));
  const planned: Planned[] = [];
  const skipped: Plan["skipped"] = [];
  const seen = new Set<string>();
  const colorless = new Map<string, Planned>();
  const ordered = [...new Map(listings.map((l) => [l.id, l])).values()].sort((a, b) => Number(WITH_ACCESSORY.test(a.title)) - Number(WITH_ACCESSORY.test(b.title)));
  for (const l of ordered) {
    const m = parseLaptopTitle(l.title);
    if (!m) continue;
    if (LAPTOP_PACK.test(l.title)) {
      skipped.push({ title: l.title, why: "pack (autres produits sur la photo)" });
      continue;
    }
    const product = byName.get(`${m.brand}|${modelName(m.line, m.modelNumber)}`.toLowerCase());
    if (!product) {
      skipped.push({ title: l.title, why: `modèle absent du catalogue (${modelName(m.line, m.modelNumber)})` });
      continue;
    }
    if (product._count.images) continue; // already has a photo: left alone
    const color = laptopColor(l.title);
    const model = `${m.brand} ${product.model}`;
    if (!color) {
      if (!colorless.has(product.id)) colorless.set(product.id, { listing: l, productId: product.id, model, color: "", family: "OTHER", modelPhoto: true });
      continue;
    }
    const family = familyOf(color)!;
    const key = `${product.id}|${family}`;
    if (seen.has(key)) continue;
    seen.add(key);
    planned.push({ listing: l, productId: product.id, model, color: titleCase(color), family });
  }
  // The model's photo from a colorless title, only for models no color photo was found for
  const withColor = new Set(planned.map((p) => p.productId));
  for (const [id, p] of colorless) if (!withColor.has(id)) planned.push(p);
  return { planned, skipped };
}

const titleCase = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()).trim();
