import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, Phone } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";
import { FULFILLMENT_LABELS, ORDER_STATUS_LABELS, ORDER_STATUS_TONE, cn, formatDateTime, formatShortDate } from "@/lib/utils";
import { OrderItemRow, OrderTimeline, orderHeadline, orderItemInclude, toItemView } from "@/components/account/OrderParts";
import ReviewPrompt from "@/components/account/ReviewPrompt";
import CancelOrderButton from "@/components/account/CancelOrderButton";
import type { ShippingAddress } from "@/types";

export const metadata: Metadata = { title: "Suivi de commande" };

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const user = await getSessionUser();
  const { id } = await params;
  const { placed } = await searchParams;
  if (!user) redirect(`/auth/login?redirect=/account/orders/${id}`);

  const order = await prisma.order.findFirst({
    where: { id, buyerId: user.id },
    include: { items: { include: orderItemInclude } },
  });
  if (!order) notFound();
  const address = order.shippingAddress as ShippingAddress;
  const subtotal = order.items.reduce((s, i) => s + i.priceMillimes, 0);
  // Items ship from different workshops — say how many parcels, never from whom
  const parcels = new Set(order.items.map((i) => i.vendorId)).size;

  return (
    <>
      <Link href="/account" className="text-sm text-ink-muted hover:text-ink">Toutes mes commandes</Link>
      {placed && (
        <div role="status" className="flex items-start gap-3.5 rounded-[24px] bg-gain-tint p-5 text-[#0B5F33]">
          <CheckCircle2 className="h-6 w-6 flex-none" aria-hidden="true" />
          <div>
            <b className="text-[17px] font-semibold">Commande {order.number} enregistrée</b>
            <p className="mt-1 text-sm">Bonétat vous appelle dans la journée pour la confirmer. Vous payez au livreur, après avoir vérifié l’appareil.</p>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">{orderHeadline(order.status, address, order.deliveredAt)}</h1>
          <p className="mt-1 text-sm text-ink-muted">Commande {order.number}, passée le {formatDateTime(order.createdAt)}</p>
        </div>
        <span className={cn("pill", ORDER_STATUS_TONE[order.status])}>{ORDER_STATUS_LABELS[order.status]}</span>
      </div>

      <article className="flex flex-col gap-5 rounded-[28px] border border-line bg-white p-6">
        <OrderTimeline status={order.status} />
        {parcels > 1 && order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
          <p className="text-sm text-ink-muted">Votre commande arrive en {parcels} colis, préparés par des ateliers différents.</p>
        )}
        {order.items.map((item) => (
          <div key={item.id} className="flex flex-col gap-3 border-t border-line-soft pt-4 first-of-type:border-0 first-of-type:pt-0">
            <OrderItemRow item={toItemView(item)} />
            {order.status !== "CANCELLED" && order.status !== "DELIVERED" && (
              <p className="text-[13px] text-ink-muted">
                {FULFILLMENT_LABELS[item.fulfillmentStatus]}
                {item.shippedAt ? ` le ${formatShortDate(item.shippedAt)}` : ""}
              </p>
            )}
            {order.status === "DELIVERED" && !item.review && <ReviewPrompt orderItemId={item.id} />}
            {item.review && <p className="text-sm text-ink-muted">Vous avez noté cet achat {item.review.rating} sur 5.</p>}
          </div>
        ))}
      </article>

      <div className="flex flex-wrap gap-[18px]">
        <section className="flex-[1_1_300px] rounded-[28px] border border-line bg-white p-6 text-[15px] leading-relaxed">
          <h2 className="mb-2 text-base font-semibold">Livraison</h2>
          {address.fullName}, {address.phone}
          <br />
          {address.line}
          {address.delegation ? `, ${address.delegation}` : ""}
          <br />
          {address.governorate}
          {address.notes && <p className="mt-2 text-sm text-ink-muted">{address.notes}</p>}
        </section>
        <section className="flex-[1_1_300px] rounded-[28px] border border-line bg-white p-6">
          <h2 className="mb-3 text-base font-semibold">Paiement à la livraison</h2>
          <dl className="flex flex-col gap-2 text-[15px]">
            <div className="flex justify-between"><dt className="text-ink-muted">Articles</dt><dd>{formatPrice(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-muted">Livraison</dt><dd>{formatPrice(order.shippingFeeMillimes)}</dd></div>
            <div className="flex justify-between border-t border-line pt-2.5 text-lg font-semibold"><dt>Total</dt><dd>{formatPrice(order.totalMillimes)}</dd></div>
          </dl>
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {(order.status === "PENDING" || order.status === "CONFIRMED") && <CancelOrderButton orderId={order.id} />}
        <Link href="/contact" className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline">
          <Phone className="h-4 w-4" aria-hidden="true" />
          Une question ? Contactez Bonétat
        </Link>
      </div>
    </>
  );
}
