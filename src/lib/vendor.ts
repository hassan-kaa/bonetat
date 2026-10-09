import "server-only";
import type { ConditionGrade } from "@prisma/client";
import { prisma } from "./prisma";
import { SELLABLE } from "./queries";

/** Best sellable price per variant + grade, optionally ignoring one partner's own offers */
export async function competitorPrices(excludeVendorId?: string) {
  const offers = await prisma.offer.findMany({
    where: { ...SELLABLE, ...(excludeVendorId ? { vendorId: { not: excludeVendorId } } : {}) },
    select: { variantId: true, conditionGrade: true, priceMillimes: true },
  });
  const map = new Map<string, number>();
  for (const o of offers) {
    const k = `${o.variantId}|${o.conditionGrade}`;
    map.set(k, Math.min(map.get(k) ?? Infinity, o.priceMillimes));
  }
  return map;
}

export const priceKey = (variantId: string, grade: ConditionGrade) => `${variantId}|${grade}`;

/** Half-month payout periods: 1–15 and 16–end */
export function currentPeriod(now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth();
  const first = now.getDate() <= 15;
  const start = new Date(y, m, first ? 1 : 16);
  const end = first ? new Date(y, m, 15, 23, 59, 59) : new Date(y, m + 1, 0, 23, 59, 59);
  const month = start.toLocaleDateString("fr-FR", { month: "long" });
  return {
    start,
    end,
    label: `${start.getDate()} au ${end.getDate()} ${month}`,
    payDate: end.toLocaleDateString("fr-FR", { day: "numeric", month: "long" }),
  };
}
