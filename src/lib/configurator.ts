// The variant engine. Pure functions, used by the product page (client) and
// by server code that needs "what would the buyer get for this selection".
//
// A selection is a value on every axis. Offers are the units for sale, one
// physical device each. The color axis compares finish ids, never color names.
// When the buyer changes one axis, we keep that value fixed and keep as many
// of the other values as possible (in priority order), then take the cheapest
// matching offer. The price shown on each option is exactly the price the
// buyer gets if they click it.

import type { ConditionGrade } from "@prisma/client";
import { GRADE_ORDER } from "./catalog";

export type Axis = "grade" | "storage" | "ram" | "option" | "color";

/** Axes in the order we try to preserve them when resolving a change */
const PRIORITY: Axis[] = ["storage", "ram", "option", "color", "grade"];

export type ConfigOffer = {
  offerId: string;
  variantId: string;
  grade: ConditionGrade;
  storageGb: number | null;
  ramGb: number | null;
  option: string | null;
  finishId: string;
  colorHex: string;
  priceMillimes: number;
  batteryHealth: number | null;
  warrantyMonths: number;
  /** Tie-breaker: higher wins at equal price. Never shown to buyers. */
  qualityScore: number;
  /** Last tie-breaker: the unit listed first sells first (ms since epoch) */
  listedAt: number;
};

export type Selection = {
  grade: ConditionGrade;
  storage: number | null;
  ram: number | null;
  option: string | null;
  /** Finish id */
  color: string;
};

export function valueOf(o: ConfigOffer, axis: Axis): string | number | null {
  switch (axis) {
    case "grade": return o.grade;
    case "storage": return o.storageGb;
    case "ram": return o.ramGb;
    case "option": return o.option;
    case "color": return o.finishId;
  }
}

export function selectionOf(o: ConfigOffer): Selection {
  return { grade: o.grade, storage: o.storageGb, ram: o.ramGb, option: o.option, color: o.finishId };
}

/** Cheapest offer; equal price → best quality score → listed first */
export function cheapest<T extends ConfigOffer>(list: T[]): T | null {
  if (list.length === 0) return null;
  return list.reduce((best, o) => {
    if (o.priceMillimes !== best.priceMillimes) return o.priceMillimes < best.priceMillimes ? o : best;
    if (o.qualityScore !== best.qualityScore) return o.qualityScore > best.qualityScore ? o : best;
    return o.listedAt < best.listedAt ? o : best;
  });
}

export function matches(o: ConfigOffer, s: Selection): boolean {
  return (
    o.grade === s.grade &&
    o.storageGb === s.storage &&
    o.ramGb === s.ram &&
    o.option === s.option &&
    o.finishId === s.color
  );
}

/** The offer that wins the buy box for an exact selection */
export function winner(offers: ConfigOffer[], s: Selection): ConfigOffer | null {
  return cheapest(offers.filter((o) => matches(o, s)));
}

/**
 * Resolve a selection where `fixed` was just changed by the buyer.
 * Returns the winning offer (whose selectionOf() is the new selection) or
 * null when nothing is for sale with that value.
 */
export function resolve(offers: ConfigOffer[], s: Selection, fixed: Axis): ConfigOffer | null {
  const sel = s as Record<Axis, unknown>;
  let pool = offers.filter((o) => valueOf(o, fixed) === sel[fixed]);
  if (pool.length === 0) return null;
  for (const axis of PRIORITY) {
    if (axis === fixed) continue;
    const kept = pool.filter((o) => valueOf(o, axis) === sel[axis]);
    if (kept.length > 0) pool = kept;
  }
  return cheapest(pool);
}

/** Every distinct value of an axis across the product's variants (not only those in stock) */
export function axisValues<T extends string | number | null>(values: T[]): T[] {
  return [...new Set(values)];
}

export type AxisOption<V> = {
  value: V;
  /** Offer the buyer lands on when clicking this option */
  target: ConfigOffer | null;
  selected: boolean;
};

export function optionsFor<V extends string | number | null>(
  offers: ConfigOffer[],
  s: Selection,
  axis: Axis,
  values: V[]
): AxisOption<V>[] {
  const sel = s as Record<Axis, unknown>;
  return values.map((value) => ({
    value,
    target: resolve(offers, { ...s, [axis]: value } as Selection, axis),
    selected: sel[axis] === value,
  }));
}

/** Initial selection: requested variant/grade if possible, else the overall cheapest. */
export function initialSelection(
  offers: ConfigOffer[],
  want: { variantId?: string | null; grade?: string | null }
): ConfigOffer | null {
  const grade = GRADE_ORDER.includes(want.grade as ConditionGrade) ? (want.grade as ConditionGrade) : null;
  if (want.variantId) {
    const inVariant = offers.filter((o) => o.variantId === want.variantId);
    const exact = grade ? cheapest(inVariant.filter((o) => o.grade === grade)) : null;
    if (exact) return exact;
    const any = cheapest(inVariant);
    if (any) return any;
  }
  if (grade) {
    const g = cheapest(offers.filter((o) => o.grade === grade));
    if (g) return g;
  }
  return cheapest(offers);
}
