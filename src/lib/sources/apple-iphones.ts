import type { ColorFamily } from "@prisma/client";

// Every iPhone a Tunisian store is likely to resell, with Apple's official colors.
// fr: Apple France's name (what buyers see); en: Apple's English name (how its image files are named);
// hex: a close swatch; family: for search and filters.
// base / sizes / dates: the pieces Apple's store image names are built from (see apple.ts candidates).

export type AppleColor = { fr: string; en: string; hex: string; family: ColorFamily };
export type AppleModel = {
  /** Exactly as in the catalog (products.model) */
  model: string;
  /** Apple's image name stem: "iphone-13", "iphone-13-pro" */
  base: string;
  /** Screen size tokens Apple used in image names: "6-1inch" */
  sizes: string[];
  /** Image name date tokens, most likely first: "202207" */
  dates: string[];
  /** Launch year, for the oldest naming scheme ("iphone11-purple-select-2019") */
  year: number;
  colors: AppleColor[];
};

const c = (fr: string, en: string, hex: string, family: ColorFamily): AppleColor => ({ fr, en, hex, family });

const BLACK = c("Noir", "black", "#1F2020", "BLACK");
const WHITE = c("Blanc", "white", "#F5F5F0", "WHITE");
const RED = c("Rouge", "red", "#BA0C2E", "RED");

