"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ConditionGrade, DeviceKind, OfferStatus } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { GRADES, GRADE_ORDER, MIN_BATTERY_HEALTH } from "@/lib/catalog";
import { cn } from "@/lib/utils";

type Props = {
  offer: {
    id: string; priceMillimes: number; sellerNote: string; status: OfferStatus; rejectionReason: string | null;
    grade: ConditionGrade; batteryHealth: number | null; imei: string | null; kind: DeviceKind;
  };
};

export default function EditOffer({ offer }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [price, setPrice] = useState(String(offer.priceMillimes / 1000));
  const [note, setNote] = useState(offer.sellerNote);
  const [grade, setGrade] = useState(offer.grade);
  const [battery, setBattery] = useState(offer.batteryHealth === null ? "" : String(offer.batteryHealth));
  const [imei, setImei] = useState(offer.imei ?? "");
  // Bonétat asked for a correction: grade, battery and IMEI open, and the offer goes back to moderation
  const correcting = offer.status === "REJECTED";
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function send(data: object, done: string) {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/vendor/listings/${offer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const d = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setError(d.error ?? "Modification refusée");
    toast(done);
    router.refresh();
  }

  if (offer.status === "SOLD") {
    return (
      <p className="rounded-panel border border-line bg-white p-6 text-[15px] text-ink-muted">
        Cet appareil est vendu. Il reviendra en ligne automatiquement si la commande est annulée.
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const base = { priceMillimes: Math.round(Number(price) * 1000), sellerNote: note || null };
        if (correcting) {
          send(
            { ...base, conditionGrade: grade, batteryHealth: offer.kind === "CONSOLE" ? null : Number(battery), imei: imei || null, resubmit: true },
            "Offre corrigée et renvoyée en contrôle"
          );
        } else send(base, "Offre enregistrée");
      }}
      className="flex flex-col gap-4 rounded-panel border border-line bg-white p-6"
    >
      {correcting && (
        <p className="rounded-2xl bg-pop-tint px-4 py-3 text-sm text-pop-dark">
          <b className="font-semibold">Bonétat demande une correction :</b> {offer.rejectionReason ?? "voir avec l’équipe"}. Corrigez, puis renvoyez l’offre.
        </p>
      )}
      {correcting && (
        <div>
          <h2 className="mb-2.5 text-[15px] font-semibold">État selon la grille Bonétat</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
            {[...GRADE_ORDER].reverse().map((g) => (
              <button key={g} type="button" aria-pressed={grade === g} onClick={() => setGrade(g)} className={cn("opt p-3 text-sm font-medium", grade === g && "opt-on")}>{GRADES[g].label}</button>
            ))}
          </div>
        </div>
      )}
      {offer.status === "PENDING_REVIEW" && (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">En contrôle : l’équipe Bonétat valide l’offre sous 24 h.</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field">Prix (DT)<input className="input" type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} required /></label>
        {correcting && offer.kind !== "CONSOLE" && (
          <label className="field">Batterie mesurée (%), minimum {MIN_BATTERY_HEALTH} %<input className="input" type="number" min={MIN_BATTERY_HEALTH} max={100} value={battery} onChange={(e) => setBattery(e.target.value)} required /></label>
        )}
        {correcting && (
          <label className="field">{offer.kind === "PHONE" ? "IMEI (15 chiffres)" : "Numéro de série"}<input className="input" value={imei} onChange={(e) => setImei(e.target.value.replace(offer.kind === "PHONE" ? /\D/g : /\s/g, ""))} maxLength={offer.kind === "PHONE" ? 15 : 40} /></label>
        )}
        <label className="field sm:col-span-2">Ce qui est inclus<input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} /></label>
      </div>
      {error && <p role="alert" className="text-sm text-pop-dark">{error}</p>}
      <div className="flex flex-wrap gap-2.5">
        <button type="submit" disabled={saving} className="btn-primary btn-sm">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : correcting ? "Renvoyer en contrôle" : "Enregistrer"}</button>
        {offer.status === "ACTIVE" && (
          <button type="button" onClick={() => send({ status: "INACTIVE" }, "Offre en pause")} className="btn-secondary btn-sm">Mettre en pause</button>
        )}
        {offer.status === "INACTIVE" && (
          <button type="button" onClick={() => send({ status: "ACTIVE" }, "Offre remise en ligne")} className="btn-secondary btn-sm">Remettre en ligne</button>
        )}
      </div>
    </form>
  );
}
