import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { GRADES, displayName, variantLabel } from "@/lib/catalog";
import { formatPrice } from "@/lib/money";
import { SELLABLE } from "@/lib/queries";
import { formatDateTime } from "@/lib/utils";
import ListingActions from "./ListingActions";

export const metadata: Metadata = { title: "Offres à contrôler" };

export default async function AdminListings() {
  const pending = await prisma.offer.findMany({
    where: { status: "PENDING_REVIEW" },
    orderBy: { createdAt: "asc" },
    include: { vendor: true, variant: { include: { product: true, finish: true } } },
  });
  // Market reference for each pending config: the current best live price
  const refs = await prisma.offer.findMany({
    where: { ...SELLABLE, OR: pending.map((p) => ({ variantId: p.variantId, conditionGrade: p.conditionGrade })) },
    select: { variantId: true, conditionGrade: true, priceMillimes: true },
  });
  const best = (variantId: string, grade: string) =>
    refs.filter((r) => r.variantId === variantId && r.conditionGrade === grade).reduce<number | null>((m, r) => (m === null || r.priceMillimes < m ? r.priceMillimes : m), null);

  return (
    <>
      <h1 className="page-title">Offres à contrôler</h1>
      <p className="-mt-2 text-[15px] text-ink-muted">Vérifiez que l’état annoncé respecte la grille (batterie minimale, IMEI) avant la mise en ligne.</p>
      <div className="overflow-x-auto rounded-[26px] border border-line bg-white">
        {pending.length === 0 ? (
          <p className="p-8 text-center text-[15px] text-ink-muted">Rien à contrôler.</p>
        ) : (
          <table className="tbl min-w-[980px]">
            <thead><tr><th>Atelier</th><th>Appareil</th><th>État annoncé</th><th>Prix</th><th>Marché</th><th>Reçue</th><th className="text-right">Décision</th></tr></thead>
            <tbody>
              {pending.map((o) => {
                const ref = best(o.variantId, o.conditionGrade);
                return (
                  <tr key={o.id}>
                    <td>{o.vendor.storeName}<br /><span className="text-[13px] text-ink-muted">{o.vendor.partnerCode}</span></td>
                    <td>{displayName(o.variant.product)}<br /><span className="text-[13px] text-ink-muted">{variantLabel(o.variant, o.variant.product.kind)}</span></td>
                    <td>
                      {GRADES[o.conditionGrade].label}
                      <br />
                      <span className="text-[13px] text-ink-muted">
                        {o.batteryHealth ? `Batterie ${o.batteryHealth} % (min ${GRADES[o.conditionGrade].minBattery})` : "Sans batterie"}
                        {o.imei ? `, IMEI ${o.imei}` : ""}
                      </span>
                    </td>
                    <td><b className="font-semibold">{formatPrice(o.priceMillimes)}</b></td>
                    <td className="text-[13px] text-ink-muted">{ref ? `Meilleur : ${formatPrice(ref)}` : "Aucune offre"}</td>
                    <td className="text-[13px] text-ink-muted">{formatDateTime(o.createdAt)}</td>
                    <td className="text-right"><ListingActions id={o.id} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
