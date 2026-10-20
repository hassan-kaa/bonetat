import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getVendorUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { displayName, variantLabel } from "@/lib/catalog";
import { competitorPrices, priceKey } from "@/lib/vendor";
import OffersTable, { type OfferRow } from "./OffersTable";

export const metadata: Metadata = { title: "Mes offres" };

export default async function VendorListingsPage() {
  const auth = await getVendorUser();
  if (!auth) redirect("/vendor/apply");
  const { vendor } = auth;

  const [offers, competitors] = await Promise.all([
    prisma.offer.findMany({
      where: { vendorId: vendor.id, status: { notIn: ["DRAFT", "WITHDRAWN"] } },
      include: { variant: { include: { product: true, finish: true } } },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    }),
    competitorPrices(vendor.id),
  ]);

  const rows: OfferRow[] = offers.map((o) => ({
    id: o.id,
    name: displayName(o.variant.product),
    config: variantLabel(o.variant, o.variant.product.kind),
    grade: o.conditionGrade,
    batteryHealth: o.batteryHealth,
    priceMillimes: o.priceMillimes,
    status: o.status,
    rejectionReason: o.rejectionReason,
    competitorMillimes: competitors.get(priceKey(o.variantId, o.conditionGrade)) ?? null,
    href: `/products/${o.variant.product.slug}?v=${o.variantId}&g=${o.conditionGrade}`,
  }));

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Mes offres</h1>
          <p className="mt-1.5 text-[15px] text-ink-muted">Une offre = un appareil. Changez un prix directement dans le tableau, les acheteurs voient le changement tout de suite. Plusieurs appareils identiques ? Utilisez « Dupliquer ».</p>
        </div>
        <Link href="/vendor/listings/new" className="btn-primary">Publier une offre</Link>
      </div>
      <OffersTable rows={rows} />
    </>
  );
}
