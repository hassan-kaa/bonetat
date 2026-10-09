"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type Store = {
  storeName: string;
  legalName: string;
  taxId: string;
  rne: string;
  contactName: string;
  phone: string;
  pickupAddress: string;
  pickupHours: string;
  rib: string;
  description: string;
};

const FIELDS: { key: keyof Store; label: string; hint?: string; wide?: boolean }[] = [
  { key: "storeName", label: "Nom commercial" },
  { key: "legalName", label: "Raison sociale" },
  { key: "taxId", label: "Matricule fiscal", hint: "1234567/A/M/000" },
  { key: "rne", label: "Identifiant RNE" },
  { key: "contactName", label: "Responsable" },
  { key: "phone", label: "Téléphone de l’atelier", hint: "+216…" },
  { key: "pickupAddress", label: "Adresse d’enlèvement des colis", wide: true },
  { key: "pickupHours", label: "Horaires d’enlèvement" },
  { key: "rib", label: "RIB pour les virements", hint: "20 chiffres" },
];

export default function StoreProfileForm({ initial, partnerCode }: { initial: Store; partnerCode: string | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const [s, setS] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/vendor/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
    const d = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setError(d.error ?? "Profil non enregistré");
    toast("Profil de l’atelier enregistré");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <div className="grid gap-4 rounded-[26px] border border-line bg-white p-6 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <label key={f.key} className={`field ${f.wide ? "sm:col-span-2" : ""}`}>
            {f.label}
            <input
              className="input"
              value={s[f.key]}
              onChange={(e) => setS({ ...s, [f.key]: e.target.value })}
              placeholder={f.hint}
              required={f.key === "storeName"}
            />
          </label>
        ))}
        <label className="field sm:col-span-2">
          Présentation de l’atelier (pour l’équipe Bonétat)
          <textarea className="input" rows={3} value={s.description} onChange={(e) => setS({ ...s, description: e.target.value })} maxLength={1000} />
        </label>
      </div>
      {partnerCode && <p className="text-sm text-ink-muted">Code atelier imprimé sur vos bons de livraison : <b className="text-ink">{partnerCode}</b></p>}
      {error && <p role="alert" className="text-sm text-pop-dark">{error}</p>}
      <button type="submit" disabled={saving} className="btn-primary btn-sm self-start">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer les modifications"}
      </button>
    </form>
  );
}
