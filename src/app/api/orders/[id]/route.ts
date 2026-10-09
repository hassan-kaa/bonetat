import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ action: z.literal("cancel") });

/** The buyer cancels an order before any partner shipped it. The units go back on sale. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  const { id } = await params;
  try {
    schema.parse(await req.json());
    const order = await prisma.order.findFirst({ where: { id, buyerId: user.id }, include: { items: true } });
    if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    if (!["PENDING", "CONFIRMED"].includes(order.status) || order.items.some((i) => i.fulfillmentStatus !== "PENDING")) {
      return NextResponse.json({ error: "Cette commande est déjà en route. Refusez le colis à la livraison ou contactez Bonétat." }, { status: 400 });
    }
    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id }, data: { status: "CANCELLED" } });
      await tx.orderItem.updateMany({ where: { orderId: id }, data: { fulfillmentStatus: "CANCELLED" } });
      await tx.offer.updateMany({ where: { id: { in: order.items.map((i) => i.offerId) }, status: "SOLD" }, data: { status: "ACTIVE" } });
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
