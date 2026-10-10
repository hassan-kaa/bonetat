"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

export default function ListingActions({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function act(body: object, done: string) {
    setBusy(true);
    const res = await fetch(`/api/admin/listings/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast(d.error ?? "Action refusée", "error");
    toast(done);
    router.refresh();
  }

  if (rejecting) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          act({ action: "reject", reason }, "Correction demandée, l’atelier est prévenu");
        }}
        className="inline-flex items-center gap-2"
      >
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ce que l’atelier doit corriger" aria-label="Ce que l’atelier doit corriger" required minLength={3} className="h-10 w-64 rounded-xl border-[1.5px] border-line-strong px-3 text-sm outline-none focus:border-brand" />
        <button type="submit" disabled={busy} className="btn-sm inline-flex items-center rounded-xl bg-pop-dark font-semibold text-white">Envoyer</button>
        <button type="button" onClick={() => setRejecting(false)} className="btn-secondary btn-sm">Annuler</button>
      </form>
    );
  }
  return (
    <span className="inline-flex gap-2">
      <button type="button" disabled={busy} onClick={() => act({ action: "approve" }, "Offre mise en ligne")} className="btn-primary btn-sm">Valider</button>
      <button type="button" disabled={busy} onClick={() => setRejecting(true)} className="btn-secondary btn-sm">Demander une correction</button>
    </span>
  );
}
