import { NextRequest, NextResponse } from "next/server";
import { runDeletions } from "@/lib/catalog-photos";
import { sweepOfferPhotos } from "@/lib/offer-photos";

// The daily photo lifecycle job in production (same work as `npm run media:cleanup`), called by Vercel Cron
// (vercel.json). Vercel sends "Authorization: Bearer <CRON_SECRET>"; anyone else gets a 401.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const log: string[] = [];
  await sweepOfferPhotos((m) => log.push(m));
  const { deleted, kept } = await runDeletions((m) => log.push(m));
  return NextResponse.json({ deleted, kept, log });
}
