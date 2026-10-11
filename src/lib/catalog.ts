// Shared catalog vocabulary — safe to import from client and server.
import type { ConditionGrade, DeviceKind } from "@prisma/client";

/** Best condition first */
export const GRADE_ORDER: ConditionGrade[] = ["COMME_NEUF", "TRES_BON", "BON", "CORRECT"];

/**
 * The grade describes how the device LOOKS and that it fully works. Battery health is a
 * separate, measured number per unit: a "Comme neuf" phone can have a 78 % battery.
 */
export const GRADES: Record<
  ConditionGrade,
  { label: string; line: string; level: number; description: string; criteria: string[] }
> = {
  COMME_NEUF: {
    label: "Comme neuf",
    line: "Comme neuf",
    level: 4,
    description: "Aucune trace, même de près. Aspect identique au neuf.",
    criteria: ["Aucune trace visible, même de près", "Écran et châssis impeccables", "100 % fonctionnel, testé"],
  },
  TRES_BON: {
    label: "Très bon",
    line: "Très bon état",
    level: 3,
    description: "Micro-rayures invisibles à 20 cm. Écran impeccable.",
    criteria: ["Micro-rayures invisibles à 20 cm", "Écran sans défaut", "100 % fonctionnel, testé"],
  },
  BON: {
    label: "Bon",
    line: "Bon état",
    level: 2,
    description: "Quelques traces visibles de près, écran sans rayure une fois allumé.",
    criteria: ["Traces d’usage visibles de près", "Écran sans rayure une fois allumé", "100 % fonctionnel, testé"],
  },
  CORRECT: {
    label: "Correct",
    line: "État correct",
    level: 1,
    description: "Rayures visibles sur le contour ou l’écran éteint. Tout fonctionne parfaitement.",
    criteria: ["Rayures marquées possibles", "100 % fonctionnel, testé"],
  },
};

export const KIND_LABELS: Record<DeviceKind, string> = {
  PHONE: "Téléphone",
  TABLET: "Tablette",
  LAPTOP: "Ordinateur",
  WATCH: "Montre",
  CONSOLE: "Console",
  OTHER: "Appareil",
};

/** Platform floor for every grade: below this, the battery is replaced before the device is listed */
export const MIN_BATTERY_HEALTH = 75;

/** Why a measured battery can't be listed, or null if it can. Devices without a battery (consoles) always pass. */
export function batteryProblem(kind: DeviceKind, battery: number | null): string | null {
  if (kind === "CONSOLE") return null;
  if (battery === null || Number.isNaN(battery)) return "Indiquez la santé de la batterie mesurée";
  if (battery > 100) return "La santé de la batterie va jusqu’à 100 %";
  if (battery < MIN_BATTERY_HEALTH) return `Batterie sous ${MIN_BATTERY_HEALTH} % : remplacez-la avant la mise en vente`;
  return null;
}

/** Bonétat's standard warranty — every offer gets at least this */
/** Each shop sets its own warranty per offer; Bonétat requires at least this */
export const MIN_WARRANTY_MONTHS = 4;
export const WARRANTY_CHOICES = [4, 6, 12, 24] as const;
export const RETURN_DAYS = 7;
export const SHIPPING_FEE_MILLIMES = 8_000;

export function formatStorage(gb: number): string {
  return gb >= 1000 ? `${gb / 1000} To` : `${gb} Go`;
}

type VariantLike = {
  storageGb: number | null;
  ramGb: number | null;
  option: string | null;
  finish: { nameFr: string };
};

/**
 * Human label for a variant, in the order buyers think about it.
 * Phone: "128 Go, Noir" · Laptop: "8 Go, SSD 256 Go, Gris sidéral" · Watch: "41 mm, GPS, Minuit"
 */
export function variantLabel(v: VariantLike, kind?: DeviceKind): string {
  const parts: string[] = [];
  if (v.ramGb) parts.push(`${v.ramGb} Go`);
  if (v.storageGb) parts.push(kind === "LAPTOP" ? `SSD ${formatStorage(v.storageGb)}` : formatStorage(v.storageGb));
  if (v.option) parts.push(v.option);
  parts.push(v.finish.nameFr);
  return parts.join(", ");
}

/** "iPhone 13", "Samsung Galaxy S23", "Sony PlayStation 5" */
export function displayName(p: { brand: string; model: string }): string {
  if (p.brand === "Apple" || p.model.toLowerCase().startsWith(p.brand.toLowerCase())) return p.model;
  return `${p.brand} ${p.model}`;
}

export const GOVERNORATES = [
  "Ariana", "Béja", "Ben Arous", "Bizerte", "Gabès", "Gafsa", "Jendouba", "Kairouan",
  "Kasserine", "Kébili", "Le Kef", "Mahdia", "La Manouba", "Médenine", "Monastir", "Nabeul",
  "Sfax", "Sidi Bouzid", "Siliana", "Sousse", "Tataouine", "Tozeur", "Tunis", "Zaghouan",
];
