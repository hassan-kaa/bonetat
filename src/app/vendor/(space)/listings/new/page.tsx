import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getVendorUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { displayName } from "@/lib/catalog";
import { competitorPrices } from "@/lib/vendor";
import PublishFlow from "./PublishFlow";
import type { BrandOption, CatalogProduct } from "./types";

export const metadata: Metadata = { title: "Publier une offre" };

export default async function NewOfferPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const auth = await getVendorUser();
  if (!auth) redirect("/vendor/apply");
  const { from } = await searchParams;

  const [products, brands, competitors, source] = await Promise.all([
    // Quick picks: the models this store already sells. Everything else is one search away.
    prisma.product.findMany({
      where: { status: { not: "MERGED" }, variants: { some: { offers: { some: { vendorId: auth.vendor.id } } } } },
      orderBy: { updatedAt: "desc" },
      take: 12,
      include: { category: true, finishes: { orderBy: { position: "asc" }, take: 1 } },
    }),
    prisma.brand.findMany({ orderBy: { position: "asc" }, include: { lines: { where: { approved: true }, orderBy: { name: "asc" } } } }),
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
    colorHex: p.finishes[0]?.hex ?? "#999",
  }));
  const brandOptions: BrandOption[] = brands.map((b) => ({ name: b.name, lines: b.lines.map((l) => l.name) }));
  const prefill = source
    ? { productId: source.variant.productId, variantId: source.variantId, grade: source.conditionGrade, priceMillimes: source.priceMillimes, sellerNote: source.sellerNote }
    : null;

  return (
    <>
      <h1 className="page-title">{prefill ? "Publier un appareil identique" : "Publier une offre"}</h1>
      <p className="-mt-2 text-[15px] text-ink-muted">
        Collez votre annonce Facebook ou Instagram : on remplit le formulaire pour vous. Photos et fiche technique viennent du catalogue Bonétat.
      </p>
      <PublishFlow recent={catalog} brands={brandOptions} competitors={Object.fromEntries(competitors)} prefill={prefill} />
    </>
  );
}
