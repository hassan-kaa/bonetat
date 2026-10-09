import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SELLABLE } from "@/lib/queries";

const schema = z.object({ variantId: z.string(), follow: z.boolean() });

/** Follow / unfollow a variant's price */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Connectez-vous pour suivre un prix" }, { status: 401 });
  try {
    const { variantId, follow } = schema.parse(await req.json());
    if (!follow) {
      await prisma.favorite.deleteMany({ where: { userId: user.id, variantId } });
      return NextResponse.json({ following: false });
    }
    const best = await prisma.offer.findFirst({ where: { variantId, ...SELLABLE }, orderBy: { priceMillimes: "asc" } });
    await prisma.favorite.upsert({
      where: { userId_variantId: { userId: user.id, variantId } },
      update: {},
      create: { userId: user.id, variantId, startPriceMillimes: best?.priceMillimes ?? null },
    });
    return NextResponse.json({ following: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
