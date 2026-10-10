// Matching our catalog to Icecat, as pure functions (no network, no database).
//   1. modelMatches: which Icecat index rows are the same model as our product
//   2. matchColor:   which of the product's colors an Icecat product is
import type { ColorFamily, DeviceKind } from "@prisma/client";

/**
 * Icecat category ids (refs/CategoriesList.xml) of the devices we sell, and their kind.
 * Everything else in the index (printers, monitors, docks, cases, TVs…) is left out.
 */
export const DEVICE_CATEGORIES: Record<string, DeviceKind> = {
  "1893": "PHONE", // Smartphones
  "119": "PHONE", // Mobile Phones
  "897": "TABLET", // Tablets
  "151": "LAPTOP", // Laptops
  "2647": "WATCH", // Smartwatches & Sport Watches
  "1060": "CONSOLE", // Game Consoles
  "2837": "CONSOLE", // Portable Game Consoles
};

export function kindForCategory(catid: string | null | undefined): DeviceKind | null {
  return (catid && DEVICE_CATEGORIES[catid.trim()]) || null;
}

/** One row of the Icecat files.index.csv, reduced to what matching needs */
export type IndexRow = {
  icecatId: number;
  /** From the Icecat category: phone, tablet, laptop, watch or console */
  kind: DeviceKind;
  productCode: string;
  brand: string;
  modelName: string;
  onMarket: boolean;
  /** "ICECAT" = edited by Icecat, the best quality */
  quality: string;
  picWidth: number;
  picHeight: number;
};

/** Lowercase, no accents, words only. Generations are unified: "Gen 2", "G2", "2. Gen", "2nd Gen" → "gen2"; "Watch6" → "watch 6". */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\b(\d)(st|nd|rd|th)?\.?\s*gen(eration)?\b/g, "gen$1")
    .replace(/\bgen(eration)?\s*(\d)\b/g, "gen$2")
    .replace(/\bg(\d)\b/g, "gen$1")
    .replace(/\bwatch(\d)/g, "watch $1")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const tokens = (s: string) => new Set(normalize(s).split(" ").filter(Boolean));

/** Words that make a different product when ours doesn't have them: "Galaxy S23 Ultra" is not a "Galaxy S23" */
const DISTINGUISHERS = ["ultra", "plus", "pro", "max", "mini", "lite", "slim", "digital", "fe", "edge", "neo", "classic", "oled", "bundle", "kit"];

/**
 * Reseller listings of refurbished units. Same model, so they can match, but their pictures
 * may be real shots on any background: ranked last, and never put online without review.
 * (On the free tier they are often the only Apple entries.)
 */
export function isRefurbished(text: string): boolean {
  return /\b(refurbished|reconditionne|renewed|grade [abc])\b/.test(normalize(text));
}

/**
 * Icecat sometimes lists a brand under its group name. Matching is exact otherwise:
 * a prefix would let in "Apple of Eden", "Tecno Baby" or "Sony Pictures".
 */
const BRAND_ALIASES: Record<string, string[]> = { sony: ["sony", "sony interactive entertainment"] };

export function brandMatches(ours: string, theirs: string): boolean {
  const o = ours.toLowerCase();
  return (BRAND_ALIASES[o] ?? [o]).includes(theirs.toLowerCase());
}

/** A model number worth trusting on its own: 4+ characters with a digit ("9310", "sm-s911b"), not "13" */
const isModelNumber = (t: string) => t.length >= 4 && /\d/.test(t);

/**
 * Same brand and same model:
 *   every word of our model name is in theirs ("Galaxy S23" ↔ "Galaxy S23 5G 128 Go"), or
 *   theirs is a short name made only of our words, including a model number ("9310" ↔ "XPS 13 9310").
 * Either way, a word that makes another model ("Ultra", "Pro", "+", another generation) rejects it.
 */
export function modelMatches(
  product: { brand: string; model: string },
  row: Pick<IndexRow, "brand" | "modelName">,
  /** The store didn't say which generation: every generation of the model is a fair suggestion */
  opts: { anyGeneration?: boolean } = {}
): boolean {
  if (!brandMatches(product.brand, row.brand)) return false;
  if (row.modelName.includes("+") && !product.model.includes("+")) return false; // "S23+", "PS5 + FIFA 23"
  const ours = tokens(product.model);
  const theirs = tokens(row.modelName);
  for (const b of tokens(row.brand)) theirs.delete(b);
  if (theirs.size === 0) return false;
  if (DISTINGUISHERS.some((d) => theirs.has(d) && !ours.has(d))) return false;
  // "Tab P11 (2nd Gen)" is not our "Tab P11"; a first generation is
  if (!opts.anyGeneration && [...theirs].some((t) => /^gen[2-9]$/.test(t) && !ours.has(t))) return false;
  const allOurs = [...ours].every((t) => theirs.has(t));
  const shortName = [...theirs].every((t) => ours.has(t)) && [...theirs].some(isModelNumber);
  return allOurs || shortName;
}

