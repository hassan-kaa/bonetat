import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/auth";
import { rejectCatalogImage, validateCatalogImage } from "@/lib/catalog-photos";

const schema = z.discriminatedUnion("action", [
  /** "Tout valider": every photo still on the screen */
  z.object({ action: z.literal("validate"), ids: z.array(z.string()).min(1).max(500) }),
  /** ✕ on one photo */
  z.object({ action: z.literal("reject"), id: z.string(), reason: z.string().trim().max(200).optional() }),
]);

/** Review of photos that need a look before going online (retailer visuals) */
export async function POST(req: NextRequest) {
  if (!(await getAdminUser())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  try {
    const d = schema.parse(await req.json());
    if (d.action === "reject") {
      await rejectCatalogImage(d.id, d.reason || "refusée à la vérification (visuel promotionnel ou inexact)");
      return NextResponse.json({ success: true });
    }
    for (const id of d.ids) await validateCatalogImage(id);
    return NextResponse.json({ validated: d.ids.length });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
