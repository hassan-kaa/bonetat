"use client";

import { useEffect, useState } from "react";
import type { DeviceKind } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { KIND_OPTIONS, type BrandOption } from "./types";

type Close = { productId: string; label: string };

type Props = {
  brands: BrandOption[];
  initial: { brand?: string | null; line?: string | null; modelNumber?: string | null; kind?: DeviceKind | null };
  onCreated: (productId: string) => void;
  onCancel: () => void;
};

/**
 * The rare case: a model the catalog doesn't have. Structured fields (brand from the list, line,
 * model number), close catalog models shown while typing, exact duplicates refused by the server.
 * The model is live at once: no approval.
 */
export default function NewModelForm({ brands, initial, onCreated, onCancel }: Props) {
  const [brand, setBrand] = useState(initial.brand && brands.some((b) => b.name === initial.brand) ? initial.brand : "");
  const [line, setLine] = useState(initial.line ?? "");
  const [modelNumber, setModelNumber] = useState(initial.modelNumber ?? "");
  const [kind, setKind] = useState<DeviceKind | "">(initial.kind && initial.kind !== "OTHER" ? initial.kind : "");
  const [hints, setHints] = useState<Close[]>([]);
  const [close, setClose] = useState<Close[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const lines = brands.find((b) => b.name === brand)?.lines ?? [];

  // "Proche de : …" while the store types: maybe it's in the catalog after all
  useEffect(() => {
    const q = `${line} ${modelNumber}`.trim();
    if (!brand || q.length < 2) return setHints([]);
    const t = setTimeout(async () => {
      const res = await fetch(`/api/vendor/catalog/search?${new URLSearchParams({ q, brand })}`);
      if (res.ok) setHints((await res.json()).catalog.slice(0, 6));
    }, 300);
    return () => clearTimeout(t);
  }, [brand, line, modelNumber]);

  async function create(confirmNew = false) {
    if (!kind) return setError("Choisissez le type d’appareil");
    setBusy(true);
    setError("");
    const res = await fetch("/api/vendor/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: "manual", brand, line, modelNumber, kind, confirmNew }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.status === 409 && d.close) return setClose(d.close);
    if (!res.ok) return setError(d.error ?? "Création impossible");
    onCreated(d.productId);
  }

  return (
    <div className="flex flex-col gap-4 rounded-[20px] border border-line p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[17px] font-semibold">Ajouter un modèle</h2>
        <button type="button" onClick={onCancel} className="text-sm text-ink-muted hover:text-ink">Annuler</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {KIND_OPTIONS.map((k) => (
          <button key={k.value} type="button" aria-pressed={kind === k.value} onClick={() => setKind(k.value)} className={cn("opt px-3.5 py-2 text-sm", kind === k.value && "opt-on")}>
            {k.label}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="field">
          Marque
          <select className="input" value={brand} onChange={(e) => { setBrand(e.target.value); setLine(""); }}>
            <option value="">Choisir…</option>
            {brands.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
          </select>
        </label>
        <label className="field">
          Gamme
          <input className="input" list="brand-lines" value={line} onChange={(e) => setLine(e.target.value)} placeholder={lines[0] ? `ex. ${lines[0]}` : ""} disabled={!brand} maxLength={40} />
          <datalist id="brand-lines">{lines.map((l) => <option key={l} value={l} />)}</datalist>
        </label>
        <label className="field">
          Numéro de modèle
          <input className="input" value={modelNumber} onChange={(e) => setModelNumber(e.target.value)} placeholder="ex. 8 G1i, 15 3520" disabled={!brand} maxLength={40} />
        </label>
      </div>
      <p className="-mt-1 text-[13px] text-ink-muted">Le numéro exact est sur l’étiquette sous l’appareil ou dans Paramètres, Informations.</p>

      {hints.length > 0 && !close && (
        <div className="rounded-2xl bg-chalk p-3.5 text-sm">
          <p className="mb-2 font-medium">Déjà au catalogue :</p>
          <div className="flex flex-wrap gap-2">
            {hints.map((h) => (
              <button key={h.productId} type="button" onClick={() => onCreated(h.productId)} className="opt px-3 py-1.5 text-[13px]">{h.label}</button>
            ))}
          </div>
        </div>
      )}

      {close && (
        <div role="alert" className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
          <p className="mb-2.5 font-medium">Un modèle proche existe déjà. C’est celui-là ?</p>
          <div className="flex flex-wrap gap-2">
            {close.map((c) => (
              <button key={c.productId} type="button" onClick={() => onCreated(c.productId)} className="btn-secondary btn-sm">Oui : {c.label}</button>
            ))}
            <button type="button" onClick={() => create(true)} className="btn-sm rounded-xl px-3 font-medium underline">Non, c’est bien un autre modèle</button>
          </div>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-pop-dark">{error}</p>}
      <button type="button" onClick={() => create()} disabled={busy || !brand || !line.trim() || !modelNumber.trim() || !kind} className="btn-primary btn-sm self-start">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ajouter et continuer"}
      </button>
    </div>
  );
}
