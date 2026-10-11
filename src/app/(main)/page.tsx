import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { SELLABLE, categoryFloors, finishWithFront, getVariantCards, productHref } from "@/lib/queries";
import { GRADES, GRADE_ORDER } from "@/lib/catalog";
import { formatPrice } from "@/lib/money";
import { ArrowRight } from "lucide-react";
import DeviceArt from "@/components/products/DeviceArt";
import DeviceVisual from "@/components/products/DeviceVisual";
import VariantCard from "@/components/products/VariantCard";
import HomeHero, { type HeroSide } from "@/components/home/HomeHero";

export const dynamic = "force-dynamic";

/** One hero side per priority category: real floor price, real best saving, a real cut-out photo */
// Static home photos: final transparent PNG/WebP files dropped in public/brand/home/, shown as they are.
// A category without an entry here shows the drawing.
const HOME = "/brand/home";
const CATEGORY_PHOTOS: Record<string, string> = {
  iphone: `${HOME}/cat-iphone.webp`,
  android: `${HOME}/cat-android.webp`,
  ipad: `${HOME}/cat-ipad.webp`,
  "tablettes-android": `${HOME}/cat-tablet.webp`,
  montres: `${HOME}/cat-watch.webp`,
  consoles: `${HOME}/cat-console.webp`,
};
const LAPTOP_PHOTOS = [`${HOME}/cat-laptops.webp`];
/** Photos kept on their white background (no outline to cut along): blended into the card, no drop shadow */
const ON_WHITE = new Set(["consoles"]);
/** Small category cards: a soft scene, light top-left to deeper bottom-right */
const SCENES: Record<string, string> = {
  // Soft blue and grey, alternating like a checkerboard. Fixed on purpose: they don't follow the theme.
  ipad: "bg-[linear-gradient(135deg,#F2F6FF,#D3E1FF)]",
  "tablettes-android": "bg-[linear-gradient(135deg,#F3F5F9,#D8DEEA)]",
  montres: "bg-[linear-gradient(135deg,#F3F5F9,#D8DEEA)]",
  consoles: "bg-[linear-gradient(135deg,#F2F6FF,#D3E1FF)]",
};

async function heroSide(kind: "PHONE" | "LAPTOP"): Promise<HeroSide> {
  const cards = await getVariantCards({ where: { kind }, sort: "deal" });
  const saving = (c: (typeof cards)[number]) => (c.newPriceMillimes ? Math.round((1 - c.priceMillimes / c.newPriceMillimes) * 100) : 0);
  return {
    kind,
    title: kind === "PHONE" ? "Téléphones" : "Ordinateurs",
    brands: kind === "PHONE" ? "iPhone, Samsung, Xiaomi, Google" : "MacBook, ThinkPad, EliteBook, PC gamer",
    href: kind === "PHONE" ? "/catalog?type=phone" : "/catalog?type=laptop",
    cta: kind === "PHONE" ? "Voir les téléphones" : "Voir les ordinateurs",
    floorMillimes: cards.length ? Math.min(...cards.map((c) => c.priceMillimes)) : null,
    maxDiscount: Math.max(0, ...cards.map(saving)),
    count: cards.length,
    // Phones: a whole scene on our navy (text goes on its empty left side). Laptops: a transparent photo.
    imageSrc: kind === "PHONE" ? `${HOME}/hero-phones.jpeg` : `${HOME}/hero-laptops.webp`,
    imageAlt: kind === "PHONE" ? "iPhone et Samsung Galaxy reconditionnés" : "MacBook reconditionné",
  };
}

async function getArrivals() {
  const offers = await prisma.offer.findMany({
    where: SELLABLE,
    orderBy: { createdAt: "desc" },
    take: 60,
    include: { variant: { include: { product: true, finish: finishWithFront } } },
  });
  const seen = new Set<string>();
  const out = [];
  for (const o of offers) {
    const p = o.variant.product;
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push({
      key: o.id,
      label: p.model,
      kind: p.kind,
      cameras: p.cameraCount,
      colorHex: o.variant.finish.hex,
      imageKey: o.variant.finish.images[0]?.key ?? p.coverKey,
      href: productHref(p.slug, o.variantId, o.conditionGrade),
    });
    if (out.length === 10) break;
  }
  return out;
}

