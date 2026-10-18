import type { AppleColor } from "./apple-iphones";

// Every iPad a Tunisian store is likely to resell, with Apple's official colors and the names Apple's
// store gave their photos. iPads come in Wi-Fi and Cellular versions that look the same but for a thin
// antenna band: the Wi-Fi photo illustrates both (photos belong to the color, not the version).
//
// templates: Apple image names, "{c}" standing for the color as Apple spells it (see colorTokens in
// apple.ts). Tried in order: the model's own name first, then a same-body sibling when Apple dropped it
// (iPad 7, 8 and 9 share one body; so do the 11-inch Pro 2020 and the "2nd gen" listing).

export type AppleIpadModel = {
  /** Exactly as in the catalog (products.model) */
  model: string;
  colors: AppleColor[];
  templates: string[];
};

const silver: AppleColor = { fr: "Argent", en: "silver", hex: "#E3E4E5", family: "SILVER" };
const spaceGray: AppleColor = { fr: "Gris sidéral", en: "space-gray", hex: "#7D7E80", family: "GREY" };
const gold: AppleColor = { fr: "Or", en: "gold", hex: "#F3DDC6", family: "GOLD" };
const roseGold: AppleColor = { fr: "Or rose", en: "rose-gold", hex: "#F2CBC2", family: "PINK" };
const green: AppleColor = { fr: "Vert", en: "green", hex: "#C9D9C4", family: "GREEN" };
const skyBlue: AppleColor = { fr: "Bleu ciel", en: "sky-blue", hex: "#A9C6DA", family: "BLUE" };
const blue: AppleColor = { fr: "Bleu", en: "blue", hex: "#A5B9D6", family: "BLUE" };
const pink: AppleColor = { fr: "Rose", en: "pink", hex: "#EFC7CD", family: "PINK" };
const yellow: AppleColor = { fr: "Jaune", en: "yellow", hex: "#F3DD8A", family: "YELLOW" };
const purple: AppleColor = { fr: "Violet", en: "purple", hex: "#C9BEDC", family: "PURPLE" };
const starlight: AppleColor = { fr: "Lumière stellaire", en: "starlight", hex: "#F1ECE3", family: "WHITE" };
const spaceBlack: AppleColor = { fr: "Noir sidéral", en: "space-black", hex: "#3A3A3C", family: "BLACK" };

// 10.2-inch body shared by the 7th, 8th and 9th generation
const IPAD_102 = ["ipad-2021-hero-{c}-wifi-select", "ipad-2020-hero-{c}-wifi-select"];
const pro11 = (date: string) => [`ipad-pro-11-select-wifi-{c}-${date}`];
const pro129 = (date: string) => [`ipad-pro-12-select-wifi-{c}-${date}`];

export const APPLE_IPADS: AppleIpadModel[] = [
  // --- iPad ---
  { model: "iPad 7", colors: [silver, spaceGray, gold], templates: ["ipad-2019-hero-{c}-wifi-select", ...IPAD_102.slice().reverse()] },
  { model: "iPad 8", colors: [silver, spaceGray, gold], templates: ["ipad-2020-hero-{c}-wifi-select", "ipad-2021-hero-{c}-wifi-select"] },
  { model: "iPad 9", colors: [silver, spaceGray], templates: IPAD_102 },
  { model: "iPad 10", colors: [blue, pink, yellow, silver], templates: ["ipad-10th-gen-finish-select-202212-{c}-wifi", "refurb-ipad-wifi-{c}-2022"] },
  { model: "iPad 11", colors: [blue, pink, yellow, silver], templates: ["refurb-ipad-11inch-11th-gen-wifi-{c}-202512", "ipad-10th-gen-finish-select-202212-{c}-wifi"] },

  // --- iPad Air ---
  { model: "iPad Air 2", colors: [silver, spaceGray, gold], templates: ["ipad-air2-select-wifi-{c}-201410", "ipad-air-2-select-wifi-{c}"] },
  { model: "iPad Air 3", colors: [silver, spaceGray, gold], templates: ["ipad-air-select-wifi-{c}-201903"] },
  { model: "iPad Air 4", colors: [silver, spaceGray, roseGold, green, skyBlue], templates: ["ipad-air-select-wifi-{c}-202009"] },
  { model: "iPad Air 5", colors: [spaceGray, starlight, pink, purple, blue], templates: ["ipad-air-select-wifi-{c}-202203"] },
  { model: "iPad Air 11 M2", colors: [spaceGray, starlight, purple, blue], templates: ["refurb-ipad-air-11inch-m2-wifi-{c}-202504"] },
  { model: "iPad Air 13 M2", colors: [spaceGray, starlight, purple, blue], templates: ["refurb-ipad-air-13inch-m2-wifi-{c}-202504"] },
  { model: "iPad Air 11 M3", colors: [spaceGray, starlight, purple, blue], templates: ["refurb-ipad-air-7th-gen-wifi-{c}-202509", "refurb-ipad-air-11inch-m2-wifi-{c}-202504"] },
  { model: "iPad Air 13 M3", colors: [spaceGray, starlight, purple, blue], templates: ["refurb-ipad-air-2nd-gen-wifi-{c}-202509", "refurb-ipad-air-13inch-m2-wifi-{c}-202504"] },

  // --- iPad mini ---
  { model: "iPad mini 2", colors: [silver, spaceGray], templates: ["ipad-mini2-select-wifi-{c}-201310", "ipad-mini-select-wifi-{c}-201310"] },
  { model: "iPad mini 4", colors: [silver, spaceGray, gold], templates: ["ipad-mini4-select-wifi-{c}-201509", "ipad-mini-select-wifi-{c}-201509"] },
  { model: "iPad mini 5", colors: [silver, spaceGray, gold], templates: ["ipad-mini-select-wifi-{c}-201903"] },
  { model: "iPad mini 6", colors: [spaceGray, pink, purple, starlight], templates: ["ipad-mini-select-wifi-{c}-202109", "refurb-ipad-mini-wifi-{c}-gallery-2022"] },
  { model: "iPad mini 7", colors: [spaceGray, blue, purple, starlight], templates: ["refurb-ipad-mini-7th-gen-wifi-{c}-202603"] },

  // --- iPad Pro 11-inch ---
  { model: "iPad Pro 11", colors: [silver, spaceGray], templates: pro11("201810") },
  { model: "iPad Pro 11 2nd gen", colors: [silver, spaceGray], templates: pro11("202003") },
  { model: "iPad Pro 11 2020", colors: [silver, spaceGray], templates: pro11("202003") },
  { model: "iPad Pro 11 2021", colors: [silver, spaceGray], templates: pro11("202104") },
  { model: "iPad Pro 11 2022", colors: [silver, spaceGray], templates: [...pro11("202210"), "refurb-ipad-pro-11inch-4th-gen-wifi-{c}-202409"] },
  { model: "iPad Pro 11 M4", colors: [spaceBlack, silver], templates: pro11("202405") },

  // --- iPad Pro 12.9 / 13-inch ---
  { model: "iPad Pro 12.9 2020", colors: [silver, spaceGray], templates: pro129("202003") },
  { model: "iPad Pro 12.9 2021", colors: [silver, spaceGray], templates: pro129("202104") },
  { model: "iPad Pro 12.9 2022", colors: [silver, spaceGray], templates: [...pro129("202210"), "refurb-ipad-pro-13inch-6th-gen-wifi-{c}-202409"] },
  { model: "iPad Pro 13 M4", colors: [spaceBlack, silver], templates: ["ipad-pro-13-select-wifi-{c}-202405"] },
];
