import Link from "next/link";
import type { Metadata } from "next";
import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";
import { FULFILLMENT_LABELS, ORDER_STATUS_LABELS, ORDER_STATUS_TONE, cn, formatDateTime, formatPhone } from "@/lib/utils";
import OrderActions from "./OrderActions";
import type { ShippingAddress } from "@/types";

export const metadata: Metadata = { title: "Commandes" };

const FILTERS: (OrderStatus | "ALL")[] = ["ALL", "PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "DISPUTED", "CANCELLED"];

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const filter = FILTERS.includes(status as OrderStatus) ? (status as OrderStatus) : undefined;
  const orders = await prisma.order.findMany({
    where: filter ? { status: filter } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { buyer: true, items: { include: { vendor: { select: { storeName: true, partnerCode: true } } } } },
  });

  return (
    <>
      <h1 className="page-title">Commandes</h1>
      <nav className="flex flex-wrap gap-2" aria-label="Filtrer">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "ALL" ? "/admin/orders" : `/admin/orders?status=${f}`}
            className={cn("rounded-full px-3.5 py-2 text-sm", (f === "ALL" ? !filter : filter === f) ? "bg-ink text-white" : "bg-white ring-1 ring-line hover:ring-line-strong")}
          >
            {f === "ALL" ? "Toutes" : ORDER_STATUS_LABELS[f]}
          </Link>
        ))}
      </nav>
      <div className="flex flex-col gap-3">
        {orders.length === 0 && <p className="rounded-panel border border-line bg-white p-6 text-ink-muted">Aucune commande.</p>}
        {orders.map((o) => {
          const a = o.shippingAddress as ShippingAddress;
          return (
            <article key={o.id} className="flex flex-col gap-3 rounded-panel border border-line bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2.5">
                    <b className="text-[17px] font-semibold">{o.number}</b>
                    <span className={cn("pill", ORDER_STATUS_TONE[o.status])}>{ORDER_STATUS_LABELS[o.status]}</span>
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">
                    {formatDateTime(o.createdAt)}, {a.fullName} ({formatPhone(a.phone)}), {a.line}{a.delegation ? `, ${a.delegation}` : ""}, {a.governorate}
                  </p>
                  {o.notes && <p className="mt-1 text-sm">Note du client : {o.notes}</p>}
                </div>
                <div className="text-right">
                  <b className="text-lg font-semibold">{formatPrice(o.totalMillimes)}</b>
                  <p className="text-[13px] text-ink-muted">à encaisser</p>
                </div>
              </div>
              <ul className="flex flex-col gap-1.5 text-sm">
                {o.items.map((i) => (
                  <li key={i.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-chalk px-3 py-2">
                    <span>{i.title}, {i.configLabel}</span>
                    <span className="text-ink-muted">{i.vendor.storeName} ({i.vendor.partnerCode}), {FULFILLMENT_LABELS[i.fulfillmentStatus]}</span>
                  </li>
                ))}
              </ul>
              <OrderActions id={o.id} status={o.status} />
            </article>
          );
        })}
      </div>
    </>
  );
}
