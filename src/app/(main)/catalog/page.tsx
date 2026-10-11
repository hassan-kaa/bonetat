import Link from "next/link";
import type { Metadata } from "next";
import type { ConditionGrade, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getVariantCards } from "@/lib/queries";
import { GRADES, GRADE_ORDER } from "@/lib/catalog";
import VariantCard from "@/components/products/VariantCard";
import { Check, X } from "lucide-react";
import { CPU_ORDER } from "@/lib/pc-filters";
import AutoSubmitSelect from "./AutoSubmitSelect";
import PriceRange from "./PriceRange";
import { FiltersButton, FiltersPanel } from "./FiltersDrawer";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Catalogue" };

const PAGE_SIZE = 24;
const SORTS = [
  { value: "deal", label: "Plus grosses économies" },
  { value: "price-asc", label: "Prix croissant" },
  { value: "price-desc", label: "Prix décroissant" },
  { value: "new", label: "Nouveautés" },
] as const;
/** Multi-select filters: comma lists in the URL, values combined with OR */
type ListKey = "grade" | "brand" | "ram" | "ssd" | "cpu";

type Search = {
  q?: string; category?: string; type?: string; sort?: string; page?: string;
  grade?: string; brand?: string; ram?: string; ssd?: string; cpu?: string; gpu?: string; min?: string; max?: string;
};
type Card = Awaited<ReturnType<typeof getVariantCards>>[number];
type Filters = { brand: string[]; ram: string[]; ssd: string[]; cpu: string[]; gpu: boolean; min?: number; max?: number };

const list = (v?: string) => (v ?? "").split(",").map((x) => x.trim()).filter(Boolean);
const dt = (millimes: number) => Math.round(millimes / 1000);
const ssdLabel = (gb: number) => (gb >= 1000 ? `${gb / 1000} To` : `${gb} Go`);

/** Every filter except `skip`: facet counts show what each choice would give with the others kept */
function applyFilters(cards: Card[], f: Filters, skip?: keyof Filters) {
  return cards.filter((c) =>
    (skip === "brand" || !f.brand.length || f.brand.includes(c.brand)) &&
    (skip === "ram" || !f.ram.length || f.ram.includes(String(c.ramGb))) &&
    (skip === "ssd" || !f.ssd.length || f.ssd.includes(String(c.storageGb))) &&
    (skip === "cpu" || !f.cpu.length || (c.cpu && f.cpu.includes(c.cpu.id))) &&
    (skip === "gpu" || !f.gpu || c.gpu) &&
    (skip === "min" || f.min === undefined || dt(c.priceMillimes) >= f.min) &&
    (skip === "max" || f.max === undefined || dt(c.priceMillimes) <= f.max)
  );
}

