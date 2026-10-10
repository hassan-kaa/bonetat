"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

type Props = {
  productId: string;
  current: { brand: string; line: string; modelNumber: string };
  brands: { name: string; lines: string[] }[];
  targets: { id: string; label: string }[];
  suggested: string | null;
};

export default function ModelActions({ productId, current, brands, targets, suggested }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [mode, setMode] = useState<"idle" | "correct" | "merge">("idle");
  const [form, setForm] = useState(current);
  const [target, setTarget] = useState(suggested ?? "");
  const [busy, setBusy] = useState(false);

  async function act(body: object, done: string) {
    setBusy(true);
    const res = await fetch(`/api/admin/catalog/products/${productId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast(d.error ?? "Action refusée", "error");
    toast(done);
    setMode("idle");
    router.refresh();
  }

  const lines = brands.find((b) => b.name === form.brand)?.lines ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => setMode(mode === "correct" ? "idle" : "correct")} className="btn-secondary btn-sm">Corriger le nom</button>
        <button type="button" disabled={busy || targets.length === 0} onClick={() => setMode(mode === "merge" ? "idle" : "merge")} className="btn-secondary btn-sm">Fusionner avec…</button>
      </div>
      {mode === "correct" && (
        <form onSubmit={(e) => { e.preventDefault(); act({ action: "correct", ...form }, "Nom corrigé"); }} className="grid gap-3 rounded-2xl bg-chalk p-4 sm:grid-cols-4">
          <label className="field">Marque
            <select className="input" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })}>
              {brands.map((b) => <option key={b.name}>{b.name}</option>)}
            </select>
          </label>
          <label className="field">Gamme
            <input className="input" list={`lines-${productId}`} value={form.line} onChange={(e) => setForm({ ...form, line: e.target.value })} />
            <datalist id={`lines-${productId}`}>{lines.map((l) => <option key={l} value={l} />)}</datalist>
          </label>
          <label className="field">Numéro de modèle<input className="input" value={form.modelNumber} onChange={(e) => setForm({ ...form, modelNumber: e.target.value })} /></label>
          <button type="submit" disabled={busy} className="btn-primary btn-sm self-end">Enregistrer</button>
        </form>
      )}
      {mode === "merge" && (
        <form onSubmit={(e) => { e.preventDefault(); if (target) act({ action: "merge", targetId: target }, "Modèles fusionnés, les offres ont suivi"); }} className="flex flex-wrap items-end gap-3 rounded-2xl bg-chalk p-4">
          <label className="field min-w-[260px] flex-1">Le bon modèle
            <select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="">Choisir…</option>
              {targets.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
          <button type="submit" disabled={busy || !target} className="btn-primary btn-sm">Fusionner</button>
        </form>
      )}
    </div>
  );
}
