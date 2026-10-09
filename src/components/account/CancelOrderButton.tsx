"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

export default function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function cancel() {
    setLoading(true);
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    const d = await res.json().catch(() => ({}));
    setLoading(false);
    setConfirming(false);
    if (res.ok) {
      toast("Commande annulée");
      router.refresh();
    } else toast(d.error ?? "Annulation impossible", "error");
  }

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="btn-secondary btn-sm">
        Annuler la commande
      </button>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-2 text-sm">
      <span>Annuler cette commande ?</span>
      <button type="button" onClick={cancel} disabled={loading} className="btn-sm inline-flex items-center rounded-xl bg-pop-dark px-4 font-semibold text-white">
        Oui, annuler
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="btn-secondary btn-sm">Garder</button>
    </span>
  );
}
