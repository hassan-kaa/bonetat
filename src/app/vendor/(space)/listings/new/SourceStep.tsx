"use client";

import { useEffect, useState } from "react";
import type { DeviceKind } from "@prisma/client";
import { ImagePlus, Link2, Loader2, PenLine, Search, Sparkles, X } from "lucide-react";
import DeviceArt from "@/components/products/DeviceArt";
import { cn } from "@/lib/utils";
import { shrinkImage, type ShrunkImage } from "@/lib/client/shrink-image";
import NewModelForm from "./NewModelForm";
import type { BrandOption, CatalogProduct, ChosenProduct, ResolvedListing } from "./types";

type Mode = "manual" | "paste" | "link";
type Shot = ShrunkImage;
type Hit = { productId: string; label: string; kind: DeviceKind };

const TABS: { mode: Mode; label: string; Icon: typeof PenLine }[] = [
  { mode: "paste", label: "Coller mon annonce", Icon: Sparkles },
  { mode: "manual", label: "Chercher le modèle", Icon: PenLine },
  { mode: "link", label: "Lien de publication", Icon: Link2 },
];

/** One model card: same look for quick picks, search results and suggestions */
function ModelButton({ label, kind, hex, onClick, note }: { label: string; kind: DeviceKind; hex?: string; onClick: () => void; note?: string }) {
  return (
    <button type="button" onClick={onClick} className="opt flex items-center gap-3 p-3 text-left">
      <span className="grid h-12 w-12 flex-none place-items-center overflow-hidden rounded-xl bg-brand-tint">
        <span className={kind === "PHONE" ? "translate-y-2 -rotate-6" : ""}>
          <DeviceArt kind={kind} color={hex ?? "#5B6170"} cameras={2} width={kind === "PHONE" ? 24 : 34} />
        </span>
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{label}</span>
        {note && <span className="text-xs text-ink-muted">{note}</span>}
      </span>
    </button>
  );
}

