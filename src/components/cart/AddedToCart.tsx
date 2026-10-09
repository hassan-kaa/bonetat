"use client";

import Link from "next/link";
import { useEffect } from "react";
import { X } from "lucide-react";
import { useCart } from "@/store/cart";

/** Confirmation after any "Ajouter au panier", wherever it happened */
export default function AddedToCart() {
  const last = useCart((s) => s.lastAdded);
  const dismiss = useCart((s) => s.dismissLastAdded);

  useEffect(() => {
    if (!last) return;
    const t = setTimeout(dismiss, 5000);
    return () => clearTimeout(t);
  }, [last, dismiss]);

  if (!last) return null;
  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-50 flex w-[calc(100%-32px)] max-w-lg -translate-x-1/2 animate-toast-in items-center gap-3.5 rounded-2xl bg-ink py-3 pl-5 pr-3 text-sm text-white shadow-toast"
    >
      <span className="min-w-0 flex-1 truncate">
        {last.name}, {last.config} ajouté au panier
      </span>
      <Link href="/cart" onClick={dismiss} className="whitespace-nowrap font-semibold text-white underline-offset-4 hover:underline">
        Voir le panier
      </Link>
      <button type="button" onClick={dismiss} aria-label="Fermer" className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-white/10">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
