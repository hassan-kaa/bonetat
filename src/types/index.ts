import type { ConditionGrade, DeviceKind } from "@prisma/client";

/** A line in the buyer's cart: one physical unit, and the shop selling it */
export type CartItem = {
  offerId: string;
  variantId: string;
  productSlug: string;
  /** "iPhone 11 Pro" */
  name: string;
  /** "256 Go, Vert nuit" */
  config: string;
  grade: ConditionGrade;
  batteryHealth: number | null;
  priceMillimes: number;
  newPriceMillimes: number | null;
  kind: DeviceKind;
  colorHex: string;
  /** Catalog FRONT photo key, null → DeviceArt illustration */
  imageKey: string | null;
  cameras: number | null;
  vendorName?: string;
};

export type ShippingAddress = {
  label?: string;
  fullName: string;
  phone: string;
  governorate: string;
  delegation?: string | null;
  line: string;
  notes?: string | null;
};

export type ReasonTag = "last" | "fresh" | "top" | "deal" | "drop";

/** Everything a variant card needs: one exact variant in one condition, at its winning price */
export type VariantCardData = {
  offerId: string;
  variantId: string;
  productSlug: string;
  name: string;
  config: string;
  kind: DeviceKind;
  brand: string;
  ramGb: number | null;
  storageGb: number | null;
  /** Laptops only: processor family read from the catalog */
  cpu: { id: string; label: string } | null;
  /** Laptops only: a dedicated graphics card is named */
  gpu: boolean;
  cameras: number | null;
  colorHex: string;
  /** Catalog FRONT photo key, null → DeviceArt illustration */
  imageKey: string | null;
  /** imageKey is the model's cover, not a photo of this color */
  imageIsCover: boolean;
  vendorName: string;
  /** Units for sale in this configuration (all grades shown on the card) */
  offerCount: number;
  grade: ConditionGrade;
  batteryHealth: number | null;
  priceMillimes: number;
  newPriceMillimes: number | null;
  tag: ReasonTag | null;
  href: string;
};
