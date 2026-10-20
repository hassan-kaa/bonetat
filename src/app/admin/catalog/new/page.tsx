import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import NewProductForm from "./NewProductForm";

export const metadata: Metadata = { title: "Ajouter un produit" };

/** Add a model no source has: it goes live at once, then its colors and photos are added on its page */
export default async function NewProductPage() {
  const brands = await prisma.brand.findMany({ orderBy: { name: "asc" }, include: { lines: { where: { approved: true }, orderBy: { name: "asc" }, select: { name: true } } } });
  return (
    <>
      <Link href="/admin/catalog" className="text-sm text-ink-muted hover:text-ink">Photos du catalogue</Link>
      <h1 className="page-title">Ajouter un produit</h1>
      <p className="-mt-2 max-w-[46em] text-[15px] text-ink-muted">
        Un modèle = une famille et une génération (« Latitude 7450 », « G16 7630 »). Processeur, mémoire et carte graphique ne font pas partie du nom : la boutique les choisit en publiant.
      </p>
      <NewProductForm brands={brands.map((b) => ({ name: b.name, lines: b.lines.map((l) => l.name) }))} />
    </>
  );
}
