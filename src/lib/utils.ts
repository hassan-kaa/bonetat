import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export function formatShortDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("fr-FR", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** +216 22 345 678 */
export function formatPhone(phone: string): string {
  return phone.replace(/(\+216)(\d{2})(\d{3})(\d{3})/, "$1 $2 $3 $4");
}

export function initials(name: string | null | undefined): string {
  if (!name) return "B";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente de confirmation",
  CONFIRMED: "Confirmée",
  SHIPPED: "En route",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
  DISPUTED: "Réclamation en cours",
};

/** Tailwind classes for status pills */
export const ORDER_STATUS_TONE: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-800",
  CONFIRMED: "bg-brand-tint text-brand",
  SHIPPED: "bg-brand-tint text-brand",
  DELIVERED: "bg-gain-tint text-gain",
  CANCELLED: "bg-slate-100 text-slate-600",
  DISPUTED: "bg-pop-tint text-pop-dark",
};

export const FULFILLMENT_LABELS: Record<string, string> = {
  PENDING: "À expédier",
  SHIPPED: "Expédiée",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
};

/** Steps shown on the buyer's order timeline */
export const ORDER_STEPS = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED"] as const;
export const ORDER_STEP_LABELS = ["Reçue", "Confirmée", "En route", "Livrée"];

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function monthsBetween(a: Date, b: Date): number {
  return Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) - (b.getDate() < a.getDate() ? 1 : 0));
}
