/* eslint-disable @next/next/no-img-element -- static SVG brand files, nothing for next/image to optimize */
import Link from "next/link";
import { useId } from "react";
import { cn } from "@/lib/utils";

// The "Envol double" mark: a B with two rising arrows cut out. The gradient variant is drawn inline so its
// colors follow the active theme (--logo-a/b/c in globals.css). White and black variants are plain files.
// Static copies for outside the app: public/brand/mark.svg, mark-white.svg, mark-black.svg, app-icon.svg.

const FILE = { white: "/brand/mark-white.svg", black: "/brand/mark-black.svg" } as const;
const B = "M12 0H52C69 0 80 11 80 26C80 35 76.5 42 70 47C84 52 92 64 92 80C92 103 76 120 52 120H14C6 120 0 114 0 106V12C0 5 5 0 12 0Z";

/** The B alone. Height drives the size (the mark is 92 × 120). */
export function LogoMark({ className, variant = "gradient" }: { className?: string; variant?: "gradient" | keyof typeof FILE }) {
  const id = useId().replace(/:/g, "");
  if (variant !== "gradient") return <img src={FILE[variant]} alt="" aria-hidden="true" className={cn("h-[34px] w-auto flex-none", className)} />;
  return (
    <svg viewBox="0 0 92 120" aria-hidden="true" className={cn("h-[34px] w-auto flex-none", className)}>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgb(var(--logo-a))" />
          <stop offset=".52" stopColor="rgb(var(--logo-b))" />
          <stop offset="1" stopColor="rgb(var(--logo-c))" />
        </linearGradient>
        <mask id={`m${id}`} maskUnits="userSpaceOnUse" x="0" y="0" width="92" height="120">
          <path d={B} fill="#fff" />
          <path d="M-8 104Q34 100 62.1 65.3" fill="none" stroke="#000" strokeWidth="11" strokeLinecap="round" />
          <polygon points="69.7,56 67.1,82.2 44.5,64" fill="#000" stroke="#000" strokeWidth="3" strokeLinejoin="round" />
          <path d="M-8 54.4Q20 52 32.4 32.5" fill="none" stroke="#000" strokeWidth="9" strokeLinecap="round" />
          <polygon points="38.8,22.4 39.4,42.9 20,30.6" fill="#000" stroke="#000" strokeWidth="3" strokeLinejoin="round" />
        </mask>
      </defs>
      <rect width="92" height="120" fill={`url(#g${id})`} mask={`url(#m${id})`} />
    </svg>
  );
}

/** "Bonétat" with the accent drawn as the brand's gradient stroke */
export function Wordmark({ tone = "ink", className }: { tone?: "ink" | "white" | "black"; className?: string }) {
  const accent =
    tone === "black" ? "#000" : "linear-gradient(90deg, rgb(var(--logo-a)), rgb(var(--logo-c)))";
  return (
    <span className={cn("font-brand font-bold leading-none tracking-[-0.035em]", tone === "white" ? "text-white" : tone === "black" ? "text-black" : "text-ink", className)}>
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
          <span className={cn("pl-px text-[9px] tracking-[0.22em]", tone === "white" ? "text-[rgb(var(--logo-a))]" : "text-[rgb(var(--logo-b))]")}>TECH RECONDITIONNÉ • TUNISIE</span>
        )}
      </span>
    </Link>
  );
}
