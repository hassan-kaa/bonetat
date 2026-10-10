import Link from "next/link";
import Image from "next/image";
import type { DeviceKind } from "@prisma/client";
import { ArrowRight, Banknote, ClipboardCheck, ShieldCheck } from "lucide-react";
import { formatPrice } from "@/lib/money";
import { imageUrl } from "@/lib/image-url";
import DeviceArt from "@/components/products/DeviceArt";

/** One side of the hero, every number read from the units on sale */
export type HeroSide = {
  kind: DeviceKind;
  title: string;
  brands: string;
  href: string;
  cta: string;
  floorMillimes: number | null;
  /** Biggest saving vs the new price, in % (0 when unknown) */
  maxDiscount: number;
  count: number;
  imageKey: string | null;
  imageAlt: string;
};

/** The logo's rising arrow, drawn large as a quiet background line */
function Envol({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 140" fill="none" aria-hidden="true" className={className}>
      <path d="M-10 130Q90 122 160 40" stroke="currentColor" strokeWidth="16" strokeLinecap="round" />
      <polygon points="178,18 172,74 124,36" fill="currentColor" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
    </svg>
  );
}

function Panel({ side, dark }: { side: HeroSide; dark: boolean }) {
  return (
    <Link
      href={side.href}
      className={`group relative flex min-h-[300px] overflow-hidden rounded-[32px] p-7 transition hover:-translate-y-1 hover:shadow-lift sm:min-h-[360px] sm:p-9 ${
        dark ? "bg-[linear-gradient(135deg,#2F6CFC,#3B1CC9_55%,#7A44F5)] text-white" : "bg-brand-tint text-ink"
      }`}
    >
      <Envol className={`absolute -bottom-6 -left-4 w-[70%] ${dark ? "text-white/[.08]" : "text-brand/[.07]"}`} />

      <div className="relative z-[1] flex max-w-[58%] flex-col">
        <h2 className="text-[32px] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-[40px]">{side.title}</h2>
        <p className={`mt-2 text-[15px] ${dark ? "text-white/75" : "text-ink-soft"}`}>{side.brands}</p>

        <div className="mt-auto flex flex-col gap-3 pt-8">
          {side.maxDiscount > 0 && (
            <span className={`w-fit rounded-full px-3 py-1.5 text-sm font-semibold ${dark ? "bg-white text-[#3B1CC9]" : "bg-gain text-white"}`}>
              Jusqu’à −{side.maxDiscount} % vs le neuf
            </span>
          )}
          {side.floorMillimes !== null && (
            <span className="flex items-baseline gap-2 text-[15px]">
              dès <b className="text-[30px] font-semibold tracking-[-0.03em]">{formatPrice(side.floorMillimes)}</b>
            </span>
          )}
          <span className="flex items-center gap-2 text-[15px] font-medium">
            {side.cta} ({side.count})
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </span>
        </div>
      </div>

      {/* Catalog photos are on pure white: a white card on the gradient, blended away on the light side */}
      <div
        className={
          dark
            ? "absolute bottom-7 right-5 top-10 w-[42%] rotate-[4deg] overflow-hidden rounded-[26px] bg-white shadow-[0_24px_48px_-20px_rgba(5,3,43,.55)] transition-transform duration-500 group-hover:rotate-[2deg] sm:right-8"
            : "absolute -right-6 bottom-0 top-8 w-[52%] sm:right-2"
        }
      >
        {side.imageKey ? (
          // Server component: a ready URL, not the loader function (functions can't cross to the client)
          <Image
            unoptimized
            src={imageUrl(side.imageKey, 800)}
            alt={side.imageAlt}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className={dark ? "object-contain p-4" : "object-contain object-bottom mix-blend-multiply transition-transform duration-500 group-hover:scale-[1.04]"}
          />
        ) : (
          <span className="absolute bottom-6 right-6">
            <DeviceArt kind={side.kind} color={dark ? "#3B1CC9" : "#5A606C"} cameras={3} width={side.kind === "LAPTOP" ? 220 : 120} />
          </span>
        )}
      </div>
    </Link>
  );
}

/**
 * Two doors, the two categories Bonétat leads with. No search box (it's in the header),
 * no illustration: real photos, real starting prices, real savings.
 */
export default function HomeHero({ phones, laptops }: { phones: HeroSide; laptops: HeroSide }) {
  return (
    <section aria-labelledby="hero-title" className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 id="hero-title" className="max-w-[16em] text-[38px] font-semibold leading-[1.05] tracking-[-0.04em] sm:text-[56px]">
          Le bon état, vérifié pour vous.
        </h1>
        <p className="max-w-[36em] text-[17px] leading-relaxed text-ink-muted">
          Téléphones et ordinateurs reconditionnés par des ateliers tunisiens, contrôlés par Bonétat, garantis 12 mois.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel side={phones} dark />
        <Panel side={laptops} dark={false} />
      </div>

      <ul className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-[15px] text-ink-soft">
        <li className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-brand" aria-hidden="true" /> Contrôlé avant la mise en vente</li>
        <li className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-brand" aria-hidden="true" /> Garantie 12 mois</li>
        <li className="flex items-center gap-2"><Banknote className="h-5 w-5 text-brand" aria-hidden="true" /> Paiement à la livraison</li>
      </ul>
    </section>
  );
}
