import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getVendorUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GRADES, displayName, variantLabel } from "@/lib/catalog";
import EditOffer from "./EditOffer";
import SuggestSpecs from "./SuggestSpecs";
import OfferPhotos from "./OfferPhotos";
import DeleteOffer from "../DeleteOffer";

export const metadata: Metadata = { title: "Modifier l’offre" };

export default async function EditOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await getVendorUser();
  if (!auth) redirect("/vendor/apply");
  const { id } = await params;
  const offer = await prisma.offer.findFirst({
    where: { id, vendorId: auth.vendor.id, status: { not: "WITHDRAWN" } },
    include: { variant: { include: { product: true, finish: true } }, photos: { orderBy: { position: "asc" }, select: { id: true, key: true } } },
  });
  if (!offer) notFound();
  const p = offer.variant.product;

  return (
    <>
      <Link href="/vendor/listings" className="text-sm text-ink-muted hover:text-ink">Mes offres</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="page-title">{displayName(p)}</h1>
        {offer.status !== "SOLD" && <DeleteOffer offerId={offer.id} name={displayName(p)} afterDelete="/vendor/listings" />}
      </div>
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
          grade: offer.conditionGrade,
          batteryHealth: offer.batteryHealth,
          imei: offer.imei,
          kind: p.kind,
        }}
      />
      <p className="text-[13px] text-ink-muted">L’état et la batterie ne se modifient que si Bonétat demande une correction. Pour un autre appareil, publiez une nouvelle offre.</p>
      <OfferPhotos offerId={offer.id} photos={offer.photos} editable={offer.status !== "SOLD"} />
      <SuggestSpecs productId={p.id} specs={Array.isArray(p.specsJson) ? (p.specsJson as [string, string][]) : []} />
    </>
  );
}
