import type { ColorFamily, DeviceKind } from "@prisma/client";
import type { ResolvedListing } from "@/lib/listing-resolve";

export type { ResolvedListing };

export type CatalogVariant = {
  id: string;
  storageGb: number | null;
  ramGb: number | null;
  option: string | null;
  finishId: string;
  finish: { nameFr: string };
  colorHex: string;
};

/** Light entry for the manual search list */
export type CatalogProduct = { id: string; name: string; category: string; kind: DeviceKind; cameras: number | null; colorHex: string };

/** Everything the configuration step needs about the chosen product */
export type ProductDetail = {
  id: string;
  name: string;
  brand: string;
  kind: DeviceKind;
  cameras: number | null;
  status: "ACTIVE" | "PROVISIONAL" | "MERGED";
  finishes: { id: string; nameFr: string; hex: string; family: ColorFamily }[];
  variants: CatalogVariant[];
};

export type BrandOption = { name: string; lines: string[] };

/** What step 1 hands to the rest of the flow */
export type ChosenProduct = { productId: string; draftId?: string; resolved?: ResolvedListing };

export const KIND_OPTIONS: { value: DeviceKind; label: string }[] = [
  { value: "PHONE", label: "Téléphone" },
  { value: "TABLET", label: "Tablette" },
  { value: "LAPTOP", label: "Ordinateur" },
  { value: "WATCH", label: "Montre" },
  { value: "CONSOLE", label: "Console" },
];

/** Same hex as FAMILY_HEX (listing-publish.ts), which new colors are created with */
export const FAMILY_OPTIONS: { value: ColorFamily; label: string; hex: string }[] = [
  { value: "BLACK", label: "Noir", hex: "#202125" }, { value: "WHITE", label: "Blanc", hex: "#F1F0EB" }, { value: "GREY", label: "Gris", hex: "#6B6E75" },
  { value: "SILVER", label: "Argent", hex: "#D9DCE2" }, { value: "GOLD", label: "Or", hex: "#EAD7BF" }, { value: "BLUE", label: "Bleu", hex: "#2F5C8F" },
  { value: "GREEN", label: "Vert", hex: "#C4E6D2" }, { value: "PURPLE", label: "Violet", hex: "#CFC6E6" }, { value: "PINK", label: "Rose", hex: "#F2D4D7" },
  { value: "RED", label: "Rouge", hex: "#B3202D" }, { value: "YELLOW", label: "Jaune", hex: "#F4D35E" }, { value: "ORANGE", label: "Orange", hex: "#F28C38" },
  { value: "OTHER", label: "Autre", hex: "#9AA0A6" },
];
