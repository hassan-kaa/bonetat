import "server-only";
import type { ColorFamily } from "@prisma/client";
import { prisma } from "../prisma";
import { slugify } from "../utils";
import { recordSource, storeOfficialPhoto } from "../catalog-photos";
import { ensureProductCover } from "../auto-photos";

// Official photos picked by eye on the brand's own product page, for models no source names cleanly
// (Xbox names its files by random ids). Each one was looked at before being listed here, so they go
// online at once. Add a line when a brand page shows a clean product shot; nothing else reads this list.

/** No color: the model's photo whatever the color, set only when the model has none yet */
type Pick = { brand: string; model: string; url: string } & (
  | { color: string; family: ColorFamily; hex: string; /** match the color by name only, never by family */ exact?: boolean }
  | { color?: undefined }
);

// Apple's refurbished-store renders (store.storeimages.cdn-apple.com): the whole watch, case and band, one
// per color. Only these generations are still on Apple's server; Series 3 to 9, SE 1 and Ultra 1 are gone.
// Colors match by exact name only: "Naturel" (titanium) must never land on another grey like "Gris sidéral".
const AS = "https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is";
const watch = (model: string, color: string, family: ColorFamily, hex: string, name: string): Pick => ({
  brand: "Apple", model: `Apple Watch ${model}`, color, family, hex, exact: true, url: `${AS}/refurb-${name}?wid=1600&hei=1600&fmt=png-alpha`,
});
const APPLE_WATCHES: Pick[] = [
  watch("SE 2", "Minuit", "BLACK", "#2E3641", "44-se-nc-alum-midnight-sport-band-midnight"),
  watch("SE 2", "Lumière stellaire", "WHITE", "#F1ECE3", "44-se-nc-alum-starlight-sport-band-starlight"),
  watch("SE 3", "Lumière stellaire", "WHITE", "#F1ECE3", "44-se-3-nc-alum-starlight-sport-band-starlight"),
  watch("Series 10", "Or rose", "PINK", "#E8C8BE", "46-s10-alum-rose-sport-band-blush"),
  watch("Series 10", "Titane naturel", "GREY", "#B9B4AA", "46-s10-titanium-natural-sport-band-stone-gray"),
  watch("Series 10", "Titane ardoise", "BLACK", "#4A4A4C", "46-s10-titanium-slate-sport-band-black"),
  watch("Series 10", "Titane or", "GOLD", "#E3CBA8", "46-s10-titanium-gold-sport-band-starlight"),
  watch("Series 11", "Argent", "SILVER", "#E3E4E5", "46-s11-alum-silver-sport-band-fog"),
  watch("Series 11", "Titane naturel", "GREY", "#B9B4AA", "46-s11-titanium-natural-sport-band-gray"),
  watch("Series 11", "Titane ardoise", "BLACK", "#4A4A4C", "46-s11-titanium-slate-sport-band-black"),
  watch("Series 11", "Titane or", "GOLD", "#E3CBA8", "46-s11-titanium-gold-sport-band-blush"),
  watch("Ultra 2", "Titane noir", "BLACK", "#3A3A3C", "49-ultra-black-titanium-ocean-black"),
  watch("Ultra 2", "Titane naturel", "GREY", "#B9B4AA", "49-ultra-natural-titanium-ocean-black"),
  watch("Ultra 3", "Titane naturel", "GREY", "#B9B4AA", "49-ultra-natural-titanium-anchor-blue"),
  watch("Ultra 3", "Titane noir", "BLACK", "#3A3A3C", "49-ultra-black-titanium-black"),
];

export const BRAND_PICKS: Pick[] = [
  // xbox.com/fr-FR/consoles/xbox-series-s: console and controller, transparent background
  {
    brand: "Microsoft",
    model: "Xbox Series S",
    color: "Blanc",
    family: "WHITE",
    hex: "#F1F0EB",
    url: "https://assets.xboxservices.com/assets/97/d3/97d3bf27-1a7d-4db6-85bc-929f2badf14e.png",
  },
  // playstation.com/fr-fr/accessories/playstation-portal-remote-player: front view, both finishes
  {
    brand: "Sony",
    model: "PlayStation Portal",
    color: "Blanc",
    family: "WHITE",
    hex: "#F1F0EB",
    url: "https://gmedia.playstation.com/is/image/SIEPDC/ps-portal-remote-player-image-block-01-en-22aug23?$1600px$",
  },
  {
    brand: "Sony",
    model: "PlayStation Portal",
    color: "Noir minuit",
    family: "BLACK",
    hex: "#202125",
    url: "https://gmedia.playstation.com/is/image/SIEPDC/ps-portal-remote-player-midnight-ui-image-block-02-en-24jan25?$1600px$",
  },
  // rog.asus.com/fr/gaming-handhelds/rog-ally/rog-ally-x-2024: front view, transparent background
  {
    brand: "Asus",
    model: "ROG Ally X",
    color: "Noir",
    family: "BLACK",
    hex: "#202125",
    url: "https://dlcdnwebimgs.asus.com/files/media/C03ED571-0D4B-47B3-90B0-BEF72BB26C05/v2/images/large/1x/nr2501_armoury_crate.png",
  },
  ...APPLE_WATCHES,
];

export async function importBrandPicks(log: (m: string) => void = () => {}) {
  for (const p of BRAND_PICKS) {
    const product = await prisma.product.findFirst({
      where: { brand: p.brand, model: p.model, status: { not: "MERGED" } },
    });
    if (!product) {
      log(`✗ ${p.brand} ${p.model}: not in the catalog`);
      continue;
    }
    if (!p.color && (await prisma.catalogImage.count({ where: { productId: product.id, finishId: null, status: "APPROVED" } }))) {
      log(`  ${p.brand} ${p.model}: already has its model photo`);
      continue;
    }
    const finish = p.color ? await ensureFinish(product.id, p) : null;
    let r: string;
    try {
      r = await storeOfficialPhoto({
        productId: product.id,
        finishId: finish?.id ?? null,
        angle: "FRONT",
        source: "BRAND_SITE",
        sourceRef: `pick:${p.url.split("/").pop()?.split("?")[0]}`,
        sourceUrl: p.url,
        download: async () => {
          const res = await fetch(p.url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; BonetatCatalog/1.0)",
            },
          });
          if (!res.ok) throw new Error(`${res.status}`);
          return Buffer.from(await res.arrayBuffer());
        },
        approve: true,
      });
    } catch (e) {
      log(`  ${p.brand} ${p.model} ${p.color ?? ""}: error (${(e as Error).message}), run again later`);
      continue;
    }
    await recordSource(
      "brand-pick",
      `${slugify(`${p.brand} ${p.model}`)}/${p.color ? slugify(p.color) : "model"}`,
      { url: p.url, productId: product.id, finishId: finish?.id ?? null, outcome: r },
    );
    await ensureProductCover(product.id).catch(() => null);
    log(`  ${p.brand} ${p.model} ${finish?.nameFr ?? "(photo du modèle)"}: ${r}`);
  }
}

/** The model's color for a pick: same name, else same family, else created */
async function ensureFinish(productId: string, p: Pick & { color: string; family: ColorFamily; hex: string; exact?: boolean }) {
  const finishes = await prisma.finish.findMany({ where: { productId } });
  return (
    finishes.find((f) => f.nameFr.toLowerCase() === p.color.toLowerCase()) ??
    (p.exact ? undefined : finishes.find((f) => f.family === p.family)) ??
    prisma.finish.create({
      data: { productId, slug: slugify(p.color), nameFr: p.color, hex: p.hex, family: p.family, aliases: [], position: finishes.length },
    })
  );
}
