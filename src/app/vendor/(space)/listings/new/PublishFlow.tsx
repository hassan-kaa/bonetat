"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ConditionGrade, DeviceKind } from "@prisma/client";
import { Loader2, Search } from "lucide-react";
import DeviceArt from "@/components/products/DeviceArt";
import { GRADES, GRADE_ORDER, formatStorage, variantLabel } from "@/lib/catalog";
import { COMMISSION_RATE, formatPrice } from "@/lib/money";
import { cn } from "@/lib/utils";

export type CatalogVariant = {
  id: string; storageGb: number | null; ramGb: number | null; option: string | null;
  finishId: string; finish: { nameFr: string }; colorHex: string;
};
export type CatalogProduct = { id: string; name: string; category: string; kind: DeviceKind; cameras: number | null; variants: CatalogVariant[] };

const STEPS = ["Appareil", "Configuration", "État et contrôle", "Prix"];

/** `color` holds a finish id */
type Pick = { storageGb: number | null; ramGb: number | null; option: string | null; color: string | null };

/** "Dupliquer": same device, config, grade, price and note. Battery and IMEI are per unit and asked again. */
export type Prefill = { productId: string; variantId: string; grade: ConditionGrade; priceMillimes: number; sellerNote: string | null };

export default function PublishFlow({ catalog, competitors, prefill }: { catalog: CatalogProduct[]; competitors: Record<string, number>; prefill: Prefill | null }) {
  const source = prefill ? catalog.find((p) => p.id === prefill.productId)?.variants.find((v) => v.id === prefill.variantId) : undefined;
  const [step, setStep] = useState(source ? 2 : 0);
  const [query, setQuery] = useState("");
  const [productId, setProductId] = useState<string | null>(source ? prefill!.productId : null);
  const [pick, setPick] = useState<Pick>(
    source
      ? { storageGb: source.storageGb, ramGb: source.ramGb, option: source.option, color: source.finishId }
      : { storageGb: null, ramGb: null, option: null, color: null }
  );
  const [grade, setGrade] = useState<ConditionGrade>(prefill?.grade ?? "TRES_BON");
  const [battery, setBattery] = useState("");
  const [imei, setImei] = useState("");
  const [note, setNote] = useState(prefill?.sellerNote ?? "");
  const [price, setPrice] = useState(prefill ? String(prefill.priceMillimes / 1000) : "");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const product = catalog.find((p) => p.id === productId) ?? null;
  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase();
    return t ? catalog.filter((p) => `${p.name} ${p.category}`.toLowerCase().includes(t)) : catalog;
  }, [catalog, query]);

  const axes = useMemo(() => {
    if (!product) return [];
    const uniq = <T,>(xs: T[]) => [...new Set(xs)];
    const out: { key: keyof Pick; title: string; values: (string | number)[] }[] = [];
    const storages = uniq(product.variants.map((v) => v.storageGb)).filter((x): x is number => x !== null).sort((a, b) => a - b);
    const rams = uniq(product.variants.map((v) => v.ramGb)).filter((x): x is number => x !== null).sort((a, b) => a - b);
    const options = uniq(product.variants.map((v) => v.option)).filter((x): x is string => x !== null);
    if (storages.length) out.push({ key: "storageGb", title: product.kind === "LAPTOP" ? "Stockage SSD" : "Stockage", values: storages });
    if (rams.length) out.push({ key: "ramGb", title: "Mémoire vive", values: rams });
    if (options.length) out.push({ key: "option", title: "Version", values: options });
    out.push({ key: "color", title: "Couleur", values: uniq(product.variants.map((v) => v.finishId)) });
    return out;
  }, [product]);

  function choose(p: CatalogProduct) {
    setProductId(p.id);
    // Pre-select axes that have a single value
    const single = <T,>(xs: T[]) => (new Set(xs).size === 1 ? xs[0] : null);
    setPick({
      storageGb: single(p.variants.map((v) => v.storageGb)),
      ramGb: single(p.variants.map((v) => v.ramGb)),
      option: single(p.variants.map((v) => v.option)),
      color: single(p.variants.map((v) => v.finishId)),
    });
    setStep(1);
  }

  const variant = product?.variants.find(
    (v) => v.storageGb === pick.storageGb && v.ramGb === pick.ramGb && v.option === pick.option && v.finishId === pick.color
  );
  const configComplete = axes.every((a) => pick[a.key] !== null);
  const needsBattery = product?.kind !== "CONSOLE";
  const floor = GRADES[grade].minBattery;
  const batteryNum = Number(battery);
  const batteryLow = needsBattery && battery !== "" && batteryNum < floor;
  const imeiOk = product?.kind !== "PHONE" || /^\d{15}$/.test(imei);
  const stateOk = (!needsBattery || (battery !== "" && !batteryLow && batteryNum <= 100)) && imeiOk;
  const priceNum = Number(price);
  const best = variant ? competitors[`${variant.id}|${grade}`] : undefined;
  const priceMillimes = Math.round(priceNum * 1000);
  const commission = Math.round(priceMillimes * COMMISSION_RATE);

  const canNext = [!!product, !!variant, stateOk, priceNum > 0][step];

  async function submit() {
    if (!variant) return;
    setSending(true);
    setError("");
    const res = await fetch("/api/vendor/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        variantId: variant.id,
        conditionGrade: grade,
        batteryHealth: needsBattery ? batteryNum : null,
        imei: product?.kind === "PHONE" ? imei : imei || null,
        priceMillimes,
        sellerNote: note || null,
      }),
    });
    const d = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) return setError(d.error ?? "L’offre n’a pas été envoyée");
    setDone(true);
  }

  /** Same device again: keep config, grade, price and note; battery and IMEI belong to the new unit */
  function another() {
    setDone(false);
    setStep(2);
    setBattery("");
    setImei("");
  }

  function reset() {
    setDone(false);
    setStep(0);
    setProductId(null);
    setBattery("");
    setImei("");
    setNote("");
    setPrice("");
  }

  if (done && product && variant) {
    return (
      <div className="flex flex-col gap-3 rounded-[26px] border border-line bg-white p-7">
        <b className="text-xl font-semibold">Offre envoyée en contrôle</b>
        <p className="text-[15px] leading-relaxed text-ink-muted">
          {product.name}, {variantLabel(variant, product.kind)}, {GRADES[grade].label.toLowerCase()} à {formatPrice(priceMillimes)}. L’équipe Bonétat la valide sous 24 h, puis elle apparaît dans le configurateur.
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
            <span className={cn("grid h-[30px] w-[30px] place-items-center rounded-full border-[1.5px] text-[13px] font-semibold", i === step ? "border-brand bg-brand text-white" : i < step ? "border-brand-tint bg-brand-tint text-brand" : "border-line-strong")}>
              {i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-[22px] rounded-[26px] border border-line bg-white p-6">
        {step === 0 && (
          <>
            <label className="flex h-12 items-center gap-2.5 rounded-[14px] border-[1.5px] border-line-strong px-4 focus-within:border-brand">
              <Search className="h-[18px] w-[18px] text-ink-muted" aria-hidden="true" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="iPhone 11 Pro, iPad Air, MacBook, PS5…" aria-label="Rechercher dans le catalogue" className="flex-1 text-[15px] outline-none" />
            </label>
            <div className="grid max-h-[460px] grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2.5 overflow-y-auto pr-1">
              {filtered.map((p) => (
                <button key={p.id} type="button" onClick={() => choose(p)} className={cn("opt flex items-center gap-3 p-3", productId === p.id && "opt-on")}>
                  <span className="grid h-12 w-12 flex-none place-items-center overflow-hidden rounded-xl bg-brand-tint">
                    <span className={p.kind === "PHONE" ? "translate-y-2 -rotate-6" : ""}>
                      <DeviceArt kind={p.kind} color={p.variants[0]?.colorHex ?? "#999"} cameras={p.cameras} width={p.kind === "PHONE" ? 24 : 34} />
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{p.name}</span>
                    <span className="text-xs text-ink-muted">{p.category}</span>
                  </span>
                </button>
              ))}
              {filtered.length === 0 && <p className="text-sm text-ink-muted">Aucun appareil trouvé. Demandez son ajout au catalogue à l’équipe Bonétat.</p>}
            </div>
          </>
        )}

        {step === 1 && product && (
          <>
            <p className="text-[15px]"><b className="font-semibold">{product.name}</b></p>
            {axes.map((a) => (
              <div key={a.key}>
                <h2 className="mb-2.5 text-[15px] font-semibold">{a.title}</h2>
                <div className="flex flex-wrap gap-2.5">
                  {a.values.map((val) => {
                    const colorOf = a.key === "color" ? product.variants.find((v) => v.finishId === val) : undefined;
                    const hex = colorOf?.colorHex;
                    return (
                      <button
                        key={String(val)}
                        type="button"
                        aria-pressed={pick[a.key] === val}
                        onClick={() => setPick({ ...pick, [a.key]: val })}
                        className={cn("opt flex items-center gap-2.5 px-4 py-2.5 text-sm", pick[a.key] === val && "opt-on")}
                      >
                        {hex && <span className="h-[18px] w-[18px] rounded-full border border-ink/20" style={{ background: hex }} />}
                        {a.key === "storageGb" ? formatStorage(val as number) : a.key === "ramGb" ? `${val} Go` : colorOf ? colorOf.finish.nameFr : String(val)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {configComplete && !variant && (
              <p className="text-sm text-pop-dark">Cette combinaison n’existe pas dans le catalogue. Vérifiez la configuration, ou demandez son ajout à l’équipe Bonétat.</p>
            )}
            <p className="text-[13px] text-ink-muted">Une couleur manque ? Demandez son ajout au catalogue Bonétat.</p>
          </>
        )}

        {step === 2 && product && (
          <>
            <div>
              <h2 className="mb-2.5 text-[15px] font-semibold">État selon la grille Bonétat</h2>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
                {[...GRADE_ORDER].reverse().map((g) => (
                  <button key={g} type="button" aria-pressed={grade === g} onClick={() => setGrade(g)} className={cn("opt flex flex-col gap-1 p-3.5", grade === g && "opt-on")}>
                    <b className="font-medium">{GRADES[g].label}</b>
                    <span className="text-xs text-ink-muted">{needsBattery ? `Batterie ≥ ${GRADES[g].minBattery} %` : GRADES[g].criteria[0]}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2.5 text-[13px] text-ink-muted">{GRADES[grade].description}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {needsBattery && (
                <label className="field">
                  Santé de la batterie mesurée (%)
                  <input className="input" type="number" min={50} max={100} inputMode="numeric" value={battery} onChange={(e) => setBattery(e.target.value)} aria-invalid={batteryLow} />
                </label>
              )}
              <label className="field">
                {product.kind === "PHONE" ? "IMEI (15 chiffres, composez *#06#)" : "Numéro de série (facultatif)"}
                <input className="input" inputMode={product.kind === "PHONE" ? "numeric" : "text"} value={imei} onChange={(e) => setImei(e.target.value.replace(product.kind === "PHONE" ? /\D/g : /\s/g, ""))} maxLength={product.kind === "PHONE" ? 15 : 40} />
              </label>
              <label className="field sm:col-span-2">
                Ce qui est inclus (facultatif)
                <input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Boîte d’origine, chargeur, batterie remplacée neuve…" />
              </label>
            </div>
            {batteryLow && (
              <p role="alert" className="-mt-2 text-sm text-pop-dark">
                « {GRADES[grade].label} » exige une batterie d’au moins {floor} %. Choisissez un état plus bas ou remplacez la batterie.
              </p>
            )}
          </>
        )}

        {step === 3 && product && variant && (
          <div className="flex flex-wrap gap-[18px]">
            <div className="flex flex-[1_1_260px] flex-col gap-3.5">
              <p className="text-sm text-ink-muted">{product.name}, {variantLabel(variant, product.kind)}, {GRADES[grade].label.toLowerCase()}</p>
              <label className="field">Votre prix (DT)<input className="input" type="number" min={1} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} autoFocus /></label>
            </div>
            <div className="flex flex-[1_1_280px] flex-col gap-2.5 rounded-[20px] bg-chalk p-[18px] text-sm">
              <div className="flex justify-between"><span className="text-ink-muted">Meilleur prix actuel</span><b className="font-semibold">{best ? formatPrice(best) : "Aucune offre"}</b></div>
              <div className="flex justify-between"><span className="text-ink-muted">Commission Bonétat, {Math.round(COMMISSION_RATE * 100)} %</span><span>{priceNum > 0 ? formatPrice(commission) : "—"}</span></div>
              <div className="flex justify-between border-t border-line pt-2.5"><span>Vous recevez</span><b className="font-semibold">{priceNum > 0 ? formatPrice(priceMillimes - commission) : "—"}</b></div>
              {priceNum > 0 && (
                <span className={cn("pill mt-1 self-start", !best || priceMillimes < best ? "bg-gain-tint text-gain" : priceMillimes === best ? "bg-amber-50 text-amber-800" : "bg-pop-tint text-pop-dark")}>
                  {!best ? "Vous serez le seul à proposer cette configuration" : priceMillimes < best ? "Vous prendrez la première place" : priceMillimes === best ? "À égalité, départagé par votre score qualité" : `Derrière une offre moins chère de ${formatPrice(priceMillimes - best)}`}
                </span>
              )}
            </div>
          </div>
        )}

        {error && <p role="alert" className="text-sm text-pop-dark">{error}</p>}
        <div className="flex justify-between gap-2.5 border-t border-line-soft pt-[18px]">
          <button type="button" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="btn-secondary btn-sm">Retour</button>
          {step < 3 ? (
            <button type="button" onClick={() => setStep(step + 1)} disabled={!canNext} className="btn-primary btn-sm">Continuer</button>
          ) : (
            <button type="button" onClick={submit} disabled={!canNext || sending} className="btn-primary btn-sm">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Envoyer en contrôle"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
