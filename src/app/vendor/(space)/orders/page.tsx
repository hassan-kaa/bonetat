import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getVendorUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GRADES } from "@/lib/catalog";
import { formatPrice } from "@/lib/money";
import { FULFILLMENT_LABELS, cn, formatDateTime, formatShortDate } from "@/lib/utils";
import ShipButton from "./ShipButton";
import type { ShippingAddress } from "@/types";

export const metadata: Metadata = { title: "Commandes à expédier" };

export default async function VendorOrdersPage() {
  const auth = await getVendorUser();
  if (!auth) redirect("/vendor/apply");
  const { vendor } = auth;

  const [open, history] = await Promise.all([
    prisma.orderItem.findMany({
      where: { vendorId: vendor.id, fulfillmentStatus: "PENDING", order: { status: { in: ["PENDING", "CONFIRMED"] } } },
      include: { order: true, offer: { select: { imei: true } } },
      orderBy: { order: { createdAt: "asc" } },
    }),
    prisma.orderItem.findMany({
      where: { vendorId: vendor.id, fulfillmentStatus: { in: ["SHIPPED", "DELIVERED", "CANCELLED"] } },
      include: { order: true },
      orderBy: { order: { createdAt: "desc" } },
      take: 20,
    }),
  ]);

  return (
    <>
      <h1 className="page-title">Commandes à expédier</h1>
      <p className="-mt-2 text-[15px] text-ink-muted">
        Emballez avec le bon Bonétat : le client ne doit voir aucune marque d’atelier. Expédiez sous 24 h après la confirmation.
      </p>

      <div className="overflow-x-auto rounded-panel border border-line bg-white">
        {open.length === 0 ? (
          <p className="p-8 text-center text-[15px] text-ink-muted">Rien à expédier. Les nouvelles commandes apparaissent ici dès que Bonétat les confirme.</p>
        ) : (
          <table className="tbl min-w-[820px]">
            <thead>
              <tr><th>Commande</th><th>Appareil</th><th>Livraison</th><th>Statut</th><th className="text-right">Action</th></tr>
            </thead>
            <tbody>
              {open.map((item) => {
                const address = item.order.shippingAddress as ShippingAddress;
                const confirmed = item.order.status === "CONFIRMED";
                return (
                  <tr key={item.id}>
                    <td>
                      <b className="font-semibold">{item.order.number}</b>
                      <br />
                      <span className="text-[13px] text-ink-muted">{formatDateTime(item.order.createdAt)}</span>
                    </td>
                    <td>
                      {item.title}
                      <br />
                      <span className="text-[13px] text-ink-muted">
                        {item.configLabel}, {GRADES[item.grade].label}
                        {item.batteryHealth ? `, ${item.batteryHealth} %` : ""}
                        {item.offer.imei ? `, IMEI …${item.offer.imei.slice(-4)}` : ""}
                      </span>
                    </td>
                    <td>
                      {address.governorate}
                      <br />
                      <span className="text-[13px] text-ink-muted">À encaisser {formatPrice(item.priceMillimes)}</span>
                    </td>
                    <td>
                      <span className={cn("pill", confirmed ? "bg-pop-tint text-pop-dark" : "bg-amber-50 text-amber-800")}>
                        {confirmed ? "Avant 18 h" : "Attend la confirmation Bonétat"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-right">
                      {confirmed ? (
                        <span className="inline-flex gap-2">
                          <Link href={`/vendor/orders/${item.id}/bon`} target="_blank" className="btn-secondary btn-sm">Imprimer le bon</Link>
                          <ShipButton itemId={item.id} />
                        </span>
                      ) : (
                        <span className="text-[13px] text-ink-muted">Ne pas expédier encore</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {history.length > 0 && (
        <>
          <h2 className="mt-4 text-lg font-semibold">Dernières expéditions</h2>
          <div className="overflow-x-auto rounded-panel border border-line bg-white">
            <table className="tbl min-w-[640px]">
              <thead><tr><th>Commande</th><th>Appareil</th><th>Montant</th><th>Statut</th></tr></thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id}>
                    <td>{item.order.number}<br /><span className="text-[13px] text-ink-muted">{formatShortDate(item.order.createdAt)}</span></td>
                    <td>{item.title}<br /><span className="text-[13px] text-ink-muted">{item.configLabel}</span></td>
                    <td>{formatPrice(item.priceMillimes)}</td>
                    <td>
                      <span className={cn("pill", item.fulfillmentStatus === "DELIVERED" ? "bg-gain-tint text-gain" : item.fulfillmentStatus === "CANCELLED" ? "bg-slate-100 text-slate-600" : "bg-brand-tint text-brand-dark")}>
                        {FULFILLMENT_LABELS[item.fulfillmentStatus]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
