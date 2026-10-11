"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { DeviceKind, ImageAngle } from "@prisma/client";
import { Banknote, BatteryCharging, Check, Heart, RotateCcw, ShieldCheck, ShoppingBag, Trash2, Truck } from "lucide-react";
import DeviceArt from "@/components/products/DeviceArt";
import { LogoMark } from "@/components/brand/Logo";
import GradingDialog from "@/components/grading/GradingDialog";
import { GRADES, GRADE_ORDER, formatStorage, variantLabel } from "@/lib/catalog";
import {
  optionsFor, sellableValues, selectionOf, unitsByShop, type Axis, type AxisOption, type ConfigOffer,
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
    /** The model's official photo in any color, used when the selected color has none */
    coverKey: string | null;
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
  const [showAllShops, setShowAllShops] = useState(false);
  /** A real photo of the unit shown in the main frame instead of the catalog shot */
  const [unitPhoto, setUnitPhoto] = useState<string | null>(null);
  /** Cursor position over the main photo, in % of the frame: zoom follows it */
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);

  const sel = selectionOf(current);
  const variant = variants.find((v) => v.id === current.variantId)!;
  const newPrice = variant.newPriceMillimes ?? product.newPriceMillimes;
  const saved = savings(current.priceMillimes, newPrice);
  const discount = discountPercent(current.priceMillimes, newPrice);
  // Every unit of this exact configuration and grade, one row per shop, in buy-box order
  const sameUnits = offers.filter((o) => o.variantId === current.variantId && o.grade === current.grade);
  const unitsHere = sameUnits.length;
  const shops = unitsByShop(sameUnits);
  const lowest = Math.min(...sameUnits.map((o) => o.priceMillimes));
  const shownShops = showAllShops ? shops : shops.slice(0, 3);
  const finish = finishes.find((f) => f.id === current.finishId)!;
  const inCart = hydrated && cartItems.some((i) => i.offerId === current.offerId);
  const isFollowed = followed.has(current.variantId);
  const config = variantLabel(variant, product.kind);

  // Only values with a unit for sale: a storage, color or version nobody sells is never shown.
  // An axis with a single value isn't a choice, so it's not shown as one (the config label carries it).
  const axes = useMemo(() => {
    const list: { axis: Axis; values: (string | number | null)[] }[] = [];
    const rams = sellableValues(offers, "ram");
    const storages = sellableValues(offers, "storage");
    const opts = sellableValues(offers, "option", variants.map((v) => v.option ?? ""));
    const colors = sellableValues(offers, "color", finishes.map((f) => f.id));
    if (rams.length > 1) list.push({ axis: "ram", values: rams });
    if (storages.length > 1) list.push({ axis: "storage", values: storages });
    if (opts.length > 1) list.push({ axis: "option", values: opts });
    list.push({ axis: "color", values: colors });
    return list;
  }, [offers, variants, finishes]);

  function select(target: ConfigOffer | null, photo: string | null = null) {
    if (!target) return;
    setCurrent(target);
    setUnitPhoto(photo);
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
      warrantyMonths: current.warrantyMonths,
      priceMillimes: current.priceMillimes,
      newPriceMillimes: newPrice,
      kind: product.kind,
      colorHex: current.colorHex,
      imageKey: finish.images.find((i) => i.angle === "FRONT")?.key ?? product.coverKey,
      vendorName: current.vendorName,
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
  // The color's own photos; otherwise the model's cover, clearly marked as another color
  const ownPhotos = finish.images;
  const coverOnly = ownPhotos.length === 0 && !!product.coverKey;
  const photos = coverOnly ? [{ angle: "FRONT" as ImageAngle, key: product.coverKey! }] : ownPhotos;
  const photo = photos.find((i) => i.angle === angle) ?? photos[0];
  const realPhoto = unitPhoto && current.photos?.includes(unitPhoto) ? unitPhoto : null;
  const stageKey = realPhoto ?? photo?.key ?? null;

  function moveZoom(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  }

  return (
    <>
      <div className="flex flex-wrap items-start gap-10">
        {/* ── Visual ── */}
        <section aria-label="Visuel" className="flex min-w-0 flex-[1_1_520px] flex-col gap-4 lg:sticky lg:top-28">
          {/* Photos are on pure white, so they get a white stage; the illustration keeps the blue one */}
          <div
            className={cn("relative grid h-[380px] place-items-center overflow-hidden rounded-panel sm:h-[600px]", stageKey ? "border border-line bg-white" : "bg-brand", stageKey && "cursor-zoom-in")}
            onMouseMove={stageKey ? moveZoom : undefined}
            onMouseLeave={() => setZoom(null)}
          >
            {!photo && (
              <>
                <span aria-hidden="true" className="absolute left-1/2 top-1/2 h-[470px] w-[470px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-white/15" />
                <span aria-hidden="true" className="absolute left-1/2 top-1/2 h-[330px] w-[330px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[.07]" />
              </>
            )}
            {stageKey ? (
              <Image
                loader={storedImageLoader}
                src={stageKey}
                alt={realPhoto ? `Photo réelle de l’appareil, ${product.name}` : `${product.name} ${config}, ${ANGLE_LABELS[photo!.angle].toLowerCase()}`}
                fill
                sizes="100vw"
                className={cn("transition-transform duration-150 ease-out", realPhoto ? "object-contain bg-chalk" : "object-contain p-10")}
                style={zoom ? { transform: "scale(2.2)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
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
            {discount && !zoom && (
              <span className="absolute right-4 top-4 flex h-[96px] w-[96px] rotate-[9deg] sm:right-6 sm:top-6 sm:h-[116px] sm:w-[116px] flex-col items-center justify-center rounded-full bg-gain text-white shadow-[0_10px_24px_rgba(10,20,60,.28)]">
                <span className="text-[25px] font-bold leading-none tracking-[-0.03em] sm:text-[30px]">−{discount} %</span>
                <span className="mt-1 text-[13px] opacity-90">vs le neuf</span>
              </span>
            )}
            {!stageKey && (
              <span className="absolute left-4 top-4 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white sm:left-6 sm:top-6">
                Illustration, photo bientôt disponible
              </span>
            )}
            {!zoom && (realPhoto ? (
              <span className="absolute bottom-[22px] left-6 rounded-full bg-ink/75 px-3.5 py-2 text-sm font-medium text-white">Photo réelle, prise par {current.vendorName}</span>
            ) : (
              <span className={cn("absolute bottom-[22px] left-6 rounded-full px-3.5 py-2 text-sm font-medium", stageKey ? "bg-chalk text-ink" : "bg-white/15 text-white")}>{config}</span>
            ))}
            {photo && !realPhoto && !coverOnly && !zoom && <span className="absolute bottom-[26px] right-6 hidden text-xs text-ink-muted sm:block">Photo de référence du modèle</span>}
            {coverOnly && !realPhoto && !zoom && (
              <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-chalk px-3 py-1.5 text-xs font-medium text-ink-soft sm:left-6 sm:top-6">
                <span className="h-3 w-3 rounded-full border border-ink/20" style={{ background: current.colorHex }} aria-hidden="true" />
                Photo du modèle, couleur indicative
              </span>
            )}
          </div>
          {/* One strip: catalog shots, then the shop's photos of this very unit */}
          {photos.length + (current.photos?.length ?? 0) > 1 && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {photos.map((img) => (
                  <button
                    key={img.key}
                    type="button"
                    onClick={() => { setAngle(img.angle); setUnitPhoto(null); }}
                    aria-label={ANGLE_LABELS[img.angle]}
                    aria-pressed={img.key === stageKey}
                    className={cn("relative h-20 w-20 flex-none overflow-hidden rounded-2xl border-2 bg-white", img.key === stageKey ? "border-brand" : "border-line")}
                  >
                    <Image loader={storedImageLoader} src={img.key} alt="" fill sizes="80px" className="object-contain p-1.5" />
                  </button>
                ))}
                {current.photos && current.photos.length > 0 && (
                  <>
                    {photos.length > 0 && <span aria-hidden="true" className="mx-1 w-px flex-none self-stretch bg-line" />}
                    {current.photos.map((key, i) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setUnitPhoto(key)}
                        aria-label={`Photo réelle ${i + 1} de l’appareil, prise par ${current.vendorName}`}
                        aria-pressed={key === stageKey}
                        className={cn("relative h-20 w-20 flex-none overflow-hidden rounded-2xl border-2 bg-chalk", key === stageKey ? "border-brand" : "border-line")}
                      >
                        <Image loader={storedImageLoader} src={key} alt="" fill sizes="80px" className="object-cover" />
                        <span className="absolute inset-x-1 bottom-1 rounded-md bg-ink/75 py-0.5 text-center text-[10px] font-medium text-white">Réelle</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
              {current.photos && current.photos.length > 0 && (
                <p className="text-[13px] text-ink-muted">
                  <b className="font-medium text-ink">Réelle</b> : photos de l’appareil que vous recevrez, prises par {current.vendorName}
                </p>
              )}
            </div>
          )}

          <div className="hidden lg:block">
            <Passport current={current} kind={product.kind} />
          </div>
        </section>

        {/* ── Configuration ── */}
        <section aria-label="Configuration" className="flex min-w-0 flex-[1_1_440px] flex-col gap-[26px]">
          <div>
            <p className="mb-1.5 text-sm text-ink-muted">Reconditionné par un atelier vérifié</p>
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
              <GradingDialog current={current.grade} />
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
                  {o.target?.batteryHealth != null && (
                    <span className="text-xs text-ink-muted">Batterie {o.target.batteryHealth} %</span>
                  )}
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
                            style={{ background: f?.hex ?? "#999", boxShadow: o.selected ? "0 0 0 3px #fff, 0 0 0 5px rgb(var(--brand))" : "0 0 0 3px #fff" }}
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

          {/* Several shops sell this exact configuration: the choice comes before the price and the cart */}
          {shops.length > 1 && (
            <div id="offres" className="scroll-mt-28 rounded-panel border border-offer-line bg-offer-tint p-5">
              <h2 className="mb-1 flex items-center gap-2.5 text-[17px] font-semibold text-offer-dark">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-offer text-sm font-bold text-white">{shops.length}</span>
                ateliers proposent cette configuration
              </h2>
              <p className="mb-4 text-[13px] text-ink-soft">{config}, {GRADES[current.grade].label.toLowerCase()}. Même configuration et même état : comparez le prix, la batterie, la garantie et les photos.</p>
              <ul className="flex flex-col gap-2.5">
                {shownShops.map(({ best: o, count }) => {
                  const chosen = o.vendorName === current.vendorName;
                  const extra = o.priceMillimes - lowest;
                  return (
                    <li key={o.offerId} className={cn("flex flex-wrap items-center gap-3 rounded-control border bg-white p-3.5", chosen ? "border-offer ring-1 ring-offer" : "border-offer-line")}>
                      <div className="min-w-0 flex-1 text-sm">
                        <p>
                          <b className="price text-[17px]">{formatPrice(o.priceMillimes)}</b>
                          {extra > 0 && <span className="ml-1.5 text-[13px] text-ink-muted">+{formatPrice(extra)}</span>}
                          <span className="ml-2 text-ink-muted">par <span className="text-ink">{o.vendorName}</span></span>
                        </p>
                        <p className="text-[13px] text-ink-muted">
                          {o.batteryHealth !== null ? `Batterie ${o.batteryHealth} %` : "Sans batterie"}
                          {` · garantie ${o.warrantyMonths} mois`}
                          {count > 1 && ` · ${count} disponibles`}
                        </p>
                        {o.photos && o.photos.length > 0 && (
                          <span className="mt-1.5 flex items-center gap-1.5">
                            <span className="pill bg-offer-tint text-[12px] text-offer-dark">Photos réelles</span>
                            {o.photos.map((key) => (
                              <button
                                key={key}
                                type="button"
                                onClick={() => { select(o, key); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                                aria-label={`Voir la photo de l’appareil de ${o.vendorName}`}
                                className="relative h-8 w-8 overflow-hidden rounded-lg bg-chalk ring-offer hover:ring-2"
                              >
                                <Image loader={storedImageLoader} src={key} alt="" fill sizes="32px" className="object-cover" />
                              </button>
                            ))}
                          </span>
                        )}
                      </div>
                      {chosen ? (
                        <span className="pill bg-offer text-white"><Check className="h-3.5 w-3.5" aria-hidden="true" /> Sélectionnée</span>
                      ) : (
                        <button type="button" onClick={() => select(o)} className="btn-sm inline-flex items-center rounded-control border-[1.5px] border-offer font-semibold text-offer-dark transition hover:bg-offer hover:text-white">Choisir</button>
                      )}
                    </li>
                  );
                })}
              </ul>
              {shops.length > 3 && (
                <button type="button" onClick={() => setShowAllShops(!showAllShops)} className="mt-3.5 text-sm font-semibold text-offer-dark hover:underline">
                  {showAllShops ? "Voir moins" : `Voir les ${shops.length} ateliers`}
                </button>
              )}
            </div>
          )}
          {/* ── Buy box ── */}
          <div id="acheter" className="flex flex-col gap-[18px] rounded-panel border border-line bg-white p-6 shadow-buy">
            <div>
              <span className="price block text-[42px] leading-tight">{formatPrice(current.priceMillimes)}</span>
              {saved && <p className="mt-1 text-sm font-semibold text-gain">{formatPrice(saved)} de moins que le neuf</p>}
              <p className="mt-1.5 text-sm text-ink-muted">Vendu par <b className="font-medium text-ink">{current.vendorName}</b></p>
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <span className="flex items-center gap-2.5"><ShieldCheck className="h-5 w-5 text-brand-dark" aria-hidden="true" />Garantie {current.warrantyMonths} mois par {current.vendorName}</span>
              <span className="flex items-center gap-2.5"><Banknote className="h-5 w-5 text-brand-dark" aria-hidden="true" />Paiement à la livraison</span>
              <span className="flex items-center gap-2.5"><Truck className="h-5 w-5 text-brand-dark" aria-hidden="true" />Livré {deliveryWindow}</span>
              <span className="flex items-center gap-2.5"><RotateCcw className="h-5 w-5 text-brand-dark" aria-hidden="true" />Retours gérés par l’atelier</span>
            </div>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={addToCart}
                className={cn(
                  "flex h-14 flex-1 items-center justify-center gap-2.5 rounded-control text-[17px] font-semibold transition active:scale-[.98]",
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
                className={cn("opt grid h-14 w-14 place-items-center rounded-control", isFollowed && "border-pop bg-pop-tint text-pop hover:border-pop")}
              >
                <Heart className="h-[22px] w-[22px]" fill={isFollowed ? "currentColor" : "none"} />
              </button>
            </div>
            <p className="-mt-1.5 text-[13px] text-ink-muted">
              {unitsHere <= 1 ? "Dernier exemplaire dans cette configuration" : `${unitsHere} exemplaires disponibles dans cette configuration`}
              {inCart && (
                <>
                  {" · "}
                  <Link href="/cart" className="font-medium text-brand-dark hover:underline">Voir le panier</Link>
                </>
              )}
            </p>
            <div className="flex items-start gap-3 rounded-control bg-trust p-4 text-white">
              <span className="grid h-9 w-9 flex-none place-items-center rounded-control bg-[linear-gradient(135deg,rgb(var(--logo-a)),rgb(var(--logo-b))_52%,rgb(var(--logo-c)))]">
                <LogoMark variant="white" className="h-[19px]" />
              </span>
              <p className="text-sm leading-normal">
                <b className="font-semibold">Atelier vérifié, annonce contrôlée par Bonétat</b>
                <br />
                <span className="text-white/70">{current.vendorName} vend et garantit cet appareil. Un souci ? Écrivez à Bonétat : on transmet à l’atelier et on suit sa réponse. Vous pouvez aussi le contacter directement.</span>
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
          <p className="price text-xl leading-tight">{formatPrice(current.priceMillimes)}</p>
        </div>
        <button
          type="button"
          onClick={addToCart}
          className={cn("flex h-12 flex-none items-center gap-2 rounded-control px-5 text-sm font-semibold", inCart ? "bg-gain-tint text-gain" : "bg-brand text-white")}
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
      <h2 className="mb-3.5 text-[17px] font-semibold">Ce que l’atelier déclare sur cet appareil</h2>
      <ul className="grid gap-x-5 gap-y-3.5 text-sm sm:grid-cols-2">
        {current.batteryHealth && (
          <li className="flex items-start gap-2.5">
            <BatteryCharging className="h-5 w-5 flex-none text-brand-dark" aria-hidden="true" />
            <span>Batterie mesurée à <b className="font-semibold">{current.batteryHealth} %</b> de sa capacité d’origine</span>
          </li>
        )}
        <li className="flex items-start gap-2.5">
          <Check className="h-5 w-5 flex-none text-brand-dark" aria-hidden="true" />
          <span>État noté avec la grille Bonétat : écran, boutons, caméras, son, connectivité</span>
        </li>
        {(kind === "PHONE" || kind === "TABLET" || kind === "WATCH") && (
          <li className="flex items-start gap-2.5">
            <ShieldCheck className="h-5 w-5 flex-none text-brand-dark" aria-hidden="true" />
            <span>Numéro de série fourni : appareil ni volé, ni bloqué</span>
          </li>
        )}
        <li className="flex items-start gap-2.5">
          <Trash2 className="h-5 w-5 flex-none text-brand-dark" aria-hidden="true" />
          <span>Données de l’ancien propriétaire effacées</span>
        </li>
      </ul>
    </div>
  );
}
