// All prices are stored as integer millimes (1 DT = 1000 millimes).
// Never use floats for money math.

export function millimesToTND(millimes: number): number {
  return millimes / 1000;
}

export function tndToMillimes(tnd: number): number {
  return Math.round(tnd * 1000);
}

/** "1 029 DT" — whole dinars when possible, millimes only when they exist */
export function formatPrice(millimes: number): string {
  const tnd = millimes / 1000;
  // Tunisian dinars have 3 decimals: show all three when there are millimes, none otherwise
  const whole = millimes % 1000 === 0;
  const s = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: whole ? 0 : 3,
    maximumFractionDigits: whole ? 0 : 3,
  }).format(tnd);
  return s.replace(/\u202f|\u00a0/g, " ") + " DT";
}

/** % saved vs the new-device reference price (rounded), or null if not applicable */
export function discountPercent(priceMillimes: number, newPriceMillimes?: number | null): number | null {
  if (!newPriceMillimes || newPriceMillimes <= priceMillimes) return null;
  return Math.round((1 - priceMillimes / newPriceMillimes) * 100);
}

export function savings(priceMillimes: number, newPriceMillimes?: number | null): number | null {
  if (!newPriceMillimes || newPriceMillimes <= priceMillimes) return null;
  return newPriceMillimes - priceMillimes;
}

/** Bonétat commission on partner sales (introductory rate) */
export const COMMISSION_RATE = 0.05;

export function calcCommission(priceMillimes: number): number {
  return Math.round(priceMillimes * COMMISSION_RATE);
}
