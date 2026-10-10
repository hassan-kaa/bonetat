import { NextRequest, NextResponse } from "next/server";
import { getVendorUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { displayName } from "@/lib/catalog";

/** What the publish form needs about one product: its colors and the configurations already listed */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getVendorUser())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id } = await params;
  const p = await prisma.product.findUnique({
    where: { id },
    include: { finishes: { orderBy: { position: "asc" } }, variants: { include: { finish: true } } },
  });
  if (!p || p.status === "MERGED") return NextResponse.json({ error: "Modèle introuvable" }, { status: 404 });
  return NextResponse.json({
    id: p.id,
    name: displayName(p),
    brand: p.brand,
    kind: p.kind,
    cameras: p.cameraCount,
    status: p.status,
    finishes: p.finishes.map((f) => ({ id: f.id, nameFr: f.nameFr, hex: f.hex, family: f.family })),
    variants: p.variants.map((v) => ({ id: v.id, storageGb: v.storageGb, ramGb: v.ramGb, option: v.option, finishId: v.finishId, finish: { nameFr: v.finish.nameFr }, colorHex: v.finish.hex })),
  });
}
