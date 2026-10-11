import Link from "next/link";
import Image from "next/image";
import type { DeviceKind } from "@prisma/client";
import { ArrowRight, Banknote, ClipboardCheck, ShieldCheck } from "lucide-react";
import { formatPrice } from "@/lib/money";
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
  /** A transparent product photo, ready URL; null → illustration */
  imageSrc: string | null;
  imageAlt: string;
};

/** The one call to action of each block: plain white, violet text, the arrow inline */
function Cta({ label }: { label: string }) {
  return (
    <span className="inline-flex h-12 w-fit items-center gap-2.5 rounded-control bg-white px-5 text-[15px] font-semibold text-brand-dark transition-all group-hover:gap-3.5">
      {label}
      <ArrowRight className="h-[18px] w-[18px]" aria-hidden="true" />
    </span>
  );
}

function Photo({ side, className, sizes }: { side: HeroSide; className: string; sizes: string }) {
  return side.imageSrc ? (
    // Server component: a ready URL, not the loader function (functions can't cross to the client)
    <Image unoptimized src={side.imageSrc} alt={side.imageAlt} fill sizes={sizes} className={className} priority />
  ) : (
    <span className="absolute inset-0 grid place-items-center">
      <DeviceArt kind={side.kind} color="#C9D3F5" cameras={3} width={side.kind === "LAPTOP" ? 220 : 130} />
    </span>
  );
}

/**
 * Full width, two blocks of different widths: phones (the wide one, carrying the headline) and
 * computers. Real cut-out product photos on dark grounds, real prices and savings, one CTA each.
 */
export default function HomeHero({ phones, laptops }: { phones: HeroSide; laptops: HeroSide }) {
  return (
    <section aria-labelledby="hero-title" className="flex flex-col gap-5">
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Phones: the lineup scene fills the block (navy, glow and reflection are in the image, so the
            block's navy is fixed to the image's, whatever the theme);
            the text sits on its empty left side. On a phone, the scene goes under the text. */}
        <Link
          href={phones.href}
          className="group relative flex min-h-[420px] flex-col overflow-hidden rounded-panel bg-[#0B1233] p-7 text-white sm:min-h-[500px] sm:p-12 lg:col-span-2"
        >
          {phones.imageSrc && (
            <Image
              unoptimized
              src={phones.imageSrc}
              alt={phones.imageAlt}
              fill
              priority
              className="!static !h-[220px] object-cover object-right sm:!absolute sm:!h-full sm:transition-transform sm:duration-700 sm:group-hover:scale-[1.02]"
            />
          )}
          {/* Navy behind the text, fading out before the phones: readable at any width */}
          <span aria-hidden="true" className="absolute inset-y-0 left-0 hidden w-[60%] bg-[linear-gradient(90deg,#0B1233_45%,rgba(11,18,51,0))] sm:block" />
          <div className="relative z-[1] order-first flex max-w-full flex-1 flex-col sm:max-w-[44%]">
            <span className="w-fit rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-medium text-white/90 ring-1 ring-white/15">Ateliers tunisiens vérifiés par Bonétat</span>
            <h1 id="hero-title" className="mt-5 text-[38px] font-bold leading-[1.02] tracking-[-0.04em] sm:text-[52px]">
              Le bon état, vérifié pour vous.
            </h1>
            <p className="mt-4 text-[16px] leading-relaxed text-white/75">
              {phones.title} {phones.brands}, garantis par l’atelier qui les vend et payés à la livraison.
            </p>
            <div className="mt-auto flex flex-col gap-4 pt-8">
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                {phones.floorMillimes !== null && <span className="text-[15px] text-white/75">dès <b className="text-[30px] font-bold tracking-[-0.03em] text-white">{formatPrice(phones.floorMillimes)}</b></span>}
                {phones.maxDiscount > 0 && <span className="rounded-full bg-gain px-2.5 py-1 text-[13px] font-semibold">jusqu’à −{phones.maxDiscount} %</span>}
              </p>
              <Cta label={`${phones.cta} (${phones.count})`} />
            </div>
          </div>
        </Link>

        {/* Computers: brand blue */}
        <Link
          href={laptops.href}
          className="group relative flex min-h-[420px] flex-col overflow-hidden rounded-panel bg-[linear-gradient(160deg,rgb(var(--brand)),rgb(var(--brand-dark)))] p-7 text-white sm:min-h-[500px] sm:p-10"
        >
          <div className="relative z-[1]">
            <h2 className="text-[32px] font-bold leading-[1.05] tracking-[-0.035em]">{laptops.title}</h2>
            <p className="mt-2 text-[15px] text-white/75">{laptops.brands}</p>
            {laptops.maxDiscount > 0 && <span className="mt-4 inline-block rounded-full bg-white px-2.5 py-1 text-[13px] font-semibold text-brand-dark">jusqu’à −{laptops.maxDiscount} % vs le neuf</span>}
          </div>
          <div className="relative my-4 min-h-[170px] flex-1">
            <Photo side={laptops} sizes="30vw" className="object-contain drop-shadow-[0_24px_30px_rgba(0,0,0,.4)] transition-transform duration-500 group-hover:scale-[1.04]" />
          </div>
          <div className="relative z-[1] flex flex-col gap-4">
            {laptops.floorMillimes !== null && <span className="text-[15px] text-white/75">dès <b className="text-[26px] font-bold tracking-[-0.03em] text-white">{formatPrice(laptops.floorMillimes)}</b></span>}
            <Cta label={`${laptops.cta} (${laptops.count})`} />
          </div>
        </Link>
      </div>

      <ul className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-[15px] text-ink-soft">
        <li className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-brand-dark" aria-hidden="true" /> Annonces vérifiées avant publication</li>
        <li className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-brand-dark" aria-hidden="true" /> Garantie de 4 mois minimum</li>
        <li className="flex items-center gap-2"><Banknote className="h-5 w-5 text-brand-dark" aria-hidden="true" /> Paiement à la livraison</li>
      </ul>
    </section>
  );
}
