import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE, cn, formatShortDate } from "@/lib/utils";
import { OrderItemRow, OrderTimeline, orderHeadline, orderItemInclude, toItemView } from "@/components/account/OrderParts";
import ReviewPrompt from "@/components/account/ReviewPrompt";
import CancelOrderButton from "@/components/account/CancelOrderButton";
import type { ShippingAddress } from "@/types";

export const metadata: Metadata = { title: "Mes commandes" };


export default async function OrdersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login?redirect=/account");
  const orders = await prisma.order.findMany({
    where: { buyerId: user.id },
    orderBy: { createdAt: "desc" },
    include: { items: { include: orderItemInclude } },
  });

  return (
    <>
      <h1 className="page-title">Mes commandes</h1>
      {orders.length === 0 && (
        <div className="rounded-panel border border-dashed border-line-strong bg-white p-8 text-center">
          <p className="text-lg font-medium">Pas encore de commande.</p>
          <p className="mt-1.5 text-ink-muted">Vos achats apparaîtront ici, avec leur suivi et leur garantie.</p>
          <Link href="/catalog" className="btn-primary btn-sm mt-5">Trouver un appareil</Link>
        </div>
      )}
      {orders.map((order) => {
        const address = order.shippingAddress as ShippingAddress;
        const open = order.status === "PENDING" || order.status === "CONFIRMED" || order.status === "SHIPPED";
        return (
          <article key={order.id} className="flex flex-col gap-5 rounded-panel border border-line bg-white p-6">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <b className="text-[17px] font-semibold">{orderHeadline(order.status, address, order.deliveredAt)}</b>
                <p className="text-sm text-ink-muted">Commande {order.number}, passée le {formatShortDate(order.createdAt)}</p>
              </div>
              <span className={cn("pill self-start", ORDER_STATUS_TONE[order.status])}>{ORDER_STATUS_LABELS[order.status]}</span>
            </div>
            <OrderTimeline status={order.status} />
            <div className="flex flex-col gap-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex flex-col gap-3">
                  <OrderItemRow item={toItemView(item)} />
                  {order.status === "DELIVERED" && !item.review && (
                    <div className="border-t border-line-soft pt-4">
                      <ReviewPrompt orderItemId={item.id} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            {open && (
              <div className="flex flex-wrap justify-between gap-2.5 rounded-panel bg-chalk px-[18px] py-4 text-sm">
                <span>
                  À payer au livreur, livraison comprise
                  <br />
                  <span className="text-ink-muted">Allumez l’appareil devant lui avant de payer.</span>
                </span>
                <b className="price text-[22px]">{formatPrice(order.totalMillimes)}</b>
              </div>
            )}
            <div className="flex flex-wrap gap-2.5">
              <Link href={`/account/orders/${order.id}`} className={open ? "btn-primary btn-sm" : "btn-secondary btn-sm"}>
                {open ? "Suivre la commande" : "Voir le détail"}
              </Link>
              {(order.status === "PENDING" || order.status === "CONFIRMED") && <CancelOrderButton orderId={order.id} />}
            </div>
          </article>
        );
      })}
    </>
  );
}
