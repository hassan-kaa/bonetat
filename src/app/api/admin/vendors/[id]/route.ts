import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";

const schema = z.object({
  status: z.enum(["PENDING", "APPROVED", "SUSPENDED"]).optional(),
  qualityScore: z.number().int().min(0).max(100).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id } = await params;
  try {
    const data = schema.parse(await req.json());
    const vendor = await prisma.vendor.findUnique({ where: { id } });
    if (!vendor) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    // Approving gives the partner an internal code for packing slips
    const partnerCode =
      data.status === "APPROVED" && !vendor.partnerCode
        ? `TN-${String(100 + (await prisma.vendor.count({ where: { partnerCode: { not: null } } })) + 1).padStart(4, "0")}`
        : undefined;
    await prisma.vendor.update({ where: { id }, data: { ...data, ...(partnerCode ? { partnerCode } : {}) } });
    if (data.status === "APPROVED" && vendor.status !== "APPROVED") {
      await notify([vendor.userId], { title: "Votre compte partenaire est validé : publiez votre première offre", href: "/vendor/listings/new" });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
