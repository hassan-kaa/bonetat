import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/** BN-20418 style references. Random to avoid leaking order volume. */
export async function newOrderNumber(tx: Prisma.TransactionClient = prisma): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const n = `BN-${Math.floor(10000 + Math.random() * 90000)}`;
    const exists = await tx.order.findUnique({ where: { number: n }, select: { id: true } });
    if (!exists) return n;
  }
  return `BN-${Date.now().toString().slice(-7)}`;
}

/**
 * Keep the order's status in step with its items: when every partner shipped, the order is "En route";
 * when every item is delivered, it is delivered.
 */
export async function syncOrderStatus(orderId: string, tx: Prisma.TransactionClient = prisma) {
  const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order || order.status === "CANCELLED" || order.status === "DISPUTED") return;
  const live = order.items.filter((i) => i.fulfillmentStatus !== "CANCELLED");
  if (live.length === 0) return;
  if (live.every((i) => i.fulfillmentStatus === "DELIVERED")) {
    await tx.order.update({ where: { id: orderId }, data: { status: "DELIVERED", deliveredAt: order.deliveredAt ?? new Date() } });
  } else if (live.every((i) => i.fulfillmentStatus !== "PENDING") && order.status !== "SHIPPED") {
    await tx.order.update({ where: { id: orderId }, data: { status: "SHIPPED" } });
  }
}
