"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { DeviceKind, ImageAngle } from "@prisma/client";
import { Banknote, BatteryCharging, Check, Heart, RotateCcw, ShieldCheck, ShoppingBag, Trash2, Truck } from "lucide-react";
import DeviceArt from "@/components/products/DeviceArt";
import { GRADES, GRADE_ORDER, formatStorage, variantLabel } from "@/lib/catalog";
import {
  axisValues, optionsFor, selectionOf, type Axis, type AxisOption, type ConfigOffer,
} from "@/lib/configurator";
import { formatPrice, savings, discountPercent } from "@/lib/money";
import { useCart } from "@/store/cart";
import { useHydrated } from "@/hooks/useHydrated";
import { storedImageLoader } from "@/lib/image-url";
import { cn } from "@/lib/utils";

export type ConfigVariant = {
  id: string;
  storageGb: number | null;
  ramGb: number | null;
  option: string | null;
  finishId: string;
  finish: { nameFr: string };
  newPriceMillimes: number | null;
};

/** A color with its approved catalog photos, FRONT first */
export type ConfigFinish = { id: string; nameFr: string; hex: string; images: { angle: ImageAngle; key: string }[] };

const ANGLE_LABELS: Record<ImageAngle, string> = { FRONT: "Face", BACK: "Dos", SIDE: "Profil", DETAIL: "Détail" };

export type Sibling = { slug: string; label: string; minPriceMillimes: number | null; current: boolean; href: string };

type Props = {
  product: {
    slug: string;
    name: string;
    kind: DeviceKind;
    cameras: number | null;
    newPriceMillimes: number | null;
  };
  variants: ConfigVariant[];
  offers: ConfigOffer[];
  initialOfferId: string;
  siblings: Sibling[];
  followedVariantIds: string[];
  finishes: ConfigFinish[];
  deliveryWindow: string;
};

const AXIS_TITLES: Record<Axis, string> = {
  grade: "État",
  storage: "Stockage",
  ram: "Mémoire vive",
  option: "Version",
  color: "Couleur",
};

