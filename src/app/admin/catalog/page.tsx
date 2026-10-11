import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { displayName } from "@/lib/catalog";
import { SELLABLE } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Photos du catalogue" };

/**
 * Coverage: which colors still show the illustration. Sorted so the colors buyers can
 * actually buy right now, without a photo, come first: that's the curation to-do list.
 */
export default async function CatalogCoverage() {
  const products = await prisma.product.findMany({
    orderBy: [{ category: { position: "asc" } }, { brand: "asc" }, { seriesOrder: "asc" }],
    include: {
      finishes: {
        orderBy: { position: "asc" },
        include: {
          images: { where: { status: { not: "ARCHIVED" } }, select: { angle: true, status: true } },
          variants: { select: { _count: { select: { offers: { where: SELLABLE } } } } },
          _count: { select: { icecatCandidates: true } },
        },
      },
    },
  });

  const rows = products.map((p) => {
    const finishes = p.finishes.map((f) => {
      const front = f.images.some((i) => i.angle === "FRONT" && i.status === "APPROVED");
      const back = f.images.some((i) => i.angle === "BACK" && i.status === "APPROVED");
      const drafts = f.images.filter((i) => i.status === "DRAFT").length;
      const live = f.variants.reduce((n, v) => n + v._count.offers, 0);
      const toConfirm = f.icecatId === null && f._count.icecatCandidates > 0;
      return { id: f.id, name: f.nameFr, hex: f.hex, state: front && back ? "complete" : front ? "partial" : "none", drafts, live, toConfirm };
    });
    const urgent = finishes.filter((f) => f.state === "none" && f.live > 0).length;
    const done = finishes.filter((f) => f.state !== "none").length;
    const toConfirm = finishes.filter((f) => f.toConfirm).length;
    return { slug: p.slug, name: displayName(p), brand: p.brand, finishes, urgent, done, toConfirm };
  });
  rows.sort((a, b) => b.urgent - a.urgent || a.done / a.finishes.length - b.done / b.finishes.length);

  const totals = rows.reduce(
    (t, r) => ({ colors: t.colors + r.finishes.length, done: t.done + r.done, urgent: t.urgent + r.urgent, toConfirm: t.toConfirm + r.toConfirm }),
    { colors: 0, done: 0, urgent: 0, toConfirm: 0 }
  );

  return (
    <>
      <h1 className="page-title">Photos du catalogue</h1>
      <p className="-mt-2 text-[15px] text-ink-muted">
        Une couleur sans photo validée s’affiche en illustration. Commencez par celles qui ont des appareils en vente.
      </p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
        <div className="rounded-panel border border-line bg-white p-5"><span className="text-[13px] text-ink-muted">Couleurs avec photo</span><b className="mt-1.5 block text-[28px] font-semibold tracking-[-0.03em]">{totals.done} / {totals.colors}</b></div>
        <div className="rounded-panel border border-line bg-white p-5"><span className="text-[13px] text-ink-muted">Suggestions Icecat à confirmer</span><b className={cn("mt-1.5 block text-[28px] font-semibold tracking-[-0.03em]", totals.toConfirm > 0 && "text-amber-700")}>{totals.toConfirm}</b></div>
        <div className="rounded-panel border border-line bg-white p-5"><span className="text-[13px] text-ink-muted">En vente sans photo</span><b className={cn("mt-1.5 block text-[28px] font-semibold tracking-[-0.03em]", totals.urgent > 0 && "text-pop-dark")}>{totals.urgent}</b></div>
      </div>
      <div className="overflow-x-auto rounded-panel border border-line bg-white">
        <table className="tbl min-w-[760px]">
          <thead><tr><th>Produit</th><th>Couleurs</th><th>En vente sans photo</th><th>À confirmer</th><th className="text-right" /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.slug}>
                <td><b className="font-medium">{r.name}</b><br /><span className="text-[13px] text-ink-muted">{r.done} / {r.finishes.length} avec photo</span></td>
                <td>
                  <span className="flex flex-wrap gap-1.5">
                    {r.finishes.map((f) => (
                      <span
                        key={f.id}
                        title={`${f.name} : ${f.state === "complete" ? "face et dos" : f.state === "partial" ? "face seulement" : "illustration"}${f.drafts ? `, ${f.drafts} à valider` : ""}`}
                        className={cn("h-6 w-6 rounded-full border-2", f.state === "complete" ? "border-gain" : f.state === "partial" ? "border-amber-400" : "border-dashed border-ink/30")}
                        style={{ background: f.hex }}
                      />
                    ))}
                  </span>
                </td>
                <td>{r.urgent > 0 ? <span className="pill bg-pop-tint text-pop-dark">{r.urgent}</span> : <span className="text-[13px] text-ink-muted">—</span>}</td>
                <td>{r.toConfirm > 0 ? <span className="pill bg-amber-50 text-amber-800">{r.toConfirm}</span> : <span className="text-[13px] text-ink-muted">—</span>}</td>
                <td className="text-right"><Link href={`/admin/catalog/${r.slug}`} className="btn-secondary btn-sm">Photos</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[13px] text-ink-muted">Bordure verte : face et dos validés. Orange : face seulement. Pointillés : illustration.</p>
    </>
  );
}
