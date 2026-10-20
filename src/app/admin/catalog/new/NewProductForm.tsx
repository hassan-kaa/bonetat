"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { modelName } from "@/lib/product-identity";

const KINDS = [
  { value: "LAPTOP", label: "PC portable" },
  { value: "PHONE", label: "Téléphone" },
  { value: "TABLET", label: "Tablette" },
  { value: "WATCH", label: "Montre" },
  { value: "CONSOLE", label: "Console" },
] as const;

type Found = { slug: string; name: string };

export default function NewProductForm({ brands }: { brands: { name: string; lines: string[] }[] }) {
  const router = useRouter();
  const [kind, setKind] = useState<(typeof KINDS)[number]["value"]>("LAPTOP");
  const [brand, setBrand] = useState("");
  const [line, setLine] = useState("");
  const [number, setNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [existing, setExisting] = useState<Found | null>(null);
  const [similar, setSimilar] = useState<Found[] | null>(null);

  const lines = brands.find((b) => b.name === brand)?.lines ?? [];
  const preview = line.trim() && number.trim() ? `${brand === "Apple" ? "" : `${brand} `}${modelName(line.trim(), number.trim())}` : "";

  async function save(force = false) {
    setBusy(true);
    setError("");
    setExisting(null);
    const res = await fetch("/api/admin/catalog/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, brand, line, modelNumber: number, force }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(d.error ?? "Ajout impossible");
    if (d.existing) return setExisting(d.existing);
    if (d.similar) return setSimilar(d.similar);
    router.push(`/admin/catalog/${d.created.slug}`);
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); setSimilar(null); save(); }}
      className="flex max-w-2xl flex-col gap-4 rounded-panel border border-line bg-white p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field">
          Type d’appareil
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
        </label>
        <label className="field">
          Marque
          <select className="input" value={brand} onChange={(e) => { setBrand(e.target.value); setLine(""); }} required>
            <option value="">Choisir…</option>
            {brands.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
          </select>
        </label>
        <label className="field">
          Gamme
          <input className="input" list="lines" value={line} onChange={(e) => setLine(e.target.value)} placeholder="Latitude, EliteBook, Galaxy S…" maxLength={40} required />
          <datalist id="lines">{lines.map((l) => <option key={l} value={l} />)}</datalist>
        </label>
        <label className="field">
          Modèle
          <input className="input" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="7450, 840 G8, 15IMH05…" maxLength={40} required />
        </label>
      </div>
      {preview && <p className="text-[15px]">Nom affiché : <b className="font-semibold">{preview}</b></p>}

      {existing && (
        <p role="alert" className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Ce modèle existe déjà : <Link href={`/admin/catalog/${existing.slug}`} className="font-semibold underline">{existing.name}</Link>. Ajoutez-y les photos.
        </p>
      )}
      {similar && (
        <div role="alert" className="flex flex-col gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p>Des modèles proches existent. Si c’est l’un d’eux, ouvrez-le plutôt :</p>
          <ul className="list-disc pl-5">
            {similar.map((s) => <li key={s.slug}><Link href={`/admin/catalog/${s.slug}`} className="font-medium underline">{s.name}</Link></li>)}
          </ul>
          <button type="button" onClick={() => save(true)} disabled={busy} className="btn-secondary btn-sm self-start">C’est bien un autre modèle : l’ajouter</button>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-pop-dark">{error}</p>}

      <button type="submit" disabled={busy || !brand || !line.trim() || !number.trim()} className="btn-primary btn-sm self-start">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ajouter le produit"}
      </button>
    </form>
  );
}
