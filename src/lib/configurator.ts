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
  /** The shop selling this unit, shown to the buyer ("Vendu par …") */
  vendorName: string;
  /** Storage keys of the store's own photos of this unit */
  photos?: string[];
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
/**
 * A unit with the store's own photos beats a cheaper one without, when it costs at most
 * this much more. Undercutting by 1 DT then no longer beats a shop that shows the real device.
 */
export const PHOTO_PREMIUM = 0.02;

const byPrice = (a: ConfigOffer, b: ConfigOffer) =>
  a.priceMillimes - b.priceMillimes || b.qualityScore - a.qualityScore || a.listedAt - b.listedAt;
const hasPhotos = (o: ConfigOffer) => (o.photos?.length ?? 0) > 0;

/** Buy-box order: price, then shop quality, then listed first, with photos winning inside the PHOTO_PREMIUM band */
export function rankUnits<T extends ConfigOffer>(list: T[]): T[] {
  const sorted = [...list].sort(byPrice);
  if (sorted.length < 2) return sorted;
  const band = sorted[0].priceMillimes * (1 + PHOTO_PREMIUM);
  return sorted.sort((a, b) => {
    if (a.priceMillimes <= band && b.priceMillimes <= band && hasPhotos(a) !== hasPhotos(b)) return hasPhotos(a) ? -1 : 1;
    return byPrice(a, b);
  });
}

/** The unit the buy box shows: the cheapest, unless a unit with real photos is within PHOTO_PREMIUM */
export function cheapest<T extends ConfigOffer>(list: T[]): T | null {
  return rankUnits(list)[0] ?? null;
}

/**
 * The offers list: one row per shop (its best unit, with how many identical units it has),
 * in buy-box order. "Dupliquer" can't flood the list with copies.
 */
export function unitsByShop<T extends ConfigOffer>(list: T[]): { best: T; count: number }[] {
  const rows = new Map<string, { best: T; count: number }>();
  for (const o of rankUnits(list)) {
    const row = rows.get(o.vendorName);
    if (row) row.count++;
    else rows.set(o.vendorName, { best: o, count: 1 });
  }
  return [...rows.values()];
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

/** Every distinct value in a list, first occurrence order */
export function axisValues<T extends string | number | null>(values: T[]): T[] {
  return [...new Set(values)];
}

/**
 * The values a buyer can pick on an axis: only those with at least one unit for sale.
 * A storage, color or version nobody sells never appears on the page.
 * Numbers sort ascending; colors and versions keep the catalog order given in `order`.
 */
export function sellableValues(offers: ConfigOffer[], axis: Exclude<Axis, "grade">, order: (string | number)[] = []): (string | number)[] {
  const values = axisValues(offers.map((o) => valueOf(o, axis))).filter((v): v is string | number => v !== null);
  if (values.every((v) => typeof v === "number")) return (values as number[]).sort((a, b) => a - b);
  const rank = (v: string | number) => (order.indexOf(v) === -1 ? Infinity : order.indexOf(v));
  return values.sort((a, b) => rank(a) - rank(b));
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
