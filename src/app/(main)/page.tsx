import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { SELLABLE, categoryFloors, finishWithFront, getVariantCards, productHref } from "@/lib/queries";
import { GRADES, GRADE_ORDER } from "@/lib/catalog";
import { formatPrice } from "@/lib/money";
import DeviceArt from "@/components/products/DeviceArt";
import DeviceVisual from "@/components/products/DeviceVisual";
import VariantCard from "@/components/products/VariantCard";
import HomeHero, { type HeroSide } from "@/components/home/HomeHero";

export const dynamic = "force-dynamic";

/** One hero side per priority category: real floor price, real best saving, a real photo */
async function heroSide(kind: "PHONE" | "LAPTOP"): Promise<HeroSide> {
  const cards = await getVariantCards({ where: { kind }, sort: "deal" });
  const saving = (c: (typeof cards)[number]) => (c.newPriceMillimes ? Math.round((1 - c.priceMillimes / c.newPriceMillimes) * 100) : 0);
  // The showcase: an own-color photo first, a model cover otherwise, best deal first
  const showcase = cards.find((c) => c.imageKey && !c.imageIsCover) ?? cards.find((c) => c.imageKey);
  return {
    kind,
    title: kind === "PHONE" ? "Téléphones" : "Ordinateurs",
    brands: kind === "PHONE" ? "iPhone, Samsung, Xiaomi, Google" : "MacBook, ThinkPad, EliteBook, PC gamer",
    href: kind === "PHONE" ? "/catalog?type=phone" : "/catalog?type=laptop",
    cta: kind === "PHONE" ? "Voir les téléphones" : "Voir les ordinateurs",
    floorMillimes: cards.length ? Math.min(...cards.map((c) => c.priceMillimes)) : null,
    maxDiscount: Math.max(0, ...cards.map(saving)),
    count: cards.length,
    imageKey: showcase?.imageKey ?? null,
    imageAlt: showcase?.name ?? "",
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
  const phoneArt: Record<string, [string, string]> = { iphone: ["#43544A", "#F2D4D7"], android: ["#BFD3E6", "#22252C"] };

  return (
    <div className="container-page flex flex-col gap-16 pb-6 pt-6">
      <HomeHero phones={phonesSide} laptops={laptopsSide} />

      {/* Categories */}
      <section aria-labelledby="categories" className="flex flex-col items-center gap-7">
        <div className="text-center">
          <h2 id="categories" className="text-[32px] font-semibold tracking-[-0.035em] sm:text-[40px]">Que cherchez-vous ?</h2>
          <p className="mt-2 text-base text-ink-muted">Chaque catégorie suit la même grille d’état et la même garantie de 12 mois.</p>
        </div>
        <div className="grid w-full grid-cols-2 gap-4 lg:grid-cols-6">
          {phones.map((c, i) => {
            const floor = floors.get(c.id);
            const [hexA, hexB] = phoneArt[c.slug] ?? ["#43544A", "#22252C"];
            return (
              <Link
                key={c.id}
                href={`/catalog?category=${c.slug}`}
                className={`relative col-span-2 flex h-[260px] flex-col justify-between overflow-hidden rounded-[32px] px-8 py-[30px] text-white transition hover:-translate-y-1 hover:shadow-lift lg:col-span-3 ${i === 0 ? "bg-brand" : "bg-ink"}`}
              >
                <span className="relative z-[1] max-w-[62%] sm:max-w-none">
                  <span className="block text-[30px] sm:text-[34px] font-semibold leading-[1.05] tracking-[-0.035em]">{c.nameFr}</span>
                  {c.tagline && <span className="mt-2 block text-[15px] text-white/80">{c.tagline}</span>}
                </span>
                {floor && floor !== Infinity && (
                  <span className="relative z-[1] flex items-baseline gap-2 text-[15px]">
                    dès <b className="text-[26px] font-semibold tracking-[-0.03em]">{formatPrice(floor)}</b>
                  </span>
                )}
                <span aria-hidden="true" className="absolute -bottom-[70px] right-[38px] h-[260px] w-[260px] rounded-full bg-white/10" />
                <span aria-hidden="true" className="absolute right-[176px] top-[78px] hidden rotate-[8deg] sm:block">
                  <DeviceArt kind="PHONE" color={hexB} cameras={3} width={104} />
                </span>
                <span aria-hidden="true" className="absolute -right-6 top-[34px] -rotate-[10deg] sm:right-[70px]">
                  <DeviceArt kind="PHONE" color={hexA} cameras={3} width={132} />
                </span>
              </Link>
            );
          })}
          {hasLaptops && (
            <Link
              href="/catalog?type=laptop"
              className="relative col-span-2 flex h-[240px] flex-col justify-between overflow-hidden rounded-[32px] bg-brand-tint px-8 py-[30px] transition hover:-translate-y-1 hover:shadow-lift lg:col-span-6"
            >
              <span className="relative z-[1] max-w-[60%]">
                <span className="block text-[30px] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-[34px]">Ordinateurs portables</span>
                <span className="mt-2 block text-[15px] text-ink-soft">MacBook, ThinkPad, EliteBook, PC gamer. Filtrez par processeur, RAM et carte graphique.</span>
              </span>
              {laptopFloor !== Infinity && (
                <span className="relative z-[1] flex items-baseline gap-2 text-[15px]">
                  dès <b className="text-[26px] font-semibold tracking-[-0.03em]">{formatPrice(laptopFloor)}</b>
                </span>
              )}
              <span aria-hidden="true" className="absolute -bottom-10 right-[200px] hidden -rotate-[4deg] sm:block">
                <DeviceArt kind="LAPTOP" color="#B9C7E6" width={230} />
              </span>
              <span aria-hidden="true" className="absolute -bottom-6 -right-10 rotate-[3deg] sm:right-6">
                <DeviceArt kind="LAPTOP" color="#5A606C" width={260} />
              </span>
            </Link>
          )}
          {others.map((c) => {
            const floor = floors.get(c.id);
            const art: Record<string, string> = {
              ipad: "#8DB0EC", "tablettes-android": "#A7D8BD", macbook: "#B9C7E6", ordinateurs: "#F2C6A8", montres: "#E8C9B0", consoles: "#3F4044",
            };
            const width = c.kind === "LAPTOP" ? 112 : c.kind === "TABLET" ? 74 : c.kind === "WATCH" ? 58 : 100;
            return (
              <Link
                key={c.id}
                href={`/catalog?category=${c.slug}`}
                className="col-span-1 flex flex-col items-center gap-4 overflow-hidden rounded-[28px] border-[1.5px] border-line bg-white px-3.5 py-5 text-center transition hover:-translate-y-1 hover:border-brand hover:shadow-lift lg:col-span-3 lg:h-[220px] lg:flex-row lg:gap-5 lg:px-[26px] lg:text-left"
              >
                <span aria-hidden="true" className="grid h-[132px] w-[132px] flex-none place-items-center rounded-full bg-brand-tint">
                  <DeviceArt kind={c.kind} color={art[c.slug] ?? "#B9C7E6"} width={width} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[22px] font-semibold leading-tight tracking-[-0.025em]">{c.nameFr}</span>
                  {floor && floor !== Infinity && (
                    <span className="mt-2.5 block text-sm text-ink-muted">
                      dès <b className="text-lg font-semibold text-ink">{formatPrice(floor)}</b>
                    </span>
                  )}
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
            <Link href="/catalog?sort=new" className="text-[15px] text-brand hover:underline">Tout voir</Link>
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
          <Link href="/catalog" className="text-[15px] text-brand hover:underline">Voir le catalogue</Link>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-[18px]">
          {deals.map((d) => (
            <VariantCard key={d.offerId} card={d} followed={followed.has(d.variantId)} />
          ))}
        </div>
      </section>

      {/* Grading */}
      <section id="etat" aria-labelledby="etats" className="rounded-[36px] border border-line bg-white p-7 sm:p-11">
        <h2 id="etats" className="text-[30px] font-semibold tracking-[-0.03em]">Quatre états, une seule règle : on vous dit tout.</h2>
        <p className="mb-[30px] mt-2.5 max-w-[40em] text-base leading-normal text-ink-muted">
          Chaque appareil est noté par Bonétat selon la même grille, quel que soit l’atelier qui l’a préparé. La batterie est mesurée, pas estimée, et affichée pour chaque appareil.
        </p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
          {[...GRADE_ORDER].reverse().map((g) => (
            <div key={g} className="rounded-[22px] bg-chalk p-[22px]">
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
              <span className="text-[15px] font-semibold text-brand">{i + 1}</span>
              <h3 className="my-1.5 text-lg font-semibold">{t}</h3>
              <p className="text-sm leading-normal text-ink-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
