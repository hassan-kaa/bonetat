"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, Trash2, X } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

const REASONS = [
  { value: "SOLD_ELSEWHERE", label: "Vendu ailleurs", hint: "En boutique, sur Facebook…" },
  { value: "UNAVAILABLE", label: "Plus disponible", hint: "Repris, en réparation, réservé…" },
  { value: "MISTAKE", label: "Erreur de saisie", hint: "Je republierai l’appareil correctement" },
] as const;

/**
 * Delete an offer, with its reason. A bottom sheet on phones, a centered dialog on larger screens.
 * `afterDelete` takes the shop back to its list when deleting from the edit page.
 */
export default function DeleteOffer({ offerId, name, afterDelete, compact }: { offerId: string; name: string; afterDelete?: string; compact?: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number]["value"] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (!reason) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/vendor/listings/${offerId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(d.error ?? "Suppression impossible");
    setOpen(false);
    toast("Offre supprimée");
    if (afterDelete) router.push(afterDelete);
    else router.refresh();
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setReason(null); setError(""); } }}>
      <Dialog.Trigger className={cn("btn-secondary btn-sm text-pop-dark", compact && "px-3")} aria-label={compact ? `Supprimer ${name}` : undefined}>
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        {!compact && "Supprimer"}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/50" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 flex flex-col gap-4 rounded-t-panel bg-white p-6 shadow-lift sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[min(460px,calc(100vw-32px))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-panel">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold">Supprimer cette offre ?</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-ink-muted">{name} disparaît de Bonétat, avec ses photos. Pour un arrêt temporaire, utilisez plutôt « Pause ».</Dialog.Description>
            </div>
            <Dialog.Close aria-label="Fermer" className="grid h-9 w-9 flex-none place-items-center rounded-full hover:bg-chalk">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Pourquoi ?</legend>
            {REASONS.map((r) => (
              <button key={r.value} type="button" aria-pressed={reason === r.value} onClick={() => setReason(r.value)} className={cn("opt flex flex-col items-start px-4 py-3 text-left", reason === r.value && "opt-on")}>
                <span className="text-[15px] font-medium">{r.label}</span>
                <span className="text-[13px] text-ink-muted">{r.hint}</span>
              </button>
            ))}
          </fieldset>
          {error && <p role="alert" className="text-sm text-pop-dark">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2.5">
            <Dialog.Close className="btn-secondary btn-sm">Annuler</Dialog.Close>
            <button type="button" onClick={remove} disabled={!reason || busy} className="btn-sm rounded-xl bg-pop-dark px-4 font-semibold text-white disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Supprimer l’offre"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