export default function Configurator({
  product, variants, offers, initialOfferId, siblings, followedVariantIds, finishes, deliveryWindow,
}: Props) {
  const router = useRouter();
  const addItem = useCart((s) => s.addItem);
  const removeItem = useCart((s) => s.removeItem);
  const cartItems = useCart((s) => s.items);
  const hydrated = useHydrated();

  const [current, setCurrent] = useState<ConfigOffer>(() => offers.find((o) => o.offerId === initialOfferId) ?? offers[0]);
  const [followed, setFollowed] = useState<Set<string>>(() => new Set(followedVariantIds));
  // The angle survives a color change: on "Dos" in blue, switching to green stays on "Dos"
  const [angle, setAngle] = useState<ImageAngle>("FRONT");

  const sel = selectionOf(current);
  const variant = variants.find((v) => v.id === current.variantId)!;
  const newPrice = variant.newPriceMillimes ?? product.newPriceMillimes;
  const saved = savings(current.priceMillimes, newPrice);
  const discount = discountPercent(current.priceMillimes, newPrice);
  const unitsHere = offers.filter((o) => o.variantId === current.variantId && o.grade === current.grade).length;
  const finish = finishes.find((f) => f.id === current.finishId)!;
  const inCart = hydrated && cartItems.some((i) => i.offerId === current.offerId);
  const isFollowed = followed.has(current.variantId);
  const config = variantLabel(variant, product.kind);

  // Axis values come from the catalog (variants), not from stock, so sold-out options still show
  const axes = useMemo(() => {
    const list: { axis: Axis; values: (string | number | null)[] }[] = [];
    const storages = axisValues(variants.map((v) => v.storageGb)).filter((x) => x !== null).sort((a, b) => (a as number) - (b as number));
    const rams = axisValues(variants.map((v) => v.ramGb)).filter((x) => x !== null).sort((a, b) => (a as number) - (b as number));
    const opts = axisValues(variants.map((v) => v.option)).filter((x) => x !== null);
    const colors = axisValues(variants.map((v) => v.finishId));
    if (rams.length > 1) list.push({ axis: "ram", values: rams });
    if (storages.length > 1) list.push({ axis: "storage", values: storages });
    if (opts.length > 1) list.push({ axis: "option", values: opts });
    list.push({ axis: "color", values: colors });
    return list;
  }, [variants]);

  function select(target: ConfigOffer | null) {
    if (!target) return;
    setCurrent(target);
    const q = new URLSearchParams({ v: target.variantId, g: target.grade });
    window.history.replaceState(null, "", `/products/${product.slug}?${q}`);
  }

  function addToCart() {
    if (inCart) return removeItem(current.offerId);
    addItem({
      offerId: current.offerId,
      variantId: current.variantId,
      productSlug: product.slug,
      name: product.name,
      config,
      grade: current.grade,
      batteryHealth: current.batteryHealth,
      priceMillimes: current.priceMillimes,
      newPriceMillimes: newPrice,
      kind: product.kind,
      colorHex: current.colorHex,
      imageKey: finish.images.find((i) => i.angle === "FRONT")?.key ?? null,
      cameras: product.cameras,
    });
  }

  async function toggleFollow() {
    const id = current.variantId;
    const next = !followed.has(id);
    const update = (on: boolean) =>
      setFollowed((prev) => {
        const s = new Set(prev);
        if (on) s.add(id);
        else s.delete(id);
        return s;
      });
    update(next);
    const res = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantId: id, follow: next }),
    });
    if (res.status === 401) {
      update(!next);
      router.push(`/auth/login?redirect=${encodeURIComponent(`/products/${product.slug}?v=${id}&g=${current.grade}`)}`);
    }
  }

  const gradeOptions = optionsFor(offers, sel, "grade", [...GRADE_ORDER].reverse());
  const photos = finish.images;
  const photo = photos.find((i) => i.angle === angle) ?? photos[0];

  return (
    <>
      <div className="flex flex-wrap items-start gap-10">
        {/* ── Visual ── */}
        <section aria-label="Visuel" className="flex min-w-0 flex-[1_1_520px] flex-col gap-4 lg:sticky lg:top-28">
          <div className="relative grid h-[380px] place-items-center overflow-hidden rounded-[32px] bg-brand sm:h-[600px]">
            <span aria-hidden="true" className="absolute left-1/2 top-1/2 h-[470px] w-[470px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-white/15" />
            <span aria-hidden="true" className="absolute left-1/2 top-1/2 h-[330px] w-[330px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[.07]" />
            {photo ? (
              <Image
                loader={storedImageLoader}
                src={photo.key}
                alt={`${product.name} ${config}, ${ANGLE_LABELS[photo.angle].toLowerCase()}`}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-contain p-10"
                priority
              />
            ) : (
              <>
                <span aria-hidden="true" className="absolute bottom-[62px] left-1/2 h-[26px] w-[230px] -translate-x-1/2 rounded-full bg-[rgba(5,15,50,.35)] blur-[10px]" />
                <span className={cn("relative scale-[.68] transition-transform duration-500 sm:scale-100", product.kind === "PHONE" && "-rotate-[4deg]")}>
                  <DeviceArt
                    kind={product.kind}
                    color={current.colorHex}
                    cameras={product.cameras}
                    width={product.kind === "PHONE" ? 200 : product.kind === "LAPTOP" ? 380 : product.kind === "TABLET" ? 250 : product.kind === "WATCH" ? 170 : 300}
                    title={`${product.name}, ${finish.nameFr}`}
                  />
                </span>
              </>
            )}
            {discount && (
              <span className="absolute right-4 top-4 flex h-[96px] w-[96px] rotate-[9deg] sm:right-6 sm:top-6 sm:h-[116px] sm:w-[116px] flex-col items-center justify-center rounded-full bg-gain text-white shadow-[0_10px_24px_rgba(10,20,60,.28)]">
                <span className="text-[25px] font-bold leading-none tracking-[-0.03em] sm:text-[30px]">−{discount} %</span>
                <span className="mt-1 text-[13px] opacity-90">vs le neuf</span>
              </span>
            )}
            {!photo && (
              <span className="absolute left-4 top-4 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white sm:left-6 sm:top-6">
                Illustration, photo bientôt disponible
              </span>
            )}
            <span className="absolute bottom-[22px] left-6 rounded-full bg-white/15 px-3.5 py-2 text-sm font-medium text-white">{config}</span>
            {photo && <span className="absolute bottom-[26px] right-6 hidden text-xs text-white/75 sm:block">Photo de référence Bonétat</span>}
          </div>
          {photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {photos.map((img) => (
                <button
                  key={img.key}
                  type="button"
                  onClick={() => setAngle(img.angle)}
                  aria-label={ANGLE_LABELS[img.angle]}
                  aria-pressed={img.key === photo?.key}
                  className={cn("relative h-20 w-20 flex-none overflow-hidden rounded-2xl border-2 bg-white", img.key === photo?.key ? "border-brand" : "border-transparent")}
                >
                  <Image loader={storedImageLoader} src={img.key} alt="" fill sizes="80px" className="object-contain p-1.5" />
                </button>
              ))}
            </div>
          )}

          <div className="hidden lg:block">
            <Passport current={current} kind={product.kind} />
          </div>
        </section>

        {/* ── Configuration ── */}
        <section aria-label="Configuration" className="flex min-w-0 flex-[1_1_440px] flex-col gap-[26px]">
          <div>
            <p className="mb-1.5 text-sm text-ink-muted">Reconditionné, contrôlé par Bonétat</p>
            <h1 className="text-[40px] font-semibold leading-[1.08] tracking-[-0.03em]">{product.name}</h1>
          </div>

          {siblings.length > 1 && (
            <div>
              <h2 className="mb-2.5 text-[15px] font-semibold">Modèle</h2>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-2.5">
                {siblings.map((s) =>
                  s.current ? (
                    <span key={s.slug} aria-current="true" className="opt opt-on flex min-h-[68px] flex-col gap-1 px-3.5 py-3">
                      <span className="text-sm font-medium">{s.label}</span>
                      <span className="text-[13px] text-ink-muted">{formatPrice(current.priceMillimes)}</span>
                    </span>
                  ) : (
                    <Link key={s.slug} href={s.href} className={cn("opt flex min-h-[68px] flex-col gap-1 px-3.5 py-3", !s.minPriceMillimes && "opt-out pointer-events-none")}>
                      <span className="text-sm font-medium">{s.label}</span>
                      <span className="text-[13px] text-ink-muted">{s.minPriceMillimes ? `dès ${formatPrice(s.minPriceMillimes)}` : "Épuisé"}</span>
                    </Link>
                  )
                )}
              </div>
            </div>
          )}

          <div>
            <div className="mb-2.5 flex items-baseline justify-between gap-3">
              <h2 className="text-[15px] font-semibold">État</h2>
              <Link href="/grading" className="text-[13px] text-brand hover:underline">Comment on note l’état</Link>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {gradeOptions.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  disabled={!o.target}
                  aria-pressed={o.selected}
                  onClick={() => select(o.target)}
                  className={cn("opt flex flex-col gap-2 p-3.5", o.selected && "opt-on", !o.target && "opt-out")}
                >
                  <span className="meter w-16">{[1, 2, 3, 4].map((i) => <span key={i} data-on={i <= GRADES[o.value].level} />)}</span>
                  <span className="flex w-full flex-wrap items-baseline justify-between gap-x-2">
                    <span className="text-[15px] font-medium">{GRADES[o.value].label}</span>
                    <span className="text-[15px] font-semibold">{o.target ? formatPrice(o.target.priceMillimes) : "Épuisé"}</span>
                  </span>
                  <span className="text-xs text-ink-muted">Batterie ≥ {GRADES[o.value].minBattery} %</span>
                </button>
              ))}
            </div>
            <p className="mt-2.5 text-[13px] leading-normal text-ink-muted">
              <b className="font-medium text-ink-soft">{GRADES[current.grade].label} :</b> {GRADES[current.grade].description}
            </p>
          </div>

          {axes.map(({ axis, values }) => {
            const options = optionsFor(offers, sel, axis, values);
            if (axis === "color") {
              return (
                <div key={axis}>
                  <h2 className="mb-3 text-[15px] font-semibold">
                    Couleur <span className="font-normal text-ink-muted">{finish.nameFr}</span>
                  </h2>
                  <div className="flex flex-wrap gap-3.5">
                    {(options as AxisOption<string>[]).map((o) => {
                      const f = finishes.find((x) => x.id === o.value);
                      return (
                        <button
                          key={o.value}
                          type="button"
                          disabled={!o.target}
                          aria-pressed={o.selected}
                          aria-label={`${f?.nameFr ?? ""}${o.target ? `, ${formatPrice(o.target.priceMillimes)}` : ", épuisé"}`}
                          onClick={() => select(o.target)}
                          className={cn("flex w-[78px] flex-col items-center gap-2 p-1", !o.target && "cursor-not-allowed opacity-40")}
                        >
                          <span
                            className="h-9 w-9 rounded-full border border-ink/20"
                            style={{ background: f?.hex ?? "#999", boxShadow: o.selected ? "0 0 0 3px #fff, 0 0 0 5px #1747C8" : "0 0 0 3px #fff" }}
                          />
                          <span className="text-center text-xs text-ink-muted">{o.target ? formatPrice(o.target.priceMillimes) : "Épuisé"}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }
            return (
              <div key={axis}>
                <h2 className="mb-2.5 text-[15px] font-semibold">{AXIS_TITLES[axis]}</h2>
                <div className="flex flex-wrap gap-2.5">
                  {options.map((o) => (
                    <button
                      key={String(o.value)}
                      type="button"
                      disabled={!o.target}
                      aria-pressed={o.selected}
                      onClick={() => select(o.target)}
                      className={cn("opt flex items-baseline gap-2.5 rounded-full px-[18px] py-2.5", o.selected && "opt-on", !o.target && "opt-out")}
                    >
                      <span className="text-[15px] font-medium">
                        {axis === "storage" ? `${product.kind === "LAPTOP" ? "SSD " : ""}${formatStorage(o.value as number)}` : axis === "ram" ? `${o.value} Go` : String(o.value)}
                      </span>
                      <span className="text-[13px] text-ink-muted">{o.target ? formatPrice(o.target.priceMillimes) : "Épuisé"}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {/* ── Buy box ── */}
          <div id="acheter" className="flex flex-col gap-[18px] rounded-[28px] border border-line bg-white p-6 shadow-buy">
            <div>
              <span className="block text-[40px] font-semibold leading-tight tracking-[-0.03em] tabular-nums">{formatPrice(current.priceMillimes)}</span>
              {saved && <p className="mt-1 text-sm font-semibold text-gain">{formatPrice(saved)} de moins que le neuf</p>}
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <span className="flex items-center gap-2.5"><ShieldCheck className="h-5 w-5 text-brand" aria-hidden="true" />Garantie Bonétat {current.warrantyMonths} mois</span>
              <span className="flex items-center gap-2.5"><Banknote className="h-5 w-5 text-brand" aria-hidden="true" />Paiement à la livraison</span>
              <span className="flex items-center gap-2.5"><Truck className="h-5 w-5 text-brand" aria-hidden="true" />Livré {deliveryWindow}</span>
              <span className="flex items-center gap-2.5"><RotateCcw className="h-5 w-5 text-brand" aria-hidden="true" />Retour gratuit sous 7 jours</span>
            </div>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={addToCart}
                className={cn(
                  "flex h-14 flex-1 items-center justify-center gap-2.5 rounded-[18px] text-[17px] font-semibold transition active:scale-[.98]",
                  inCart ? "bg-gain-tint text-gain" : "bg-brand text-white hover:bg-brand-dark"
                )}
              >
                {inCart ? <Check className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}
                {inCart ? "Dans le panier" : "Ajouter au panier"}
              </button>
              <button
                type="button"
                onClick={toggleFollow}
                aria-pressed={isFollowed}
                aria-label={isFollowed ? "Ne plus suivre le prix" : "Suivre le prix de cette configuration"}
                className={cn("opt grid h-14 w-14 place-items-center rounded-[18px]", isFollowed && "border-pop bg-pop-tint text-pop hover:border-pop")}
              >
                <Heart className="h-[22px] w-[22px]" fill={isFollowed ? "currentColor" : "none"} />
              </button>
            </div>
            <p className="-mt-1.5 text-[13px] text-ink-muted">
              {unitsHere <= 1 ? "Dernier exemplaire dans cette configuration" : `${unitsHere} exemplaires disponibles dans cette configuration`}
              {inCart && (
                <>
                  {" · "}
                  <Link href="/cart" className="font-medium text-brand hover:underline">Voir le panier</Link>
                </>
              )}
            </p>
            <div className="flex items-start gap-3 border-t border-line pt-4">
              <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-brand font-bold text-white">b</span>
              <p className="text-sm leading-normal">
                <b className="font-semibold">Contrôlé et garanti par Bonétat</b>
                <br />
                <span className="text-ink-muted">Expédié depuis un atelier partenaire certifié. En cas de souci, c’est Bonétat qui vous répond.</span>
              </p>
            </div>
          </div>
        </section>
        <div className="w-full lg:hidden">
          <Passport current={current} kind={product.kind} />
        </div>
      </div>

      {/* Sticky buy bar on phones */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-line bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,.06)] lg:hidden">
        <div className="min-w-0">
          <p className="truncate text-xs text-ink-muted">{config}, {GRADES[current.grade].label}</p>
          <p className="text-lg font-semibold leading-tight">{formatPrice(current.priceMillimes)}</p>
        </div>
        <button
          type="button"
          onClick={addToCart}
          className={cn("flex h-12 flex-none items-center gap-2 rounded-[14px] px-5 text-sm font-semibold", inCart ? "bg-gain-tint text-gain" : "bg-brand text-white")}
        >
          {inCart ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
          {inCart ? "Dans le panier" : "Ajouter"}
        </button>
      </div>
    </>
  );
}

function Passport({ current, kind }: { current: ConfigOffer; kind: DeviceKind }) {
  return (
    <div className="rounded-3xl border border-line bg-white px-6 py-[22px]">
      <h2 className="mb-3.5 text-[17px] font-semibold">Ce que Bonétat a vérifié avant la mise en vente</h2>
      <ul className="grid gap-x-5 gap-y-3.5 text-sm sm:grid-cols-2">
        {current.batteryHealth && (
          <li className="flex items-start gap-2.5">
            <BatteryCharging className="h-5 w-5 flex-none text-brand" aria-hidden="true" />
            <span>Batterie mesurée à <b className="font-semibold">{current.batteryHealth} %</b> de sa capacité d’origine</span>
          </li>
        )}
        <li className="flex items-start gap-2.5">
          <Check className="h-5 w-5 flex-none text-brand" aria-hidden="true" />
          <span>32 points de contrôle : écran, boutons, caméras, son, connectivité</span>
        </li>
        {(kind === "PHONE" || kind === "TABLET" || kind === "WATCH") && (
          <li className="flex items-start gap-2.5">
            <ShieldCheck className="h-5 w-5 flex-none text-brand" aria-hidden="true" />
            <span>Numéro de série vérifié : ni volé, ni bloqué</span>
          </li>
        )}
        <li className="flex items-start gap-2.5">
          <Trash2 className="h-5 w-5 flex-none text-brand" aria-hidden="true" />
          <span>Données de l’ancien propriétaire effacées</span>
        </li>
      </ul>
    </div>
  );
}
