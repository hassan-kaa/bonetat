import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getVendorUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GRADES } from "@/lib/catalog";
import { formatPrice } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { LogoMark } from "@/components/brand/Logo";
import PrintButton from "./PrintButton";
import type { ShippingAddress } from "@/types";

export const metadata: Metadata = { title: "Bon de livraison" };

/** Bonétat-branded packing slip. Carries no partner branding: only the internal partner code. */
export default async function PackingSlip({ params }: { params: Promise<{ id: string }> }) {
  const auth = await getVendorUser();
  if (!auth) redirect("/vendor/apply");
  const { id } = await params;
  const item = await prisma.orderItem.findFirst({
    where: { id, vendorId: auth.vendor.id },
    include: { order: { include: { items: { orderBy: { id: "asc" } } } } },
  });
  if (!item) notFound();

  const mine = item.order.items.filter((i) => i.vendorId === auth.vendor.id && i.fulfillmentStatus !== "CANCELLED");
  const carriesFee = item.order.items[0]?.vendorId === auth.vendor.id;
  const toCollect = mine.reduce((s, i) => s + i.priceMillimes, 0) + (carriesFee ? item.order.shippingFeeMillimes : 0);
  const a = item.order.shippingAddress as ShippingAddress;

  return (
    <div className="min-h-screen bg-white px-6 py-10 text-ink print:p-0">
      <div className="mx-auto flex max-w-[720px] flex-col gap-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <LogoMark className="h-11 w-11 rounded-[14px] text-2xl" />
            <div>
              <b className="text-2xl font-bold tracking-[-0.03em]">bonétat</b>
              <p className="text-sm text-ink-muted">Contrôlé et garanti par Bonétat</p>
            </div>
          </div>
          <div className="text-right text-sm">
            <b className="text-lg font-semibold">Bon de livraison</b>
            <p>Commande {item.order.number}</p>
            <p className="text-ink-muted">{formatDate(item.order.createdAt)}</p>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <section className="rounded-2xl border-2 border-ink p-5">
            <h2 className="mb-2 text-xs font-semibold text-ink-muted">Destinataire</h2>
            <p className="text-lg font-semibold">{a.fullName}</p>
            <p>{a.phone}</p>
            <p className="mt-2">{a.line}{a.delegation ? `, ${a.delegation}` : ""}</p>
            <p className="font-semibold">{a.governorate}</p>
            {a.notes && <p className="mt-2 text-sm">{a.notes}</p>}
          </section>
          <section className="rounded-2xl border-2 border-ink p-5">
            <h2 className="mb-2 text-xs font-semibold text-ink-muted">Paiement à la livraison</h2>
            <p className="text-sm">Montant à encaisser pour ce colis</p>
            <p className="text-[34px] font-semibold tracking-[-0.03em]">{formatPrice(toCollect)}</p>
            <p className="mt-1 text-xs text-ink-muted">Le client vérifie l’appareil avant de payer.</p>
          </section>
        </div>

        <table className="tbl">
          <thead><tr><th>Appareil</th><th>État</th><th className="text-right">Prix</th></tr></thead>
          <tbody>
            {mine.map((i) => (
              <tr key={i.id}>
                <td>{i.title}<br /><span className="text-[13px] text-ink-muted">{i.configLabel}</span></td>
                <td>{GRADES[i.grade].label}{i.batteryHealth ? `, batterie ${i.batteryHealth} %` : ""}</td>
                <td className="text-right">{formatPrice(i.priceMillimes)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="rounded-2xl bg-chalk p-5 text-sm leading-relaxed">
          <b>Garantie Bonétat 12 mois.</b> Une panne, une question : contactez Bonétat, jamais l’atelier. Retour gratuit sous 7 jours.
        </div>
        <p className="text-xs text-ink-muted">Réf. atelier {auth.vendor.partnerCode ?? "—"}</p>
        <PrintButton />
      </div>
    </div>
  );
}
