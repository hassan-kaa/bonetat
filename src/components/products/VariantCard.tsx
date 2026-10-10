"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Clock, Heart, ShoppingBag, Sparkles, Star, TrendingDown, BadgePercent } from "lucide-react";
import DeviceVisual from "./DeviceVisual";
import { GRADES } from "@/lib/catalog";
import { formatPrice, savings } from "@/lib/money";
import { useCart } from "@/store/cart";
import { useHydrated } from "@/hooks/useHydrated";
import { cn } from "@/lib/utils";
import type { ReasonTag, VariantCardData } from "@/types";

const TAGS: Record<ReasonTag, { label: string; className: string; Icon: typeof Star }> = {
  top: { label: "Top ventes", className: "bg-brand text-white", Icon: Star },
  drop: { label: "Prix en baisse", className: "bg-ink text-white", Icon: TrendingDown },
  fresh: { label: "Arrivé aujourd’hui", className: "bg-white text-brand", Icon: Sparkles },
  deal: { label: "Bon plan", className: "bg-gain-tint text-[#0B6B42]", Icon: BadgePercent },
  last: { label: "Dernière pièce", className: "bg-[#FFE9A8] text-[#6B4A00]", Icon: Clock },
};

export default function VariantCard({ card, followed = false }: { card: VariantCardData; followed?: boolean }) {
  const router = useRouter();
  const addItem = useCart((s) => s.addItem);
  const removeItem = useCart((s) => s.removeItem);
  const inCart = useCart((s) => s.items.some((i) => i.offerId === card.offerId));
  const hydrated = useHydrated();
  const [fav, setFav] = useState(followed);
  const saved = savings(card.priceMillimes, card.newPriceMillimes);
  const tag = card.tag ? TAGS[card.tag] : null;
  const added = hydrated && inCart;

  function toggleCart() {
    if (added) return removeItem(card.offerId);
    addItem({
      offerId: card.offerId,
      variantId: card.variantId,
      productSlug: card.productSlug,
      name: card.name,
      config: card.config,
      grade: card.grade,
      batteryHealth: card.batteryHealth,
      priceMillimes: card.priceMillimes,
      newPriceMillimes: card.newPriceMillimes,
      kind: card.kind,
      colorHex: card.colorHex,
      imageKey: card.imageKey,
      vendorName: card.vendorName,
      cameras: card.cameras,
    });
  }

  async function toggleFav() {
    const next = !fav;
    setFav(next);
    const res = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantId: card.variantId, follow: next }),
    });
    if (res.status === 401) {
      setFav(!next);
      router.push(`/auth/login?redirect=${encodeURIComponent(card.href)}`);
    }
  }

  return (
    <article className="relative flex flex-col rounded-[28px] border border-line bg-white p-3 transition hover:-translate-y-[3px] hover:shadow-lift">
      <Link href={card.href} aria-label={`${card.name}, ${card.config}`} className="block">
        <span className="relative grid h-[210px] place-items-center overflow-hidden rounded-[20px] bg-brand-tint">
          <DeviceVisual
            imageKey={card.imageKey}
            kind={card.kind}
            colorHex={card.colorHex}
            cameras={card.cameras}
            artWidth={card.kind === "PHONE" ? 112 : card.kind === "LAPTOP" ? 200 : card.kind === "TABLET" ? 120 : card.kind === "WATCH" ? 92 : 150}
            artClassName={cn(card.kind === "PHONE" && "translate-y-[34px] -rotate-6")}
            alt={`${card.name}, ${card.config}`}
            sizes="(max-width: 640px) 50vw, 300px"
            approximate={card.imageIsCover}
          />
          {tag && (
            <span className={cn("absolute left-3 top-3 flex items-center gap-1.5 rounded-full py-1.5 pl-2.5 pr-3 text-[13px] font-semibold", tag.className)}>
              <tag.Icon className="h-[15px] w-[15px]" strokeWidth={2.4} aria-hidden="true" />
              {tag.label}
            </span>
          )}
        </span>
      </Link>

      <button
        type="button"
        onClick={toggleFav}
        aria-pressed={fav}
        aria-label={fav ? "Ne plus suivre le prix" : "Suivre le prix"}
        className={cn("absolute right-[22px] top-[22px] grid h-10 w-10 place-items-center rounded-full bg-white transition", fav ? "text-pop" : "text-ink")}
      >
        <Heart className="h-5 w-5" fill={fav ? "currentColor" : "none"} strokeWidth={1.9} />
      </button>

      <div className="flex flex-1 flex-col gap-3 px-2 pb-1 pt-3.5">
        <Link href={card.href} className="flex flex-col gap-1 text-sm leading-snug">
          <span className="text-[18px] font-medium tracking-[-0.01em]">{card.name}</span>
          <span className="text-ink-soft">{card.config}</span>
          <span className="text-ink-muted">
            {GRADES[card.grade].line}
            {card.batteryHealth ? `, batterie ${card.batteryHealth} %` : ""}
          </span>
          <span className="text-ink-muted">Garantie 12 mois</span>
          <span className="text-[13px] text-ink-muted">
            Par {card.vendorName}
            {card.offerCount > 1 && <b className="ml-1.5 font-medium text-brand">· {card.offerCount} offres</b>}
          </span>
        </Link>
        <div className="mt-auto flex flex-col gap-0.5">
          <b className="text-[28px] font-semibold leading-tight tracking-[-0.035em]">{formatPrice(card.priceMillimes)}</b>
          {saved && <span className="text-sm font-semibold text-gain">{formatPrice(saved)} de moins que le neuf</span>}
        </div>
        <button
          type="button"
          onClick={toggleCart}
          className={cn(
            "flex h-12 items-center justify-center gap-2 rounded-[14px] text-[15px] font-semibold transition active:scale-[.98]",
            added ? "bg-gain-tint text-gain" : "bg-brand text-white hover:bg-brand-dark"
          )}
        >
          {added ? <Check className="h-[18px] w-[18px]" /> : <ShoppingBag className="h-[18px] w-[18px]" />}
          {added ? "Dans le panier" : "Ajouter au panier"}
        </button>
      </div>
    </article>
  );
}
