import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/auth";
import { importIcecatForFinish } from "@/lib/catalog-import";
import { IcecatError } from "@/lib/icecat";

const schema = z.object({ ref: z.string().trim().min(1, "Collez un code produit, un EAN ou un identifiant Icecat").max(80) });

// Downloading and resizing a gallery takes a few seconds
export const maxDuration = 60;

/** Link this color to an Icecat product and import its gallery as draft catalog photos */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id } = await params;
  try {
    const { ref } = schema.parse(await req.json());
    return NextResponse.json(await importIcecatForFinish(id, ref));
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    if (err instanceof IcecatError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
