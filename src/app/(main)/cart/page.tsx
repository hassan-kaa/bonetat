"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Banknote, ShieldCheck, Trash2 } from "lucide-react";
import DeviceVisual from "@/components/products/DeviceVisual";
import { GRADES, SHIPPING_FEE_MILLIMES } from "@/lib/catalog";
import { formatPrice, savings } from "@/lib/money";
import { cartTotal, useCart } from "@/store/cart";
import { useHydrated } from "@/hooks/useHydrated";

type Check = {
  offerId: string;
  available: boolean;
  priceMillimes?: number;
  replacement?: { offerId: string; priceMillimes: number; batteryHealth: number | null; vendorName: string } | null;
};

export default function CartPage() {
  const hydrated = useHydrated();
  const items = useCart((s) => s.items);
  const removeItem = useCart((s) => s.removeItem);
  const [notice, setNotice] = useState<string | null>(null);

  // Re-check prices and availability: a partner may have changed a price, or the unit sold meanwhile
  useEffect(() => {
    if (!hydrated || items.length === 0) return;
    const ids = items.map((i) => i.offerId).join(",");
    fetch(`/api/cart?ids=${ids}`)
      .then((r) => r.json())
      .then((checks: Check[]) => {
        const changes: string[] = [];
        useCart.setState((state) => ({
          items: state.items.flatMap((item) => {
            const c = checks.find((x) => x.offerId === item.offerId);
            if (!c) return [item];
            if (!c.available) {
              const r = c.replacement;
              if (!r) {
                changes.push(`${item.name} (${item.config}) vient d’être vendu et a été retiré.`);
                return [];
              }
              changes.push(
                `${item.name} (${item.config}) vient d’être vendu. Nous l’avons remplacé par un appareil identique, même état${r.priceMillimes !== item.priceMillimes ? `, à ${formatPrice(r.priceMillimes)}` : ", même prix"}.`
              );
              return [{ ...item, offerId: r.offerId, priceMillimes: r.priceMillimes, batteryHealth: r.batteryHealth, vendorName: r.vendorName }];
            }
            if (c.priceMillimes !== item.priceMillimes) changes.push(`Le prix de ${item.name} est passé à ${formatPrice(c.priceMillimes!)}.`);
            return [{ ...item, priceMillimes: c.priceMillimes! }];
          }),
        }));
        if (changes.length) setNotice(changes.join(" "));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  if (!hydrated) return <div className="container-page min-h-[50vh] py-10" />;

  if (items.length === 0) {
    return (
      <div className="container-page py-16">
        <div className="mx-auto max-w-md rounded-panel border border-line bg-white p-10 text-center">
          <h1 className="text-[28px] font-semibold tracking-[-0.03em]">Votre panier est vide</h1>
          <p className="mt-2 text-ink-muted">Choisissez un appareil, son état et sa configuration : le meilleur prix s’affiche directement.</p>
          <Link href="/catalog" className="btn-primary mt-6">Voir le catalogue</Link>
        </div>
      </div>
    );
  }

  const subtotal = cartTotal(items);
  const saved = items.reduce((s, i) => s + (savings(i.priceMillimes, i.newPriceMillimes) ?? 0), 0);

  return (
    <div className="container-page pb-6 pt-8">
      <h1 className="page-title mb-6">Panier</h1>
      {notice && <p role="status" className="mb-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{notice}</p>}
      <div className="flex flex-wrap items-start gap-8">
        <ul className="flex min-w-0 flex-[1_1_560px] flex-col gap-3">
          {items.map((item) => (
            <li key={item.offerId} className="flex flex-wrap items-center gap-5 rounded-panel border border-line bg-white p-4 sm:flex-nowrap">
              <Link href={`/products/${item.productSlug}?v=${item.variantId}&g=${item.grade}`} className="grid h-24 w-24 flex-none place-items-center overflow-hidden rounded-panel bg-brand-tint">
                <DeviceVisual
                  imageKey={item.imageKey}
                  kind={item.kind}
                  colorHex={item.colorHex}
                  cameras={item.cameras}
                  artWidth={item.kind === "PHONE" ? 48 : item.kind === "LAPTOP" ? 80 : 52}
                  artClassName={item.kind === "PHONE" ? "translate-y-4 -rotate-6" : undefined}
                  alt={`${item.name}, ${item.config}`}
                  sizes="96px"
                />
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/products/${item.productSlug}?v=${item.variantId}&g=${item.grade}`} className="text-base font-medium hover:text-brand-dark">{item.name}</Link>
                <p className="text-sm text-ink-soft">{item.config}</p>
                <p className="text-sm text-ink-muted">
                  {GRADES[item.grade].line}
                  {item.batteryHealth ? `, batterie ${item.batteryHealth} %` : ""}, garantie {item.warrantyMonths ? `${item.warrantyMonths} mois` : "de l’atelier"}
                </p>
                {item.vendorName && <p className="text-[13px] text-ink-muted">Vendu par {item.vendorName}</p>}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-ink-muted">Pièce unique</span>
                <b className="price w-28 text-right text-lg">{formatPrice(item.priceMillimes)}</b>
                <button type="button" onClick={() => removeItem(item.offerId)} aria-label={`Retirer ${item.name} du panier`} className="grid h-10 w-10 place-items-center rounded-xl text-ink-muted hover:bg-chalk hover:text-pop-dark">
                  <Trash2 className="h-[18px] w-[18px]" />
                </button>
              </div>
            </li>
          ))}
        </ul>

        <aside className="flex w-full flex-col gap-4 rounded-panel border border-line bg-white p-6 shadow-buy lg:sticky lg:top-32 lg:w-[360px]">
          <h2 className="text-lg font-semibold">Récapitulatif</h2>
          <dl className="flex flex-col gap-2.5 text-[15px]">
            <div className="flex justify-between"><dt className="text-ink-muted">Articles</dt><dd>{formatPrice(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-muted">Livraison</dt><dd>{formatPrice(SHIPPING_FEE_MILLIMES)}</dd></div>
            <div className="flex justify-between border-t border-line pt-3 text-lg font-semibold"><dt>Total</dt><dd className="price text-xl">{formatPrice(subtotal + SHIPPING_FEE_MILLIMES)}</dd></div>
          </dl>
          {saved > 0 && <p className="text-sm font-semibold text-gain">{formatPrice(saved)} de moins que le neuf</p>}
          <Link href="/checkout" className="btn-primary h-14 rounded-control text-[17px]">Commander</Link>
          <ul className="flex flex-col gap-2.5 text-sm text-ink-soft">
            <li className="flex items-center gap-2.5"><Banknote className="h-5 w-5 text-brand-dark" aria-hidden="true" />Vous payez au livreur, après vérification</li>
            <li className="flex items-center gap-2.5"><ShieldCheck className="h-5 w-5 text-brand-dark" aria-hidden="true" />Chaque appareil garanti par son atelier, 4 mois minimum</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
