import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid h-[34px] w-[34px] flex-none place-items-center rounded-[11px] bg-brand text-[20px] font-bold leading-none text-white",
        className
      )}
      aria-hidden="true"
    >
      b
    </span>
  );
}

export default function Logo({ href = "/", tone = "ink", suffix }: { href?: string; tone?: "ink" | "white"; suffix?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5", tone === "white" ? "text-white" : "text-ink")}>
      <LogoMark />
      <span className="text-[22px] font-bold tracking-[-0.03em]">
        bonétat
        {suffix && <span className="ml-1.5 text-[15px] font-normal tracking-normal opacity-60">{suffix}</span>}
      </span>
    </Link>
  );
}
