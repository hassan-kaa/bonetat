"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const fmt = (dt: number) => `${dt.toLocaleString("fr-FR").replace(/ | /g, " ")} DT`;

/**
 * Two-handle price interval, in DT. Moves freely while dragging, applies on release
 * (one navigation per gesture, not one per pixel). Bounds come from the units on sale.
 */
export default function PriceRange({ floor, ceil, min, max }: { floor: number; ceil: number; min?: number; max?: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const step = ceil - floor > 2000 ? 50 : 10;
  const [lo, setLo] = useState(min ?? floor);
  const [hi, setHi] = useState(max ?? ceil);

  // Another filter changed the bounds: follow them
  useEffect(() => {
    setLo(min ?? floor);
    setHi(max ?? ceil);
  }, [floor, ceil, min, max]);

  function apply(nextLo = lo, nextHi = hi) {
    const q = new URLSearchParams(params.toString());
    q.delete("page");
    if (nextLo > floor) q.set("min", String(nextLo)); else q.delete("min");
    if (nextHi < ceil) q.set("max", String(nextHi)); else q.delete("max");
    router.push(`${pathname}?${q.toString()}`, { scroll: false });
  }

  const span = Math.max(1, ceil - floor);
  const left = ((lo - floor) / span) * 100;
  const right = ((hi - floor) / span) * 100;
  // The browser keeps each thumb half its width (11px) inside the ends: the blue bar follows the same scale
  const at = (pct: number) => `calc(11px + (100% - 22px) * ${pct / 100})`;

  if (ceil <= floor) return <p className="text-sm text-ink-muted">{fmt(floor)}</p>;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="relative h-6">
        <span aria-hidden="true" className="absolute inset-x-[11px] top-1/2 h-1 -translate-y-1/2 rounded-full bg-line" />
        <span aria-hidden="true" className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-brand" style={{ left: at(left), width: `calc((100% - 22px) * ${(right - left) / 100})` }} />
        <input
          type="range" min={floor} max={ceil} step={step} value={lo} aria-label="Prix minimum"
          onChange={(e) => setLo(Math.min(Number(e.target.value), hi - step))}
          onPointerUp={() => apply()} onKeyUp={() => apply()}
          className="range-dual"
          style={{ zIndex: lo > ceil - (ceil - floor) / 10 ? 2 : 1 }}
        />
        <input
          type="range" min={floor} max={ceil} step={step} value={hi} aria-label="Prix maximum"
          onChange={(e) => setHi(Math.max(Number(e.target.value), lo + step))}
          onPointerUp={() => apply()} onKeyUp={() => apply()}
          className="range-dual"
        />
      </div>
      <div className="flex justify-between text-sm tabular-nums">
        <span>{fmt(lo)}</span>
        <span>{fmt(hi)}</span>
      </div>
    </div>
  );
}
