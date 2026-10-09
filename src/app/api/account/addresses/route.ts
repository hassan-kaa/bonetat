import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addressSchema } from "@/lib/validation";


export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  try {
    const data = addressSchema.parse(await req.json());
    const count = await prisma.address.count({ where: { userId: user.id } });
    const isDefault = data.isDefault || count === 0;
    const address = await prisma.$transaction(async (tx) => {
      if (isDefault) await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
      return tx.address.create({ data: { ...data, isDefault, userId: user.id } });
    });
    return NextResponse.json({ success: true, address });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
