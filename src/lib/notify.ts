import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

// Messages that appear live on whatever page the user has open (see /api/live and LiveUpdates).

type Db = Prisma.TransactionClient | typeof prisma;

export async function notify(userIds: (string | null | undefined)[], message: { title: string; href?: string }, db: Db = prisma) {
  const ids = [...new Set(userIds.filter((x): x is string => !!x))];
  if (ids.length) await db.notification.createMany({ data: ids.map((userId) => ({ userId, ...message })) });
}

export async function adminIds(db: Db = prisma) {
  return (await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } })).map((u) => u.id);
}

/** The user accounts behind these shops */
export async function vendorUserIds(vendorIds: string[], db: Db = prisma) {
  return (await db.vendor.findMany({ where: { id: { in: vendorIds } }, select: { userId: true } })).map((v) => v.userId);
}
