"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/account", label: "Mes commandes", key: "orders" },
  { href: "/account/appareils", label: "Mes appareils", key: "devices" },
  { href: "/account/suivi", label: "Suivi des prix", key: "follows" },
  { href: "/account/adresses", label: "Mes adresses", key: "addresses" },
  { href: "/account/profil", label: "Mon profil", key: "profile" },
] as const;

export default function AccountNav({
  badges,
  extra,
}: {
  badges: Partial<Record<(typeof ITEMS)[number]["key"], string>>;
  extra: { href: string; label: string } | null;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/account" ? pathname === "/account" || pathname.startsWith("/account/orders") : pathname.startsWith(href));
  return (
    <nav aria-label="Mon espace" className="flex gap-0.5 overflow-x-auto rounded-[26px] border border-line bg-white p-2.5 lg:flex-col">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(item.href) ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 whitespace-nowrap rounded-[14px] px-3.5 py-3 text-[15px] transition hover:bg-chalk",
            isActive(item.href) && "bg-brand-tint font-medium text-brand hover:bg-brand-tint"
          )}
        >
          <span className="flex-1">{item.label}</span>
          {badges[item.key] && <span className="text-[13px] font-normal text-ink-muted">{badges[item.key]}</span>}
        </Link>
      ))}
      {extra && (
        <Link href={extra.href} className="mt-1 whitespace-nowrap rounded-[14px] border-t border-line px-3.5 py-3 text-[15px] text-ink-muted hover:bg-chalk lg:mt-2 lg:rounded-none lg:rounded-b-[14px] lg:pt-4">
          {extra.label}
        </Link>
      )}
    </nav>
  );
}
