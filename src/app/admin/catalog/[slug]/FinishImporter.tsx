"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

/** Paste an Icecat reference for this color; the gallery is imported as drafts */
export default function FinishImporter({ finishId, linked }: { finishId: string; linked: number | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const [ref, setRef] = useState(linked ? String(linked) : "");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch(`/api/admin/catalog/finishes/${finishId}/icecat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast(d.error ?? "Import impossible", "error");
    // The Icecat title names the color: read it to catch a wrong mapping straight away
    toast(`${d.title} : ${d.imported} importée(s)${d.skipped ? `, ${d.skipped} déjà là` : ""}${d.failed ? `, ${d.failed} en échec` : ""}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`icecat-${finishId}`}>Référence Icecat</label>
      <input
        id={`icecat-${finishId}`}
        value={ref}
        onChange={(e) => setRef(e.target.value)}
        placeholder="Code fabricant, EAN ou ID Icecat"
        className="h-10 w-64 rounded-xl border-[1.5px] border-line-strong px-3 text-sm outline-none focus:border-brand"
      />
      <button type="submit" disabled={busy || !ref.trim()} className="btn-primary btn-sm">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : linked ? "Réimporter" : "Importer"}
      </button>
    </form>
  );
}
