import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { SELLABLE, toConfigOffers, productHref } from "@/lib/queries";
import { initialSelection } from "@/lib/configurator";
import { displayName, GRADES } from "@/lib/catalog";
import { matchFinish } from "@/lib/variants";
import { imageUrl } from "@/lib/image-url";
import { millimesToTND, formatPrice } from "@/lib/money";
import { deliveryWindow } from "@/lib/delivery";
import { formatShortDate } from "@/lib/utils";
import Configurator, { type ConfigFinish, type ConfigVariant, type Sibling } from "./Configurator";

const ANGLE_ORDER = { FRONT: 0, BACK: 1, SIDE: 2, DETAIL: 3 } as const;

type Props = {
  params: Promise<{ slug: string }>;
  /** v = variant id; from a sibling model: st = storage, c = finish slug, cf = color family */
  searchParams: Promise<{ v?: string; g?: string; st?: string; c?: string; cf?: string }>;
};

async function load(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      finishes: {
        orderBy: { position: "asc" },
        include: { images: { where: { status: "APPROVED" }, orderBy: { position: "asc" }, select: { angle: true, key: true } } },
      },
      variants: {
        orderBy: { position: "asc" },
        include: {
          finish: true,
          offers: {
            where: SELLABLE,
            include: { vendor: { select: { qualityScore: true, storeName: true } }, photos: { orderBy: { position: "asc" }, select: { key: true } } },
          },
        },
      },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await load(slug);
  if (!product) return {};
  const prices = product.variants.flatMap((v) => v.offers.map((o) => o.priceMillimes));
  const name = displayName(product);
  return {
    title: `${name} reconditionné${prices.length ? ` dès ${formatPrice(Math.min(...prices))}` : ""}`,
    description: product.description.slice(0, 155),
    openGraph: { title: `${name} reconditionné`, description: product.description.slice(0, 155) },
  };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const product = await load(slug);
  if (!product) notFound();
  if (product.status === "MERGED" && product.mergedIntoId) {
    const target = await prisma.product.findUnique({ where: { id: product.mergedIntoId }, select: { slug: true } });
    if (target) permanentRedirect(`/products/${target.slug}`);
    notFound();
  }

  const name = displayName(product);
  const offers = toConfigOffers(product);

  // Accept ?v=<variantId>, or ?st=&c=&cf= when arriving from a sibling model.
  // Color names differ between models ("Vert" vs "Vert nuit"), so match by finish slug, alias, then family.
  let wantVariant = query.v ?? null;
  if (!wantVariant && (query.st || query.c || query.cf)) {
    const finish = matchFinish(product.finishes, { slug: query.c, family: query.cf });
    const match =
      product.variants.find((v) => String(v.storageGb) === query.st && v.finishId === finish?.id) ??
      product.variants.find((v) => String(v.storageGb) === query.st) ??
      product.variants.find((v) => v.finishId === finish?.id);
    wantVariant = match?.id ?? null;
  }
  const initial = initialSelection(offers, { variantId: wantVariant, grade: query.g });

  const [siblingsRaw, user, reviews] = await Promise.all([
    product.series
      ? prisma.product.findMany({
          where: { series: product.series },
          orderBy: { seriesOrder: "asc" },
          include: { variants: { include: { offers: { where: SELLABLE, select: { priceMillimes: true } } } } },
        })
      : Promise.resolve([]),
    getSessionUser(),
    prisma.review.findMany({
      where: { orderItem: { offer: { variant: { productId: product.id } } } },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { buyer: { select: { name: true } }, orderItem: { select: { grade: true, configLabel: true } } },
    }),
  ]);

  const currentVariant = initial ? product.variants.find((v) => v.id === initial.variantId) : null;
  // Sibling models with nothing for sale aren't offered in the switcher
  const siblings: Sibling[] = siblingsRaw.filter((s) => s.id === product.id || s.variants.some((v) => v.offers.length > 0)).map((s) => {
    const prices = s.variants.flatMap((v) => v.offers.map((o) => o.priceMillimes));
    const q = new URLSearchParams();
    if (initial) q.set("g", initial.grade);
    if (currentVariant?.storageGb) q.set("st", String(currentVariant.storageGb));
    if (currentVariant) {
      q.set("c", currentVariant.finish.slug);
      q.set("cf", currentVariant.finish.family);
    }
    return {
      slug: s.slug,
      label: s.seriesLabel ?? s.model,
      minPriceMillimes: prices.length ? Math.min(...prices) : null,
      current: s.id === product.id,
      href: `/products/${s.slug}?${q}`,
    };
  });

  const followedVariantIds = user
    ? (await prisma.favorite.findMany({ where: { userId: user.id, variant: { productId: product.id } }, select: { variantId: true } })).map((f) => f.variantId)
    : [];

  // The browser only ever receives what is for sale: configurations and colors without a unit stay server-side
  const sellable = product.variants.filter((v) => v.offers.length > 0);
  const sellableFinishIds = new Set(sellable.map((v) => v.finishId));
  const finishes: ConfigFinish[] = product.finishes.filter((f) => sellableFinishIds.has(f.id)).map((f) => ({
    id: f.id,
    nameFr: f.nameFr,
    hex: f.hex,
    images: [...f.images].sort((a, b) => ANGLE_ORDER[a.angle] - ANGLE_ORDER[b.angle]),
  }));
  const variants: ConfigVariant[] = sellable.map((v) => ({
    id: v.id, storageGb: v.storageGb, ramGb: v.ramGb, option: v.option, finishId: v.finishId, finish: { nameFr: v.finish.nameFr }, newPriceMillimes: v.newPriceMillimes,
  }));
  // Specs are stored as ordered [label, value] pairs (JSONB would reorder object keys)
  const rawSpecs = product.specsJson as [string, string][] | Record<string, string> | null;
  const specs: [string, string][] = Array.isArray(rawSpecs) ? rawSpecs : Object.entries(rawSpecs ?? {});
  const prices = offers.map((o) => o.priceMillimes);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${name} reconditionné`,
    description: product.description.slice(0, 300),
    brand: { "@type": "Brand", name: product.brand },
    ...(finishes.some((f) => f.images.length) ? { image: finishes.flatMap((f) => f.images.slice(0, 1).map((i) => imageUrl(i.key))) } : {}),
    ...(prices.length
      ? {
          offers: {
            "@type": "AggregateOffer",
            lowPrice: millimesToTND(Math.min(...prices)),
            highPrice: millimesToTND(Math.max(...prices)),
            offerCount: offers.length,
            priceCurrency: "TND",
            itemCondition: "https://schema.org/RefurbishedCondition",
            availability: "https://schema.org/InStock",
          },
        }
      : {}),
  };

  return (
    <div className="container-page pb-28 pt-5 lg:pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav aria-label="Fil d’Ariane" className="mb-[18px] flex flex-wrap gap-2 text-[13px] text-ink-muted">
        <Link href="/" className="hover:text-ink">Accueil</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/catalog?category=${product.category.slug}`} className="hover:text-ink">{product.category.nameFr}</Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink">{name}</span>
      </nav>

      {initial ? (
        <Configurator
          product={{ slug: product.slug, name, kind: product.kind, cameras: product.cameraCount, newPriceMillimes: product.newPriceMillimes, coverKey: product.coverKey }}
          variants={variants}
          offers={offers}
          initialOfferId={initial.offerId}
          siblings={siblings}
          followedVariantIds={followedVariantIds}
          finishes={finishes}
          deliveryWindow={deliveryWindow()}
        />
      ) : (
        <div className="card mx-auto max-w-xl p-8 text-center">
          <h1 className="text-[28px] font-semibold tracking-[-0.03em]">{name}</h1>
          <p className="mt-3 text-ink-muted">Plus aucun exemplaire en stock pour le moment. Les ateliers partenaires en ajoutent chaque semaine.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {siblings.filter((s) => !s.current && s.minPriceMillimes).map((s) => (
              <Link key={s.slug} href={productHref(s.slug)} className="btn-secondary btn-sm">{s.label}</Link>
            ))}
            <Link href={`/catalog?category=${product.category.slug}`} className="btn-primary btn-sm">Voir les {product.category.nameFr}</Link>
          </div>
        </div>
      )}

      <div className="mt-14 flex flex-wrap items-start gap-10">
        <section className="min-w-0 flex-[1_1_420px]">
          <h2 className="mb-4 text-[22px] font-semibold tracking-[-0.02em]">Caractéristiques</h2>
          <dl className="overflow-hidden rounded-[22px] border border-line bg-white">
            {specs.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-line-soft px-5 py-3.5 text-sm last:border-0">
                <dt className="text-ink-muted">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-[15px] leading-relaxed text-ink-soft">{product.description}</p>
        </section>
        <section id="avis" className="min-w-0 flex-[1_1_520px]">
          <h2 className="mb-4 text-[22px] font-semibold tracking-[-0.02em]">Ce qu’en disent les acheteurs</h2>
          {reviews.length === 0 ? (
            <p className="rounded-[22px] border border-dashed border-line-strong p-5 text-[15px] text-ink-muted">
              Pas encore d’avis sur ce modèle. Chaque acheteur peut noter son appareil après la livraison.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {reviews.map((r) => (
                <article key={r.id} className="rounded-[22px] border border-line bg-white px-5 py-[18px]">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <b className="font-semibold">{r.buyer.name?.split(" ")[0] ?? "Client"}</b>
                    <span className="flex items-center gap-0.5 text-[#F2A516]" aria-label={`${r.rating} sur 5`}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5" fill={i < r.rating ? "currentColor" : "none"} />
                      ))}
                    </span>
                  </div>
                  {r.comment && <p className="mt-2 text-sm leading-relaxed text-ink-soft">{r.comment}</p>}
                  <p className="mt-2 text-xs text-ink-muted">
                    {r.orderItem.configLabel}, {GRADES[r.orderItem.grade].line.toLowerCase()}, {formatShortDate(r.createdAt)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
