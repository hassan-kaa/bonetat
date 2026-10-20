import Link from "next/link";
import type { Metadata } from "next";
import type { DeviceKind, Prisma } from "@prisma/client";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { displayName } from "@/lib/catalog";
import { normalize } from "@/lib/icecat-match";
import { SELLABLE } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Photos du catalogue" };

const PER_PAGE = 50;

const SHOW = {
  none: "Sans photo",
  urgent: "En vente sans photo",
  all: "Tous",
} as const;
type Show = keyof typeof SHOW;

const KINDS: Record<DeviceKind, string> = { PHONE: "Téléphones", TABLET: "Tablettes", LAPTOP: "PC portables", WATCH: "Montres", CONSOLE: "Consoles", OTHER: "Autres" };

type Search = { show?: string; kind?: string; brand?: string; q?: string; page?: string };

/**
 * The photo to-do list: models without a photo first, the ones buyers can order right now on top of the
 * "En vente sans photo" filter. Filters are in the address, so a filtered list survives a reload or a link.
 */
export default async function CatalogCoverage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const show: Show = sp.show && sp.show in SHOW ? (sp.show as Show) : "none";
  const kind = sp.kind && sp.kind in KINDS ? (sp.kind as DeviceKind) : undefined;
  const brand = sp.brand || undefined;
  const q = sp.q?.trim() ? normalize(sp.q) : "";
  const page = Math.max(1, Number(sp.page) || 1);

  const base: Prisma.ProductWhereInput = {
    status: { not: "MERGED" },
    ...(kind ? { kind } : {}),
    ...(brand ? { brand } : {}),
    ...(q ? { searchText: { contains: q } } : {}),
  };
  const noPhoto: Prisma.ProductWhereInput = { images: { none: { status: "APPROVED" } } };
  const onSale: Prisma.ProductWhereInput = { variants: { some: { offers: { some: SELLABLE } } } };
  const filters: Record<Show, Prisma.ProductWhereInput> = {
    none: { ...base, ...noPhoto },
    urgent: { ...base, ...noPhoto, ...onSale },
    all: base,
  };

  const [counts, total, products, brands] = await Promise.all([
    Promise.all((Object.keys(SHOW) as Show[]).map((s) => prisma.product.count({ where: filters[s] }))),
    prisma.product.count({ where: filters[show] }),
    prisma.product.findMany({
      where: filters[show],
      orderBy: [{ brand: "asc" }, { model: "asc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        images: { where: { status: "APPROVED" }, select: { finishId: true } },
        finishes: {
          orderBy: { position: "asc" },
          include: {
            images: { where: { status: "APPROVED" }, select: { angle: true } },
            variants: { select: { _count: { select: { offers: { where: SELLABLE } } } } },
          },
        },
      },
    }),
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const href = (over: Partial<Search>) => {
    const p = new URLSearchParams();
    const next = { show, kind, brand, q: sp.q, page: String(page), ...over };
    for (const [k, v] of Object.entries(next)) if (v && !(k === "page" && v === "1") && !(k === "show" && v === "none")) p.set(k, v);
    return `/admin/catalog${p.size ? `?${p}` : ""}`;
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Photos du catalogue</h1>
          <p className="mt-1.5 max-w-[46em] text-[15px] text-ink-muted">
            Un modèle sans photo s’affiche en illustration. Commencez par « En vente sans photo » : ce sont ceux que les acheteurs voient en ce moment.
          </p>
        </div>
        <Link href="/admin/catalog/new" className="btn-primary btn-sm">
          <Plus className="h-4 w-4" aria-hidden="true" /> Ajouter un produit
        </Link>
      </div>

      <nav aria-label="Filtre" className="flex flex-wrap gap-2">
        {(Object.keys(SHOW) as Show[]).map((s, i) => (
          <Link key={s} href={href({ show: s, page: "1" })} aria-current={show === s ? "page" : undefined} className={cn("opt flex items-center gap-2 px-4 py-2 text-sm", show === s && "opt-on")}>
            {SHOW[s]}
            <span className={cn("pill", s === "urgent" && counts[i] > 0 ? "bg-pop-tint text-pop-dark" : "bg-chalk text-ink-muted")}>{counts[i]}</span>
          </Link>
        ))}
      </nav>

      <form method="get" className="flex flex-wrap items-end gap-2.5">
        {show !== "none" && <input type="hidden" name="show" value={show} />}
        <label className="field min-w-[200px] flex-1">
          Rechercher
          <input className="input" name="q" defaultValue={sp.q ?? ""} placeholder="Latitude 7450, Galaxy S23…" />
        </label>
        <label className="field">
          Type
          <select className="input" name="kind" defaultValue={kind ?? ""}>
            <option value="">Tous</option>
            {(Object.keys(KINDS) as DeviceKind[]).map((k) => <option key={k} value={k}>{KINDS[k]}</option>)}
          </select>
        </label>
        <label className="field">
          Marque
          <select className="input" name="brand" defaultValue={brand ?? ""}>
            <option value="">Toutes</option>
            {brands.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
          </select>
        </label>
        <button type="submit" className="btn-secondary btn-sm h-[46px]">Filtrer</button>
      </form>

      {products.length === 0 ? (
        <p className="rounded-panel border border-dashed border-line-strong bg-white p-8 text-center text-ink-muted">Aucun modèle avec ces filtres.</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-white">
          {products.map((p) => {
            const offers = p.finishes.reduce((n, f) => n + f.variants.reduce((m, v) => m + v._count.offers, 0), 0);
            const modelPhoto = p.images.some((i) => i.finishId === null);
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{displayName(p)}</p>
                  <p className="text-[13px] text-ink-muted">
                    {KINDS[p.kind]} · {p.finishes.length ? `${p.finishes.length} couleur${p.finishes.length > 1 ? "s" : ""}` : "aucune couleur"}
                    {modelPhoto && " · photo du modèle"}
                    {offers > 0 && <span className="font-medium text-pop-dark"> · {offers} en vente</span>}
                  </p>
                </div>
                <span className="flex flex-wrap gap-1.5" aria-label="Couleurs">
                  {p.finishes.map((f) => {
                    const front = f.images.some((i) => i.angle === "FRONT");
                    return (
                      <span
                        key={f.id}
                        title={`${f.nameFr} : ${front ? "photo" : "illustration"}`}
                        className={cn("h-5 w-5 rounded-full border-2", front ? "border-gain" : "border-dashed border-ink/30")}
                        style={{ background: f.hex }}
                      />
                    );
                  })}
                </span>
                <Link href={`/admin/catalog/${p.slug}`} className="btn-secondary btn-sm">{show === "all" ? "Photos" : "Ajouter des photos"}</Link>
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-between gap-3 text-sm">
          {page > 1 ? <Link href={href({ page: String(page - 1) })} className="btn-secondary btn-sm">Précédent</Link> : <span />}
          <span className="text-ink-muted">Page {page} sur {pages} · {total} modèles</span>
          {page < pages ? <Link href={href({ page: String(page + 1) })} className="btn-secondary btn-sm">Suivant</Link> : <span />}
        </nav>
      )}
    </>
  );
}
