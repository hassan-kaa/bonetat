import "server-only";
import { z } from "zod";

// Open Icecat live JSON API: one product (= one color of one model) per call.
// Docs: https://iceclog.com/manual-for-icecat-json-product-requests/
const API = "https://live.icecat.biz/api";
/** Gallery images are only ever downloaded from Icecat's own image host */
const IMAGE_HOST = "images.icecat.biz";
/** Icecat's public demo account: fine for development, use your own username in production */
const DEMO_USER = "openIcecat-live";

export type IcecatRef = { icecatId: number } | { gtin: string } | { brand: string; productCode: string };

/**
 * What Kaa pastes in the admin field, read as an Icecat reference:
 *   "107934938"       → Icecat product id (up to 11 digits)
 *   "8806094724530"   → GTIN / EAN barcode (12 to 14 digits)
 *   "SM-S911BZKDEUB"  → manufacturer product code, with the product's brand
 *   "Sony:CFI-1015A"  → product code with an explicit brand (when Icecat's brand name differs)
 */
export function parseIcecatRef(input: string, defaultBrand: string): IcecatRef | null {
  const v = input.trim();
  if (!v) return null;
  if (/^\d{12,14}$/.test(v)) return { gtin: v };
  if (/^\d{1,11}$/.test(v)) return { icecatId: Number(v) };
  const m = v.match(/^([^:]+):(.+)$/);
  if (m) return { brand: m[1].trim(), productCode: m[2].trim() };
  return { brand: defaultBrand, productCode: v };
}

const galleryItem = z.object({
  Pic: z.string().url(),
  PicWidth: z.coerce.number().optional(),
  PicHeight: z.coerce.number().optional(),
  IsMain: z.string().optional(),
  No: z.coerce.number().optional(),
});

const feature = z.object({
  Feature: z.object({ Name: z.object({ Value: z.string() }).partial() }).partial().optional(),
  PresentationValue: z.string().optional(),
});

const response = z.object({
  msg: z.string().optional(),
  data: z.object({
    GeneralInfo: z.object({ IcecatId: z.coerce.number(), Title: z.string() }),
    Gallery: z.array(galleryItem).default([]),
    FeaturesGroups: z.array(z.object({ Features: z.array(feature).default([]) }).passthrough()).default([]),
  }),
});

export type IcecatImage = { url: string; width: number | null; height: number | null; isMain: boolean };
export type IcecatProduct = {
  icecatId: number;
  title: string;
  images: IcecatImage[];
  /** Coarse color, "Couleur du produit" (e.g. "Noir") */
  color: string | null;
  /** Marketing color name, "Nom de la couleur" (e.g. "Phantom Black") */
  colorName: string | null;
};

// Feature names as Icecat returns them in French and English
const COLOR_FEATURES = ["couleur du produit", "product colour", "product color", "couleur"];
const COLOR_NAME_FEATURES = ["nom de la couleur", "colour name", "color name"];

export class IcecatError extends Error {}

export function icecatUrl(ref: IcecatRef, lang = "FR"): string {
  const q = new URLSearchParams({ lang, shopname: process.env.ICECAT_USERNAME || DEMO_USER, content: "" });
  if ("icecatId" in ref) q.set("icecat_id", String(ref.icecatId));
  else if ("gtin" in ref) q.set("GTIN", ref.gtin);
  else {
    q.set("Brand", ref.brand);
    q.set("ProductCode", ref.productCode);
  }
  return `${API}?${q}`;
}

/** Parse an Icecat response into the product title and its gallery, main image first */
export function parseIcecatResponse(json: unknown): IcecatProduct {
  const parsed = response.safeParse(json);
  if (!parsed.success) {
    const msg = (json as { msg?: string } | null)?.msg;
    throw new IcecatError(msg ? `Icecat : ${msg}` : "Réponse Icecat inattendue (produit introuvable ?)");
  }
  const { GeneralInfo, Gallery, FeaturesGroups } = parsed.data.data;
  const features = FeaturesGroups.flatMap((g) => g.Features);
  const featureValue = (names: string[]) =>
    features.find((f) => names.includes((f.Feature?.Name?.Value ?? "").trim().toLowerCase()))?.PresentationValue?.trim() || null;
  const images = Gallery
    .filter((g) => new URL(g.Pic).hostname === IMAGE_HOST)
    .sort((a, b) => Number(b.IsMain === "Y") - Number(a.IsMain === "Y") || (a.No ?? 0) - (b.No ?? 0))
    .map((g) => ({ url: g.Pic, width: g.PicWidth ?? null, height: g.PicHeight ?? null, isMain: g.IsMain === "Y" }));
  return {
    icecatId: GeneralInfo.IcecatId,
    title: GeneralInfo.Title,
    images,
    color: featureValue(COLOR_FEATURES),
    colorName: featureValue(COLOR_NAME_FEATURES),
  };
}

/** Account tokens from "Manage access tokens" on icecat.biz, sent as headers (never in the URL) */
function icecatHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  if (process.env.ICECAT_API_TOKEN) h["api_token"] = process.env.ICECAT_API_TOKEN;
  if (process.env.ICECAT_CONTENT_KEY) h["content_token"] = process.env.ICECAT_CONTENT_KEY;
  return h;
}

export async function fetchIcecatProduct(ref: IcecatRef, lang = "FR"): Promise<IcecatProduct> {
  const res = await fetch(icecatUrl(ref, lang), { headers: icecatHeaders(), signal: AbortSignal.timeout(20_000), cache: "no-store" });
  const json = await res.json().catch(() => null);
  if (!res.ok && !json) throw new IcecatError(`Icecat ne répond pas (HTTP ${res.status})`);
  return parseIcecatResponse(json);
}

/** Download one gallery image. Refuses anything not hosted by Icecat. */
export async function downloadIcecatImage(url: string): Promise<Buffer> {
  if (new URL(url).hostname !== IMAGE_HOST) throw new IcecatError(`Image hors d’Icecat refusée : ${url}`);
  const res = await fetch(url, { headers: icecatHeaders(), signal: AbortSignal.timeout(30_000), cache: "no-store" });
  if (!res.ok) throw new IcecatError(`Téléchargement impossible (HTTP ${res.status}) : ${url}`);
  return Buffer.from(await res.arrayBuffer());
}
