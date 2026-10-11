import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getVendorUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";
import { SELLABLE } from "@/lib/queries";
import { competitorPrices, currentPeriod, priceKey } from "@/lib/vendor";

export const metadata: Metadata = { title: "Tableau de bord partenaire" };

const HOUR = 3_600_000;

export default async function VendorDashboard() {
  const auth = await getVendorUser();
  if (!auth) redirect("/vendor/apply");
  const { user, vendor } = auth;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const period = currentPeriod(now);

  const [monthItems, toShip, awaiting, shipped, allItems, myOffers, periodItems, competitors] = await Promise.all([
    prisma.orderItem.findMany({
      where: { vendorId: vendor.id, fulfillmentStatus: "DELIVERED", order: { deliveredAt: { gte: monthStart } } },
      select: { priceMillimes: true },
    }),
    prisma.orderItem.count({ where: { vendorId: vendor.id, fulfillmentStatus: "PENDING", order: { status: "CONFIRMED" } } }),
    prisma.orderItem.count({ where: { vendorId: vendor.id, fulfillmentStatus: "PENDING", order: { status: "PENDING" } } }),
    prisma.orderItem.findMany({
      where: { vendorId: vendor.id, shippedAt: { not: null } },
      select: { shippedAt: true, order: { select: { createdAt: true } } },
    }),
    prisma.orderItem.findMany({ where: { vendorId: vendor.id }, select: { fulfillmentStatus: true, order: { select: { status: true } } } }),
    prisma.offer.findMany({ where: { vendorId: vendor.id, ...SELLABLE }, select: { variantId: true, conditionGrade: true, priceMillimes: true } }),
    prisma.orderItem.findMany({
      where: { vendorId: vendor.id, fulfillmentStatus: "DELIVERED", order: { deliveredAt: { gte: period.start, lte: period.end } } },
      select: { priceMillimes: true, commissionMillimes: true },
    }),
    competitorPrices(vendor.id),
  ]);

  const monthSales = monthItems.reduce((s, i) => s + i.priceMillimes, 0);
  const monthUnits = monthItems.length;
  const nextPayout = periodItems.reduce((s, i) => s + i.priceMillimes - i.commissionMillimes, 0);

  // Quality breakdown, from real fulfilment data
  const fast = shipped.filter((s) => s.shippedAt!.getTime() - s.order.createdAt.getTime() <= 24 * HOUR).length;
  const fastPct = shipped.length ? Math.round((fast / shipped.length) * 100) : 100;
  const disputed = allItems.filter((i) => i.order.status === "DISPUTED").length;
  const conformPct = allItems.length ? Math.round(((allItems.length - disputed) / allItems.length) * 100) : 100;
  const cancelled = allItems.filter((i) => i.fulfillmentStatus === "CANCELLED" && i.order.status !== "CANCELLED").length;
  const keptPct = allItems.length ? Math.round(((allItems.length - cancelled) / allItems.length) * 100) : 100;

  const winning = myOffers.filter((o) => {
    const best = competitors.get(priceKey(o.variantId, o.conditionGrade));
    return best === undefined || o.priceMillimes <= best;
  }).length;

  const firstName = user.name?.split(" ")[0] ?? vendor.storeName;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Bonjour {firstName}</h1>
          <p className="mt-1.5 text-[15px] text-ink-muted">
            {toShip > 0
              ? `${toShip} article${toShip > 1 ? "s" : ""} à expédier aujourd’hui avant 18 h.`
              : "Rien à expédier pour l’instant."}
            {awaiting > 0 && ` ${awaiting} commande${awaiting > 1 ? "s" : ""} en attente de confirmation par Bonétat.`}
          </p>
        </div>
        <Link href="/vendor/listings/new" className="btn-primary">Publier une offre</Link>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
        <div className="rounded-panel border border-line bg-white p-5">
          <span className="text-[13px] text-ink-muted">Ventes livrées ce mois</span>
          <b className="mt-1.5 block text-[30px] font-semibold tracking-[-0.03em]">{formatPrice(monthSales)}</b>
          <span className="text-[13px] text-ink-muted">{monthUnits} appareil{monthUnits > 1 ? "s" : ""}</span>
        </div>
        <Link href="/vendor/orders" className="rounded-panel border border-line bg-white p-5 transition hover:border-line-strong">
          <span className="text-[13px] text-ink-muted">À expédier aujourd’hui</span>
          <b className="mt-1.5 block text-[30px] font-semibold tracking-[-0.03em]">{toShip}</b>
          <span className={toShip ? "text-[13px] text-pop-dark" : "text-[13px] text-ink-muted"}>{toShip ? "Avant 18 h" : "À jour"}</span>
        </Link>
        <div className="rounded-panel bg-brand p-5 text-white">
          <span className="text-[13px] opacity-85">Score qualité</span>
          <b className="mt-1.5 block text-[30px] font-semibold tracking-[-0.03em]">{vendor.qualityScore} / 100</b>
          <span className="text-[13px] opacity-85">Départage les prix égaux</span>
        </div>
        <Link href="/vendor/payouts" className="rounded-panel border border-line bg-white p-5 transition hover:border-line-strong">
          <span className="text-[13px] text-ink-muted">Prochain virement</span>
          <b className="mt-1.5 block text-[30px] font-semibold tracking-[-0.03em]">{formatPrice(nextPayout)}</b>
          <span className="text-[13px] text-ink-muted">Le {period.payDate}</span>
        </Link>
      </div>

      <div className="flex flex-wrap gap-3.5">
        <div className="flex-[1_1_360px] rounded-panel border border-line bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">Ce qui compose votre score</h2>
          {[
            ["Expédié en moins de 24 h", fastPct],
            ["État conforme à l’annonce", conformPct],
            ["Commandes honorées", keptPct],
          ].map(([label, pct]) => (
            <div key={label} className="mb-3.5">
              <div className="mb-1.5 flex justify-between text-sm"><span>{label}</span><b className="font-semibold">{pct} %</b></div>
              <div className="h-2 rounded-full bg-brand-tint"><div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} /></div>
            </div>
          ))}
        </div>
        <div className="flex flex-[1_1_300px] flex-col gap-3 rounded-panel bg-brand-tint p-6">
          <h2 className="text-lg font-semibold">Comment vous gagnez une vente</h2>
          <p className="text-sm leading-relaxed text-ink-soft">
            Les acheteurs voient Bonétat, jamais le nom de votre atelier. Pour chaque configuration et chaque état, la vente va au meilleur prix. À prix égal, elle va à l’atelier qui a le meilleur score qualité.
          </p>
          <p className="text-sm leading-relaxed text-ink-soft">
            Vous avez le meilleur prix sur <b>{winning} offre{winning > 1 ? "s" : ""} sur {myOffers.length}</b> en ligne.
          </p>
          <Link href="/vendor/listings" className="btn-secondary btn-sm self-start">Voir mes positions</Link>
        </div>
      </div>
    </>
  );
}
