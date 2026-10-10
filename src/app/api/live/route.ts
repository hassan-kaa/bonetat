import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Messages older than this are no longer worth a popup when the user comes back */
const FRESH_MS = 24 * 60 * 60 * 1000;

/**
 * What changed: the user's undelivered messages, and a version of the data pages show
 * (offers on sale, orders, moderation queue). The page refreshes itself when the version moves.
 *
 * Exactly once: each message is claimed (readAt set) by the one request that delivers it. Two tabs,
 * or a focus and a timer tick firing together, can't both show it: the second claim matches no row.
 */
export async function GET() {
  const user = await getSessionUser();
  const [catalog, mine] = await Promise.all([
    // Anything on sale changed: new offer approved, price changed, unit sold
    prisma.offer.aggregate({ _max: { updatedAt: true }, _count: { _all: true }, where: { status: { in: ["ACTIVE", "SOLD", "PENDING_REVIEW", "REJECTED"] } } }),
    user
      ? Promise.all([
          prisma.notification.findMany({
            where: { userId: user.id, readAt: null, createdAt: { gt: new Date(Date.now() - FRESH_MS) } },
            orderBy: { createdAt: "asc" },
            take: 10,
            select: { id: true, title: true, href: true },
          }),
          prisma.order.aggregate({ _max: { updatedAt: true }, where: user.role === "ADMIN" ? {} : { OR: [{ buyerId: user.id }, { items: { some: { vendor: { userId: user.id } } } }] } }),
        ])
      : Promise.resolve(null),
  ]);

  const delivered: { id: string; title: string; href: string | null }[] = [];
  for (const n of mine?.[0] ?? []) {
    const { count } = await prisma.notification.updateMany({ where: { id: n.id, readAt: null }, data: { readAt: new Date() } });
    if (count === 1) delivered.push(n);
  }

  const version = [catalog._max.updatedAt?.getTime() ?? 0, catalog._count._all, mine?.[1]._max.updatedAt?.getTime() ?? 0].join(".");
  return NextResponse.json({ version, notifications: delivered });
}
