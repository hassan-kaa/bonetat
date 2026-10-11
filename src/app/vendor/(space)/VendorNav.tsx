"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/vendor/dashboard", label: "Tableau de bord" },
  { href: "/vendor/orders", label: "Commandes à expédier", badge: true },
  { href: "/vendor/listings", label: "Mes offres" },
  { href: "/vendor/listings/new", label: "Publier une offre" },
  { href: "/vendor/payouts", label: "Paiements" },
  { href: "/vendor/profile", label: "Profil de l’atelier" },
];

export default function VendorNav({ toShip }: { toShip: number }) {
  const pathname = usePathname();
  const active = (href: string) =>
    href === "/vendor/listings" ? pathname === href || /^\/vendor\/listings\/(?!new)/.test(pathname) : pathname === href;
  return (
    <nav aria-label="Espace partenaire" className="flex gap-0.5 overflow-x-auto lg:flex-col">
      {ITEMS.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={active(i.href) ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 whitespace-nowrap rounded-control px-3.5 py-3 text-[15px] text-white/80 transition hover:bg-white/[.07]",
            active(i.href) && "bg-white font-medium text-ink hover:bg-white"
          )}
        >
          <span className="flex-1">{i.label}</span>
          {i.badge && toShip > 0 && (
            <span className="grid h-[22px] min-w-[22px] place-items-center rounded-full bg-pop px-1.5 text-xs font-semibold text-white">{toShip}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}
