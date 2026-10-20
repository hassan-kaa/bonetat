"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { storedImageLoader } from "@/lib/image-url";
import { shrinkImage } from "@/lib/client/shrink-image";
import { usePasteImages } from "@/hooks/usePasteImages";

/** The store's own photos of this unit: shown to buyers with the offer, whether or not the model has catalog photos */
export default function OfferPhotos({ offerId, photos, editable }: { offerId: string; photos: { id: string; key: string }[]; editable: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  async function add(files: FileList | File[] | null) {
    const list = [...(files ?? [])].filter((f) => f.type.startsWith("image/")).slice(0, 3 - photos.length);
    if (!list.length) return;
    setBusy(true);
    const shrunk = await Promise.all(list.map((f) => shrinkImage(f, 1600)));
    const res = await fetch(`/api/vendor/listings/${offerId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photos: shrunk.map(({ mediaType, data }) => ({ mediaType, data })) }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast(d.error ?? "Envoi impossible", "error");
    toast(d.added ? "Photos ajoutées" : "Ces photos sont déjà là");
    router.refresh();
  }

  usePasteImages((files) => add(files), editable && !busy && photos.length < 3);

  async function remove(id: string) {
    setBusy(true);
    const res = await fetch(`/api/vendor/listings/${offerId}/photos?photo=${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) return toast("Suppression impossible", "error");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-panel border border-line bg-white p-6">
      <div>
        <h2 className="text-[17px] font-semibold">Photos de l’appareil</h2>
        <p className="text-[13px] text-ink-muted">Jusqu’à 3 photos réelles de cet appareil. Les acheteurs les voient avec votre offre.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        {photos.map((p) => (
          <span key={p.id} className="relative h-24 w-24 overflow-hidden rounded-xl border border-line bg-chalk">
            <Image loader={storedImageLoader} src={p.key} alt="Photo de l’appareil" fill sizes="96px" className="object-cover" />
            {editable && (
              <button type="button" disabled={busy} aria-label="Supprimer la photo" onClick={() => remove(p.id)} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-ink/70 text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </span>
        ))}
        {editable && photos.length < 3 && (
          <label className="opt flex h-24 cursor-pointer items-center gap-2 px-4 text-sm">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-[18px] w-[18px]" aria-hidden="true" />}
            Ajouter
            <input type="file" accept="image/*" multiple className="sr-only" disabled={busy} onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
          </label>
        )}
        {editable && photos.length < 3 && <span className="hidden text-[13px] text-ink-muted md:inline">ou collez une image (Ctrl+V)</span>}
        {!editable && photos.length === 0 && <p className="text-sm text-ink-muted">Aucune photo.</p>}
      </div>
    </div>
  );
}
