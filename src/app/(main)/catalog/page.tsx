import Link from "next/link";
import type { Metadata } from "next";
import type { ConditionGrade, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getVariantCards } from "@/lib/queries";
import { GRADES, GRADE_ORDER } from "@/lib/catalog";
import VariantCard from "@/components/products/VariantCard";
import AutoSubmitSelect from "./AutoSubmitSelect";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Catalogue" };

const PAGE_SIZE = 24;
const SORTS = [
  { value: "deal", label: "Plus grosses économies" },
  { value: "price-asc", label: "Prix croissant" },
  { value: "price-desc", label: "Prix décroissant" },
  { value: "new", label: "Nouveautés" },
] as const;
const BUDGETS = [500, 1000, 1500, 2500, 4000];

type Search = { q?: string; category?: string; brand?: string; grade?: string; max?: string; sort?: string; page?: string };

export default async function CatalogPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const grade = GRADE_ORDER.includes(sp.grade as ConditionGrade) ? (sp.grade as ConditionGrade) : undefined;
  const sort = (SORTS.find((s) => s.value === sp.sort)?.value ?? "deal") as (typeof SORTS)[number]["value"];
  const max = Number(sp.max) || undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Prisma.ProductWhereInput = {};
  if (sp.category) where.category = { slug: sp.category };
  if (sp.brand) where.brand = sp.brand;
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

  const [categories, brands, cards, user] = await Promise.all([
    prisma.category.findMany({ orderBy: { position: "asc" } }),
    prisma.product.findMany({
      where: sp.category ? { category: { slug: sp.category } } : {},
      distinct: ["brand"],
      select: { brand: true },
      orderBy: { brand: "asc" },
    }),
    getVariantCards({ where, grade, sort, maxPriceMillimes: max ? max * 1000 : undefined }),
    getSessionUser(),
  ]);
  const followed = user
    ? new Set((await prisma.favorite.findMany({ where: { userId: user.id }, select: { variantId: true } })).map((f) => f.variantId))
    : new Set<string>();

  const category = categories.find((c) => c.slug === sp.category);
  const pages = Math.max(1, Math.ceil(cards.length / PAGE_SIZE));
  const shown = cards.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const href = (patch: Partial<Search>) => {
    const q = new URLSearchParams();
    const merged = { ...sp, page: undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, String(v));
    const s = q.toString();
    return `/catalog${s ? `?${s}` : ""}`;
  };

  const title = sp.q ? `Résultats pour « ${sp.q} »` : category ? category.nameFr : "Tout le catalogue";

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
          <label htmlFor="sort" className="text-sm text-ink-muted">Trier</label>
          <AutoSubmitSelect id="sort" name="sort" defaultValue={sort} options={SORTS.map((s) => ({ value: s.value, label: s.label }))} />
        </form>
      </div>

      {/* Category chips */}
      <nav aria-label="Catégories" className="mb-5 flex gap-2 overflow-x-auto pb-1">
        <Link href={href({ category: undefined, brand: undefined })} className={cn("whitespace-nowrap rounded-full px-4 py-2 text-sm", !sp.category ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-line hover:ring-line-strong")}>
          Tout
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={href({ category: c.slug, brand: undefined })}
            className={cn("whitespace-nowrap rounded-full px-4 py-2 text-sm", sp.category === c.slug ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-line hover:ring-line-strong")}
          >
            {c.nameFr}
          </Link>
        ))}
      </nav>

      <div className="flex flex-wrap items-start gap-8">
        <aside className="flex w-full flex-col gap-6 rounded-[24px] border border-line bg-white p-5 lg:sticky lg:top-32 lg:w-60">
          <div>
            <h2 className="mb-2.5 text-sm font-semibold">État</h2>
            <div className="flex flex-wrap gap-2 lg:flex-col">
              <Link href={href({ grade: undefined })} className={cn("rounded-xl px-3 py-2 text-sm", !grade ? "bg-brand-tint font-medium text-brand" : "hover:bg-chalk")}>
                Tous les états
              </Link>
              {[...GRADE_ORDER].map((g) => (
                <Link key={g} href={href({ grade: g })} className={cn("flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm", grade === g ? "bg-brand-tint font-medium text-brand" : "hover:bg-chalk")}>
                  <span className="meter w-8">{[1, 2, 3, 4].map((i) => <span key={i} data-on={i <= GRADES[g].level} />)}</span>
                  {GRADES[g].label}
                </Link>
              ))}
            </div>
          </div>
          {brands.length > 1 && (
            <div>
              <h2 className="mb-2.5 text-sm font-semibold">Marque</h2>
              <div className="flex flex-wrap gap-2">
                {brands.map((b) => (
                  <Link key={b.brand} href={href({ brand: sp.brand === b.brand ? undefined : b.brand })} className={cn("rounded-full px-3 py-1.5 text-sm ring-1", sp.brand === b.brand ? "bg-brand text-white ring-brand" : "ring-line hover:ring-line-strong")}>
                    {b.brand}
                  </Link>
                ))}
              </div>
            </div>
          )}
          <div>
            <h2 className="mb-2.5 text-sm font-semibold">Budget</h2>
            <div className="flex flex-wrap gap-2">
              {BUDGETS.map((b) => (
                <Link key={b} href={href({ max: max === b ? undefined : String(b) })} className={cn("rounded-full px-3 py-1.5 text-sm ring-1", max === b ? "bg-brand text-white ring-brand" : "ring-line hover:ring-line-strong")}>
                  Moins de {b.toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ")} DT
                </Link>
              ))}
            </div>
          </div>
          {(sp.grade || sp.brand || sp.max || sp.q) && (
            <Link href={href({ grade: undefined, brand: undefined, max: undefined, q: undefined })} className="text-sm font-medium text-brand hover:underline">
              Effacer les filtres
            </Link>
          )}
        </aside>

        <section className="min-w-0 flex-1">
          {shown.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-line-strong bg-white p-10 text-center">
              <p className="text-lg font-medium">Aucun appareil ne correspond à ces filtres.</p>
              <p className="mt-2 text-ink-muted">Retirez un filtre ou cherchez un autre modèle.</p>
              <Link href="/catalog" className="btn-primary btn-sm mt-5">Voir tout le catalogue</Link>
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
