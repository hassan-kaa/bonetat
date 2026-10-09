import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";
import { SELLABLE } from "@/lib/queries";

export const metadata: Metadata = { title: "Administration" };

export default async function AdminHome() {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [toConfirm, toReview, toApprove, live, delivered, disputes] = await Promise.all([
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.offer.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.vendor.count({ where: { status: "PENDING" } }),
    prisma.offer.count({ where: SELLABLE }),
    prisma.order.findMany({ where: { status: "DELIVERED", deliveredAt: { gte: monthStart } }, select: { totalMillimes: true, shippingFeeMillimes: true, items: { select: { commissionMillimes: true } } } }),
    prisma.order.count({ where: { status: "DISPUTED" } }),
  ]);
  const gmv = delivered.reduce((s, o) => s + o.totalMillimes - o.shippingFeeMillimes, 0);
  const commission = delivered.reduce((s, o) => s + o.items.reduce((x, i) => x + i.commissionMillimes, 0), 0);

  const todo = [
    { href: "/admin/orders?status=PENDING", n: toConfirm, label: "commandes à confirmer par téléphone" },
    { href: "/admin/listings", n: toReview, label: "offres à contrôler" },
    { href: "/admin/vendors", n: toApprove, label: "ateliers candidats" },
    { href: "/admin/orders?status=DISPUTED", n: disputes, label: "réclamations ouvertes" },
  ];

  return (
    <>
      <h1 className="page-title">Vue d’ensemble</h1>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
        <div className="rounded-[24px] border border-line bg-white p-5"><span className="text-[13px] text-ink-muted">Ventes livrées ce mois</span><b className="mt-1.5 block text-[28px] font-semibold tracking-[-0.03em]">{formatPrice(gmv)}</b><span className="text-[13px] text-ink-muted">{delivered.length} commandes</span></div>
        <div className="rounded-[24px] border border-line bg-white p-5"><span className="text-[13px] text-ink-muted">Commission ce mois</span><b className="mt-1.5 block text-[28px] font-semibold tracking-[-0.03em]">{formatPrice(commission)}</b></div>
        <div className="rounded-[24px] border border-line bg-white p-5"><span className="text-[13px] text-ink-muted">Offres en ligne</span><b className="mt-1.5 block text-[28px] font-semibold tracking-[-0.03em]">{live}</b></div>
      </div>
      <section className="rounded-[26px] border border-line bg-white p-6">
        <h2 className="mb-3 text-lg font-semibold">À faire</h2>
        <ul className="flex flex-col divide-y divide-line-soft">
          {todo.map((t) => (
            <li key={t.href}>
              <Link href={t.href} className="flex items-center justify-between gap-3 py-3 text-[15px] hover:text-brand">
                <span><b className="font-semibold">{t.n}</b> {t.label}</span>
                <span className="text-sm text-brand">Ouvrir</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
