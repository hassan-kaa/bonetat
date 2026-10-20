"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ConditionGrade } from "@prisma/client";
import { ImagePlus, Loader2, X } from "lucide-react";
import { shrinkImage, type ShrunkImage } from "@/lib/client/shrink-image";
import { usePasteImages } from "@/hooks/usePasteImages";
import { GRADES, GRADE_ORDER, MIN_BATTERY_HEALTH, MIN_WARRANTY_MONTHS, WARRANTY_CHOICES, batteryProblem, formatStorage, variantLabel } from "@/lib/catalog";
import { familyOf } from "@/lib/icecat-match";
import { COMMISSION_LABEL, COMMISSION_RATE, formatPrice } from "@/lib/money";
import { cn } from "@/lib/utils";
import { cpuFamily } from "@/lib/pc-filters";
import { EMPTY_SPECS, LAPTOP_RAMS, LAPTOP_SSDS, laptopLabel, normalizeStorage, specsFromText, type LaptopSpecs } from "@/lib/laptop-specs";
import SourceStep from "./SourceStep";
import ColorPicker, { type ColorChoice } from "./ColorPicker";
import LaptopSpecsPicker from "./LaptopSpecsPicker";
import { type BrandOption, type CatalogProduct, type ChosenProduct, type ProductDetail, type ResolvedListing } from "./types";

const STEPS = ["Appareil", "Configuration", "État et contrôle", "Prix"];
const NEEDS_STORAGE = ["PHONE", "TABLET", "LAPTOP"];

/** "Dupliquer": same device, config, grade, price and note. Battery and IMEI are per unit and asked again. */
export type Prefill = { productId: string; variantId: string; grade: ConditionGrade; priceMillimes: number; sellerNote: string | null; warrantyMonths: number };

type Color = ColorChoice;

/** Small marker next to a field filled from the store's post */
function Read({ on }: { on: boolean }) {
  return on ? <span className="ml-1.5 rounded-full bg-brand-tint px-2 py-0.5 text-[11px] font-medium text-brand-dark">lu dans votre annonce</span> : null;
}

