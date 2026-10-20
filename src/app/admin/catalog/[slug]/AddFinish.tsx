"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

/** Add a color to the model: a French name ("Gris sidéral"), and a swatch if the automatic one doesn't fit */
export default function AddFinish({ productId }: { productId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [hex, setHex] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch(`/api/admin/catalog/products/${productId}/finishes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nameFr: name, ...(hex ? { hex } : {}) }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast(d.error ?? "Ajout impossible", "error");
    toast(`Couleur « ${name} » ajoutée`);
    setName("");
    setHex("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2.5 rounded-panel border border-line bg-white p-5">
      <label className="field min-w-[200px] flex-1">
        Nouvelle couleur
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Noir, Gris sidéral, Bleu nuit…" required />
      </label>
      <label className="field">
        Teinte (facultatif)
        <input type="color" value={hex || "#9aa0a6"} onChange={(e) => setHex(e.target.value)} className="h-[46px] w-16 cursor-pointer rounded-xl border-[1.5px] border-line-strong" />
      </label>
      <button type="submit" disabled={busy || !name.trim()} className="btn-primary btn-sm h-[46px]">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
        Ajouter
      </button>
    </form>
  );
}
