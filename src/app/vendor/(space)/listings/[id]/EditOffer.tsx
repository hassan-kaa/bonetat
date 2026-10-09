"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { OfferStatus } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type Props = {
  offer: { id: string; priceMillimes: number; sellerNote: string; status: OfferStatus; rejectionReason: string | null };
};

export default function EditOffer({ offer }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [price, setPrice] = useState(String(offer.priceMillimes / 1000));
  const [note, setNote] = useState(offer.sellerNote);
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
      <p className="rounded-[26px] border border-line bg-white p-6 text-[15px] text-ink-muted">
        Cet appareil est vendu. Il reviendra en ligne automatiquement si la commande est annulée.
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send({ priceMillimes: Math.round(Number(price) * 1000), sellerNote: note || null }, "Offre enregistrée");
      }}
      className="flex flex-col gap-4 rounded-[26px] border border-line bg-white p-6"
    >
      {offer.status === "REJECTED" && offer.rejectionReason && (
        <p className="rounded-2xl bg-pop-tint px-4 py-3 text-sm text-pop-dark">Refusée par Bonétat : {offer.rejectionReason}</p>
      )}
      {offer.status === "PENDING_REVIEW" && (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">En contrôle : l’équipe Bonétat valide l’offre sous 24 h.</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field">Prix (DT)<input className="input" type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} required /></label>
        <label className="field sm:col-span-2">Ce qui est inclus<input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} /></label>
      </div>
      {error && <p role="alert" className="text-sm text-pop-dark">{error}</p>}
      <div className="flex flex-wrap gap-2.5">
        <button type="submit" disabled={saving} className="btn-primary btn-sm">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}</button>
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
