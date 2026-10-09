"use client";

import { useRouter } from "next/navigation";
import type { OrderStatus } from "@prisma/client";
import { useToast } from "@/components/ui/Toast";

export default function OrderActions({ id, status }: { id: string; status: OrderStatus }) {
  const router = useRouter();
  const { toast } = useToast();

  async function set(next: OrderStatus, done: string) {
    const res = await fetch(`/api/admin/orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return toast(d.error ?? "Action refusée", "error");
    toast(done);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "PENDING" && <button type="button" onClick={() => set("CONFIRMED", "Commande confirmée, l’atelier est prévenu")} className="btn-primary btn-sm">Confirmer (appel fait)</button>}
      {(status === "SHIPPED" || status === "CONFIRMED") && <button type="button" onClick={() => set("DELIVERED", "Livraison enregistrée")} className="btn-primary btn-sm">Livrée et encaissée</button>}
      {status === "DELIVERED" && <button type="button" onClick={() => set("DISPUTED", "Réclamation ouverte")} className="btn-secondary btn-sm">Ouvrir une réclamation</button>}
      {status !== "DELIVERED" && status !== "CANCELLED" && <button type="button" onClick={() => set("CANCELLED", "Commande annulée, stock remis en vente")} className="btn-secondary btn-sm">Annuler</button>}
    </div>
  );
}