export default function PublishFlow({
  recent, brands, competitors, prefill,
}: { recent: CatalogProduct[]; brands: BrandOption[]; competitors: Record<string, number>; prefill: Prefill | null }) {
  const [step, setStep] = useState(prefill ? 2 : 0);
  const [chosen, setChosen] = useState<ChosenProduct | null>(prefill ? { productId: prefill.productId } : null);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [storage, setStorage] = useState<number | null>(null);
  const [ram, setRam] = useState<number | null>(null);
  const [option, setOption] = useState("");
  const [color, setColor] = useState<Color>(null);
  /** Laptops: processor and graphics card by clicks; `option` is generated from them */
  const [specs, setSpecs] = useState<LaptopSpecs>(EMPTY_SPECS);
  /** Exact processor model, a unit detail: goes into the note */
  const [cpuModel, setCpuModel] = useState("");
  const [grade, setGrade] = useState<ConditionGrade | null>(prefill?.grade ?? null);
  const [battery, setBattery] = useState("");
  const [imei, setImei] = useState("");
  const [note, setNote] = useState(prefill?.sellerNote ?? "");
  /** The shop's own warranty on this unit, 4 months minimum */
  const [warranty, setWarranty] = useState<number>(prefill?.warrantyMonths ?? 12);
  const [price, setPrice] = useState(prefill ? String(prefill.priceMillimes / 1000) : "");
  /** Real photos of this unit, optional */
  const [unitPhotos, setUnitPhotos] = useState<ShrunkImage[]>([]);
  /** From the gallery or pasted (Ctrl/Cmd+V): shrunk in the browser, 3 at most */
  async function addUnitPhotos(files: File[]) {
    const list = files.filter((f) => f.type.startsWith("image/")).slice(0, 3 - unitPhotos.length);
    if (!list.length) return;
    const shrunk = await Promise.all(list.map((f) => shrinkImage(f, 1600)));
    setUnitPhotos((cur) => [...cur, ...shrunk].slice(0, 3));
  }
  const [sending, setSending] = useState(false);
  // Pasting a photo only means something on the step that shows the photos
  usePasteImages(addUnitPhotos, step === 2 && !!product && unitPhotos.length < 3);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const r: ResolvedListing | undefined = chosen?.resolved;
  const pre = r?.prefill;

  // Load the chosen product, then apply what the post said (or the duplicated offer)
  useEffect(() => {
    if (!chosen) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/vendor/products/${chosen.productId}`);
      if (cancelled) return;
      if (!res.ok) return setError("Modèle introuvable");
      const p: ProductDetail = await res.json();
      setProduct(p);
      const source = prefill ? p.variants.find((v) => v.id === prefill.variantId) : undefined;
      const fromPost = chosen.resolved?.prefill;
      const single = <T,>(xs: T[]) => (new Set(xs).size === 1 ? xs[0] : null);
      setStorage(source?.storageGb ?? fromPost?.storageGb ?? single(p.variants.map((v) => v.storageGb)));
      setRam(source?.ramGb ?? fromPost?.ramGb ?? single(p.variants.map((v) => v.ramGb)));
      const startOption = source?.option ?? fromPost?.option ?? single(p.variants.map((v) => v.option)) ?? "";
      setOption(startOption);
      if (p.kind === "LAPTOP") setSpecs(startOption ? specsFromText(startOption, p.brand) : EMPTY_SPECS);
      const finishId = source?.finishId ?? fromPost?.finishId ?? (p.finishes.length === 1 ? p.finishes[0].id : null);
      if (finishId) setColor({ finishId });
      else if (fromPost?.colorAsWritten) {
        // The post's color matches one of the product's colors by name, or becomes a new color
        const byName = p.finishes.find((f) => f.nameFr.toLowerCase() === fromPost.colorAsWritten!.toLowerCase());
        setColor(byName ? { finishId: byName.id } : { name: fromPost.colorAsWritten, family: familyOf(fromPost.colorAsWritten) ?? "OTHER" });
      }
      if (fromPost) {
        if (fromPost.batteryHealth !== null) setBattery(String(fromPost.batteryHealth));
        if (fromPost.priceMillimes) setPrice(String(fromPost.priceMillimes / 1000));
        if (fromPost.sellerNote) setNote(fromPost.sellerNote);
      }
      if (!prefill) setStep(1);
    })();
    return () => {
      cancelled = true;
    };
  }, [chosen, prefill]);

  const kind = product?.kind;
  const values = useMemo(() => {
    const uniq = <T,>(xs: T[]) => [...new Set(xs)].filter((x): x is NonNullable<T> => x !== null);
    const v = product?.variants ?? [];
    return {
      // Laptops: the usual sizes are always offered, not only the ones already listed
      storages: uniq([...(product?.kind === "LAPTOP" ? LAPTOP_SSDS : []), ...v.map((x) => x.storageGb), pre?.storageGb ?? null]).sort((a, b) => a - b),
      rams: uniq([...(product?.kind === "LAPTOP" ? LAPTOP_RAMS : []), ...v.map((x) => x.ramGb), pre?.ramGb ?? null]).sort((a, b) => a - b),
      options: uniq(v.map((x) => x.option)),
    };
  }, [product, pre]);

  const showRam = kind === "LAPTOP" || values.rams.length > 0;
  const cpuInModel = product?.kind === "LAPTOP" ? cpuFamily(product.name, product.brand)?.label ?? null : null;
  // Laptops: the version label is generated from the picks, in one fixed form
  const finalOption = kind === "LAPTOP" ? laptopLabel(specs, { cpuInModel: !!cpuInModel }) ?? "" : option.trim();
  const configOk =
    !!product && !!color && ("finishId" in color || !!color.name.trim()) && (!NEEDS_STORAGE.includes(kind!) || !!storage) &&
    (kind !== "LAPTOP" || (!!ram && (!!cpuInModel || !!specs.cpuFamily)));
  const existingVariant =
    product && color && "finishId" in color
      ? product.variants.find((v) => v.storageGb === storage && v.ramGb === (showRam ? ram : null) && (v.option ?? "") === finalOption && v.finishId === color.finishId)
      : undefined;

  const needsBattery = kind !== "CONSOLE";
  const batteryNum = Number(battery);
  const batteryIssue = product ? batteryProblem(product.kind, battery === "" ? null : batteryNum) : null;
  const imeiOk = kind !== "PHONE" || /^\d{15}$/.test(imei);
  const stateOk = !!grade && !batteryIssue && imeiOk;
  const priceNum = Number(price);
  const priceMillimes = Math.round(priceNum * 1000);
  const commission = Math.round(priceMillimes * COMMISSION_RATE);
  const best = existingVariant && grade ? competitors[`${existingVariant.id}|${grade}`] : undefined;
  const canNext = [!!product, configOk, stateOk, priceNum > 0][step];

  const colorName = color ? ("finishId" in color ? product?.finishes.find((f) => f.id === color.finishId)?.nameFr ?? "" : color.name) : "";
  const configText = product ? variantLabel({ storageGb: storage, ramGb: showRam ? ram : null, option: finalOption || null, finish: { nameFr: colorName } }, product.kind) : "";

  async function submit() {
    if (!product || !color || !grade) return;
    setSending(true);
    setError("");
    const res = await fetch("/api/vendor/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(existingVariant
          ? { variantId: existingVariant.id }
          : {
              config: {
                productId: product.id,
                storageGb: storage,
                ramGb: showRam ? ram : null,
                option: finalOption || null,
                finish: "finishId" in color ? { id: color.finishId } : { name: color.name, family: color.family },
              },
            }),
        conditionGrade: grade,
        batteryHealth: needsBattery ? batteryNum : null,
        imei: kind === "PHONE" ? imei : imei || null,
        priceMillimes,
        warrantyMonths: warranty,
        sellerNote: noteWithCpu() || null,
        draftId: chosen?.draftId,
        photos: unitPhotos.map(({ mediaType, data }) => ({ mediaType, data })),
      }),
    });
    const d = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) return setError(d.error ?? "L’offre n’a pas été envoyée");
    setDone(true);
  }

  /** The exact processor model is shown to buyers in the note, unless the store already wrote it there */
  function noteWithCpu() {
    const m = cpuModel.trim();
    if (!m || note.toLowerCase().includes(m.toLowerCase())) return note.trim();
    return [`Processeur ${m}`, note.trim()].filter(Boolean).join(". ").slice(0, 200);
  }

  /** Same device again: keep config, grade, price and note; battery and IMEI belong to the new unit */
  function another() {
    setDone(false);
    setStep(2);
    setBattery("");
    setImei("");
    setUnitPhotos([]);
  }

  function reset() {
    setDone(false);
    setStep(0);
    setChosen(null);
    setProduct(null);
    setColor(null);
    setGrade(null);
    setBattery("");
    setImei("");
    setNote("");
    setPrice("");
    setUnitPhotos([]);
    setError("");
  }

  if (done && product) {
    return (
      <div className="flex flex-col gap-3 rounded-panel border border-line bg-white p-7">
        <b className="text-xl font-semibold">Offre envoyée en contrôle</b>
        <p className="text-[15px] leading-relaxed text-ink-muted">
          {product.name}, {configText}, {grade ? GRADES[grade].label.toLowerCase() : ""} à {formatPrice(priceMillimes)}. L’équipe Bonétat la valide sous 24 h, puis elle apparaît dans le configurateur.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <button type="button" onClick={another} className="btn-primary btn-sm">Publier un appareil identique</button>
          <button type="button" onClick={reset} className="btn-secondary btn-sm">Publier un autre appareil</button>
          <Link href="/vendor/listings" className="btn-secondary btn-sm">Voir mes offres</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <ol className="flex flex-wrap gap-x-[26px] gap-y-2.5" aria-label="Étapes">
        {STEPS.map((s, i) => (
          <li key={s} className={cn("flex items-center gap-2.5 text-sm", i === step ? "font-medium text-ink" : "text-ink-muted")} aria-current={i === step ? "step" : undefined}>
            <span className={cn("grid h-[30px] w-[30px] place-items-center rounded-full border-[1.5px] text-[13px] font-semibold", i === step ? "border-brand bg-brand text-white" : i < step ? "border-brand-tint bg-brand-tint text-brand-dark" : "border-line-strong")}>
              {i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-[22px] rounded-panel border border-line bg-white p-6">
        {step === 0 && <SourceStep recent={recent} brands={brands} onChosen={(c) => { setError(""); setChosen(c); }} />}

        {step === 1 && product && (
          <>
            <p className="text-[15px]">
              <b className="font-semibold">{product.name}</b>

            </p>
            {r && (r.missing.length > 0 || r.warnings.length > 0) && (
              <div className="rounded-2xl bg-chalk px-4 py-3 text-sm">
                <p><b className="font-medium">À compléter :</b> {r.missing.join(", ")}</p>
                {r.warnings.map((w) => <p key={w} className="mt-1 text-amber-800">{w}</p>)}
              </div>
            )}

            {NEEDS_STORAGE.includes(product.kind) && (
              <div>
                <h2 className="mb-2.5 text-[15px] font-semibold">{product.kind === "LAPTOP" ? "Stockage SSD" : "Stockage"}<Read on={!!pre?.storageGb && storage === pre.storageGb} /></h2>
                <div className="flex flex-wrap items-center gap-2.5">
                  {values.storages.map((v) => (
                    <button key={v} type="button" aria-pressed={storage === v} onClick={() => setStorage(v)} className={cn("opt px-4 py-2.5 text-sm", storage === v && "opt-on")}>{formatStorage(v)}</button>
                  ))}
                  <label className="flex items-center gap-2 text-sm text-ink-muted">
                    Autre
                    <input className="input h-10 w-24" type="number" min={8} inputMode="numeric" placeholder="Go" value={storage && !values.storages.includes(storage) ? storage : ""} onChange={(e) => setStorage(normalizeStorage(Number(e.target.value)) || null)} />
                  </label>
                </div>
              </div>
            )}

            {showRam && (
              <div>
                <h2 className="mb-2.5 text-[15px] font-semibold">Mémoire vive<Read on={!!pre?.ramGb && ram === pre.ramGb} /></h2>
                <div className="flex flex-wrap items-center gap-2.5">
                  {values.rams.map((v) => (
                    <button key={v} type="button" aria-pressed={ram === v} onClick={() => setRam(v)} className={cn("opt px-4 py-2.5 text-sm", ram === v && "opt-on")}>{v} Go</button>
                  ))}
                  <label className="flex items-center gap-2 text-sm text-ink-muted">
                    Autre
                    <input className="input h-10 w-20" type="number" min={1} inputMode="numeric" placeholder="Go" value={ram && !values.rams.includes(ram) ? ram : ""} onChange={(e) => setRam(Number(e.target.value) || null)} />
                  </label>
                </div>
              </div>
            )}

            {product.kind === "LAPTOP" && (
              <LaptopSpecsPicker
                value={specs}
                onChange={setSpecs}
                cpuInModel={cpuInModel}
                known={values.options}
                brand={product.brand}
                cpuModel={cpuModel}
                onCpuModel={setCpuModel}
              />
            )}

            {product.kind !== "LAPTOP" && values.options.length > 0 && (
              <div>
                <h2 className="mb-2.5 text-[15px] font-semibold">Version<Read on={!!pre?.option && option === pre.option} /></h2>
                {values.options.length > 0 && (
                  <div className="mb-2.5 flex flex-wrap gap-2.5">
                    {values.options.map((v) => (
                      <button key={v} type="button" aria-pressed={option === v} onClick={() => setOption(v)} className={cn("opt px-4 py-2.5 text-sm", option === v && "opt-on")}>{v}</button>
                    ))}
                  </div>
                )}
                <input className="input" value={option} onChange={(e) => setOption(e.target.value)} maxLength={120} placeholder="ex. 41 mm, GPS" aria-label="Version" />
              </div>
            )}

            <div>
              <h2 className="mb-2.5 text-[15px] font-semibold">Couleur<Read on={!!pre?.colorAsWritten && !!color} /></h2>
              <ColorPicker finishes={product.finishes} value={color} onChange={setColor} />
            </div>
          </>
        )}

        {step === 2 && product && (
          <>
            <div>
              <h2 className="mb-2.5 text-[15px] font-semibold">État selon la grille Bonétat</h2>
              {r?.conditionAsWritten && (
                <p className="mb-2.5 text-[13px] text-ink-muted">Votre annonce dit « {r.conditionAsWritten} ». Choisissez l’état réel selon la grille.</p>
              )}
              <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
                {[...GRADE_ORDER].reverse().map((g) => (
                  <button key={g} type="button" aria-pressed={grade === g} onClick={() => setGrade(g)} className={cn("opt flex flex-col gap-1 p-3.5", grade === g && "opt-on")}>
                    <b className="font-medium">{GRADES[g].label}</b>
                    <span className="text-xs text-ink-muted">{GRADES[g].criteria[0]}</span>
                  </button>
                ))}
              </div>
              {grade && <p className="mt-2.5 text-[13px] text-ink-muted">{GRADES[grade].description}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {needsBattery && (
                <label className="field">
                  <span>Santé de la batterie mesurée (%), minimum {MIN_BATTERY_HEALTH} %<Read on={pre?.batteryHealth != null && battery === String(pre.batteryHealth)} /></span>
                  <input className="input" type="number" min={MIN_BATTERY_HEALTH} max={100} inputMode="numeric" value={battery} onChange={(e) => setBattery(e.target.value)} aria-invalid={battery !== "" && !!batteryIssue} />
                </label>
              )}
              <label className="field">
                {product.kind === "PHONE" ? "IMEI (15 chiffres, composez *#06#)" : "Numéro de série (facultatif)"}
                <input className="input" inputMode={product.kind === "PHONE" ? "numeric" : "text"} value={imei} onChange={(e) => setImei(e.target.value.replace(product.kind === "PHONE" ? /\D/g : /\s/g, ""))} maxLength={product.kind === "PHONE" ? 15 : 40} />
              </label>
              <label className="field sm:col-span-2">
                <span>Ce qui est inclus (facultatif)<Read on={!!pre?.sellerNote && note === pre.sellerNote} /></span>
                <input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder={kind === "LAPTOP" ? "Clavier AZERTY, chargeur d’origine, écran Full HD tactile…" : "Boîte d’origine, chargeur, batterie remplacée neuve…"} />
              </label>
            </div>
            {battery !== "" && batteryIssue && <p role="alert" className="-mt-2 text-sm text-pop-dark">{batteryIssue}</p>}
            <div>
              <h2 className="mb-1 text-[15px] font-semibold">Photos de l’appareil <span className="font-normal text-ink-muted">(facultatif, 3 max.)</span></h2>
              <p className="mb-2.5 text-[13px] text-ink-muted">Les acheteurs les voient avec votre offre : « Photos de l’appareil que vous recevrez ».</p>
              <div className="flex flex-wrap items-center gap-2.5">
                {unitPhotos.map((s, i) => (
                  <span key={i} className="relative h-20 w-20 overflow-hidden rounded-xl border border-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.preview} alt={s.name} className="h-full w-full object-cover" />
                    <button type="button" aria-label="Retirer la photo" onClick={() => setUnitPhotos(unitPhotos.filter((_, j) => j !== i))} className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-ink/70 text-white">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {unitPhotos.length < 3 && (
                  <label className="opt flex h-20 cursor-pointer items-center gap-2 px-4 text-sm">
                    <ImagePlus className="h-[18px] w-[18px]" aria-hidden="true" />
                    Ajouter des photos
                    <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { addUnitPhotos([...(e.target.files ?? [])]); e.target.value = ""; }} />
                  </label>
                )}
                {unitPhotos.length < 3 && <span className="hidden text-[13px] text-ink-muted md:inline">ou collez une image (Ctrl+V)</span>}
              </div>
            </div>
          </>
        )}

        {step === 3 && product && (
          <div className="flex flex-wrap gap-[18px]">
            <div className="flex flex-[1_1_260px] flex-col gap-3.5">
              <p className="text-sm text-ink-muted">{product.name}, {configText}, {grade ? GRADES[grade].label.toLowerCase() : ""}</p>
              <label className="field"><span>Votre prix (DT)<Read on={!!pre?.priceMillimes && priceMillimes === pre.priceMillimes} /></span><input className="input" type="number" min={1} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} autoFocus /></label>
              <div>
                <p className="mb-2 text-[13px] text-ink-muted">Votre garantie sur cet appareil ({MIN_WARRANTY_MONTHS} mois minimum)</p>
                <div className="flex flex-wrap gap-2">
                  {WARRANTY_CHOICES.map((m) => (
                    <button key={m} type="button" aria-pressed={warranty === m} onClick={() => setWarranty(m)} className={cn("opt px-4 py-2 text-sm", warranty === m && "opt-on")}>{m} mois</button>
                  ))}
                </div>
                <p className="mt-2 text-[12px] text-ink-muted">Affichée sur l’offre. C’est vous qui l’assurez auprès du client.</p>
              </div>
            </div>
            <div className="flex flex-[1_1_280px] flex-col gap-2.5 rounded-panel bg-chalk p-[18px] text-sm">
              <div className="flex justify-between"><span className="text-ink-muted">Meilleur prix actuel</span><b className="font-semibold">{best ? formatPrice(best) : "Aucune offre"}</b></div>
              <div className="flex justify-between"><span className="text-ink-muted">Commission Bonétat, {COMMISSION_LABEL}</span><span>{priceNum > 0 ? formatPrice(commission) : "—"}</span></div>
              <div className="flex justify-between border-t border-line pt-2.5"><span>Vous recevez</span><b className="font-semibold">{priceNum > 0 ? formatPrice(priceMillimes - commission) : "—"}</b></div>
              {priceNum > 0 && (
                <span className={cn("pill mt-1 self-start", !best || priceMillimes < best ? "bg-gain-tint text-gain" : priceMillimes === best ? "bg-amber-50 text-amber-800" : "bg-pop-tint text-pop-dark")}>
                  {!best ? "Vous serez le seul à proposer cette configuration" : priceMillimes < best ? "Vous prendrez la première place" : priceMillimes === best ? "À égalité, départagé par votre score qualité" : `Derrière une offre moins chère de ${formatPrice(priceMillimes - best)}`}
                </span>
              )}
            </div>
          </div>
        )}

        {step > 0 && !product && !error && <p className="flex items-center gap-2 text-sm text-ink-muted"><Loader2 className="h-4 w-4 animate-spin" /> Chargement du modèle…</p>}
        {error && step > 0 && <p role="alert" className="text-sm text-pop-dark">{error}</p>}
        {step > 0 && (
          <div className="flex justify-between gap-2.5 border-t border-line-soft pt-[18px]">
            <button type="button" onClick={() => (step === 1 ? reset() : setStep(step - 1))} className="btn-secondary btn-sm">Retour</button>
            {step < 3 ? (
              <button type="button" onClick={() => setStep(step + 1)} disabled={!canNext} className="btn-primary btn-sm">Continuer</button>
            ) : (
              <button type="button" onClick={submit} disabled={!canNext || sending} className="btn-primary btn-sm">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Envoyer en contrôle"}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
