"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type Candidate = {
  icecatId: number;
  title: string;
  color: string | null;
  colorName: string | null;
  picWidth: number | null;
  previewUrl: string | null;
  refurbished: boolean;
};

/** Icecat products the sync found for this model but couldn't tie to this color with certainty */
export default function CandidateList({ finishId, colorName, candidates }: { finishId: string; colorName: string; candidates: Candidate[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState<number | null>(null);

  async function use(c: Candidate) {
    setBusy(c.icecatId);
    const res = await fetch(`/api/admin/catalog/finishes/${finishId}/icecat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref: String(c.icecatId) }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return toast(d.error ?? "Import impossible", "error");
    toast(`${colorName} : ${d.imported} image(s) importée(s)${c.colorName ? `, « ${c.colorName} » retenu comme autre nom` : ""}`);
    router.refresh();
  }

  return (
    <div className="rounded-2xl bg-amber-50 p-4">
      <p className="mb-2.5 text-sm font-medium text-amber-900">Suggestions Icecat : laquelle est « {colorName} » ?</p>
      <ul className="flex flex-col gap-2">
        {candidates.map((c) => (
          <li key={c.icecatId} className="flex flex-wrap items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-sm">
            {c.previewUrl && (
              // Admin-only preview straight from Icecat; the site only ever shows our own resized copies
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.previewUrl} alt="" loading="lazy" className="h-16 w-16 flex-none rounded-lg border border-line bg-white object-contain" />
            )}
            <span className="min-w-0 flex-1">
              <b className="font-medium">{[c.color, c.colorName].filter(Boolean).join(", ") || "Couleur non précisée"}</b>
              {c.refurbished && (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900" title="Annonce d’un revendeur : vérifiez qu’aucun logo ni mention « Grade » n’apparaît sur l’écran">
                  Annonce reconditionnée, vérifiez l’écran
                </span>
              )}
              <span className="block truncate text-[13px] text-ink-muted" title={c.title}>{c.title}</span>
            </span>
            {c.picWidth ? <span className="text-[12px] text-ink-muted">{c.picWidth} px</span> : null}
            <button type="button" disabled={busy !== null} onClick={() => use(c)} className="btn-secondary btn-sm">
              {busy === c.icecatId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Utiliser"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