/** Best entries first: not refurbished, Icecat-edited, on the market, biggest main picture */
export function rankRows(rows: IndexRow[]): IndexRow[] {
  return [...rows].sort(
    (a, b) =>
      Number(isRefurbished(a.modelName)) - Number(isRefurbished(b.modelName)) ||
      Number(b.quality === "ICECAT") - Number(a.quality === "ICECAT") ||
      Number(b.onMarket) - Number(a.onMarket) ||
      b.picWidth * b.picHeight - a.picWidth * a.picHeight
  );
}

/**
 * The full Icecat title can reveal a variant the index name hides ("9310" is a 2-in-1).
 * Only form-factor words: "Pro" or "Ultra" can't be used here, titles say "Windows 11 Pro".
 */
const TITLE_VARIANTS = [/\bhybrid[e]?\b/, /\b2 ?(en|in) ?1\b/, /\bconvertible\b/];

export function titleConflicts(product: { model: string }, title: string): boolean {
  const ours = normalize(product.model);
  const theirs = normalize(title);
  return TITLE_VARIANTS.some((re) => re.test(theirs) && !re.test(ours));
}

/** Color words per family, French and English, as Icecat writes them in "Couleur du produit" */
const FAMILY_WORDS: Record<ColorFamily, string[]> = {
  BLACK: ["noir", "black"],
  WHITE: ["blanc", "white", "creme", "cream", "beige"],
  GREY: ["gris", "grey", "gray", "graphite"],
  SILVER: ["argent", "silver"],
  GOLD: ["or", "gold", "dore"],
  BLUE: ["bleu", "blue"],
  GREEN: ["vert", "green", "menthe", "mint", "lime"],
  PURPLE: ["violet", "purple", "lavande", "lavender"],
  PINK: ["rose", "pink"],
  RED: ["rouge", "red"],
  YELLOW: ["jaune", "yellow"],
  ORANGE: ["orange"],
  OTHER: [],
};

export function familyOf(color: string | null): ColorFamily | null {
  if (!color) return null;
  const words = tokens(color);
  for (const [family, list] of Object.entries(FAMILY_WORDS) as [ColorFamily, string[]][]) {
    if (list.some((w) => words.has(w))) return family;
  }
  return null;
}

export type FinishForMatch = { id: string; nameFr: string; aliases: string[]; family: ColorFamily };

export type ColorMatch = { finishId: string; how: "exact" | "family" };

/**
 * Which of our colors an Icecat product is.
 *   exact:  its color name ("Phantom Black") or coarse color equals our name or an alias
 *   family: its coarse color ("Noir") points to a family only ONE of our colors has
 * Anything else is not certain and goes to the review screen as a suggestion.
 */
export function matchColor(
  finishes: FinishForMatch[],
  icecat: { color: string | null; colorName: string | null }
): ColorMatch | null {
  const names = [icecat.colorName, icecat.color].filter((x): x is string => !!x).map(normalize);
  for (const f of finishes) {
    const ours = [f.nameFr, ...f.aliases].map(normalize);
    if (names.some((n) => ours.includes(n))) return { finishId: f.id, how: "exact" };
  }
  const family = familyOf(icecat.color) ?? familyOf(icecat.colorName);
  if (!family) return null;
  const same = finishes.filter((f) => f.family === family);
  return same.length === 1 ? { finishId: same[0].id, how: "family" } : null;
}

/** Marketing tails and edition words that don't change which model it is */
const NAME_NOISE = [
  /\bnext gen ai( pc)?\b/g, /\bai pc\b/g, /\bnotebook pc\b/g, /\bnotebook\b/g, /\blaptop\b/g, /\bordinateur portable\b/g,
  /\bwolf pro security edition\b/g, /\brenew(ed)?\b/g, /\b[45]g\b/gi, /\blte\b/gi, /\bdual sim\b/gi, /\bds\b/gi, /\(\s*\)/g,
  /\bw1[01][hp]?\b/gi, /\bmobile workstation\b/gi, /\bplaystation hits\b/gi, /\bkonsole\b/gi, /\b(19|20)\d\d\b(?!\s*(gb|go|tb))/g, /\s-+\s|-+\s*pc\b|\s-+$/gi, /\b\d+(\.\d+)? ?(inch|pouces?|cm)\b/g, /\((intel|amd)\)/gi, /\b(intel|amd)\b/g,
];

