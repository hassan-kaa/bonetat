import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getVendorUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GRADES, displayName, variantLabel } from "@/lib/catalog";
import EditOffer from "./EditOffer";

export const metadata: Metadata = { title: "Modifier l’offre" };

export default async function EditOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await getVendorUser();
  if (!auth) redirect("/vendor/apply");
  const { id } = await params;
  const offer = await prisma.offer.findFirst({
    where: { id, vendorId: auth.vendor.id },
    include: { variant: { include: { product: true, finish: true } } },
  });
  if (!offer) notFound();
  const p = offer.variant.product;

  return (
    <>
      <Link href="/vendor/listings" className="text-sm text-ink-muted hover:text-ink">Mes offres</Link>
      <h1 className="page-title">{displayName(p)}</h1>
      <p className="-mt-2 text-[15px] text-ink-muted">
        {variantLabel(offer.variant, p.kind)}, {GRADES[offer.conditionGrade].label.toLowerCase()}
        {offer.batteryHealth ? `, batterie ${offer.batteryHealth} %` : ""}
        {offer.imei ? `, IMEI ${offer.imei}` : ""}
      </p>
      <EditOffer
        offer={{
          id: offer.id,
          priceMillimes: offer.priceMillimes,
          sellerNote: offer.sellerNote ?? "",
          status: offer.status,
          rejectionReason: offer.rejectionReason,
        }}
      />
      <p className="text-[13px] text-ink-muted">L’état et la batterie ne se modifient pas : pour un autre état, publiez une nouvelle offre, elle repassera en contrôle.</p>
    </>
  );
}
