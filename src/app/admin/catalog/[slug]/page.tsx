import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { displayName } from "@/lib/catalog";
import { LOW_RES_PX } from "@/lib/images";
import FinishImporter from "./FinishImporter";
import ImageTile from "./ImageTile";
import CandidateList from "./CandidateList";

const MATCH_LABELS: Record<string, string> = { exact: "lié automatiquement", family: "lié automatiquement (par famille de couleur)", manual: "lié à la main" };

export const metadata: Metadata = { title: "Photos d’un produit" };

const ANGLE_ORDER = { FRONT: 0, BACK: 1, SIDE: 2, DETAIL: 3 } as const;

/** Review screen: one block per color. Import from Icecat, fix angles, approve what goes live. */
export default async function ProductPhotos({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      finishes: {
        orderBy: { position: "asc" },
        include: {
          images: { where: { status: { not: "ARCHIVED" } }, orderBy: { position: "asc" } },
          icecatCandidates: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });
  if (!product) notFound();

  return (
    <>
      <Link href="/admin/catalog" className="text-sm text-ink-muted hover:text-ink">Photos du catalogue</Link>
      <h1 className="page-title">{displayName(product)}</h1>
      <p className="-mt-2 text-[15px] text-ink-muted">
        Une couleur = un produit Icecat. Collez son code fabricant (ex. SM-S911BZKDEUB), son EAN ou son identifiant Icecat.
        Les images arrivent en brouillon : vérifiez l’angle, puis validez une image par angle.
        La synchro automatique (<code>npm run images:sync</code>) remplit ces champs et propose des suggestions quand elle n’est pas sûre.
      </p>
      {product.finishes.map((f) => {
        const images = [...f.images].sort((a, b) => a.status.localeCompare(b.status) || ANGLE_ORDER[a.angle] - ANGLE_ORDER[b.angle] || a.position - b.position);
        return (
          <section key={f.id} className="flex flex-col gap-4 rounded-panel border border-line bg-white p-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="h-8 w-8 rounded-full border border-ink/20" style={{ background: f.hex }} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold">{f.nameFr}</h2>
                <p className="text-[13px] text-ink-muted">
                  {f.slug}
                  {f.aliases.length > 0 && `, aussi : ${f.aliases.join(", ")}`}
                  {f.icecatId && `, Icecat ${f.icecatId}${f.icecatMatch ? `, ${MATCH_LABELS[f.icecatMatch] ?? f.icecatMatch}` : ""}`}
                </p>
              </div>
              <FinishImporter finishId={f.id} linked={f.icecatId} />
            </div>
            {!f.icecatId && f.icecatCandidates.length > 0 && (
              <CandidateList
                finishId={f.id}
                colorName={f.nameFr}
                candidates={f.icecatCandidates.map((c) => ({
                  icecatId: c.icecatId, title: c.title, color: c.color, colorName: c.colorName, picWidth: c.picWidth, previewUrl: c.previewUrl, refurbished: c.refurbished,
                }))}
              />
            )}
            {images.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line-strong p-4 text-sm text-ink-muted">Pas encore de photo : la fiche affiche l’illustration.</p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3">
                {images.map((img) => (
                  <ImageTile
                    key={img.id}
                    image={{
                      id: img.id,
                      key: img.key,
                      angle: img.angle,
                      status: img.status,
                      source: `${img.sourceWidth ?? "?"} × ${img.sourceHeight ?? "?"} px`,
                      lowRes: Math.max(img.sourceWidth ?? 0, img.sourceHeight ?? 0) < LOW_RES_PX,
                    }}
                    colorName={f.nameFr}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </>
  );
}
