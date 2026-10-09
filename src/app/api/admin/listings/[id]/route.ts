import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("reject"), reason: z.string().trim().min(3, "Indiquez la raison du refus").max(300) }),
  z.object({ action: z.literal("deactivate") }),
]);

/** Moderation: approve puts the offer live; reject sends the partner a reason */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id } = await params;
  try {
    const d = schema.parse(await req.json());
    const data =
      d.action === "approve"
        ? { status: "ACTIVE" as const, rejectionReason: null }
        : d.action === "reject"
          ? { status: "REJECTED" as const, rejectionReason: d.reason }
          : { status: "INACTIVE" as const };
    await prisma.offer.update({ where: { id }, data });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
