import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getVendorUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncOrderStatus } from "@/lib/orders";
import { notify } from "@/lib/notify";

const schema = z.object({ action: z.literal("ship") });

/** A partner marks one of its order items as handed to the courier */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getVendorUser();
  if (!auth) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id } = await params;
  try {
    schema.parse(await req.json());
    const item = await prisma.orderItem.findFirst({ where: { id, vendorId: auth.vendor.id }, include: { order: true } });
    if (!item) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    if (item.order.status !== "CONFIRMED") {
      return NextResponse.json({ error: "Attendez que Bonétat confirme la commande avec le client" }, { status: 400 });
    }
    if (item.fulfillmentStatus !== "PENDING") return NextResponse.json({ error: "Déjà expédiée" }, { status: 400 });
    await prisma.$transaction(async (tx) => {
      await tx.orderItem.update({ where: { id }, data: { fulfillmentStatus: "SHIPPED", shippedAt: new Date() } });
      await syncOrderStatus(item.orderId, tx);
    });
    await notify([item.order.buyerId], { title: `${item.title} est en route (commande ${item.order.number})`, href: `/account/orders/${item.orderId}` });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
