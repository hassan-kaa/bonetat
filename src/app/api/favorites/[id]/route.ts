import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  alertEnabled: z.boolean().optional(),
  alertPriceMillimes: z.number().int().positive().nullable().optional(),
});

/** Turn a price alert on/off or change its threshold */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  const { id } = await params;
  try {
    const data = schema.parse(await req.json());
    const res = await prisma.favorite.updateMany({ where: { id, userId: user.id }, data });
    if (res.count === 0) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Valeur invalide" }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  const { id } = await params;
  await prisma.favorite.deleteMany({ where: { id, userId: user.id } });
  return NextResponse.json({ success: true });
}