export default function SourceStep({ recent, brands, onChosen }: { recent: CatalogProduct[]; brands: BrandOption[]; onChosen: (c: ChosenProduct) => void }) {
  const [mode, setMode] = useState<Mode>("paste");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [shots, setShots] = useState<Shot[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ draftId: string; resolved: ResolvedListing } | null>(null);
  const [newModel, setNewModel] = useState(false);

  // The whole catalog, searched on the server as the store types
  useEffect(() => {
    if (mode !== "manual" || query.trim().length < 2) return setHits(null);
    const t = setTimeout(async () => {
      const res = await fetch(`/api/vendor/catalog/search?${new URLSearchParams({ q: query.trim() })}`);
      if (res.ok) setHits((await res.json()).catalog);
    }, 250);
    return () => clearTimeout(t);
  }, [mode, query]);

  async function addShots(files: FileList | null) {
    if (!files) return;
    const added = await Promise.all([...files].filter((f) => f.type.startsWith("image/")).slice(0, 3 - shots.length).map((f) => shrinkImage(f)));
    setShots([...shots, ...added]);
  }

  async function analyse() {
    setBusy(true);
    setError("");
    setResult(null);
    setNewModel(false);
    const res = await fetch("/api/vendor/listings/interpret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        mode === "link"
          ? { link: link.trim() }
          : { text: text.trim() || undefined, images: shots.map(({ mediaType, data }) => ({ mediaType, data })) }
      ),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(d.error ?? "Analyse impossible");
    setResult(d);
    // The model is in the catalog: straight to the configuration
    if (d.resolved.product) onChosen({ productId: d.resolved.product.id, draftId: d.draftId, resolved: d.resolved });
  }

  const chosen = (productId: string) => onChosen({ productId, draftId: result?.draftId, resolved: result?.resolved });
  const r = result?.resolved;

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" className="grid gap-2 sm:grid-cols-3">
        {TABS.map(({ mode: m, label, Icon }) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setError(""); setResult(null); setNewModel(false); }} className={cn("opt flex items-center gap-2.5 px-4 py-3 text-[15px]", mode === m && "opt-on")}>
            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {mode === "manual" && !newModel && (
        <>
          <label className="flex h-12 items-center gap-2.5 rounded-[14px] border-[1.5px] border-line-strong px-4 focus-within:border-brand">
            <Search className="h-[18px] w-[18px] text-ink-muted" aria-hidden="true" />
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="iPhone 13 Pro, Redmi Note 13, EliteBook 840 G8, PS5…" aria-label="Rechercher un modèle" className="flex-1 text-[15px] outline-none" />
          </label>
          {hits === null ? (
            recent.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Vos modèles récents</p>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2.5">
                  {recent.map((p) => <ModelButton key={p.id} label={p.name} kind={p.kind} hex={p.colorHex} note={p.category} onClick={() => chosen(p.id)} />)}
                </div>
              </div>
            )
          ) : hits.length > 0 ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2.5">
              {hits.map((h) => <ModelButton key={h.productId} label={h.label} kind={h.kind} onClick={() => chosen(h.productId)} />)}
            </div>
          ) : (
            <p className="text-sm text-ink-muted">Aucun modèle trouvé pour « {query} ». Vérifiez l’orthographe ou le numéro de modèle.</p>
          )}
          <button type="button" onClick={() => setNewModel(true)} className="self-start text-[13px] text-ink-muted hover:text-ink hover:underline">
            Mon modèle n’est pas dans la liste
          </button>
        </>
      )}

      {(mode === "paste" || mode === "link") && !r && (
        <div className="flex flex-col gap-3">
          {mode === "paste" ? (
            <>
              <textarea className="input min-h-[180px]" value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} placeholder="Collez ici le texte de votre publication Facebook ou Instagram…" aria-label="Texte de l’annonce" />
              <div className="flex flex-wrap items-center gap-2.5">
                {shots.map((s, i) => (
                  <span key={i} className="relative h-16 w-16 overflow-hidden rounded-xl border border-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.preview} alt={s.name} className="h-full w-full object-cover" />
                    <button type="button" aria-label="Retirer la capture" onClick={() => setShots(shots.filter((_, j) => j !== i))} className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-ink/70 text-white">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {shots.length < 3 && (
                  <label className="opt flex h-16 cursor-pointer items-center gap-2 px-4 text-sm">
                    <ImagePlus className="h-[18px] w-[18px]" aria-hidden="true" />
                    Captures d’écran (3 max.)
                    <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => addShots(e.target.files)} />
                  </label>
                )}
              </div>
            </>
          ) : (
            <>
              <input className="input" type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://www.facebook.com/… ou https://www.instagram.com/p/…" aria-label="Lien de la publication" />
              <p className="text-[13px] text-ink-muted">La publication doit être publique. Sinon, collez son texte ou une capture d’écran.</p>
            </>
          )}
          <button type="button" onClick={analyse} disabled={busy || (mode === "paste" ? !text.trim() && !shots.length : !link.trim())} className="btn-primary btn-sm self-start">
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Lecture de l’annonce…</> : "Analyser"}
          </button>
        </div>
      )}

      {r && !r.product && !newModel && (
        <div className="flex flex-col gap-3.5">
          <p className="text-[15px]">
            Lu dans votre annonce : <b className="font-semibold">{[r.brand ?? r.brandUnknown, r.line, r.modelNumber].filter(Boolean).join(" ") || "modèle non précisé"}</b>
          </p>
          {r.candidates.length > 0 ? (
            <>
              <p className="text-sm font-medium">C’est l’un de ces modèles ?</p>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2.5">
                {r.candidates.map((c) => <ModelButton key={c.productId} label={c.label} kind={r.kind ?? "OTHER"} onClick={() => chosen(c.productId)} />)}
              </div>
            </>
          ) : (
            <p className="rounded-2xl bg-chalk px-4 py-3 text-sm text-ink-soft">
              {r.modelNumber ? "Modèle introuvable dans le catalogue. Cherchez-le ci-dessous." : "L’annonce ne donne pas le modèle exact (étiquette sous l’appareil). Cherchez-le ci-dessous."}
            </p>
          )}
          <div className="flex flex-wrap gap-2.5">
            <button type="button" onClick={() => { setMode("manual"); setQuery([r.line, r.modelNumber].filter(Boolean).join(" ")); }} className="btn-secondary btn-sm">Chercher un autre modèle</button>
            <button type="button" onClick={() => setResult(null)} className="btn-sm rounded-xl px-3 text-ink-muted hover:text-ink">Modifier l’annonce</button>
          </div>
        </div>
      )}

      {newModel && (
        <NewModelForm
          brands={brands}
          initial={{ brand: r?.brand, line: r?.line, modelNumber: r?.modelNumber, kind: r?.kind }}
          onCreated={chosen}
          onCancel={() => setNewModel(false)}
        />
      )}

      {error && <p role="alert" className="text-sm text-pop-dark">{error}</p>}
    </div>
  );
}
