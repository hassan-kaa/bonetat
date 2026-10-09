"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { VendorStatus } from "@prisma/client";
import { useToast } from "@/components/ui/Toast";

export default function VendorActions({ id, status, qualityScore }: { id: string; status: VendorStatus; qualityScore: number }) {
  const router = useRouter();
  const { toast } = useToast();
  const [score, setScore] = useState(String(qualityScore));

  async function patch(body: object, done: string) {
    const res = await fetch(`/api/admin/vendors/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return toast(d.error ?? "Action refusée", "error");
    toast(done);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-2.5">
      <div className="flex gap-2">
        {status !== "APPROVED" && <button type="button" onClick={() => patch({ status: "APPROVED" }, "Atelier approuvé")} className="btn-primary btn-sm">Approuver</button>}
        {status === "APPROVED" && <button type="button" onClick={() => patch({ status: "SUSPENDED" }, "Atelier suspendu")} className="btn-secondary btn-sm">Suspendre</button>}
      </div>
      {status === "APPROVED" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            patch({ qualityScore: Number(score) }, "Score mis à jour");
          }}
          className="flex items-center gap-2 text-sm"
        >
          <label htmlFor={`q-${id}`} className="text-ink-muted">Score qualité</label>
          <input id={`q-${id}`} type="number" min={0} max={100} value={score} onChange={(e) => setScore(e.target.value)} className="h-9 w-16 rounded-xl border-[1.5px] border-line-strong px-2 text-right outline-none focus:border-brand" />
          {Number(score) !== qualityScore && <button type="submit" className="rounded-lg bg-brand px-2.5 py-1.5 text-xs font-semibold text-white">OK</button>}
        </form>
      )}
    </div>
  );
}
