import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getVendorUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GRADES, WARRANTY_MONTHS } from "@/lib/catalog";

const schema = z.object({
  variantId: z.string(),
  conditionGrade: z.enum(["COMME_NEUF", "TRES_BON", "BON", "CORRECT"]),
  batteryHealth: z.number().int().min(50).max(100).nullable(),
  imei: z.string().regex(/^\d{15}$/, "L’IMEI fait 15 chiffres (composez *#06#)").nullable().optional(),
  priceMillimes: z.number().int().positive().max(50_000_000),
  sellerNote: z.string().trim().max(200).nullable().optional(),
});

/** A partner publishes one physical unit of a Bonétat catalog variant. It goes to moderation first. */
export async function POST(req: NextRequest) {
  const auth = await getVendorUser();
  if (!auth) return NextResponse.json({ error: "Compte partenaire non approuvé" }, { status: 403 });
  try {
    const data = schema.parse(await req.json());
    const variant = await prisma.variant.findUnique({ where: { id: data.variantId }, include: { product: true } });
    if (!variant) return NextResponse.json({ error: "Configuration introuvable dans le catalogue" }, { status: 400 });

    // The grading standard is enforced in code, not only in copy
    const needsBattery = variant.product.kind !== "CONSOLE";
    const floor = GRADES[data.conditionGrade].minBattery;
    if (needsBattery && (data.batteryHealth === null || data.batteryHealth < floor)) {
      return NextResponse.json(
        { error: `« ${GRADES[data.conditionGrade].label} » exige une batterie d’au moins ${floor} %` },
        { status: 400 }
      );
    }
    if (variant.product.kind === "PHONE" && !data.imei) {
      return NextResponse.json({ error: "L’IMEI est obligatoire pour un téléphone" }, { status: 400 });
    }

    const offer = await prisma.offer.create({
      data: {
        variantId: data.variantId,
        vendorId: auth.vendor.id,
        conditionGrade: data.conditionGrade,
        batteryHealth: needsBattery ? data.batteryHealth : null,
        imei: data.imei ?? null,
        warrantyMonths: WARRANTY_MONTHS,
        priceMillimes: data.priceMillimes,
        sellerNote: data.sellerNote || null,
        status: "PENDING_REVIEW",
      },
    });
    return NextResponse.json({ success: true, offerId: offer.id });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
