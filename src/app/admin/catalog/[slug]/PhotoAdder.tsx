"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ImagePlus, Link2, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { shrinkImage } from "@/lib/client/shrink-image";
import { usePasteImages } from "@/hooks/usePasteImages";
import { cn } from "@/lib/utils";

const ANGLES = [
  { value: "FRONT", label: "Face" },
  { value: "BACK", label: "Dos" },
  { value: "SIDE", label: "Côté" },
  { value: "DETAIL", label: "Détail" },
] as const;

/**
 * Add photos by hand to one color (or to the model, finishId null): a file, a drag and drop, Ctrl/Cmd+V, or
 * an image address. Online at once. The page has one per color, so pasting goes to the one under the mouse.
 */
export default function PhotoAdder({ productId, finishId }: { productId: string; finishId: string | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const [angle, setAngle] = useState<(typeof ANGLES)[number]["value"]>("FRONT");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(false);
  const [over, setOver] = useState(false);

  async function send(body: object) {
    const res = await fetch(`/api/admin/catalog/products/${productId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ finishId, angle, ...body }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) toast(d.message ?? "Photo ajoutée");
    else toast(d.message ?? d.error ?? "Ajout impossible", "error");
    return res.ok;
  }

  async function addFiles(files: File[]) {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (!images.length) return;
    setBusy(true);
    let added = 0;
    // Big enough for the 1600 px catalog size, small enough for a request
    for (const f of images) if (await send({ data: (await shrinkImage(f, 2000)).data })) added++;
    setBusy(false);
    if (added) router.refresh();
  }

  async function addUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setBusy(true);
    const ok = await send({ url: url.trim() });
    setBusy(false);
    if (ok) {
      setUrl("");
      router.refresh();
    }
  }

  usePasteImages(addFiles, active && !busy);

  return (
    <div
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); addFiles([...e.dataTransfer.files]); }}
      className={cn("flex flex-col gap-3 rounded-2xl border border-dashed border-line-strong p-4 transition-colors", (over || active) && "border-brand bg-brand-tint/40")}
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-ink-muted">Angle</span>
          <select value={angle} onChange={(e) => setAngle(e.target.value as typeof angle)} className="h-9 rounded-lg border-[1.5px] border-line-strong px-2 text-sm">
            {ANGLES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </label>
        <label className="btn-secondary btn-sm cursor-pointer">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" aria-hidden="true" />}
          Choisir des photos
          <input type="file" accept="image/*" multiple className="sr-only" disabled={busy} onChange={(e) => { addFiles([...(e.target.files ?? [])]); e.target.value = ""; }} />
        </label>
        <span className="text-[13px] text-ink-muted">ou glissez-les ici, ou collez (Ctrl+V)</span>
      </div>
      <form onSubmit={addUrl} className="flex flex-wrap items-center gap-2">
        <Link2 className="h-4 w-4 text-ink-muted" aria-hidden="true" />
        <label className="sr-only" htmlFor={`url-${finishId ?? "model"}`}>Adresse d’une image</label>
        <input
          id={`url-${finishId ?? "model"}`}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://… adresse d’une image sur le site de la marque"
          className="h-9 min-w-0 flex-1 rounded-lg border-[1.5px] border-line-strong px-3 text-sm outline-none focus:border-brand"
        />
        <button type="submit" disabled={busy || !url.trim()} className="btn-secondary btn-sm">Importer</button>
      </form>
    </div>
  );
}
