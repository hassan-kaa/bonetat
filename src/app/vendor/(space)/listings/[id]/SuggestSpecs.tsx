"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

/**
 * "La fiche du modèle contient une erreur ?" The spec sheet is shared by every store selling
 * the model, so a correction is sent to Bonétat for review, never applied directly.
 */
export default function SuggestSpecs({ productId, specs }: { productId: string; specs: [string, string][] }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<{ label: string; to: string }[]>(specs.length ? [] : [{ label: "", to: "" }]);
  const [busy, setBusy] = useState(false);

  async function send() {
    const changes = rows.filter((r) => r.label.trim() && r.to.trim());
    if (!changes.length) return;
    setBusy(true);
    const res = await fetch(`/api/vendor/products/${productId}/suggest`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ changes }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast(d.error ?? "Envoi impossible", "error");
    toast("Merci, l’équipe Bonétat vérifie la correction");
    setOpen(false);
    setRows([]);
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="self-start text-sm font-medium text-brand-dark hover:underline">
        La fiche du modèle contient une erreur ?
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-3 rounded-panel border border-line bg-white p-6">
      <h2 className="text-[17px] font-semibold">Proposer une correction de la fiche</h2>
      <p className="-mt-1.5 text-[13px] text-ink-muted">La fiche est commune à tous les vendeurs de ce modèle : l’équipe Bonétat valide la correction.</p>
      {specs.length > 0 && (
        <dl className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[180px_1fr_auto]">
          {specs.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-ink-muted">{k}</dt>
              <dd>{v}</dd>
              <button type="button" onClick={() => setRows([...rows, { label: k, to: v }])} className="text-left text-[13px] text-brand-dark hover:underline">Corriger</button>
            </div>
          ))}
        </dl>
      )}
      {rows.map((r, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[180px_1fr]">
          <input className="input" value={r.label} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="Caractéristique" maxLength={40} aria-label="Caractéristique" />
          <input className="input" value={r.to} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, to: e.target.value } : x)))} placeholder="Bonne valeur" maxLength={160} aria-label="Bonne valeur" />
        </div>
      ))}
      <div className="flex flex-wrap gap-2.5">
        <button type="button" onClick={() => setRows([...rows, { label: "", to: "" }])} className="btn-secondary btn-sm">Ajouter une ligne</button>
        <button type="button" onClick={send} disabled={busy || !rows.some((r) => r.label.trim() && r.to.trim())} className="btn-primary btn-sm">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Envoyer à Bonétat"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-sm px-3 text-ink-muted hover:text-ink">Annuler</button>
      </div>
    </div>
  );
}
