import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { approveCatalogImage } from "@/lib/catalog-import";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("draft") }),
  z.object({ action: z.literal("archive") }),
  z.object({ action: z.literal("angle"), angle: z.enum(["FRONT", "BACK", "SIDE", "DETAIL"]) }),
]);

/** Review a catalog photo: approve it for its angle, take it offline, archive it, or fix its angle */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id } = await params;
  try {
    const d = schema.parse(await req.json());
    const img = await prisma.catalogImage.findUnique({ where: { id } });
    if (!img) return NextResponse.json({ error: "Image introuvable" }, { status: 404 });

    if (d.action === "approve") await approveCatalogImage(id);
    else if (d.action === "draft") await prisma.catalogImage.update({ where: { id }, data: { status: "DRAFT" } });
    else if (d.action === "archive") await prisma.catalogImage.update({ where: { id }, data: { status: "ARCHIVED" } });
    else {
      // Changing the angle of a live image takes it offline: re-approve it in its new slot
      await prisma.catalogImage.update({ where: { id }, data: { angle: d.angle, status: img.status === "APPROVED" ? "DRAFT" : img.status } });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
