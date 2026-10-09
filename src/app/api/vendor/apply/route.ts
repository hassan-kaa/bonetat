import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GOVERNORATES } from "@/lib/catalog";

const schema = z.object({
  storeName: z.string().trim().min(2, "Nom de l’atelier trop court").max(80),
  contactName: z.string().trim().min(2).max(80),
  phone: z.string().regex(/^\+216\d{8}$/, "Téléphone : +216 suivi de 8 chiffres"),
  governorate: z.enum(GOVERNORATES as [string, ...string[]], { errorMap: () => ({ message: "Choisissez un gouvernorat" }) }),
  pickupAddress: z.string().trim().min(5, "Adresse trop courte").max(200),
  description: z.string().trim().min(20, "Décrivez votre activité en quelques phrases").max(1000),
  instagramUrl: z.string().url("Lien invalide").optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
    if (user.vendor) return NextResponse.json({ error: "Vous avez déjà une candidature" }, { status: 400 });
    if (user.role === "ADMIN") return NextResponse.json({ error: "Un compte admin ne peut pas être partenaire" }, { status: 400 });

    const d = schema.parse(await req.json());
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { role: "VENDOR" } }),
      prisma.vendor.create({
        data: {
          userId: user.id,
          storeName: d.storeName,
          contactName: d.contactName,
          phone: d.phone,
          pickupAddress: `${d.pickupAddress}, ${d.governorate}`,
          description: d.description,
          instagramUrl: d.instagramUrl || null,
          status: "PENDING",
        },
      }),
    ]);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
