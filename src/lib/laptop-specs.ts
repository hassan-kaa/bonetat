// A laptop configuration, picked by clicks instead of typed. The variant's `option` is generated from
// these picks (laptopLabel), always in the same words, so the same machine gets the same configuration
// whichever store lists it, and the catalog filters (pc-filters.ts) read it back.
// Screen, keyboard, charger, exact processor model: unit details, in the seller's note.

import { cpuFamily } from "./pc-filters";

export type CpuBrand = "INTEL" | "AMD" | "APPLE";

export type LaptopSpecs = {
  cpuBrand: CpuBrand | null;
  /** pc-filters family id: "i5", "ultra7", "ryzen5", "m1", "entry" */
  cpuFamily: string | null;
  /** Intel "11", Core Ultra "1", Ryzen "5000", Apple tier "Pro" / "Max" */
  cpuGen: string | null;
  /** null = integrated graphics */
  gpu: string | null;
  vramGb: number | null;
};

export const EMPTY_SPECS: LaptopSpecs = { cpuBrand: null, cpuFamily: null, cpuGen: null, gpu: null, vramGb: null };

export const CPU_BRANDS: { value: CpuBrand; label: string }[] = [
  { value: "INTEL", label: "Intel" },
  { value: "AMD", label: "AMD" },
  { value: "APPLE", label: "Apple" },
];

export const CPU_FAMILIES: Record<CpuBrand, { id: string; label: string }[]> = {
  INTEL: [
    { id: "i3", label: "Core i3" }, { id: "i5", label: "Core i5" }, { id: "i7", label: "Core i7" }, { id: "i9", label: "Core i9" },
    { id: "ultra5", label: "Core Ultra 5" }, { id: "ultra7", label: "Core Ultra 7" }, { id: "ultra9", label: "Core Ultra 9" },
    { id: "entry", label: "Celeron / Pentium" },
  ],
  AMD: [
    { id: "ryzen3", label: "Ryzen 3" }, { id: "ryzen5", label: "Ryzen 5" }, { id: "ryzen7", label: "Ryzen 7" }, { id: "ryzen9", label: "Ryzen 9" },
    { id: "entry", label: "Athlon" },
  ],
  APPLE: [{ id: "m1", label: "M1" }, { id: "m2", label: "M2" }, { id: "m3", label: "M3" }, { id: "m4", label: "M4" }],
};

/** Generations offered for a family (none for entry chips) */
export function generationsFor(family: string | null): { value: string; label: string }[] {
  if (!family || family === "entry") return [];
  if (/^i[3579]$/.test(family)) return ["6", "7", "8", "9", "10", "11", "12", "13", "14"].map((g) => ({ value: g, label: `${g}e gén.` }));
  if (family.startsWith("ultra")) return [{ value: "1", label: "Série 1" }, { value: "2", label: "Série 2" }];
  if (family.startsWith("ryzen")) return ["3000", "4000", "5000", "6000", "7000", "8000"].map((g) => ({ value: g, label: `Série ${g}` }));
  if (/^m\d$/.test(family)) return [{ value: "", label: "Standard" }, { value: "Pro", label: "Pro" }, { value: "Max", label: "Max" }];
  return [];
}

export const GPUS = ["GeForce MX", "GTX 1650", "RTX 2050", "RTX 3050", "RTX 3050 Ti", "RTX 3060", "RTX 3070", "RTX 4050", "RTX 4060", "RTX 4070", "RTX 4080", "Quadro / RTX A", "Radeon RX"];
export const VRAMS = [2, 4, 6, 8, 12, 16];
export const LAPTOP_RAMS = [4, 8, 16, 32, 64];
export const LAPTOP_SSDS = [128, 256, 512, 1000, 2000];

const brandOf = (family: string): CpuBrand =>
  family.startsWith("ryzen") ? "AMD" : /^m\d$/.test(family) ? "APPLE" : "INTEL";

