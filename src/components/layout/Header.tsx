"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, Search, ShoppingBag, User, X } from "lucide-react";
import Logo from "@/components/brand/Logo";
import { cartCount, useCart } from "@/store/cart";
import { useHydrated } from "@/hooks/useHydrated";
import { cn } from "@/lib/utils";

export type NavUser = {
  name: string | null;
  role: "BUYER" | "VENDOR" | "ADMIN";
  vendorApproved: boolean;
} | null;

export type NavCategory = { slug: string; nameFr: string; kind: string };

export default function Header({ user, categories }: { user: NavUser; categories: NavCategory[] }) {
  const [open, setOpen] = useState(false);
  const items = useCart((s) => s.items);
  const hydrated = useHydrated();
  const count = hydrated ? cartCount(items) : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="container-page flex flex-wrap items-center gap-x-7 gap-y-3 py-3.5">
        <Logo />

        <form action="/catalog" method="get" role="search" className="order-last w-full md:order-none md:w-auto md:flex-1">
          <label className="flex h-[46px] items-center gap-2.5 rounded-full bg-[#F0F3F9] px-[18px] text-ink-muted focus-within:ring-[3px] focus-within:ring-pop">
            <Search className="h-[18px] w-[18px] flex-none" aria-hidden="true" />
            <input
              name="q"
              aria-label="Rechercher un appareil"
              placeholder="iPhone 13, iPad Air, MacBook, Apple Watch…"
              className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-muted"
            />
          </label>
        </form>

        <nav className="ml-auto flex items-center gap-1 md:ml-0" aria-label="Compte">
          {user?.role === "ADMIN" && (
            <Link href="/admin" className="hidden rounded-full px-3.5 py-2.5 text-[15px] text-ink-muted hover:bg-chalk sm:block">
              Admin
            </Link>
          )}
          {user?.role === "VENDOR" && user.vendorApproved ? (
            <Link href="/vendor/dashboard" className="hidden rounded-full px-3.5 py-2.5 text-[15px] text-ink-muted hover:bg-chalk sm:block">
              Espace partenaire
            </Link>
          ) : !user || user.role === "BUYER" ? (
            <Link href="/vendor/apply" className="hidden rounded-full px-3.5 py-2.5 text-[15px] text-ink-muted hover:bg-chalk lg:block">
              Devenir partenaire
            </Link>
          ) : null}
          <Link
            href={user ? "/account" : "/auth/login"}
            className="flex items-center gap-2 rounded-full px-3.5 py-2.5 text-[15px] font-medium hover:bg-chalk"
          >
            <User className="h-5 w-5" aria-hidden="true" />
            <span className="hidden sm:inline">{user ? "Mon espace" : "Connexion"}</span>
          </Link>
          <Link href="/cart" className="flex items-center gap-2 rounded-full px-3.5 py-2.5 text-[15px] font-medium hover:bg-chalk" aria-label={`Panier, ${count} article${count > 1 ? "s" : ""}`}>
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            <span className="hidden sm:inline">Panier</span>
            {count > 0 && (
              <span className="grid h-[22px] min-w-[22px] place-items-center rounded-full bg-pop px-1.5 text-xs font-semibold text-white">
                {count}
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="grid h-11 w-11 place-items-center rounded-full hover:bg-chalk md:hidden"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>
      </div>

      <div className={cn("container-page pb-3 md:block", open ? "block" : "hidden")}>
        <nav aria-label="Catégories" className="flex flex-col gap-1 text-[15px] md:flex-row md:flex-wrap md:gap-x-6 md:gap-y-1 md:text-sm">
          {navItems(categories).map((c) => (
            <Link
              key={c.href}
              href={c.href}
              onClick={() => setOpen(false)}
              className="py-1.5 text-ink-muted hover:text-ink md:py-0"
            >
              {c.nameFr}
            </Link>
          ))}
          <Link href="/grading" onClick={() => setOpen(false)} className="py-1.5 text-ink-muted hover:text-ink md:py-0">
            Comment on contrôle
          </Link>
        </nav>
      </div>
    </header>
  );
}

/** Phones, then every laptop (MacBook and PC) as one "Ordinateurs" entry, then the rest */
function navItems(categories: NavCategory[]) {
  const item = (c: NavCategory) => ({ href: `/catalog?category=${c.slug}`, nameFr: c.nameFr });
  return [
    ...categories.filter((c) => c.kind === "PHONE").map(item),
    ...(categories.some((c) => c.kind === "LAPTOP") ? [{ href: "/catalog?type=laptop", nameFr: "Ordinateurs" }] : []),
    ...categories.filter((c) => c.kind !== "PHONE" && c.kind !== "LAPTOP").map(item),
  ];
}
