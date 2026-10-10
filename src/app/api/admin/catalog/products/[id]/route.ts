import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MergeError, correctProductIdentity, mergeProducts } from "@/lib/product-merge";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("confirm") }),
  z.object({ action: z.literal("merge"), targetId: z.string() }),
  z.object({
    action: z.literal("correct"),
    brand: z.string().min(1),
    line: z.string().trim().min(1).max(40),
    modelNumber: z.string().trim().min(1).max(40),
  }),
]);

/** Review a store-created model: confirm it, fix its name, or fold it into the existing product */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id } = await params;
  try {
    const d = schema.parse(await req.json());
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return NextResponse.json({ error: "Modèle introuvable" }, { status: 404 });

    if (d.action === "merge") {
      await mergeProducts(id, d.targetId);
    } else {
      if (d.action === "correct") await correctProductIdentity(id, d);
      const fresh = await prisma.product.findUniqueOrThrow({ where: { id } });
      // Confirming (or correcting) also confirms a line the store proposed
      await prisma.productLine.updateMany({ where: { brand: { name: fresh.brand }, name: fresh.line ?? "" }, data: { approved: true } });
      if (d.action === "confirm") await prisma.product.update({ where: { id }, data: { status: "ACTIVE" } });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    if (err instanceof MergeError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
