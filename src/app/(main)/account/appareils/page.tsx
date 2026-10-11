import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DeviceVisual from "@/components/products/DeviceVisual";
import { GRADES } from "@/lib/catalog";
import { addMonths, formatDate, monthsBetween } from "@/lib/utils";

export const metadata: Metadata = { title: "Mes appareils" };

export default async function DevicesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login?redirect=/account/appareils");

  const items = await prisma.orderItem.findMany({
    where: { order: { buyerId: user.id }, fulfillmentStatus: "DELIVERED" },
    orderBy: { order: { deliveredAt: "desc" } },
    include: {
      order: { select: { number: true, deliveredAt: true, createdAt: true } },
      offer: {
        select: {
          imei: true,
          variant: {
            select: {
              finish: { select: { hex: true, images: { where: { status: "APPROVED", angle: "FRONT" }, orderBy: { position: "asc" }, take: 1, select: { key: true } } } },
              product: { select: { kind: true, cameraCount: true, coverKey: true } },
            },
          },
        },
      },
    },
  });
  const inTransit = await prisma.orderItem.count({
    where: { order: { buyerId: user.id, status: { in: ["PENDING", "CONFIRMED", "SHIPPED"] } } },
  });
  const now = new Date();

  return (
    <>
      <h1 className="page-title">Mes appareils</h1>
      <p className="-mt-1.5 text-[15px] text-ink-muted">
        La garantie Bonétat suit chaque appareil acheté ici. Une panne ? Déclarez-la, on organise l’enlèvement.
      </p>
      {items.map((item) => {
        const start = item.order.deliveredAt ?? item.order.createdAt;
        const end = addMonths(start, item.warrantyMonths);
        const left = end > now ? monthsBetween(now, end) : 0;
        const pct = Math.max(0, Math.min(100, Math.round(((end.getTime() - now.getTime()) / (end.getTime() - start.getTime())) * 100)));
        const kind = item.offer.variant.product.kind;
        const imei = item.offer.imei;
        return (
          <article key={item.id} className="flex flex-wrap items-center gap-[26px] rounded-panel border border-line bg-white p-6">
            <span className="grid h-[190px] w-[150px] flex-none place-items-center overflow-hidden rounded-panel bg-brand">
              <DeviceVisual
                imageKey={item.offer.variant.finish.images[0]?.key ?? item.offer.variant.product.coverKey}
                kind={kind}
                colorHex={item.offer.variant.finish.hex}
                cameras={item.offer.variant.product.cameraCount}
                artWidth={kind === "PHONE" ? 88 : kind === "LAPTOP" ? 130 : 90}
                artClassName={kind === "PHONE" ? "translate-y-[30px] -rotate-[8deg]" : undefined}
                alt={item.title}
                sizes="150px"
              />
            </span>
            <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-3.5">
              <div>
                <b className="text-xl font-semibold">{item.title}, {item.configLabel}</b>
                <p className="text-sm text-ink-muted">
                  {GRADES[item.grade].line}
                  {imei ? `, IMEI ${imei.slice(0, 2)} •••• •••• ${imei.slice(-4)}` : ""}, livré le {formatDate(start)}
                </p>
              </div>
              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span>Garantie Bonétat</span>
                  <b className="font-semibold">{left > 0 ? `${left} mois restant${left > 1 ? "s" : ""}` : end > now ? "Moins d’un mois" : "Terminée"}</b>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-brand-tint">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1.5 text-[13px] text-ink-muted">{end > now ? `Couvert jusqu’au ${formatDate(end)}` : `Garantie terminée le ${formatDate(end)}`}</p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {end > now && (
                  <Link href={`/contact?sujet=panne&commande=${item.order.number}`} className="btn-primary btn-sm">Déclarer une panne</Link>
                )}
                <Link href={`/account/orders/${item.orderId}`} className="btn-secondary btn-sm">Voir la commande</Link>
              </div>
            </div>
          </article>
        );
      })}
      {items.length === 0 && (
        <div className="rounded-panel border border-dashed border-line-strong bg-white p-8 text-[15px] text-ink-muted">
          Vos appareils apparaîtront ici dès leur livraison, avec leur garantie de 12 mois.
        </div>
      )}
      {inTransit > 0 && items.length > 0 && (
        <p className="rounded-panel border border-dashed border-line-strong bg-white px-6 py-5 text-[15px] text-ink-muted">
          {inTransit === 1 ? "L’appareil en cours de livraison apparaîtra" : `Les ${inTransit} appareils en cours de livraison apparaîtront`} ici dès réception, avec sa garantie de 12 mois.
        </p>
      )}
    </>
  );
}