function countBy<T extends string | number>(cards: Card[], key: (c: Card) => T | null | undefined) {
  const m = new Map<T, number>();
  for (const c of cards) {
    const k = key(c);
    if (k !== null && k !== undefined) m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

export default async function CatalogPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const grades = list(sp.grade).filter((g): g is ConditionGrade => GRADE_ORDER.includes(g as ConditionGrade));
  const sort = (SORTS.find((s) => s.value === sp.sort)?.value ?? "deal") as (typeof SORTS)[number]["value"];
  const page = Math.max(1, Number(sp.page) || 1);
  const laptops = sp.type === "laptop";
  const f: Filters = {
    brand: list(sp.brand), ram: list(sp.ram), ssd: list(sp.ssd), cpu: list(sp.cpu), gpu: sp.gpu === "1",
    min: Number(sp.min) || undefined, max: Number(sp.max) || undefined,
  };

  const where: Prisma.ProductWhereInput = {};
  if (sp.category) where.category = { slug: sp.category };
  else if (laptops) where.kind = "LAPTOP";
  else if (sp.type === "phone") where.kind = "PHONE";
  const tokens = (sp.q ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 5);
  if (tokens.length) {
    where.AND = tokens.map((t) => ({
      OR: [
        { model: { contains: t, mode: "insensitive" } },
        { brand: { contains: t, mode: "insensitive" } },
        { category: { nameFr: { contains: t, mode: "insensitive" } } },
      ],
    }));
  }

  // One query for the scope (category, search, grades); every other filter is applied here so facets stay consistent
  const [categories, all, user] = await Promise.all([
    prisma.category.findMany({ orderBy: { position: "asc" } }),
    getVariantCards({ where, grades, sort }),
    getSessionUser(),
  ]);
  const followed = user
    ? new Set((await prisma.favorite.findMany({ where: { userId: user.id }, select: { variantId: true } })).map((f) => f.variantId))
    : new Set<string>();

  const category = categories.find((c) => c.slug === sp.category);
  const isLaptopView = laptops || category?.kind === "LAPTOP";
  const cards = applyFilters(all, f);
  const pages = Math.max(1, Math.ceil(cards.length / PAGE_SIZE));
  const shown = cards.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Facets
  const brandCounts = countBy(applyFilters(all, f, "brand"), (c) => c.brand);
  const ramCounts = countBy(applyFilters(all, f, "ram"), (c) => c.ramGb);
  const ssdCounts = countBy(applyFilters(all, f, "ssd"), (c) => c.storageGb);
  const cpuPool = applyFilters(all, f, "cpu");
  const cpuCounts = countBy(cpuPool, (c) => c.cpu?.id);
  const cpuLabels = new Map(cpuPool.flatMap((c) => (c.cpu ? [[c.cpu.id, c.cpu.label] as const] : [])));
  const gpuCount = applyFilters(all, f, "gpu").filter((c) => c.gpu).length;
  // Bounds ignore the price filter itself, so the slider keeps its scale while you drag it
  const pricePool = applyFilters(all, { ...f, min: undefined, max: undefined }).map((c) => dt(c.priceMillimes));
  const floor = pricePool.length ? Math.floor(Math.min(...pricePool) / 10) * 10 : 0;
  const ceil = pricePool.length ? Math.ceil(Math.max(...pricePool) / 10) * 10 : 0;

  const href = (patch: Partial<Search>) => {
    const q = new URLSearchParams();
    const merged = { ...sp, page: undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, String(v));
    const s = q.toString();
    return `/catalog${s ? `?${s}` : ""}`;
  };
  /** Add or remove one value of a multi-select filter */
  const toggle = (key: ListKey, value: string) => {
    const cur = list(sp[key]);
    const next = cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value];
    return href({ [key]: next.join(",") || undefined });
  };
  const cleared = href({ grade: undefined, brand: undefined, ram: undefined, ssd: undefined, cpu: undefined, gpu: undefined, min: undefined, max: undefined, q: undefined });

  // What is active, as removable chips above the results
  const active: { label: string; href: string }[] = [
    ...(sp.q ? [{ label: `« ${sp.q} »`, href: href({ q: undefined }) }] : []),
    ...grades.map((g) => ({ label: GRADES[g].label, href: toggle("grade", g) })),
    ...f.brand.map((b) => ({ label: b, href: toggle("brand", b) })),
    ...f.ram.map((r) => ({ label: `${r} Go de RAM`, href: toggle("ram", r) })),
    ...f.ssd.map((x) => ({ label: `SSD ${ssdLabel(Number(x))}`, href: toggle("ssd", x) })),
    ...f.cpu.map((x) => ({ label: cpuLabels.get(x) ?? x, href: toggle("cpu", x) })),
    ...(f.gpu ? [{ label: "Carte graphique dédiée", href: href({ gpu: undefined }) }] : []),
    ...(f.min || f.max ? [{ label: `${f.min ?? floor} à ${f.max ?? ceil} DT`, href: href({ min: undefined, max: undefined }) }] : []),
  ];

  const title = sp.q ? `Résultats pour « ${sp.q} »` : category ? category.nameFr : laptops ? "Ordinateurs portables" : sp.type === "phone" ? "Téléphones" : "Tout le catalogue";
  const phones = categories.filter((c) => c.kind === "PHONE");
  const laptopCats = categories.filter((c) => c.kind === "LAPTOP");
  const rest = categories.filter((c) => c.kind !== "PHONE" && c.kind !== "LAPTOP");
  const chip = (on: boolean) => cn("whitespace-nowrap rounded-full px-4 py-2 text-sm", on ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-line hover:ring-line-strong");
  const pill = (on: boolean) => cn("rounded-full px-3 py-1.5 text-sm ring-1", on ? "bg-brand text-white ring-brand" : "ring-line hover:ring-line-strong");
  const scope = { brand: undefined, ram: undefined, ssd: undefined, cpu: undefined, gpu: undefined, min: undefined, max: undefined };

  return (
    <div className="container-page pb-6 pt-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="mt-1.5 text-[15px] text-ink-muted">
            {cards.length} configuration{cards.length > 1 ? "s" : ""} disponible{cards.length > 1 ? "s" : ""}, chacune au meilleur prix du moment
          </p>
        </div>
        <form action="/catalog" method="get" className="flex items-center gap-2">
          {Object.entries(sp).filter(([k, v]) => v && k !== "sort" && k !== "page").map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <FiltersButton count={active.length} />
          <label htmlFor="sort" className="text-sm text-ink-muted">Trier</label>
          <AutoSubmitSelect id="sort" name="sort" defaultValue={sort} options={SORTS.map((s) => ({ value: s.value, label: s.label }))} />
        </form>
      </div>

      {/* Category chips: phones, then computers, then the rest */}
      <nav aria-label="Catégories" className="mb-5 flex gap-2 overflow-x-auto pb-1">
        <Link href={href({ ...scope, category: undefined, type: undefined })} className={chip(!sp.category && !laptops)}>Tout</Link>
        {phones.map((c) => <Link key={c.id} href={href({ ...scope, category: c.slug, type: undefined })} className={chip(sp.category === c.slug)}>{c.nameFr}</Link>)}
        <Link href={href({ ...scope, category: undefined, type: "laptop" })} className={chip(laptops && !sp.category)}>Ordinateurs</Link>
        {laptopCats.map((c) => <Link key={c.id} href={href({ ...scope, category: c.slug, type: "laptop" })} className={chip(sp.category === c.slug)}>{c.nameFr}</Link>)}
        {rest.map((c) => <Link key={c.id} href={href({ ...scope, category: c.slug, type: undefined })} className={chip(sp.category === c.slug)}>{c.nameFr}</Link>)}
      </nav>

      <div className="flex flex-wrap items-start gap-8">
        <FiltersPanel results={cards.length}>
          <div className="flex items-baseline justify-between pr-12 lg:pr-0">
            <h2 className="text-base font-semibold">Filtres</h2>
            {active.length > 0 && <Link href={cleared} className="text-sm font-medium text-brand-dark hover:underline">Tout effacer</Link>}
          </div>

          <fieldset>
            <legend className="mb-2.5 text-sm font-semibold">État</legend>
            <div className="flex flex-wrap gap-2 lg:flex-col">
              {[...GRADE_ORDER].map((g) => {
                const on = grades.includes(g);
                return (
                  <Link key={g} href={toggle("grade", g)} role="checkbox" aria-checked={on} className={cn("flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm", on ? "bg-brand-tint font-medium text-brand-dark" : "hover:bg-chalk")}>
                    <span aria-hidden="true" className={cn("grid h-4 w-4 flex-none place-items-center rounded border-[1.5px]", on ? "border-brand bg-brand text-white" : "border-line-strong")}>
                      {on && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    <span className="meter w-8">{[1, 2, 3, 4].map((i) => <span key={i} data-on={i <= GRADES[g].level} />)}</span>
                    {GRADES[g].label}
                  </Link>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-3 text-sm font-semibold">Prix</legend>
            <PriceRange floor={floor} ceil={ceil} min={f.min} max={f.max} />
          </fieldset>

          {brandCounts.size + f.brand.length > 1 && (
            <fieldset>
              <legend className="mb-2.5 text-sm font-semibold">Marque</legend>
              <div className="flex flex-wrap gap-2">
                {[...new Set([...brandCounts.keys(), ...f.brand])].sort().map((b) => (
                  <Link key={b} href={toggle("brand", b)} role="checkbox" aria-checked={f.brand.includes(b)} className={pill(f.brand.includes(b))}>
                    {b} <span className="opacity-60">{brandCounts.get(b) ?? 0}</span>
                  </Link>
                ))}
              </div>
            </fieldset>
          )}

          {isLaptopView && (
            <>
              {cpuCounts.size > 0 && (
                <fieldset>
                  <legend className="mb-2.5 text-sm font-semibold">Processeur</legend>
                  <div className="flex flex-wrap gap-2">
                    {[...cpuCounts.keys()].sort((a, b) => CPU_ORDER.indexOf(a) - CPU_ORDER.indexOf(b)).map((id) => (
                      <Link key={id} href={toggle("cpu", id)} role="checkbox" aria-checked={f.cpu.includes(id)} className={pill(f.cpu.includes(id))}>
                        {cpuLabels.get(id)} <span className="opacity-60">{cpuCounts.get(id)}</span>
                      </Link>
                    ))}
                  </div>
                </fieldset>
              )}
              {ramCounts.size > 0 && (
                <fieldset>
                  <legend className="mb-2.5 text-sm font-semibold">Mémoire vive (RAM)</legend>
                  <div className="flex flex-wrap gap-2">
                    {[...ramCounts.keys()].sort((a, b) => a - b).map((r) => (
                      <Link key={r} href={toggle("ram", String(r))} role="checkbox" aria-checked={f.ram.includes(String(r))} className={pill(f.ram.includes(String(r)))}>
                        {r} Go <span className="opacity-60">{ramCounts.get(r)}</span>
                      </Link>
                    ))}
                  </div>
                </fieldset>
              )}
              {ssdCounts.size > 0 && (
                <fieldset>
                  <legend className="mb-2.5 text-sm font-semibold">Stockage SSD</legend>
                  <div className="flex flex-wrap gap-2">
                    {[...ssdCounts.keys()].sort((a, b) => a - b).map((x) => (
                      <Link key={x} href={toggle("ssd", String(x))} role="checkbox" aria-checked={f.ssd.includes(String(x))} className={pill(f.ssd.includes(String(x)))}>
                        {ssdLabel(x)} <span className="opacity-60">{ssdCounts.get(x)}</span>
                      </Link>
                    ))}
                  </div>
                </fieldset>
              )}
              {(gpuCount > 0 || f.gpu) && (
                <fieldset>
                  <legend className="mb-2.5 text-sm font-semibold">Carte graphique</legend>
                  <Link href={href({ gpu: f.gpu ? undefined : "1" })} role="checkbox" aria-checked={f.gpu} className={pill(f.gpu)}>
                    Dédiée (RTX, GTX, Radeon RX…) <span className="opacity-60">{gpuCount}</span>
                  </Link>
                </fieldset>
              )}
            </>
          )}
        </FiltersPanel>

        <section className="min-w-0 flex-1">
          {active.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {active.map((a) => (
                <Link key={a.label} href={a.href} aria-label={`Retirer le filtre ${a.label}`} className="flex items-center gap-1.5 rounded-full bg-brand-tint py-1.5 pl-3 pr-2 text-sm text-brand-dark hover:bg-brand hover:text-white">
                  {a.label} <X className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              ))}
              <Link href={cleared} className="px-2 text-sm font-medium text-ink-muted hover:text-ink hover:underline">Tout effacer</Link>
            </div>
          )}
          {shown.length === 0 ? (
            <div className="rounded-panel border border-dashed border-line-strong bg-white p-10 text-center">
              <p className="text-lg font-medium">Aucun appareil ne correspond à ces filtres.</p>
              <p className="mt-2 text-ink-muted">Retirez un filtre ou cherchez un autre modèle.</p>
              <Link href={active.length ? cleared : "/catalog"} className="btn-primary btn-sm mt-5">{active.length ? "Effacer les filtres" : "Voir tout le catalogue"}</Link>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-[18px]">
              {shown.map((c) => (
                <VariantCard key={c.offerId} card={c} followed={followed.has(c.variantId)} />
              ))}
            </div>
          )}
          {pages > 1 && (
            <nav aria-label="Pages" className="mt-8 flex flex-wrap justify-center gap-2">
              {Array.from({ length: pages }).map((_, i) => (
                <Link
                  key={i}
                  href={href({ page: String(i + 1) })}
                  aria-current={page === i + 1 ? "page" : undefined}
                  className={cn("grid h-11 min-w-11 place-items-center rounded-xl px-3 text-sm", page === i + 1 ? "bg-ink text-white" : "bg-white ring-1 ring-line hover:ring-line-strong")}
                >
                  {i + 1}
                </Link>
              ))}
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}
