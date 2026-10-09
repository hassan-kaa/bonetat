import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  orderItemId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

/** A buyer rates a delivered item. Updates the (private) partner rating too. */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  try {
    const data = schema.parse(await req.json());
    const item = await prisma.orderItem.findFirst({
      where: { id: data.orderItemId, order: { buyerId: user.id } },
      include: { review: true },
    });
    if (!item) return NextResponse.json({ error: "Article introuvable" }, { status: 404 });
    if (item.fulfillmentStatus !== "DELIVERED") return NextResponse.json({ error: "Vous pourrez noter cet appareil après la livraison" }, { status: 400 });
    if (item.review) return NextResponse.json({ error: "Vous avez déjà noté cet appareil" }, { status: 400 });

    await prisma.$transaction(async (tx) => {
      await tx.review.create({
        data: { orderItemId: item.id, buyerId: user.id, vendorId: item.vendorId, rating: data.rating, comment: data.comment || null },
      });
      const agg = await tx.review.aggregate({ where: { vendorId: item.vendorId }, _avg: { rating: true }, _count: true });
      await tx.vendor.update({ where: { id: item.vendorId }, data: { rating: agg._avg.rating, reviewCount: agg._count } });
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
