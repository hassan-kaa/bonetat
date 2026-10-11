import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { displayName } from "@/lib/catalog";
import { nearDuplicates } from "@/lib/product-identity";
import { formatDateTime } from "@/lib/utils";
import ModelActions from "./ModelActions";
import SuggestionActions from "./SuggestionActions";

export const metadata: Metadata = { title: "Modèles ajoutés par les ateliers" };

/**
 * Optional tool, not a to-do list: the catalog is complete in advance, so stores rarely add a model.
 * When they do, it is live at once; here admin can fix a name or fold a duplicate into the existing product.
 */
export default async function NewModels() {
  const [suggestions, provisional, brands, all] = await Promise.all([
    prisma.specSuggestion.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, include: { product: { select: { brand: true, model: true, slug: true } } } }),
    prisma.product.findMany({
      where: { source: "store", status: { not: "MERGED" } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { variants: { include: { _count: { select: { offers: true } } } } },
    }),
    prisma.brand.findMany({ orderBy: { position: "asc" }, include: { lines: { orderBy: { name: "asc" } } } }),
    prisma.product.findMany({
      where: { status: { not: "MERGED" } },
      select: { id: true, brand: true, model: true, line: true, modelNumber: true, canonicalKey: true },
      orderBy: [{ brand: "asc" }, { model: "asc" }],
    }),
  ]);
  const vendorIds = [...new Set(provisional.map((p) => p.createdByVendorId).filter((x): x is string => !!x))];
  const vendors = new Map((await prisma.vendor.findMany({ where: { id: { in: vendorIds } }, select: { id: true, storeName: true } })).map((v) => [v.id, v.storeName]));

  return (
    <>
      <Link href="/admin/catalog" className="text-sm text-ink-muted hover:text-ink">Photos du catalogue</Link>
      <h1 className="page-title">Modèles ajoutés par les ateliers</h1>
      <p className="-mt-2 text-[15px] text-ink-muted">
        Rien à valider ici : le catalogue est complet d’avance et ces ajouts sont déjà en ligne. Corrigez un nom ou fusionnez un doublon si besoin (les offres suivent).
      </p>
      {suggestions.length > 0 && (
        <section className="flex flex-col gap-3 rounded-panel border border-line bg-white p-6">
          <h2 className="text-lg font-semibold">Corrections de fiches proposées</h2>
          {suggestions.map((s) => (
            <div key={s.id} className="flex flex-wrap items-start justify-between gap-3 border-t border-line-soft pt-3 first:border-0 first:pt-0">
              <div className="text-sm">
                <Link href={`/products/${s.product.slug}`} target="_blank" className="font-medium hover:text-brand-dark">{displayName(s.product)}</Link>
                <ul className="mt-1 text-ink-soft">
                  {(s.changes as { label: string; from: string | null; to: string }[]).map((c) => (
                    <li key={c.label}>{c.label} : <span className="text-ink-muted line-through">{c.from ?? "vide"}</span> → <b className="font-medium">{c.to}</b></li>
                  ))}
                </ul>
              </div>
              <SuggestionActions id={s.id} />
            </div>
          ))}
        </section>
      )}
      {provisional.length === 0 ? (
        <p className="rounded-panel border border-line bg-white p-8 text-center text-[15px] text-ink-muted">Aucun modèle ajouté par les ateliers.</p>
      ) : (
        provisional.map((p) => {
          const offers = p.variants.reduce((n, v) => n + v._count.offers, 0);
          const others = all.filter((x) => x.id !== p.id);
          const { close } = nearDuplicates({ brand: p.brand, line: p.line, modelNumber: p.modelNumber }, others);
          const lineApproved = brands.find((b) => b.name === p.brand)?.lines.find((l) => l.name === p.line)?.approved ?? false;
          return (
            <section key={p.id} className="flex flex-col gap-4 rounded-panel border border-line bg-white p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{displayName(p)}</h2>
                  <p className="text-[13px] text-ink-muted">
                    {p.brand} · gamme « {p.line} »{!lineApproved && " (nouvelle gamme)"} · n° « {p.modelNumber} » · {offers} offre(s) ·{" "}
                    proposé par {p.createdByVendorId ? vendors.get(p.createdByVendorId) ?? "un atelier" : "?"} le {formatDateTime(p.createdAt)}
                  </p>
                </div>
                <Link href={`/products/${p.slug}`} target="_blank" className="text-sm text-brand-dark hover:underline">Voir la fiche</Link>
              </div>
              {close.length > 0 && (
                <p className="rounded-2xl bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
                  Proche de : {close.map((c) => displayName(c)).join(", ")}. Doublon ? Fusionnez.
                </p>
              )}
              <ModelActions
                productId={p.id}
                current={{ brand: p.brand, line: p.line ?? "", modelNumber: p.modelNumber ?? "" }}
                brands={brands.map((b) => ({ name: b.name, lines: b.lines.map((l) => l.name) }))}
                targets={others.filter((x) => x.brand === p.brand).map((x) => ({ id: x.id, label: displayName(x) }))}
                suggested={close[0]?.id ?? null}
              />
            </section>
          );
        })
      )}
    </>
  );
}
