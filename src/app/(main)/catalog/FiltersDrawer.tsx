"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Phones: the filters live in a side drawer opened by a button next to "Trier".
// Computers (lg and up): the same panel is the usual sticky sidebar, the button is hidden.
// The button and the panel sit in different places of a server page, so they talk through one window event.

const OPEN = "catalog-filters:open";

export function FiltersButton({ count }: { count: number }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN))}
      className="inline-flex h-10 items-center gap-2 rounded-control border-[1.5px] border-line-strong bg-white px-3.5 text-sm font-medium lg:hidden"
    >
      <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
      Filtres
      {count > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-semibold text-white">{count}</span>}
    </button>
  );
}

/** Filters stay open while the buyer ticks several of them (each tick reloads the results behind) */
export function FiltersPanel({ results, children }: { results: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN, show);
    return () => window.removeEventListener(OPEN, show);
  }, []);

  // Escape closes; the page behind doesn't scroll while the drawer is open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  return (
    <>
      {open && <div aria-hidden="true" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-ink/45 lg:hidden" />}
      <aside
        aria-label="Filtres"
        className={cn(
          "flex-col gap-6 bg-white p-5",
          "lg:sticky lg:top-32 lg:flex lg:max-h-[calc(100vh-9rem)] lg:w-64 lg:overflow-y-auto lg:rounded-panel lg:border lg:border-line",
          open ? "fixed inset-y-0 left-0 z-50 flex w-[86%] max-w-sm overflow-y-auto shadow-toast lg:static lg:z-auto lg:w-64 lg:shadow-none" : "hidden"
        )}
      >
        <button type="button" onClick={() => setOpen(false)} aria-label="Fermer les filtres" className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-control hover:bg-chalk lg:hidden">
          <X className="h-5 w-5" />
        </button>
        {children}
        <button type="button" onClick={() => setOpen(false)} className="btn-primary sticky bottom-0 mt-auto w-full lg:hidden">
          Voir {results} résultat{results > 1 ? "s" : ""}
        </button>
      </aside>
    </>
  );
}