/** "Intel Core i5 11e gén., RTX 3050 4 Go". Without the processor when the model name already says it (MacBook Air M1). */
export function laptopLabel(s: LaptopSpecs, opts: { cpuInModel?: boolean } = {}): string | null {
  const parts: string[] = [];
  if (!opts.cpuInModel && s.cpuFamily && s.cpuBrand) {
    const fam = CPU_FAMILIES[s.cpuBrand].find((f) => f.id === s.cpuFamily)?.label ?? s.cpuFamily;
    const gen = generationsFor(s.cpuFamily).find((g) => g.value === (s.cpuGen ?? ""))?.label;
    if (s.cpuBrand === "APPLE") parts.push(`Apple ${fam}${s.cpuGen ? ` ${s.cpuGen}` : ""}`);
    else parts.push([s.cpuBrand === "INTEL" ? "Intel" : "AMD", fam, s.cpuGen ? gen : null].filter(Boolean).join(" "));
  }
  if (s.gpu) parts.push(`${s.gpu}${s.vramGb ? ` ${s.vramGb} Go` : ""}`);
  return parts.join(", ") || null;
}

/**
 * Best reading of free text: a generated label, a store's post ("i7 10th gen · RTX 3050"),
 * or an exact processor model ("i5-1145G7", "Ryzen 7 5800H", "M2 Pro").
 */
export function specsFromText(text: string | null | undefined, brand?: string): LaptopSpecs {
  const t = text ?? "";
  const fam = cpuFamily(t, brand);
  const out: LaptopSpecs = { ...EMPTY_SPECS, cpuFamily: fam?.id ?? null, cpuBrand: fam ? brandOf(fam.id) : null };
  if (fam && fam.id === "entry") out.cpuBrand = /athlon/i.test(t) ? "AMD" : "INTEL";

  if (fam && /^i[3579]$/.test(fam.id)) {
    const m = t.match(/i[3579][-\s]?(1\d{3,4}|[6-9]\d{3})/i);
    const g = t.match(/\b(\d{1,2})\s*(?:e|ème|th|st|nd|rd)?\s*(?:gén|gen)/i);
    if (m) out.cpuGen = m[1].startsWith("1") ? m[1].slice(0, 2) : m[1][0];
    else if (g && Number(g[1]) >= 6 && Number(g[1]) <= 14) out.cpuGen = String(Number(g[1]));
  } else if (fam?.id.startsWith("ultra")) {
    const m = t.match(/ultra\s*[579]\s*([12])\d{2}/i) ?? t.match(/s[ée]rie\s*([12])\b/i);
    if (m) out.cpuGen = m[1];
  } else if (fam?.id.startsWith("ryzen")) {
    const m = t.match(/ryzen\s*(?:ai\s*)?[3579]\s*(?:pro\s*)?([3-8])\d{3}/i) ?? t.match(/s[ée]rie\s*([3-8])000/i);
    if (m) out.cpuGen = `${m[1]}000`;
  } else if (fam && /^m\d$/.test(fam.id)) {
    const m = t.match(/\bM\d\s*(Pro|Max)\b/i);
    out.cpuGen = m ? (m[1].toLowerCase() === "pro" ? "Pro" : "Max") : "";
  }

  // Graphics card: the model, then a memory size written right after it ("RTX 3050 4 Go")
  const at = t.search(/\b(rtx|gtx|quadro|mx\s*\d{3}|geforce\s*mx|radeon\s*rx|rx\s*\d{4})/i);
  if (at >= 0) {
    const after = t.slice(at);
    const nv = after.match(/^(?:RTX|GTX)\s*(\d{4})(\s*Ti)?/i);
    if (/^(rtx\s*a\d|quadro)/i.test(after)) out.gpu = "Quadro / RTX A";
    else if (nv) out.gpu = `${/^gtx/i.test(after) ? "GTX" : "RTX"} ${nv[1]}${nv[2] ? " Ti" : ""}`;
    else if (/^(mx|geforce)/i.test(after)) out.gpu = "GeForce MX";
    else out.gpu = "Radeon RX";
    const vram = after.match(/^[^,·]{0,24}?\b(\d{1,2})\s*(?:Go|GB)\b/i);
    if (vram && VRAMS.includes(Number(vram[1]))) out.vramGb = Number(vram[1]);
  }
  return out;
}

/** 1024 → 1000, 2048 → 2000: stores type binary sizes, the catalog stores 1 To as 1000 */
export function normalizeStorage(gb: number): number {
  if (gb === 1024) return 1000;
  if (gb === 2048) return 2000;
  return gb;
}