export default async function HomePage() {
  const [phonesSide, laptopsSide, categories, floors, arrivals, deals, user] = await Promise.all([
    heroSide("PHONE"),
    heroSide("LAPTOP"),
    prisma.category.findMany({ orderBy: { position: "asc" } }),
    categoryFloors(),
    getArrivals(),
    getVariantCards({ sort: "deal", take: 8, onePerProduct: true }),
    getSessionUser(),
  ]);
  const followed = user
    ? new Set((await prisma.favorite.findMany({ where: { userId: user.id }, select: { variantId: true } })).map((f) => f.variantId))
    : new Set<string>();

  const phones = categories.filter((c) => c.kind === "PHONE");
  // Computers get their own wide tile right after phones: MacBook and PC together
  const laptopFloor = Math.min(...categories.filter((c) => c.kind === "LAPTOP").map((c) => floors.get(c.id) ?? Infinity));
  const hasLaptops = categories.some((c) => c.kind === "LAPTOP");
  const others = categories.filter((c) => c.kind !== "PHONE" && c.kind !== "LAPTOP");
  // Phone tiles are dark: their photos are cut out. Light tiles blend the photo's white away.


  return (
    <>
    {/* The hero runs wider than the page column (1600 vs 1240): the phones scene needs the room */}
    <div className="mx-auto w-full max-w-[1600px] px-4 pt-6 sm:px-6">
      <HomeHero phones={phonesSide} laptops={laptopsSide} />
    </div>
    <div className="container-page flex flex-col gap-16 pb-6 pt-16">

      {/* Categories */}
      <section aria-labelledby="categories" className="flex flex-col items-center gap-7">
        <div className="text-center">
          <h2 id="categories" className="text-[32px] font-semibold tracking-[-0.035em] sm:text-[40px]">Que cherchez-vous ?</h2>
          <p className="mt-2 text-base text-ink-muted">Chaque catégorie suit la même grille d’état et la même garantie de 12 mois.</p>
        </div>
        <div className="grid w-full grid-cols-2 gap-4 lg:grid-cols-6">
          {phones.map((c, i) => {
            const floor = floors.get(c.id);
            const cut = CATEGORY_PHOTOS[c.slug];
            return (
              <Link
                key={c.id}
                href={`/catalog?category=${c.slug}`}
                className={`group relative col-span-2 flex h-[260px] flex-col justify-between overflow-hidden rounded-panel px-8 py-[30px] text-white transition hover:-translate-y-1 hover:shadow-lift lg:col-span-3 ${i === 0 ? "bg-brand" : "bg-trust"}`}
              >
                <span className="relative z-[1] max-w-[50%] sm:max-w-[58%]">
                  <span className="block text-[30px] font-bold leading-[1.05] tracking-[-0.035em] sm:text-[34px]">{c.nameFr}</span>
                  {c.tagline && <span className="mt-2 block text-[15px] text-white/80">{c.tagline}</span>}
                </span>
                {floor && floor !== Infinity && (
                  <span className="relative z-[1] flex items-baseline gap-2 text-[15px]">
                    dès <b className="text-[26px] font-bold tracking-[-0.03em]">{formatPrice(floor)}</b>
                  </span>
                )}
                <span aria-hidden="true" className="absolute -bottom-20 right-4 h-[280px] w-[280px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,.22),rgba(255,255,255,0)_65%)]" />
                {cut ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- pre-sized stored file */
                  <img src={cut} alt="" aria-hidden="true" className="absolute right-4 top-1/2 h-[64%] w-[46%] -translate-y-1/2 object-contain object-center drop-shadow-[0_20px_26px_rgba(0,0,0,.4)] transition-transform duration-500 sm:bottom-4 sm:right-8 sm:top-auto sm:h-[210px] sm:w-[56%] sm:translate-y-0 sm:object-bottom sm:group-hover:-translate-y-1.5" />
                ) : (
                  <span aria-hidden="true" className="absolute -right-6 top-[34px] -rotate-[10deg] sm:right-[70px]">
                    <DeviceArt kind="PHONE" color="#C9D3F5" cameras={3} width={132} />
                  </span>
                )}
              </Link>
            );
          })}
          {hasLaptops && (
            <Link
              href="/catalog?type=laptop"
              className="group relative col-span-2 flex flex-col justify-between overflow-hidden rounded-panel bg-brand-tint px-6 py-6 sm:h-[240px] sm:px-8 sm:py-[30px] transition hover:-translate-y-1 hover:shadow-lift lg:col-span-6"
            >
              <span className="relative z-[1] max-w-full sm:max-w-[48%]">
                <span className="block text-[30px] font-bold leading-[1.05] tracking-[-0.035em] sm:text-[34px]">Ordinateurs portables</span>
                <span className="mt-2 block text-[15px] text-ink-soft">MacBook, ThinkPad, EliteBook, PC gamer. Filtrez par processeur, RAM et carte graphique.</span>
              </span>
              {laptopFloor !== Infinity && (
                <span className="relative z-[1] flex items-baseline gap-2 text-[15px]">
                  dès <b className="price text-[26px]">{formatPrice(laptopFloor)}</b>
                </span>
              )}
              {LAPTOP_PHOTOS.length > 0 ? (
                <span aria-hidden="true" className="relative order-last mt-4 flex h-[150px] w-full items-end justify-center transition-transform duration-500 sm:absolute sm:bottom-3 sm:right-10 sm:mt-0 sm:h-[215px] sm:w-[48%] sm:justify-end sm:gap-4 sm:group-hover:-translate-y-1.5">
                  {LAPTOP_PHOTOS.map((src) => (
                    /* eslint-disable-next-line @next/next/no-img-element -- pre-sized static file */
                    <img key={src} src={src} alt="" className="h-full min-w-0 flex-1 object-contain object-bottom" />
                  ))}
                </span>
              ) : (
                <span aria-hidden="true" className="absolute -bottom-6 right-6"><DeviceArt kind="LAPTOP" color="#5A606C" width={260} /></span>
              )}
            </Link>
          )}
          {others.map((c) => {
            const floor = floors.get(c.id);
            const show = CATEGORY_PHOTOS[c.slug];
            const onWhite = ON_WHITE.has(c.slug);
            const width = c.kind === "LAPTOP" ? 112 : c.kind === "TABLET" ? 74 : c.kind === "WATCH" ? 58 : 100;
            return (
              <Link
                key={c.id}
                href={`/catalog?category=${c.slug}`}
                className={`group relative col-span-1 flex flex-col overflow-hidden rounded-panel p-5 transition hover:-translate-y-1 hover:shadow-lift sm:p-7 lg:col-span-3 lg:h-[230px] ${SCENES[c.slug] ?? "bg-brand-tint"}`}
              >
                {/* The device: a fixed frame it can never overflow, on a white glow like a pedestal */}
                <span aria-hidden="true" className="relative h-[130px] w-full lg:absolute lg:inset-y-6 lg:right-6 lg:h-auto lg:w-[44%]">
                  <span className="absolute inset-x-[8%] bottom-0 h-[38%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,.9),rgba(255,255,255,0)_70%)]" />
                  {show ? (
                    /* eslint-disable-next-line @next/next/no-img-element -- pre-sized static file */
                    <img
                      src={show}
                      alt=""
                      className={`absolute inset-0 h-full w-full object-contain object-bottom transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-[1.03] ${
                        onWhite ? "mix-blend-multiply" : "drop-shadow-[0_14px_16px_rgba(13,27,62,.22)]"
                      }`}
                    />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center"><DeviceArt kind={c.kind} color="#B9C7E6" width={width} /></span>
                  )}
                </span>
                <span className="relative z-[1] mt-4 flex flex-1 flex-col lg:mt-0 lg:max-w-[50%]">
                  <span className="text-[19px] font-bold leading-tight tracking-[-0.025em] sm:text-[24px]">{c.nameFr}</span>
                  {floor && floor !== Infinity && (
                    <span className="mt-2 text-sm text-ink-soft">
                      dès <b className="price text-xl">{formatPrice(floor)}</b>
                    </span>
                  )}
                  <span className="mt-auto hidden items-center gap-1.5 pt-4 text-sm font-semibold text-brand-dark sm:flex">
                    Voir
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* New arrivals */}
      {arrivals.length > 0 && (
        <section aria-labelledby="arrivages">
          <div className="mb-[18px] flex items-baseline justify-between gap-4">
            <h2 id="arrivages" className="section-title">Arrivés cette semaine</h2>
            <Link href="/catalog?sort=new" className="text-[15px] text-brand-dark hover:underline">Tout voir</Link>
          </div>
          <div className="flex gap-[22px] overflow-x-auto px-0.5 pb-2 pt-1">
            {arrivals.map((a) => (
              <Link key={a.key} href={a.href} className="group flex w-[92px] flex-none flex-col items-center gap-2.5 text-ink">
                <span className="relative grid h-[88px] w-[88px] place-items-center">
                  <span className="absolute inset-0 rounded-full bg-[conic-gradient(theme(colors.pop.DEFAULT),theme(colors.brand.DEFAULT),theme(colors.pop.DEFAULT))] transition-transform duration-300 group-hover:rotate-12" />
                  <span className="relative grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-white">
                    <span className="grid h-[70px] w-[70px] place-items-center overflow-hidden rounded-full bg-brand-tint">
                      <DeviceVisual
                        imageKey={a.imageKey}
                        kind={a.kind}
                        colorHex={a.colorHex}
                        cameras={a.cameras}
                        artWidth={a.kind === "PHONE" ? 36 : a.kind === "LAPTOP" ? 56 : a.kind === "CONSOLE" ? 52 : 34}
                        artClassName={a.kind === "PHONE" ? "translate-y-2.5 -rotate-[10deg]" : undefined}
                        alt={a.label}
                        sizes="70px"
                      />
                    </span>
                  </span>
                </span>
                <span className="text-center text-[13px] leading-tight">{a.label}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Deals: one exact variant per card */}
      <section aria-labelledby="affaires">
        <div className="mb-[18px] flex items-baseline justify-between gap-4">
          <h2 id="affaires" className="section-title">Les plus grosses économies du moment</h2>
          <Link href="/catalog" className="text-[15px] text-brand-dark hover:underline">Voir le catalogue</Link>
        </div>
        {/* Phones: one row to swipe, cards a bit narrower than the screen so the next one peeks in */}
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] sm:gap-[18px] sm:overflow-visible sm:px-0 sm:pb-0">
          {deals.map((d) => (
            <div key={d.offerId} className="w-[76%] flex-none snap-start sm:w-auto">
              <VariantCard card={d} followed={followed.has(d.variantId)} />
            </div>
          ))}
        </div>
      </section>

      {/* Grading */}
      <section id="etat" aria-labelledby="etats" className="rounded-panel border border-line bg-white p-7 sm:p-11">
        <h2 id="etats" className="text-[30px] font-semibold tracking-[-0.03em]">Quatre états, une seule règle : on vous dit tout.</h2>
        <p className="mb-[30px] mt-2.5 max-w-[40em] text-base leading-normal text-ink-muted">
          Chaque appareil est noté par Bonétat selon la même grille, quel que soit l’atelier qui l’a préparé. La batterie est mesurée, pas estimée, et affichée pour chaque appareil.
        </p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
          {[...GRADE_ORDER].reverse().map((g) => (
            <div key={g} className="rounded-panel bg-chalk p-[22px]">
              <span className="meter w-[72px]">{[1, 2, 3, 4].map((i) => <span key={i} data-on={i <= GRADES[g].level} />)}</span>
              <h3 className="mb-1.5 mt-4 text-[19px] font-semibold">{GRADES[g].label}</h3>
              <p className="text-sm leading-normal text-ink-soft">{GRADES[g].description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works — a real sequence, so it's numbered */}
      <section aria-labelledby="parcours">
        <h2 id="parcours" className="section-title mb-[22px]">De l’atelier à votre porte</h2>
        <ol className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
          {[
            ["Un atelier partenaire le prépare", "Seuls des ateliers vérifiés par Bonétat peuvent proposer un appareil."],
            ["Bonétat note son état", "Même grille pour tout le monde, batterie mesurée, IMEI vérifié."],
            ["Vous payez à la livraison", "Vous allumez l’appareil devant le livreur, puis vous payez."],
            ["Garanti 12 mois par Bonétat", "Une panne ? Vous parlez à Bonétat, on s’occupe du reste."],
          ].map(([t, d], i) => (
            <li key={t} className="border-t-[3px] border-brand pt-[18px]">
              <span className="text-[15px] font-semibold text-brand-dark">{i + 1}</span>
              <h3 className="my-1.5 text-lg font-semibold">{t}</h3>
              <p className="text-sm leading-normal text-ink-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
    </>
  );
}
