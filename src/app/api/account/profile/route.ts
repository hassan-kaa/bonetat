import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().trim().min(2, "Nom trop court").max(60).optional(),
  email: z.string().trim().email("E-mail invalide").max(120).or(z.literal("")).optional(),
  locale: z.enum(["FR", "AR"]).optional(),
  notifySms: z.boolean().optional(),
  notifyWhatsapp: z.boolean().optional(),
  notifyPromos: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  try {
    const data = schema.parse(await req.json());
    await prisma.user.update({
      where: { id: user.id },
      data: { ...data, ...(data.email !== undefined ? { email: data.email || null } : {}) },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
