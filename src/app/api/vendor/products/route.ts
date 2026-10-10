import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getVendorUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { displayName } from "@/lib/catalog";
import { nearDuplicates } from "@/lib/product-identity";
import { PublishError, createProductForStore } from "@/lib/listing-publish";

const kind = z.enum(["PHONE", "TABLET", "LAPTOP", "WATCH", "CONSOLE", "OTHER"]);
const schema = z.discriminatedUnion("from", [
  /** kind is optional: the reference model knows its device type */
  z.object({ from: z.literal("reference"), icecatId: z.number().int(), kind: kind.optional() }),
  z.object({
    from: z.literal("manual"),
    brand: z.string().min(1, "Choisissez la marque"),
    line: z.string().trim().min(1, "Indiquez la gamme").max(40),
    modelNumber: z.string().trim().min(1, "Indiquez le numéro de modèle").max(40),
    kind,
    /** The store saw the close matches and confirmed it's a different model */
    confirmNew: z.boolean().optional(),
  }),
]);

/**
 * A store lists a model we don't have. Returns the existing product when it's a duplicate,
 * asks "C'est celui-là ?" (409) on a close match, otherwise creates it.
 */
export async function POST(req: NextRequest) {
  const auth = await getVendorUser();
  if (!auth) return NextResponse.json({ error: "Compte partenaire non approuvé" }, { status: 403 });
  try {
    const data = schema.parse(await req.json());
    if (data.from === "manual" && !data.confirmNew) {
      const products = await prisma.product.findMany({
        where: { brand: data.brand, status: { not: "MERGED" } },
        select: { id: true, brand: true, model: true, line: true, modelNumber: true, canonicalKey: true },
      });
      const { exact, close } = nearDuplicates(data, products);
      if (!exact && close.length) {
        return NextResponse.json(
          { error: "Modèle proche déjà au catalogue", close: close.map((p) => ({ productId: p.id, label: displayName(p) })) },
          { status: 409 }
        );
      }
    }
    const product = await createProductForStore(data, auth.vendor.id);
    return NextResponse.json({ productId: product.id, label: displayName(product), status: product.status });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    if (err instanceof PublishError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
