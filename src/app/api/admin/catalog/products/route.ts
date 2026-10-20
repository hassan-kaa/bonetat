import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/auth";
import { AdminCatalogError, createProduct } from "@/lib/admin-catalog";

const schema = z.object({
  kind: z.enum(["PHONE", "TABLET", "LAPTOP", "WATCH", "CONSOLE", "OTHER"]),
  brand: z.string().trim().min(1, "Choisissez une marque"),
  line: z.string().trim().min(1, "Indiquez la gamme").max(40),
  modelNumber: z.string().trim().min(1, "Indiquez le modèle").max(40),
  /** Save even though close names exist (the admin checked them) */
  force: z.boolean().optional(),
});

/** Add a catalog model by hand. Answers `existing` (same model), `similar` (close names to check) or `created`. */
export async function POST(req: NextRequest) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  try {
    const { force, ...input } = schema.parse(await req.json());
    return NextResponse.json(await createProduct(input, { force }));
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    if (err instanceof AdminCatalogError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
