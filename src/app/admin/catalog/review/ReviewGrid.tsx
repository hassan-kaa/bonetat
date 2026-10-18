"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type Item = { id: string; src: string; full: string; model: string; color: string; hex: string };

async function post(body: object) {
  const res = await fetch("/api/admin/catalog/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return res.ok;
}

/** Every pending photo side by side: ✕ the bad ones, then validate what's left in one click */
export default function ReviewGrid({ images }: { images: Item[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = useState(images);
  const [busy, setBusy] = useState<string | null>(null);

  async function reject(id: string) {
    setBusy(id);
    const ok = await post({ action: "reject", id });
    setBusy(null);
    if (!ok) return toast("Rejet impossible", "error");
    setItems((xs) => xs.filter((x) => x.id !== id));
  }

  async function validateAll() {
    setBusy("all");
    const ok = await post({ action: "validate", ids: items.map((i) => i.id) });
    setBusy(null);
    if (!ok) return toast("Validation impossible", "error");
    toast(`${items.length} photo${items.length > 1 ? "s" : ""} mise${items.length > 1 ? "s" : ""} en ligne`);
    setItems([]);
    router.refresh();
  }

  if (!items.length) return <p className="rounded-panel border border-line bg-white p-8 text-center text-ink-muted">Rien à vérifier pour le moment.</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-panel border border-line bg-white p-4">
        <p className="text-[15px]"><b className="font-semibold">{items.length}</b> photo{items.length > 1 ? "s" : ""} en attente</p>
        <button type="button" onClick={validateAll} disabled={busy !== null} className="btn-primary">
          {busy === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Tout valider ({items.length})
        </button>
      </div>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3">
        {items.map((i) => (
          <li key={i.id} className={`relative flex flex-col overflow-hidden rounded-panel border border-line bg-white ${busy === i.id ? "opacity-50" : ""}`}>
            <a href={i.full} target="_blank" rel="noreferrer" className="block aspect-square bg-white p-2" title="Voir en grand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={i.src} alt={`${i.model}, ${i.color}`} className="h-full w-full object-contain" />
            </a>
            <div className="border-t border-line-soft px-3 py-2 text-[13px] leading-tight">
              <p className="truncate font-medium">{i.model}</p>
              <p className="flex items-center gap-1.5 text-ink-muted">
                <span className="h-2.5 w-2.5 rounded-full border border-ink/15" style={{ background: i.hex }} aria-hidden="true" />
                {i.color}
              </p>
            </div>
            <button
              type="button"
              onClick={() => reject(i.id)}
              disabled={busy !== null}
              aria-label={`Rejeter la photo ${i.model} ${i.color}`}
              className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-ink/80 text-white hover:bg-pop"
            >
              <X className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
