import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/auth";
import { AdminCatalogError, addPhoto } from "@/lib/admin-catalog";

const schema = z
  .object({
    finishId: z.string().nullable(),
    angle: z.enum(["FRONT", "BACK", "SIDE", "DETAIL"]).default("FRONT"),
    /** A file from the admin's computer, shrunk in the browser (Vercel caps a request at about 4.5 MB) */
    data: z.string().max(4_000_000, "Image trop lourde").optional(),
    /** Or an image address on a public site, fetched by the server */
    url: z.string().url("Adresse invalide").optional(),
  })
  .refine((d) => d.data || d.url, { message: "Ajoutez une image ou une adresse" });

const RESULT: Record<string, string> = { imported: "Photo ajoutée", duplicate: "Cette photo est déjà là", "rejected-before": "Photo déjà rejetée auparavant" };

/** Add one photo to a model or one of its colors, online at once */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id } = await params;
  try {
    const d = schema.parse(await req.json());
    const r = await addPhoto(d.url ? { productId: id, finishId: d.finishId, angle: d.angle, url: d.url } : { productId: id, finishId: d.finishId, angle: d.angle, data: d.data! });
    return NextResponse.json({ result: r, message: RESULT[r] ?? r }, { status: r === "imported" ? 200 : 409 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    if (err instanceof AdminCatalogError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Image illisible ou format non pris en charge" }, { status: 500 });
  }
}
