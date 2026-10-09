"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

type Profile = {
  name: string;
  phone: string;
  email: string;
  locale: "FR" | "AR";
  notifySms: boolean;
  notifyWhatsapp: boolean;
  notifyPromos: boolean;
};

const NOTIFS: { key: "notifySms" | "notifyWhatsapp" | "notifyPromos"; title: string; detail: string }[] = [
  { key: "notifySms", title: "Suivi de commande par SMS", detail: "Confirmation, départ du colis, arrivée du livreur" },
  { key: "notifyWhatsapp", title: "Alertes prix par WhatsApp", detail: "Seulement pour les configurations que vous suivez" },
  { key: "notifyPromos", title: "Bons plans du week-end", detail: "Un message par semaine au maximum" },
];

export default function ProfileForm({ initial }: { initial: Profile }) {
  const router = useRouter();
  const { toast } = useToast();
  const [p, setP] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: p.name, email: p.email, locale: p.locale, notifySms: p.notifySms, notifyWhatsapp: p.notifyWhatsapp, notifyPromos: p.notifyPromos,
      }),
    });
    const d = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setError(d.error ?? "Profil non enregistré");
    toast("Profil enregistré");
    router.refresh();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-[18px]">
      <h1 className="page-title">Mon profil</h1>
      <div className="grid gap-4 rounded-[28px] border border-line bg-white p-6 sm:grid-cols-2">
        <label className="field">Prénom et nom<input className="input" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} autoComplete="name" required minLength={2} /></label>
        <label className="field">Téléphone, vérifié par SMS<input className="input" value={p.phone} disabled /></label>
        <label className="field">E-mail, pour les factures (facultatif)<input className="input" type="email" value={p.email} onChange={(e) => setP({ ...p, email: e.target.value })} placeholder="vous@exemple.tn" autoComplete="email" /></label>
        <div className="field">
          Langue du site
          <div className="flex h-12 gap-1.5 rounded-[14px] bg-[#F0F3F9] p-1" role="group" aria-label="Langue du site">
            {(["FR", "AR"] as const).map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={p.locale === l}
                onClick={() => setP({ ...p, locale: l })}
                lang={l === "AR" ? "ar" : "fr"}
                className={cn("flex-1 rounded-[11px] text-[15px] text-ink", p.locale === l && "bg-white shadow-sm")}
              >
                {l === "FR" ? "Français" : "العربية"}
              </button>
            ))}
          </div>
          {p.locale === "AR" && <span className="text-xs">La version arabe arrive bientôt. Votre choix est enregistré.</span>}
        </div>
      </div>

      <div className="rounded-[28px] border border-line bg-white px-6 py-2.5">
        {NOTIFS.map((n) => (
          <div key={n.key} className="flex items-center gap-4 border-b border-line-soft py-4 last:border-0">
            <div className="flex-1">
              <b className="text-[15px] font-medium">{n.title}</b>
              <p className="text-[13px] text-ink-muted">{n.detail}</p>
            </div>
            <button type="button" className="toggle" aria-pressed={p[n.key]} aria-label={n.title} onClick={() => setP({ ...p, [n.key]: !p[n.key] })} />
          </div>
        ))}
      </div>

      {error && <p role="alert" className="text-sm text-pop-dark">{error}</p>}
      <div className="flex flex-wrap gap-2.5">
        <button type="submit" disabled={saving} className="btn-primary btn-sm">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}</button>
        <button type="button" onClick={logout} className="btn-secondary btn-sm">Se déconnecter</button>
      </div>
    </form>
  );
}
