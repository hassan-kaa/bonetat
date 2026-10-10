// Laptop facets read from what the catalog already knows (model name, variant option,
// spec sheet), so stores never fill extra fields. Pure functions: tested in pc-filters.test.ts.

export type CpuFamily = { id: string; label: string };

const INTEL = /\bcore\s*(?:i|™\s*i)?([3579])\b|\bi([3579])(?:[-\s]\d{4,5}|\b)/i;
const ULTRA = /\bcore\s*ultra\s*([579])\b|\bultra\s*([579])\s*\d{3}/i;
const RYZEN = /\bryzen\s*(?:ai\s*)?([3579])\b/i;
const APPLE = /\bM([1-9])\b(?:\s*(Pro|Max|Ultra))?/;
const ENTRY = /\b(celeron|pentium|athlon)\b/i;

/** "Intel Core i5 11e gén." → { id: "i5", label: "Intel Core i5" } */
export function cpuFamily(text: string, brand?: string): CpuFamily | null {
  let m = text.match(ULTRA);
  if (m) return { id: `ultra${m[1] ?? m[2]}`, label: `Intel Core Ultra ${m[1] ?? m[2]}` };
  m = text.match(INTEL);
  if (m) return { id: `i${m[1] ?? m[2]}`, label: `Intel Core i${m[1] ?? m[2]}` };
  m = text.match(RYZEN);
  if (m) return { id: `ryzen${m[1]}`, label: `AMD Ryzen ${m[1]}` };
  if (brand === "Apple" || /\bapple\b/i.test(text)) {
    m = text.match(APPLE);
    if (m) return { id: `m${m[1]}`, label: `Apple M${m[1]}` };
  }
  m = text.match(ENTRY);
  if (m) return { id: "entry", label: "Celeron, Pentium, Athlon" };
  return null;
}

const GPU = /\b(rtx|gtx|quadro|geforce\s*mx|mx\s*\d{3}|radeon\s*(?:rx|pro)|rx\s*\d{3,4}m?|arc\s*a\d{3}m?)\b/i;

/** Dedicated graphics card named somewhere (RTX 3060, GTX 1650, Quadro T1000, Radeon RX 6600M…) */
export function hasDedicatedGpu(text: string): boolean {
  return GPU.test(text);
}

/** Everything the catalog says about a laptop configuration, as one searchable string */
export function laptopText(p: { model: string; specsJson?: unknown }, v: { option?: string | null }): string {
  return [p.model, v.option ?? "", ...specValues(p.specsJson)].filter(Boolean).join(" · ");
}

/** Spec values whatever the stored shape: [["Puce", "M1"], …] or { Puce: "M1" } */
function specValues(specs: unknown): string[] {
  if (Array.isArray(specs)) return specs.flatMap((row) => (Array.isArray(row) && typeof row[1] === "string" ? [row[1]] : []));
  if (specs && typeof specs === "object") return Object.values(specs).filter((x): x is string => typeof x === "string");
  return [];
}

/** Display order for the processor filter */
export const CPU_ORDER = ["entry", "i3", "i5", "i7", "i9", "ultra5", "ultra7", "ultra9", "ryzen3", "ryzen5", "ryzen7", "ryzen9", "m1", "m2", "m3", "m4", "m5"];
