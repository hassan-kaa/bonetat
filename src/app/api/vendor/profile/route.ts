import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getVendorUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const opt = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : null));

const schema = z.object({
  storeName: z.string().trim().min(2, "Nom commercial trop court").max(80),
  legalName: opt(120),
  taxId: opt(40),
  rne: opt(40),
  contactName: opt(80),
  phone: z.string().trim().regex(/^(\+216\d{8})?$/, "Téléphone : +216 suivi de 8 chiffres").optional().transform((v) => v || null),
  pickupAddress: opt(200),
  pickupHours: opt(80),
  rib: z.string().trim().regex(/^[\d\s]{0,30}$/, "Le RIB ne contient que des chiffres").optional().transform((v) => v || null),
  description: opt(1000),
});

export async function PATCH(req: NextRequest) {
  const auth = await getVendorUser();
  if (!auth) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  try {
    const data = schema.parse(await req.json());
    await prisma.vendor.update({ where: { id: auth.vendor.id }, data });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
