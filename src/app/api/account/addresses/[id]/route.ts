import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addressSchema } from "@/lib/validation";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  const { id } = await params;
  try {
    const data = addressSchema.partial().parse(await req.json());
    const existing = await prisma.address.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    await prisma.$transaction(async (tx) => {
      if (data.isDefault) await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
      await tx.address.update({ where: { id }, data });
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.address.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  await prisma.$transaction(async (tx) => {
    await tx.address.delete({ where: { id } });
    if (existing.isDefault) {
      const next = await tx.address.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
      if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  });
  return NextResponse.json({ success: true });
}
