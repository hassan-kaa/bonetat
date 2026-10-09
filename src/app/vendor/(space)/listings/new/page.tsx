import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getVendorUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { displayName } from "@/lib/catalog";
import { competitorPrices } from "@/lib/vendor";
import PublishFlow, { type CatalogProduct } from "./PublishFlow";

export const metadata: Metadata = { title: "Publier une offre" };

export default async function NewOfferPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const auth = await getVendorUser();
  if (!auth) redirect("/vendor/apply");
  const { from } = await searchParams;

  const [products, competitors, source] = await Promise.all([
    prisma.product.findMany({
      orderBy: [{ category: { position: "asc" } }, { brand: "asc" }, { seriesOrder: "asc" }, { model: "asc" }],
      include: { category: true, variants: { orderBy: { position: "asc" }, include: { finish: true } } },
    }),
    competitorPrices(auth.vendor.id),
    // "Dupliquer": start from one of the partner's own offers. Battery and IMEI are per unit, so never copied.
    from
      ? prisma.offer.findFirst({
          where: { id: from, vendorId: auth.vendor.id },
          select: { variantId: true, conditionGrade: true, priceMillimes: true, sellerNote: true, variant: { select: { productId: true } } },
        })
      : Promise.resolve(null),
  ]);

  const catalog: CatalogProduct[] = products.map((p) => ({
    id: p.id,
    name: displayName(p),
    category: p.category.nameFr,
    kind: p.kind,
    cameras: p.cameraCount,
    variants: p.variants.map((v) => ({
      id: v.id, storageGb: v.storageGb, ramGb: v.ramGb, option: v.option, finishId: v.finishId, finish: { nameFr: v.finish.nameFr }, colorHex: v.finish.hex,
    })),
  }));
  const prefill = source
    ? { productId: source.variant.productId, variantId: source.variantId, grade: source.conditionGrade, priceMillimes: source.priceMillimes, sellerNote: source.sellerNote }
    : null;

  return (
    <>
      <h1 className="page-title">{prefill ? "Publier un appareil identique" : "Publier une offre"}</h1>
      <p className="-mt-2 text-[15px] text-ink-muted">
        Photos, description et fiche technique viennent du catalogue Bonétat. Vous ne renseignez que l’appareil que vous avez en main.
      </p>
      <PublishFlow catalog={catalog} competitors={Object.fromEntries(competitors)} prefill={prefill} />
    </>
  );
}