export const APPLE_IPHONES: AppleModel[] = [
  { model: "iPhone 11", base: "iphone-11", sizes: ["6-1inch"], dates: ["202207", "2019"], year: 2019,
    colors: [BLACK, WHITE, RED, c("Vert", "green", "#AEE1CD", "GREEN"), c("Jaune", "yellow", "#FFE681", "YELLOW"), c("Violet", "purple", "#D1CDDA", "PURPLE")] },
  { model: "iPhone 11 Pro", base: "iphone-11-pro", sizes: ["5-8inch"], dates: ["2019"], year: 2019,
    colors: [c("Vert nuit", "midnight-green", "#4E5851", "GREEN"), c("Gris sidéral", "space-gray", "#535150", "GREY"), c("Argent", "silver", "#EBEBE3", "SILVER"), c("Or", "gold", "#FAD7BD", "GOLD")] },
  { model: "iPhone 11 Pro Max", base: "iphone-11-pro-max", sizes: ["6-5inch"], dates: ["2019"], year: 2019,
    colors: [c("Vert nuit", "midnight-green", "#4E5851", "GREEN"), c("Gris sidéral", "space-gray", "#535150", "GREY"), c("Argent", "silver", "#EBEBE3", "SILVER"), c("Or", "gold", "#FAD7BD", "GOLD")] },
  { model: "iPhone 12", base: "iphone-12", sizes: ["6-1inch"], dates: ["202207", "2020"], year: 2020,
    colors: [BLACK, WHITE, RED, c("Vert", "green", "#D8EFD5", "GREEN"), c("Bleu", "blue", "#023B63", "BLUE"), c("Violet", "purple", "#B7AFE6", "PURPLE")] },
  { model: "iPhone 12 mini", base: "iphone-12-mini", sizes: ["5-4inch"], dates: ["202207", "2020"], year: 2020,
    colors: [BLACK, WHITE, RED, c("Vert", "green", "#D8EFD5", "GREEN"), c("Bleu", "blue", "#023B63", "BLUE"), c("Violet", "purple", "#B7AFE6", "PURPLE")] },
  { model: "iPhone 12 Pro", base: "iphone-12-pro", sizes: ["6-1inch"], dates: ["2020"], year: 2020,
    colors: [c("Graphite", "graphite", "#52514D", "GREY"), c("Argent", "silver", "#E3E4DF", "SILVER"), c("Or", "gold", "#FCEBD3", "GOLD"), c("Bleu Pacifique", "pacific-blue", "#2E4A5B", "BLUE")] },
  { model: "iPhone 12 Pro Max", base: "iphone-12-pro-max", sizes: ["6-7inch"], dates: ["2020"], year: 2020,
    colors: [c("Graphite", "graphite", "#52514D", "GREY"), c("Argent", "silver", "#E3E4DF", "SILVER"), c("Or", "gold", "#FCEBD3", "GOLD"), c("Bleu Pacifique", "pacific-blue", "#2E4A5B", "BLUE")] },
  { model: "iPhone 13", base: "iphone-13", sizes: ["6-1inch"], dates: ["202207", "202203", "202109"], year: 2021,
    colors: [c("Minuit", "midnight", "#232A31", "BLACK"), c("Lumière stellaire", "starlight", "#FAF6F2", "WHITE"), c("Bleu", "blue", "#215E7C", "BLUE"), c("Rose", "pink", "#FAE0D8", "PINK"), RED, c("Vert", "green", "#394C38", "GREEN")] },
  { model: "iPhone 13 mini", base: "iphone-13-mini", sizes: ["5-4inch"], dates: ["202207", "202203", "202109"], year: 2021,
    colors: [c("Minuit", "midnight", "#232A31", "BLACK"), c("Lumière stellaire", "starlight", "#FAF6F2", "WHITE"), c("Bleu", "blue", "#215E7C", "BLUE"), c("Rose", "pink", "#FAE0D8", "PINK"), RED, c("Vert", "green", "#394C38", "GREEN")] },
  { model: "iPhone 13 Pro", base: "iphone-13-pro", sizes: ["6-1inch"], dates: ["202203", "202109"], year: 2021,
    colors: [c("Graphite", "graphite", "#54524F", "GREY"), c("Or", "gold", "#FAE7CF", "GOLD"), c("Argent", "silver", "#F1F2ED", "SILVER"), c("Bleu alpin", "sierra-blue", "#A7C1D9", "BLUE"), c("Vert alpin", "alpine-green", "#576856", "GREEN")] },
  { model: "iPhone 13 Pro Max", base: "iphone-13-pro-max", sizes: ["6-7inch"], dates: ["202203", "202109"], year: 2021,
    colors: [c("Graphite", "graphite", "#54524F", "GREY"), c("Or", "gold", "#FAE7CF", "GOLD"), c("Argent", "silver", "#F1F2ED", "SILVER"), c("Bleu alpin", "sierra-blue", "#A7C1D9", "BLUE"), c("Vert alpin", "alpine-green", "#576856", "GREEN")] },
  { model: "iPhone 14", base: "iphone-14", sizes: ["6-1inch"], dates: ["202209", "202303"], year: 2022,
    colors: [c("Minuit", "midnight", "#222930", "BLACK"), c("Lumière stellaire", "starlight", "#FAF6F2", "WHITE"), c("Bleu", "blue", "#A0B4C7", "BLUE"), c("Violet", "purple", "#E5DDEA", "PURPLE"), RED, c("Jaune", "yellow", "#F9E479", "YELLOW")] },
  { model: "iPhone 14 Plus", base: "iphone-14", sizes: ["6-7inch"], dates: ["202209", "202303"], year: 2022,
    colors: [c("Minuit", "midnight", "#222930", "BLACK"), c("Lumière stellaire", "starlight", "#FAF6F2", "WHITE"), c("Bleu", "blue", "#A0B4C7", "BLUE"), c("Violet", "purple", "#E5DDEA", "PURPLE"), RED, c("Jaune", "yellow", "#F9E479", "YELLOW")] },
  { model: "iPhone 14 Pro", base: "iphone-14-pro", sizes: ["6-1inch"], dates: ["202209"], year: 2022,
    colors: [c("Noir sidéral", "space-black", "#403E3D", "BLACK"), c("Argent", "silver", "#F0F2F2", "SILVER"), c("Or", "gold", "#F4E8CE", "GOLD"), c("Violet intense", "deep-purple", "#594F63", "PURPLE")] },
  { model: "iPhone 14 Pro Max", base: "iphone-14-pro", sizes: ["6-7inch"], dates: ["202209"], year: 2022,
    colors: [c("Noir sidéral", "space-black", "#403E3D", "BLACK"), c("Argent", "silver", "#F0F2F2", "SILVER"), c("Or", "gold", "#F4E8CE", "GOLD"), c("Violet intense", "deep-purple", "#594F63", "PURPLE")] },
  { model: "iPhone 15", base: "iphone-15", sizes: ["6-1inch"], dates: ["202309"], year: 2023,
    colors: [BLACK, c("Bleu", "blue", "#D4E4ED", "BLUE"), c("Vert", "green", "#E3E9D9", "GREEN"), c("Jaune", "yellow", "#F9EAC8", "YELLOW"), c("Rose", "pink", "#F9DFE1", "PINK")] },
  { model: "iPhone 15 Plus", base: "iphone-15-plus", sizes: ["6-7inch"], dates: ["202309"], year: 2023,
    colors: [BLACK, c("Bleu", "blue", "#D4E4ED", "BLUE"), c("Vert", "green", "#E3E9D9", "GREEN"), c("Jaune", "yellow", "#F9EAC8", "YELLOW"), c("Rose", "pink", "#F9DFE1", "PINK")] },
  { model: "iPhone 15 Pro", base: "iphone-15-pro", sizes: ["6-1inch"], dates: ["202309"], year: 2023,
    colors: [c("Titane noir", "black-titanium", "#3B3B3A", "BLACK"), c("Titane blanc", "white-titanium", "#F2F1ED", "WHITE"), c("Titane bleu", "blue-titanium", "#3F4A5B", "BLUE"), c("Titane naturel", "natural-titanium", "#BEB8AD", "SILVER")] },
  { model: "iPhone 15 Pro Max", base: "iphone-15-pro-max", sizes: ["6-7inch"], dates: ["202309"], year: 2023,
    colors: [c("Titane noir", "black-titanium", "#3B3B3A", "BLACK"), c("Titane blanc", "white-titanium", "#F2F1ED", "WHITE"), c("Titane bleu", "blue-titanium", "#3F4A5B", "BLUE"), c("Titane naturel", "natural-titanium", "#BEB8AD", "SILVER")] },
  { model: "iPhone 16", base: "iphone-16", sizes: ["6-1inch"], dates: ["202409"], year: 2024,
    colors: [BLACK, WHITE, c("Rose", "pink", "#F3C7D6", "PINK"), c("Sarcelle", "teal", "#B0D4D2", "GREEN"), c("Outremer", "ultramarine", "#9AADF6", "BLUE")] },
  { model: "iPhone 16 Plus", base: "iphone-16-plus", sizes: ["6-7inch"], dates: ["202409"], year: 2024,
    colors: [BLACK, WHITE, c("Rose", "pink", "#F3C7D6", "PINK"), c("Sarcelle", "teal", "#B0D4D2", "GREEN"), c("Outremer", "ultramarine", "#9AADF6", "BLUE")] },
  { model: "iPhone 16 Pro", base: "iphone-16-pro", sizes: ["6-3inch"], dates: ["202409"], year: 2024,
    colors: [c("Titane noir", "black-titanium", "#3C3C3D", "BLACK"), c("Titane blanc", "white-titanium", "#F2F1ED", "WHITE"), c("Titane naturel", "natural-titanium", "#C2BCB2", "SILVER"), c("Titane désert", "desert-titanium", "#BFA48F", "GOLD")] },
  { model: "iPhone 16 Pro Max", base: "iphone-16-pro", sizes: ["6-9inch"], dates: ["202409"], year: 2024,
    colors: [c("Titane noir", "black-titanium", "#3C3C3D", "BLACK"), c("Titane blanc", "white-titanium", "#F2F1ED", "WHITE"), c("Titane naturel", "natural-titanium", "#C2BCB2", "SILVER"), c("Titane désert", "desert-titanium", "#BFA48F", "GOLD")] },
  { model: "iPhone 16e", base: "iphone-16e", sizes: ["6-1inch"], dates: ["202502"], year: 2025,
    colors: [BLACK, WHITE] },
  { model: "iPhone 17", base: "iphone-17", sizes: ["6-3inch"], dates: ["202509"], year: 2025,
    colors: [BLACK, WHITE, c("Bleu brume", "mist-blue", "#9FB4C9", "BLUE"), c("Sauge", "sage", "#A9B79B", "GREEN"), c("Lavande", "lavender", "#C9B6D9", "PURPLE")] },
  { model: "iPhone Air", base: "iphone-air", sizes: ["6-5inch"], dates: ["202509"], year: 2025,
    colors: [c("Noir sidéral", "space-black", "#2E2E30", "BLACK"), c("Blanc nuage", "cloud-white", "#F4F3EE", "WHITE"), c("Or clair", "light-gold", "#EADBC0", "GOLD"), c("Bleu ciel", "sky-blue", "#C6D7E6", "BLUE")] },
  { model: "iPhone 17 Pro", base: "iphone-17-pro", sizes: ["6-3inch"], dates: ["202509"], year: 2025,
    colors: [c("Argent", "silver", "#E6E6E3", "SILVER"), c("Orange cosmique", "cosmic-orange", "#E8742E", "ORANGE"), c("Bleu intense", "deep-blue", "#2C3A55", "BLUE")] },
  { model: "iPhone 17 Pro Max", base: "iphone-17-pro", sizes: ["6-9inch"], dates: ["202509"], year: 2025,
    colors: [c("Argent", "silver", "#E6E6E3", "SILVER"), c("Orange cosmique", "cosmic-orange", "#E8742E", "ORANGE"), c("Bleu intense", "deep-blue", "#2C3A55", "BLUE")] },
  { model: "iPhone SE 2020", base: "iphone-se", sizes: ["4-7inch"], dates: ["2020"], year: 2020,
    colors: [BLACK, WHITE, RED] },
  { model: "iPhone SE 2022", base: "iphone-se", sizes: ["4-7inch"], dates: ["202203"], year: 2022,
    colors: [c("Minuit", "midnight", "#232A31", "BLACK"), c("Lumière stellaire", "starlight", "#FAF6F2", "WHITE"), RED] },
];
