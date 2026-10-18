"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { X } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

/** A shop's photo in the moderation list: open it full size, or refuse it */
export default function UnitPhoto({ id, thumb, full }: { id: string; thumb: string; full: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  async function refuse() {
    if (!window.confirm("Refuser cette photo ? Elle disparaît de l’offre.")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/offer-photos/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) return toast("Suppression impossible", "error");
    router.refresh();
  }

  return (
    <span className={`relative ${busy ? "opacity-50" : ""}`}>
      <a href={full} target="_blank" rel="noreferrer" title="Photo de l’atelier : vérifier qu’aucun numéro ni lien n’apparaît">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumb} alt="Photo de l’appareil" className="h-12 w-12 rounded-lg border border-line object-cover" />
      </a>
      <button type="button" onClick={refuse} disabled={busy} aria-label="Refuser cette photo" className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink text-white hover:bg-pop">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
