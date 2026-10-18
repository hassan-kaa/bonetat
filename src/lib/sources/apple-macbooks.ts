import type { AppleColor } from "./apple-iphones";

// Every MacBook a Tunisian store is likely to resell, with Apple's official colors per generation.
//
// Apple names a MacBook image `${stem}-${color}-select-${date}`: the stem carries the model
// ("mbp14" = 14-inch Pro), the date token carries the CHASSIS GENERATION ("202410" = the M4
// body). M2/M3/M4 Air share one body, and M1→M4 Pro 14"/16" share one body, so a color that
// still exists on a live generation shows that generation's identical render — but the model's
// OWN date is listed first, so it always wins when Apple still serves it.
// The M1 Air and the 13-inch Pro use Apple's store names of their time: "macbook-air-…-select-201810"
// (the M1 Air reused the 2018 Air renders, same body) and "mbp-…-select-202011" / "-202206".
//
// en: Apple's English name, hyphenated as Apple writes it ("space-gray"); the filename token is
//     the hyphenless form ("spacegray"), derived in apple.ts (colorTokens).
// hex: a close swatch; family: for search and filters.

export type AppleMacModel = {
  /** Exactly as in the catalog (products.model) */
  model: string;
  /** Apple's image stem: "mba13", "mbp14", "mbp16" */
  stem: string;
  /** Image date tokens, the model's own chassis first, then live siblings as fallback */
  dates: string[];
  colors: AppleColor[];
};

const silver: AppleColor = { fr: "Argent", en: "silver", hex: "#E3E4DF", family: "SILVER" };
const spaceGray: AppleColor = { fr: "Gris sidéral", en: "space-gray", hex: "#7E7E80", family: "GREY" };
const gold: AppleColor = { fr: "Or", en: "gold", hex: "#D8C3BA", family: "GOLD" };
const spaceBlack: AppleColor = { fr: "Noir sidéral", en: "space-black", hex: "#35363A", family: "BLACK" };
const midnight: AppleColor = { fr: "Minuit", en: "midnight", hex: "#2E3641", family: "BLACK" };
const starlight: AppleColor = { fr: "Lumière stellaire", en: "starlight", hex: "#F5F0E8", family: "WHITE" };
const skyBlue: AppleColor = { fr: "Bleu ciel", en: "sky-blue", hex: "#A9C3DC", family: "BLUE" };

// Live date pools per stem (what Apple's CDN still serves). "own" goes first on each model.
const MBA13 = ["202503"]; // M4 Air 13-inch
const MBA15 = ["202306", "202503"]; // M2, then M4 Air 15-inch
const MBP14 = ["202110", "202301", "202410"]; // M1 Pro, M2 Pro, M4 Pro
const MBP16 = ["202110", "202301", "202410"];

/** Own generation first, then the other live dates of the same stem */
const order = (own: string, pool: string[]) => [own, ...pool.filter((d) => d !== own)];

export const APPLE_MACBOOKS: AppleMacModel[] = [
  // --- Air. The M1 shows Apple's 2018 Air renders (same body), as Apple's store did. ---
  { model: "MacBook Air M1", stem: "macbook-air", dates: ["201810"], colors: [spaceGray, silver, gold] },
  { model: "MacBook Air 13 M2", stem: "mba13", dates: order("202206", MBA13), colors: [midnight, starlight, spaceGray, silver] },
  { model: "MacBook Air 13 M3", stem: "mba13", dates: order("202403", MBA13), colors: [midnight, starlight, silver] },
  { model: "MacBook Air 13 M4", stem: "mba13", dates: order("202503", MBA13), colors: [skyBlue, starlight, midnight, silver] },
  { model: "MacBook Air 15 M2", stem: "mba15", dates: order("202306", MBA15), colors: [midnight, starlight, spaceGray, silver] },
  { model: "MacBook Air 15 M3", stem: "mba15", dates: order("202403", MBA15), colors: [midnight, starlight, silver] },
  { model: "MacBook Air 15 M4", stem: "mba15", dates: order("202503", MBA15), colors: [skyBlue, starlight, midnight, silver] },

  // --- 13-inch Pro (Touch Bar): Apple's store names "mbp-<color>-select-<date>". ---
  { model: "MacBook Pro 13 M1", stem: "mbp", dates: ["202011"], colors: [spaceGray, silver] },
  { model: "MacBook Pro 13 M2", stem: "mbp", dates: ["202206", "202011"], colors: [spaceGray, silver] },
  { model: "MacBook Pro M1", stem: "mbp", dates: ["202011"], colors: [spaceGray, silver] },

  // --- 14-inch Pro. M1/M2 Pro keep Space Gray + Silver; M3 onward swaps Space Gray for Space Black. ---
  { model: "MacBook Pro 14 M1 Pro", stem: "mbp14", dates: order("202110", MBP14), colors: [spaceGray, silver] },
  { model: "MacBook Pro 14 M1 Max", stem: "mbp14", dates: order("202110", MBP14), colors: [spaceGray, silver] },
  { model: "MacBook Pro 14 M2 Pro", stem: "mbp14", dates: order("202301", MBP14), colors: [spaceGray, silver] },
  { model: "MacBook Pro 14 M2 Max", stem: "mbp14", dates: order("202301", MBP14), colors: [spaceGray, silver] },
  { model: "MacBook Pro 14 M3", stem: "mbp14", dates: order("202311", MBP14), colors: [spaceBlack, silver] },
  { model: "MacBook Pro 14 M3 Pro", stem: "mbp14", dates: order("202311", MBP14), colors: [spaceBlack, silver] },
  { model: "MacBook Pro 14 M3 Max", stem: "mbp14", dates: order("202311", MBP14), colors: [spaceBlack, silver] },
  { model: "MacBook Pro 14 M4", stem: "mbp14", dates: order("202410", MBP14), colors: [spaceBlack, silver] },
  { model: "MacBook Pro 14 M4 Pro", stem: "mbp14", dates: order("202410", MBP14), colors: [spaceBlack, silver] },
  { model: "MacBook Pro 14 M4 Max", stem: "mbp14", dates: order("202410", MBP14), colors: [spaceBlack, silver] },

  // --- 16-inch Pro, same colors as the 14-inch by generation. ---
  { model: "MacBook Pro 16 M1 Pro", stem: "mbp16", dates: order("202110", MBP16), colors: [spaceGray, silver] },
  { model: "MacBook Pro 16 M1 Max", stem: "mbp16", dates: order("202110", MBP16), colors: [spaceGray, silver] },
  { model: "MacBook Pro 16 M2 Pro", stem: "mbp16", dates: order("202301", MBP16), colors: [spaceGray, silver] },
  { model: "MacBook Pro 16 M2 Max", stem: "mbp16", dates: order("202301", MBP16), colors: [spaceGray, silver] },
  { model: "MacBook Pro 16 M3 Pro", stem: "mbp16", dates: order("202311", MBP16), colors: [spaceBlack, silver] },
  { model: "MacBook Pro 16 M3 Max", stem: "mbp16", dates: order("202311", MBP16), colors: [spaceBlack, silver] },
  { model: "MacBook Pro 16 M4 Pro", stem: "mbp16", dates: order("202410", MBP16), colors: [spaceBlack, silver] },
  { model: "MacBook Pro 16 M4 Max", stem: "mbp16", dates: order("202410", MBP16), colors: [spaceBlack, silver] },
];
