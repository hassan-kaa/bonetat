"use client";

import Link from "next/link";
import { useState } from "react";
import type { ConditionGrade } from "@prisma/client";
import DeviceArt from "@/components/products/DeviceArt";
import { GRADES } from "@/lib/catalog";
import { formatPrice } from "@/lib/money";
import { cn } from "@/lib/utils";

export type HeroGrade = { grade: ConditionGrade; priceMillimes: number; discount: number; href: string };

/** Scratches fade as the condition improves: the grading system, shown instead of explained */
const WEAR: Record<ConditionGrade, { micro: number; heavy: number; swing: number }> = {
  CORRECT: { micro: 0.95, heavy: 0.85, swing: 13 },
  BON: { micro: 0.6, heavy: 0.3, swing: 9 },
  TRES_BON: { micro: 0.22, heavy: 0, swing: 5 },
  COMME_NEUF: { micro: 0, heavy: 0, swing: 2 },
};

export default function GradeHero({
  product,
  grades,
  popular,
}: {
  product: { name: string; config: string; colorHex: string; cameras: number | null };
  grades: HeroGrade[];
  popular: { label: string; href: string }[];
}) {
  const initial = grades.find((g) => g.grade === "TRES_BON") ?? grades[0];
  const [current, setCurrent] = useState<HeroGrade | undefined>(initial);
  const wear = current ? WEAR[current.grade] : WEAR.TRES_BON;

  return (
    <section aria-labelledby="hero" className="flex flex-col items-center gap-6 overflow-hidden pb-2 pt-3">
      <h1
        id="hero"
        className="m-0 flex flex-wrap items-center justify-center gap-x-[clamp(10px,2.4vw,34px)] md:mb-14 text-[clamp(88px,15vw,216px)] font-semibold leading-[.86] tracking-display text-brand"
      >
        <span>bon</span>
        <span aria-hidden="true" className="relative mx-[clamp(4px,1vw,16px)] block h-[440px] w-[210px] flex-none">
          <span className="absolute left-0 top-2.5 -rotate-6">
            <DeviceArt kind="PHONE" color={product.colorHex} cameras={product.cameras} width={210} />
            <svg viewBox="0 0 300 600" width={210} height={420} className="absolute inset-0 transition-opacity duration-500" style={{ opacity: wear.micro }} fill="none" stroke="#fff" strokeLinecap="round">
              <path d="M188 252l58-26M196 262l30-13M72 332l34 17M210 418l-38 46M118 502q22-11 52-6M232 150l16 28M150 300l40 8M96 420l22-30" strokeWidth="1.6" strokeOpacity=".85" />
            </svg>
            <svg viewBox="0 0 300 600" width={210} height={420} className="absolute inset-0 transition-opacity duration-500" style={{ opacity: wear.heavy }} fill="none" stroke="#fff" strokeLinecap="round">
              <path d="M10 360v56M10 470v34M290 120v40M60 590h60M240 594h40" strokeWidth="4" strokeOpacity=".7" />
              <path d="M140 210l70 60M82 250l26-40M170 540l60-24M60 450l70 40" strokeWidth="2.4" strokeOpacity=".8" />
            </svg>
          </span>
          <svg width="120" height="200" viewBox="0 0 120 200" className="absolute left-[150px] top-[220px] hidden overflow-visible md:block" fill="none">
            <path d="M48 36 C 96 70, 100 120, 80 163" stroke="#0D1B3E" strokeOpacity=".55" strokeWidth="1.6" />
          </svg>
          {current && (
            <span
              className="absolute hidden w-[196px] flex-col gap-1.5 rounded-[10px_18px_18px_10px] border border-line bg-white py-4 pl-9 pr-[18px] text-sm leading-tight tracking-normal text-ink shadow-[0_18px_34px_-16px_rgba(13,27,62,.45)] transition-transform duration-500 [transition-timing-function:cubic-bezier(.3,1.6,.5,1)] md:left-[212px] md:top-[318px] md:flex"
              style={{ transform: `rotate(${wear.swing}deg)`, transformOrigin: "18px 50%" }}
            >
              <span className="absolute left-3 top-1/2 -mt-1.5 h-3 w-3 rounded-full border-[2.5px] border-pop bg-chalk" />
              <span className="text-[13px] font-normal text-ink-muted">{product.name}, {product.config}</span>
              <span className="flex items-center gap-2 text-[15px] font-medium">
                <span className="meter w-11">
                  {[1, 2, 3, 4].map((i) => <span key={i} data-on={i <= GRADES[current.grade].level} />)}
                </span>
                {GRADES[current.grade].label}
              </span>
              <span className="text-[30px] font-semibold tracking-[-0.035em]">{formatPrice(current.priceMillimes)}</span>
              {current.discount > 0 && <span className="text-[13px] font-semibold text-gain">{current.discount} % de moins que le neuf</span>}
            </span>
          )}
          <span className="absolute -left-16 bottom-[30px] flex h-28 w-28 rotate-[-14deg] flex-col items-center justify-center rounded-full border-[2.5px] border-pop bg-chalk/60 leading-tight tracking-normal text-pop">
            <span className="absolute inset-1.5 rounded-full border-[1.5px] border-dashed border-pop" />
            <span className="text-[19px] font-semibold">Contrôlé</span>
            <span className="text-xs font-medium">32 points</span>
          </span>
        </span>
        <span>état</span>
      </h1>

      <div className="flex flex-col items-center gap-3">
        <div role="group" aria-label="Choisir un état" className="flex justify-center gap-0.5 sm:gap-1 rounded-full border border-line bg-white p-[5px]">
          {grades.map((g) => (
            <button
              key={g.grade}
              type="button"
              aria-pressed={current?.grade === g.grade}
              onClick={() => setCurrent(g)}
              className={cn(
                "h-[42px] whitespace-nowrap rounded-full px-3 text-sm transition sm:h-[46px] sm:px-[18px] sm:text-[15px]",
                current?.grade === g.grade ? "bg-brand font-medium text-white" : "text-ink-soft hover:bg-[#E3E9F6]"
              )}
            >
              {GRADES[g.grade].label}
            </button>
          ))}
        </div>
        {current && (
          <p className="text-center text-[15px] md:hidden">
            {product.name}, {product.config} : <b className="font-semibold">{formatPrice(current.priceMillimes)}</b>
            {current.discount > 0 && <span className="font-semibold text-gain">, {current.discount} % de moins que le neuf</span>}
          </p>
        )}
        {current && (
          <p className="text-center text-sm text-ink-muted">
            Changez l’état : le téléphone, le prix et la batterie minimale ({GRADES[current.grade].minBattery} %) suivent.{" "}
            <Link href={current.href} className="font-medium text-brand underline-offset-4 hover:underline">Voir cet appareil</Link>
          </p>
        )}
      </div>

      <p className="mt-1.5 max-w-[32em] text-center text-[19px] leading-normal text-ink-soft">
        Téléphones, tablettes, ordinateurs, montres : réparés par des ateliers tunisiens vérifiés, contrôlés par Bonétat, garantis 12 mois et payés à la livraison.
      </p>

      <div className="flex w-full max-w-[640px] flex-col items-center gap-3.5">
        <form action="/catalog" method="get" role="search" className="w-full">
          <label className="flex h-16 w-full items-center gap-3 rounded-[20px] border border-line bg-white pl-5 pr-2 text-ink-muted shadow-buy focus-within:ring-[3px] focus-within:ring-pop">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>
            <input name="q" aria-label="Rechercher un appareil" placeholder="iPhone 13, iPad Air, MacBook, Apple Watch…" className="min-w-0 flex-1 bg-transparent text-[17px] text-ink outline-none placeholder:text-ink-muted" />
            <button type="submit" className="h-12 rounded-[14px] bg-brand px-5 text-[15px] font-semibold text-white hover:bg-brand-dark">Chercher</button>
          </label>
        </form>
        <div className="flex flex-wrap justify-center gap-2">
          {popular.map((p) => (
            <Link key={p.label} href={p.href} className="rounded-full bg-brand-tint px-3.5 py-2 text-sm text-ink hover:bg-brand-tint2">
              {p.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
