"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ConditionGrade, OfferStatus } from "@prisma/client";
import { GRADES } from "@/lib/catalog";
import { formatPrice } from "@/lib/money";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

export type OfferRow = {
  id: string;
  name: string;
  config: string;
  grade: ConditionGrade;
  batteryHealth: number | null;
  priceMillimes: number;
  status: OfferStatus;
  rejectionReason: string | null;
  competitorMillimes: number | null;
  href: string;
};

const STATUS: Record<OfferStatus, { label: string; cls: string }> = {
  ACTIVE: { label: "En ligne", cls: "bg-gain-tint text-gain" },
  INACTIVE: { label: "En pause", cls: "bg-slate-100 text-slate-600" },
  PENDING_REVIEW: { label: "En contrôle", cls: "bg-amber-50 text-amber-800" },
  REJECTED: { label: "Refusée", cls: "bg-pop-tint text-pop-dark" },
  DRAFT: { label: "Brouillon", cls: "bg-slate-100 text-slate-600" },
  SOLD: { label: "Vendue", cls: "bg-brand-tint text-brand" },
};

export default function OffersTable({ rows }: { rows: OfferRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});

  async function patch(id: string, data: object, done: string) {
    setBusy(id);
    const res = await fetch(`/api/vendor/listings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return toast(d.error ?? "Modification refusée", "error");
    toast(done);
    router.refresh();
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-[26px] border border-dashed border-line-strong bg-white p-10 text-center">
        <p className="text-lg font-medium">Aucune offre pour l’instant.</p>
        <p className="mt-1.5 text-ink-muted">Choisissez un appareil dans le catalogue Bonétat : photos et fiche sont déjà prêtes.</p>
        <Link href="/vendor/listings/new" className="btn-primary btn-sm mt-5">Publier ma première offre</Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[26px] border border-line bg-white">
      <table className="tbl min-w-[980px]">
        <thead>
          <tr><th>Appareil</th><th>État</th><th>Votre prix</th><th>Position</th><th>Statut</th><th className="text-right">Actions</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const live = r.status === "ACTIVE";
            const best = r.competitorMillimes;
            const leading = best === null || r.priceMillimes < best;
            const tied = best !== null && r.priceMillimes === best;
            const draft = prices[r.id] ?? String(r.priceMillimes / 1000);
            const changed = Number(draft) * 1000 !== r.priceMillimes;
            return (
              <tr key={r.id} className={cn(busy === r.id && "opacity-60")}>
                <td>
                  <Link href={r.href} target="_blank" className="font-medium hover:text-brand">{r.name}</Link>
                  <br />
                  <span className="text-[13px] text-ink-muted">{r.config}</span>
                </td>
                <td>
                  {GRADES[r.grade].label}
                  <br />
                  <span className="text-[13px] text-ink-muted">{r.batteryHealth ? `Batterie ${r.batteryHealth} %` : "—"}</span>
                </td>
                <td>
                  {r.status === "SOLD" ? (
                    <b className="font-semibold">{formatPrice(r.priceMillimes)}</b>
                  ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (Number(draft) > 0) patch(r.id, { priceMillimes: Math.round(Number(draft) * 1000) }, "Prix mis à jour");
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <label className="sr-only" htmlFor={`p-${r.id}`}>Prix en DT</label>
                    <input
                      id={`p-${r.id}`}
                      type="number"
                      min={1}
                      value={draft}
                      onChange={(e) => setPrices({ ...prices, [r.id]: e.target.value })}
                      className="h-9 w-24 rounded-xl border-[1.5px] border-line-strong px-2 text-right font-semibold outline-none focus:border-brand"
                    />
                    <span className="text-[13px] text-ink-muted">DT</span>
                    {changed && <button type="submit" className="rounded-lg bg-brand px-2.5 py-1.5 text-xs font-semibold text-white">OK</button>}
                  </form>
                  )}
                </td>
                <td>
                  {!live ? (
                    <span className="text-[13px] text-ink-muted">—</span>
                  ) : leading ? (
                    <span className="pill bg-gain-tint text-gain">Meilleur prix</span>
                  ) : tied ? (
                    <span className="pill bg-amber-50 text-amber-800">À égalité</span>
                  ) : (
                    <span className="pill bg-pop-tint text-pop-dark">2e, +{formatPrice(r.priceMillimes - best!)}</span>
                  )}
                </td>
                <td>
                  <span className={cn("pill", STATUS[r.status].cls)} title={r.rejectionReason ?? undefined}>{STATUS[r.status].label}</span>
                  {r.status === "REJECTED" && r.rejectionReason && <p className="mt-1 max-w-[200px] text-xs text-ink-muted">{r.rejectionReason}</p>}
                </td>
                <td className="whitespace-nowrap text-right">
                  <span className="inline-flex gap-2">
                    {live && best !== null && !leading && (
                      <button type="button" onClick={() => patch(r.id, { priceMillimes: best - 1000 }, "Vous avez maintenant le meilleur prix")} className="btn-secondary btn-sm">
                        Passer à {formatPrice(best - 1000)}
                      </button>
                    )}
                    {r.status === "ACTIVE" && (
                      <button type="button" onClick={() => patch(r.id, { status: "INACTIVE" }, "Offre en pause")} className="btn-secondary btn-sm">Pause</button>
                    )}
                    {r.status === "INACTIVE" && (
                      <button type="button" onClick={() => patch(r.id, { status: "ACTIVE" }, "Offre remise en ligne")} className="btn-secondary btn-sm">Remettre en ligne</button>
                    )}
                    <Link href={`/vendor/listings/new?from=${r.id}`} className="btn-secondary btn-sm" title="Publier un autre appareil identique">Dupliquer</Link>
                    {r.status !== "SOLD" && <Link href={`/vendor/listings/${r.id}`} className="btn-secondary btn-sm">Modifier</Link>}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
