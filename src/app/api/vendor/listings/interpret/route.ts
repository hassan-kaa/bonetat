import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getVendorUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ListingAiError, interpretListing } from "@/lib/listing-ai";
import { resolveListing } from "@/lib/listing-resolve";
import { PostLinkError, readPostLink } from "@/lib/post-link";

const DAILY_LIMIT = 30;

const schema = z
  .object({
    text: z.string().max(4000, "Annonce trop longue (4 000 caractères au plus)").optional(),
    link: z.string().url("Lien invalide").optional(),
    images: z
      .array(z.object({ mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]), data: z.string().max(3_000_000, "Capture trop lourde") }))
      .max(3, "3 captures au plus")
      .optional(),
  })
  .refine((d) => d.text?.trim() || d.link || d.images?.length, { message: "Collez votre annonce, un lien ou une capture" });

// Reading a post takes a few seconds
export const maxDuration = 30;

/** Read a store's post (text, screenshots or link) into a pre-filled publish form. Publishes nothing. */
export async function POST(req: NextRequest) {
  const auth = await getVendorUser();
  if (!auth) return NextResponse.json({ error: "Compte partenaire non approuvé" }, { status: 403 });
  try {
    const data = schema.parse(await req.json());
    const today = await prisma.listingDraft.count({
      where: { vendorId: auth.vendor.id, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
    if (today >= DAILY_LIMIT) {
      return NextResponse.json({ error: `Limite de ${DAILY_LIMIT} analyses par jour atteinte. Le formulaire manuel reste disponible.` }, { status: 429 });
    }

    let text = data.text?.trim() ?? "";
    let images = data.images ?? [];
    if (data.link) {
      const post = await readPostLink(data.link);
      text = [text, post.text].filter(Boolean).join("\n");
      images = [...images, ...post.images].slice(0, 3);
    }

    const ai = await interpretListing({ text, images });
    const resolved = await resolveListing(ai.extraction);
    const draft = await prisma.listingDraft.create({
      data: {
        vendorId: auth.vendor.id,
        source: data.link ? "link" : images.length && !text ? "screenshot" : "paste",
        input: data.link ?? text.slice(0, 4000),
        extracted: ai.extraction,
        inputTokens: ai.inputTokens,
        outputTokens: ai.outputTokens,
      },
    });
    return NextResponse.json({ draftId: draft.id, resolved });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    if (err instanceof PostLinkError || err instanceof ListingAiError) return NextResponse.json({ error: err.message }, { status: 422 });
    console.error(err);
    return NextResponse.json({ error: "Analyse impossible pour le moment. Remplissez le formulaire à la main." }, { status: 500 });
  }
}
