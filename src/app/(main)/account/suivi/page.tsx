import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SELLABLE, finishWithFront, productHref } from "@/lib/queries";
import { displayName, variantLabel } from "@/lib/catalog";
import FollowRow from "./FollowRow";

export const metadata: Metadata = { title: "Suivi des prix" };

export default async function FollowsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login?redirect=/account/suivi");

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      variant: {
        include: {
          product: true,
          finish: finishWithFront,
          offers: { where: SELLABLE, orderBy: { priceMillimes: "asc" }, take: 1 },
        },
      },
    },
  });

  return (
    <>
      <h1 className="page-title">Suivi des prix</h1>
      <p className="-mt-1.5 text-[15px] text-ink-muted">
        Suivez une configuration avec le cœur sur sa fiche. On vous prévient dès qu’elle passe sous votre prix.
      </p>
      {favorites.length === 0 ? (
        <div className="rounded-panel border border-dashed border-line-strong bg-white p-8 text-center">
          <p className="text-[15px] text-ink-muted">Vous ne suivez encore aucun appareil.</p>
          <Link href="/catalog" className="btn-primary btn-sm mt-4">Parcourir le catalogue</Link>
        </div>
      ) : (
        favorites.map((f) => {
          const best = f.variant.offers[0];
          const p = f.variant.product;
          return (
            <FollowRow
              key={f.id}
              follow={{
                id: f.id,
                name: displayName(p),
                config: variantLabel(f.variant, p.kind),
                kind: p.kind,
                cameras: p.cameraCount,
                colorHex: f.variant.finish.hex,
                imageKey: f.variant.finish.images[0]?.key ?? p.coverKey,
                href: productHref(p.slug, f.variantId, best?.conditionGrade),
                currentPriceMillimes: best?.priceMillimes ?? null,
                startPriceMillimes: f.startPriceMillimes,
                alertEnabled: f.alertEnabled,
                alertPriceMillimes: f.alertPriceMillimes,
                since: f.createdAt.toISOString(),
              }}
            />
          );
        })
      )}
    </>
  );
}
