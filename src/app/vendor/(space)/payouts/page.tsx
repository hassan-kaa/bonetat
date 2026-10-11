import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getVendorUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { COMMISSION_RATE, formatPrice } from "@/lib/money";
import { currentPeriod } from "@/lib/vendor";
import { cn, formatShortDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Paiements" };

export default async function PayoutsPage() {
  const auth = await getVendorUser();
  if (!auth) redirect("/vendor/apply");
  const { vendor } = auth;
  const period = currentPeriod();

  const [inPeriod, payouts] = await Promise.all([
    prisma.orderItem.findMany({
      where: { vendorId: vendor.id, fulfillmentStatus: "DELIVERED", order: { deliveredAt: { gte: period.start, lte: period.end } } },
      include: { order: { select: { number: true, deliveredAt: true } } },
      orderBy: { order: { deliveredAt: "desc" } },
    }),
    prisma.payout.findMany({ where: { vendorId: vendor.id }, orderBy: { createdAt: "desc" } }),
  ]);
  const gross = inPeriod.reduce((s, i) => s + i.priceMillimes, 0);
  const fee = inPeriod.reduce((s, i) => s + i.commissionMillimes, 0);
  const rib = vendor.rib ? `•••• ${vendor.rib.replace(/\s/g, "").slice(-4)}` : null;

  return (
    <>
      <h1 className="page-title">Paiements</h1>
      <p className="-mt-2 text-[15px] text-ink-muted">
        Le livreur encaisse, Bonétat retient sa commission ({Math.round(COMMISSION_RATE * 100)} %) et vous vire le reste tous les 15 jours
        {rib ? ` sur le RIB ${rib}` : ". Ajoutez votre RIB dans le profil de l’atelier"}.
      </p>

      <section className="flex flex-col gap-4 rounded-panel border border-line bg-white p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Période en cours, du {period.label}</h2>
            <p className="text-sm text-ink-muted">Virement prévu le {period.payDate}</p>
          </div>
          <b className="text-[30px] font-semibold tracking-[-0.03em]">{formatPrice(gross - fee)}</b>
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-2xl bg-chalk p-4"><dt className="text-ink-muted">Ventes livrées</dt><dd className="mt-1 text-lg font-semibold">{formatPrice(gross)}</dd></div>
          <div className="rounded-2xl bg-chalk p-4"><dt className="text-ink-muted">Commission Bonétat</dt><dd className="mt-1 text-lg font-semibold">{formatPrice(fee)}</dd></div>
          <div className="rounded-2xl bg-chalk p-4"><dt className="text-ink-muted">Appareils</dt><dd className="mt-1 text-lg font-semibold">{inPeriod.length}</dd></div>
        </dl>
        {inPeriod.length > 0 && (
          <div className="overflow-x-auto">
            <table className="tbl min-w-[560px]">
              <thead><tr><th>Commande</th><th>Appareil</th><th>Livrée le</th><th className="text-right">Net</th></tr></thead>
              <tbody>
                {inPeriod.map((i) => (
                  <tr key={i.id}>
                    <td>{i.order.number}</td>
                    <td>{i.title}<br /><span className="text-[13px] text-ink-muted">{i.configLabel}</span></td>
                    <td>{i.order.deliveredAt ? formatShortDate(i.order.deliveredAt) : "—"}</td>
                    <td className="text-right">{formatPrice(i.priceMillimes - i.commissionMillimes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <h2 className="mt-2 text-lg font-semibold">Virements précédents</h2>
      <div className="overflow-x-auto rounded-panel border border-line bg-white">
        {payouts.length === 0 ? (
          <p className="p-6 text-[15px] text-ink-muted">Votre premier virement apparaîtra ici.</p>
        ) : (
          <table className="tbl min-w-[640px]">
            <thead><tr><th>Période</th><th>Ventes livrées</th><th>Commission</th><th>Net viré</th><th>Statut</th></tr></thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id}>
                  <td>{p.period}</td>
                  <td>{formatPrice(p.grossMillimes)}</td>
                  <td>{p.commissionMillimes === 0 ? "Offerte" : formatPrice(p.commissionMillimes)}</td>
                  <td><b className="font-semibold">{formatPrice(p.netMillimes)}</b></td>
                  <td>
                    <span className={cn("pill", p.status === "PAID" ? "bg-gain-tint text-gain" : "bg-amber-50 text-amber-800")}>
                      {p.status === "PAID" ? `Viré${p.paidAt ? ` le ${formatShortDate(p.paidAt)}` : ""}` : p.status === "PROCESSING" ? "En cours" : "Prévu"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
