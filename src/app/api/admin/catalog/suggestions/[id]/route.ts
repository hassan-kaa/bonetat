import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ action: z.enum(["accept", "reject"]) });

/** Accept (apply to the shared spec sheet) or reject a store's spec correction */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id } = await params;
  try {
    const { action } = schema.parse(await req.json());
    const s = await prisma.specSuggestion.findUnique({ where: { id }, include: { product: { select: { specsJson: true } } } });
    if (!s || s.status !== "PENDING") return NextResponse.json({ error: "Suggestion introuvable ou déjà traitée" }, { status: 404 });
    await prisma.$transaction(async (tx) => {
      if (action === "accept") {
        const specs: [string, string][] = Array.isArray(s.product.specsJson) ? [...(s.product.specsJson as [string, string][])] : [];
        for (const c of s.changes as { label: string; to: string }[]) {
          const i = specs.findIndex(([k]) => k.toLowerCase() === c.label.toLowerCase());
          if (i >= 0) specs[i] = [specs[i][0], c.to];
          else specs.push([c.label, c.to]);
        }
        await tx.product.update({ where: { id: s.productId }, data: { specsJson: specs } });
      }
      await tx.specSuggestion.update({ where: { id }, data: { status: action === "accept" ? "ACCEPTED" : "REJECTED" } });
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
