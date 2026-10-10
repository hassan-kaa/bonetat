"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ImageAngle, ImageStatus } from "@prisma/client";
import { useToast } from "@/components/ui/Toast";
import { storedImageLoader } from "@/lib/image-url";
import { cn } from "@/lib/utils";

const ANGLES: { value: ImageAngle; label: string }[] = [
  { value: "FRONT", label: "Face" },
  { value: "BACK", label: "Dos" },
  { value: "SIDE", label: "Profil" },
  { value: "DETAIL", label: "Détail" },
];

type Props = {
  image: { id: string; key: string; angle: ImageAngle; status: ImageStatus; source: string; lowRes: boolean };
  colorName: string;
};

export default function ImageTile({ image, colorName }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const live = image.status === "APPROVED";

  async function act(body: object) {
    setBusy(true);
    const res = await fetch(`/api/admin/catalog/images/${image.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast(d.error ?? "Action refusée", "error");
    router.refresh();
  }

  return (
    <div className={cn("flex flex-col gap-2 rounded-2xl border-2 p-2", live ? "border-gain" : "border-line", busy && "opacity-60")}>
      <span className="relative block aspect-square overflow-hidden rounded-xl bg-white">
        <Image loader={storedImageLoader} src={image.key} alt={`${colorName}, ${image.angle}`} fill sizes="200px" className="object-contain" />
        {live && <span className="absolute left-1.5 top-1.5 rounded-full bg-gain px-2 py-0.5 text-[11px] font-semibold text-white">En ligne</span>}
      </span>
      <select
        aria-label="Angle"
        value={image.angle}
        disabled={busy}
        onChange={(e) => act({ action: "angle", angle: e.target.value })}
        className="h-9 rounded-lg border-[1.5px] border-line-strong px-2 text-sm"
      >
        {ANGLES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
      </select>
      <p className={cn("text-[12px]", image.lowRes ? "font-medium text-amber-700" : "text-ink-muted")}>
        Source {image.source}{image.lowRes ? ", basse résolution" : ""}
      </p>
      <div className="flex gap-1.5">
        {live ? (
          <button type="button" disabled={busy} onClick={() => act({ action: "draft" })} className="btn-secondary btn-sm flex-1">Retirer</button>
        ) : (
          <button type="button" disabled={busy} onClick={() => act({ action: "approve" })} className="btn-primary btn-sm flex-1">Valider</button>
        )}
        <button type="button" disabled={busy} onClick={() => act({ action: "archive" })} aria-label="Archiver" className="btn-secondary btn-sm">✕</button>
      </div>
    </div>
  );
}
