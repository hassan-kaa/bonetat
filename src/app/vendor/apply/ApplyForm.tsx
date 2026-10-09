"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { GOVERNORATES } from "@/lib/catalog";

export default function ApplyForm({ defaultName, defaultPhone }: { defaultName: string; defaultPhone: string }) {
  const router = useRouter();
  const [f, setF] = useState({
    storeName: "", contactName: defaultName, phone: defaultPhone, governorate: "", pickupAddress: "", description: "", instagramUrl: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/vendor/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    const d = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.status === 401) return router.push("/auth/login?redirect=/vendor/apply");
    if (!res.ok) return setError(d.error ?? "Candidature non envoyée");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Candidature atelier</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field">Nom de l’atelier ou de la page<input className="input" value={f.storeName} onChange={set("storeName")} required minLength={2} /></label>
        <label className="field">Responsable<input className="input" value={f.contactName} onChange={set("contactName")} required minLength={2} /></label>
        <label className="field">Téléphone de l’atelier<input className="input" type="tel" value={f.phone} onChange={set("phone")} pattern="\+216\d{8}" required /></label>
        <label className="field">
          Gouvernorat
          <select className="input" value={f.governorate} onChange={set("governorate")} required>
            <option value="" disabled>Choisir</option>
            {GOVERNORATES.map((g) => <option key={g}>{g}</option>)}
          </select>
        </label>
        <label className="field sm:col-span-2">Adresse de l’atelier<input className="input" value={f.pickupAddress} onChange={set("pickupAddress")} required minLength={5} /></label>
        <label className="field sm:col-span-2">
          Ce que vous réparez et vendez, depuis quand
          <textarea className="input" rows={4} value={f.description} onChange={set("description")} required minLength={20} maxLength={1000} placeholder="iPhone et Samsung, remplacement d’écrans et batteries, 6 ans d’activité, environ 30 ventes par mois…" />
        </label>
        <label className="field sm:col-span-2">Page Instagram ou Facebook (facultatif)<input className="input" type="url" value={f.instagramUrl} onChange={set("instagramUrl")} placeholder="https://instagram.com/…" /></label>
      </div>
      {error && <p role="alert" className="text-sm text-pop-dark">{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary self-start">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Envoyer ma candidature"}
      </button>
    </form>
  );
}
