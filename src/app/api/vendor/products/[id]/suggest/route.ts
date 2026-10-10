import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getVendorUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeSellerText } from "@/lib/seller-text";

const schema = z.object({
  changes: z
    .array(z.object({ label: z.string().trim().min(1).max(40), to: z.string().trim().min(1).max(160) }))
    .min(1, "Indiquez au moins une correction")
    .max(10),
});

/**
 * A store suggests a correction to a model's shared spec sheet. Shared by every store selling
 * the model, so it is never applied directly: admin accepts or rejects it.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getVendorUser();
  if (!auth) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id } = await params;
  try {
    const { changes } = schema.parse(await req.json());
    const product = await prisma.product.findUnique({ where: { id }, select: { specsJson: true } });
    if (!product) return NextResponse.json({ error: "Modèle introuvable" }, { status: 404 });
    const current = new Map((Array.isArray(product.specsJson) ? (product.specsJson as [string, string][]) : []).map(([k, v]) => [k.toLowerCase(), v]));
    await prisma.specSuggestion.create({
      data: {
        productId: id,
        vendorId: auth.vendor.id,
        changes: changes.map((c) => ({ label: c.label, from: current.get(c.label.toLowerCase()) ?? null, to: sanitizeSellerText(c.to) })),
      },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
