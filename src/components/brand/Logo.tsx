/* eslint-disable @next/next/no-img-element -- static SVG brand files, nothing for next/image to optimize */
import Link from "next/link";
import { cn } from "@/lib/utils";

// The "Envol double" mark: a B with two rising arrows cut out, blue to violet gradient.
// Files: public/brand/mark.svg (gradient), mark-white.svg, mark-black.svg (print), app-icon.svg.

const MARK = { gradient: "/brand/mark.svg", white: "/brand/mark-white.svg", black: "/brand/mark-black.svg" } as const;

/** The B alone. Height drives the size (the mark is 92 × 120). */
export function LogoMark({ className, variant = "gradient" }: { className?: string; variant?: keyof typeof MARK }) {
  return <img src={MARK[variant]} alt="" aria-hidden="true" className={cn("h-[34px] w-auto flex-none", className)} />;
}

/** "Bonétat" with the accent drawn as the brand's gradient stroke */
export function Wordmark({ tone = "ink", className }: { tone?: "ink" | "white" | "black"; className?: string }) {
  const accent =
    tone === "black" ? "#000" : tone === "white" ? "linear-gradient(90deg, #4C82FF, #9466FF)" : "linear-gradient(90deg, #2F6CFC, #7A44F5)";
  return (
    <span className={cn("font-bold leading-none tracking-[-0.035em]", tone === "white" ? "text-white" : tone === "black" ? "text-black" : "text-ink", className)}>
      Bon
      <span className="relative inline-block">
        e
        <span aria-hidden="true" className="absolute left-[.16em] top-[.1em] h-[.105em] w-[.3em] rotate-[-36deg] rounded-[.06em]" style={{ background: accent }} />
      </span>
      tat
    </span>
  );
}

export default function Logo({ href = "/", tone = "ink", suffix, tagline }: { href?: string; tone?: "ink" | "white"; suffix?: string; tagline?: boolean }) {
  return (
    <Link href={href} aria-label="Bonétat, accueil" className="flex items-center gap-2.5">
      <LogoMark />
      <span className="flex flex-col gap-1">
        <span className="flex items-baseline">
          <Wordmark tone={tone} className="text-[24px]" />
          {suffix && <span className={cn("ml-2 text-[15px] font-normal tracking-normal opacity-60", tone === "white" ? "text-white" : "text-ink")}>{suffix}</span>}
        </span>
        {tagline && (
          <span className={cn("pl-px text-[9px] tracking-[0.22em]", tone === "white" ? "text-[#A99BFF]" : "text-[#3B1CC9]")}>TECH RECONDITIONNÉ • TUNISIE</span>
        )}
      </span>
    </Link>
  );
}
