"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

export default function SuggestionActions({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  async function act(action: "accept" | "reject") {
    setBusy(true);
    const res = await fetch(`/api/admin/catalog/suggestions/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast(d.error ?? "Action refusée", "error");
    toast(action === "accept" ? "Fiche corrigée" : "Correction refusée");
    router.refresh();
  }
  return (
    <span className="inline-flex gap-2">
      <button type="button" disabled={busy} onClick={() => act("accept")} className="btn-primary btn-sm">Accepter</button>
      <button type="button" disabled={busy} onClick={() => act("reject")} className="btn-secondary btn-sm">Refuser</button>
    </span>
  );
}
