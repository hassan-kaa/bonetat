import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { displayName } from "@/lib/catalog";
import { imageUrl } from "@/lib/image-url";
import ReviewGrid from "./ReviewGrid";

export const metadata: Metadata = { title: "Photos à vérifier" };
export const dynamic = "force-dynamic";

/**
 * Photos waiting for a look before going online: retailer visuals, which sometimes carry a promotion
 * only the eye catches ("+ Chargeur Offert"), and brand-site photos picked by file name (Huawei), where a
 * guessed name can bring the wrong shot. Apple's photos, named exactly, never come here.
 */
export default async function ReviewPage() {
  const images = await prisma.catalogImage.findMany({
    where: { status: "DRAFT", source: { in: ["RETAILER", "BRAND_SITE"] } },
    include: { product: { select: { brand: true, model: true } }, finish: { select: { nameFr: true, hex: true } } },
    orderBy: [{ product: { brand: "asc" } }, { product: { model: "asc" } }],
    take: 500,
  });
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="page-title">Photos à vérifier</h1>
        <p className="mt-1.5 max-w-[46em] text-[15px] text-ink-muted">
          Photos venues d’un revendeur ou choisies sur le site d’une marque. Rejetez avec ✕ celles qui montrent un cadeau, un pack, un texte promotionnel ou un autre appareil, puis validez le reste en une fois.
        </p>
      </div>
      <ReviewGrid
        images={images.map((i) => ({
          id: i.id,
          src: imageUrl(i.key, 400),
          full: imageUrl(i.key, 1600),
          model: displayName(i.product),
          color: i.finish?.nameFr ?? "Toutes couleurs",
          hex: i.finish?.hex ?? "#9AA0A6",
        }))}
      />
    </div>
  );
}
