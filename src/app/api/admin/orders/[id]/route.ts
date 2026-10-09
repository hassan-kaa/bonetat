import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ status: z.enum(["CONFIRMED", "DELIVERED", "CANCELLED", "DISPUTED"]) });

class RuleError extends Error {}

/**
 * Operations: confirm after the phone call, mark delivered when the courier confirms cash,
 * cancel (the units go back on sale) or flag a dispute.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id } = await params;
  try {
    const { status } = schema.parse(await req.json());
    const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      if (status === "CONFIRMED") {
        if (order.status !== "PENDING") throw new RuleError("Seule une commande en attente peut être confirmée");
        await tx.order.update({ where: { id }, data: { status } });
      } else if (status === "DELIVERED") {
        await tx.orderItem.updateMany({ where: { orderId: id, fulfillmentStatus: { not: "CANCELLED" } }, data: { fulfillmentStatus: "DELIVERED" } });
        await tx.order.update({ where: { id }, data: { status, deliveredAt: new Date() } });
      } else if (status === "CANCELLED") {
        if (order.status === "DELIVERED") throw new RuleError("Une commande livrée ne s’annule pas : ouvrez une réclamation");
        const back = order.items.filter((i) => i.fulfillmentStatus !== "CANCELLED").map((i) => i.offerId);
        await tx.offer.updateMany({ where: { id: { in: back }, status: "SOLD" }, data: { status: "ACTIVE" } });
        await tx.orderItem.updateMany({ where: { orderId: id }, data: { fulfillmentStatus: "CANCELLED" } });
        await tx.order.update({ where: { id }, data: { status } });
      } else {
        await tx.order.update({ where: { id }, data: { status } });
      }
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    if (err instanceof RuleError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
