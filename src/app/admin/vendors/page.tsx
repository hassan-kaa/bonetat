import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatPhone, cn, formatShortDate } from "@/lib/utils";
import VendorActions from "./VendorActions";

export const metadata: Metadata = { title: "Ateliers partenaires" };

const TONE = { APPROVED: "bg-gain-tint text-gain", PENDING: "bg-amber-50 text-amber-800", SUSPENDED: "bg-pop-tint text-pop-dark" } as const;
const LABEL = { APPROVED: "Partenaire", PENDING: "Candidat", SUSPENDED: "Suspendu" } as const;

export default async function AdminVendors() {
  const vendors = await prisma.vendor.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { user: true, _count: { select: { offers: { where: { status: "ACTIVE" } }, orderItems: true } } },
  });
  return (
    <>
      <h1 className="page-title">Ateliers partenaires</h1>
      <div className="flex flex-col gap-3">
        {vendors.map((v) => (
          <article key={v.id} className="flex flex-wrap items-start gap-5 rounded-[24px] border border-line bg-white p-5">
            <div className="min-w-0 flex-[1_1_320px]">
              <div className="flex flex-wrap items-center gap-2.5">
                <b className="text-lg font-semibold">{v.storeName}</b>
                <span className={cn("pill", TONE[v.status])}>{LABEL[v.status]}</span>
                {v.partnerCode && <span className="text-[13px] text-ink-muted">{v.partnerCode}</span>}
              </div>
              <p className="mt-1 text-sm text-ink-muted">
                {v.contactName ?? v.user.name}, {formatPhone(v.phone ?? v.user.phone)}{v.pickupAddress ? `, ${v.pickupAddress}` : ""}
              </p>
              {v.description && <p className="mt-2 max-w-[60em] text-sm leading-relaxed text-ink-soft">{v.description}</p>}
              <p className="mt-2 text-[13px] text-ink-muted">
                Depuis le {formatShortDate(v.createdAt)}, {v._count.offers} offres en ligne, {v._count.orderItems} ventes
                {v.rating ? `, note ${v.rating.toFixed(1)}/5` : ""}{v.legalName ? `, ${v.legalName}` : ""}{v.taxId ? `, MF ${v.taxId}` : ""}
              </p>
            </div>
            <VendorActions id={v.id} status={v.status} qualityScore={v.qualityScore} />
          </article>
        ))}
      </div>
    </>
  );
}