/**
 * A shop or regional reference, not part of the model name: "db0013na", "A14VGG", "A9WIG", "C1MG",
 * "614US", "S908B". Real model numbers stay: "T14s", "GF63", "8570p", "G84", "A54".
 */
const isSku = (t: string) => {
  if (t.length < 4 || !/\d/.test(t)) return false;
  const letters = (t.match(/[a-z]/gi) ?? []).length;
  const digits = (t.match(/\d/g) ?? []).length;
  // Under 6 characters, a reference has letters AFTER a digit ("A9WIG", "C1MG", "614US"); models put them first ("ANV17", "GF63")
  return t.length >= 6 ? letters >= 2 : /\d[a-z]{2,}/i.test(t) || (digits >= 3 && letters >= 2);
};

/**
 * The model as a person would name it: "OMEN 17-db0013na" → "OMEN 17",
 * "Raider 18 HX A14VGG-006BE" → "Raider 18 HX", "EliteBook 8 G1i Next Gen AI PC" → "EliteBook 8 G1i".
 */
export function cleanModelName(name: string, brand?: string): string {
  // After a comma come bundles and notes ("PlayStation 4, Uncharted 4", "ProBook 6570b, základní model")
  let s = ` ${name.split(",")[0].replace(/["“”]/g, " ")} `
    .replace(/\b\d+ ?(gb|go|tb|to)\b/gi, " ") // storage belongs to the variant, not the model
    .replace(/\b(black|white|silver|gold|blue|green|red|purple|pink|grey|gray|graphite|midnight|starlight|noir|blanc|argent|bleu|vert|rouge|violet|rose|gris|lime|beige|cream|creme|lavender|lavande|mint|olive|yellow|jaune|orange|coral|champagne|bronze|onyx|marble|cobalt|phantom)\b/gi, " ");
  if (brand) s = s.replace(new RegExp(`^\\s*(${brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+)+`, "i"), " ");
  for (const re of NAME_NOISE) s = s.replace(new RegExp(re.source, re.flags.includes("i") ? re.flags : re.flags + "i"), " ");
  const words = s.split(/\s+/).filter(Boolean).flatMap((w) => {
    // "17-db0013na" → keep "17", drop the SKU part; "A14VGG-006BE" → drop entirely
    const parts = w.split("-");
    // Next to a SKU, a 3+ digit chunk is part of it too ("A2XWJG-075")
    const hasSku = parts.some(isSku);
    const kept = parts.filter((p) => !isSku(p) && !(parts.length > 1 && /^\d{3}[a-z]{2}$/i.test(p)) && !(hasSku && /^\d{3,}[a-z]*$/i.test(p)));
    return kept.length === parts.length ? [w] : kept;
  });
  return words.filter((w) => !isSku(w)).join(" ").replace(/\s+/g, " ").replace(/\(\s*\)/g, " ").replace(/\s+/g, " ").replace(/[\s\-–,;:]+$/, "").trim();
}

/** Every number the store typed must be in the candidate: "iPhone 16 Pro Max" is never "iPhone 13 Pro Max" */
export function numbersMatch(query: string, candidate: string): boolean {
  const theirs = new Set(normalize(candidate).split(" "));
  return normalize(query)
    .split(" ")
    .filter((t) => /\d/.test(t))
    .every((t) => theirs.has(t) || [...theirs].some((c) => c.startsWith(t)));
}

/** Bags, chargers, docks, cases…: the index lists them under the same brands and model names */
const ACCESSORY = /\b(backpack|bag|sacoche|sac|sleeve|housse|case|cover|coque|etui|charger|chargeur|adapter|adaptateur|dock|docking|station d accueil|mouse|souris|keyboard|clavier|cable|toner|cartridge|cartouche|ink|monitor|moniteur|ecran|stand|support|stylus|stylet|pen|screen protector|protection|strap|bracelet|warranty|garantie|care pack|carepack|service)\b/;

export function isAccessory(modelName: string): boolean {
  return ACCESSORY.test(normalize(modelName));
}
