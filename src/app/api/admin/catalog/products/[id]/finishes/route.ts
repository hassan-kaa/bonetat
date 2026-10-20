import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/auth";
import { AdminCatalogError, addFinish } from "@/lib/admin-catalog";

const schema = z.object({
  nameFr: z.string().trim().min(1, "Nommez la couleur").max(40),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

/** Add a color to a model (its photos are added on the same page) */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id } = await params;
  try {
    const d = schema.parse(await req.json());
    const f = await addFinish(id, d.nameFr, d.hex);
    return NextResponse.json({ id: f.id });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    if (err instanceof AdminCatalogError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
