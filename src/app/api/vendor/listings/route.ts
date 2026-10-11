import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import { getVendorUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MIN_WARRANTY_MONTHS, batteryProblem } from "@/lib/catalog";
import { PublishError, ensureVariant } from "@/lib/listing-publish";
import { sanitizeSellerText } from "@/lib/seller-text";
import { specsFromExtraction } from "@/lib/listing-resolve";
import type { ListingExtraction } from "@/lib/listing-ai";
import { ensureFinishPhotos, ensureProductCover } from "@/lib/auto-photos";
import { addOfferPhotos } from "@/lib/offer-photos";
import { adminIds, notify } from "@/lib/notify";

const family = z.enum(["BLACK", "WHITE", "GREY", "SILVER", "GOLD", "BLUE", "GREEN", "PURPLE", "PINK", "RED", "YELLOW", "ORANGE", "OTHER"]);

const schema = z
  .object({
    /** An existing configuration… */
    variantId: z.string().optional(),
    /** …or a new one on this product (created on the fly, with a new color if needed) */
    config: z
      .object({
        productId: z.string(),
        storageGb: z.number().int().positive().max(16_000).nullable(),
        ramGb: z.number().int().positive().max(512).nullable(),
        option: z.string().trim().max(120).nullable(),
        finish: z.union([z.object({ id: z.string() }), z.object({ name: z.string().trim().min(1, "Indiquez la couleur").max(40), family })]),
      })
      .optional(),
    conditionGrade: z.enum(["COMME_NEUF", "TRES_BON", "BON", "CORRECT"]),
    batteryHealth: z.number().int().min(0).max(100).nullable(),
    imei: z.string().regex(/^\d{15}$/, "L’IMEI fait 15 chiffres (composez *#06#)").nullable().optional(),
    priceMillimes: z.number().int().positive().max(50_000_000),
    /** The shop's own warranty on this unit */
    warrantyMonths: z.number().int().min(MIN_WARRANTY_MONTHS, `Garantie de ${MIN_WARRANTY_MONTHS} mois minimum`).max(36),
    sellerNote: z.string().trim().max(200).nullable().optional(),
    /** The smart-listing draft this offer comes from, for tracking */
    draftId: z.string().optional(),
    /** Real photos of the unit (optional, 3 at most) */
    photos: z
      .array(z.object({ mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]), data: z.string().max(3_000_000, "Photo trop lourde") }))
      .max(3, "3 photos au plus")
      .optional(),
  })
  .refine((d) => d.variantId || d.config, { message: "Choisissez la configuration" });

/** A partner publishes one physical unit. It goes to moderation first. */
export async function POST(req: NextRequest) {
  const auth = await getVendorUser();
  if (!auth) return NextResponse.json({ error: "Compte partenaire non approuvé" }, { status: 403 });
  try {
    const data = schema.parse(await req.json());
    const offer = await prisma.$transaction(async (tx) => {
      const variant = data.variantId
        ? await tx.variant.findUnique({ where: { id: data.variantId } })
        : await ensureVariant(data.config!, tx);
      if (!variant) throw new PublishError("Configuration introuvable dans le catalogue");
      const product = await tx.product.findUniqueOrThrow({ where: { id: variant.productId } });
      if (product.status === "MERGED") throw new PublishError("Ce modèle a été fusionné : rechargez la page");

      // Battery is measured per unit, independent of the grade; one platform floor for all grades
      const problem = batteryProblem(product.kind, data.batteryHealth);
      if (problem) throw new PublishError(problem);
      if (product.kind === "PHONE" && !data.imei) throw new PublishError("L’IMEI est obligatoire pour un téléphone");

      const created = await tx.offer.create({
        data: {
          variantId: variant.id,
          vendorId: auth.vendor.id,
          conditionGrade: data.conditionGrade,
          batteryHealth: product.kind === "CONSOLE" ? null : data.batteryHealth,
          imei: data.imei ?? null,
          warrantyMonths: data.warrantyMonths,
          priceMillimes: data.priceMillimes,
          // Stores are hidden from buyers: no phone number or link ever reaches the note
          sellerNote: data.sellerNote ? sanitizeSellerText(data.sellerNote) || null : null,
          status: "PENDING_REVIEW",
        },
      });
      if (data.draftId) {
        const draft = await tx.listingDraft.findFirst({ where: { id: data.draftId, vendorId: auth.vendor.id } });
        if (draft) {
          await tx.listingDraft.update({ where: { id: draft.id }, data: { offerId: created.id } });
          // A model with no spec sheet yet gets the specs read from the post; an existing sheet is never overwritten
          const empty = !product.specsJson || (Array.isArray(product.specsJson) && product.specsJson.length === 0);
          const specs = draft.extracted ? specsFromExtraction(draft.extracted as unknown as ListingExtraction) : [];
          if (empty && specs.length) {
            await tx.product.update({ where: { id: product.id }, data: { specsJson: specs.map((s) => [s.label, s.value]) } });
          }
        }
      }
      return { ...created, finishId: variant.finishId, productId: product.id };
    });
    if (data.photos?.length) await addOfferPhotos(offer.id, data.photos);
    await notify(await adminIds(), { title: `Nouvelle offre à contrôler (${auth.vendor.storeName})`, href: "/admin/listings" });
    // After the answer is sent: fetch this color's official photos if it has none yet (no admin step)
    // and the model's cover if it has none
    after(async () => {
      try {
        console.info(`auto photos ${offer.finishId}: ${await ensureFinishPhotos(offer.finishId)}, cover: ${await ensureProductCover(offer.productId)}`);
      } catch (e) {
        console.error("auto photos", e);
      }
    });
    return NextResponse.json({ success: true, offerId: offer.id });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    if (err instanceof PublishError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
