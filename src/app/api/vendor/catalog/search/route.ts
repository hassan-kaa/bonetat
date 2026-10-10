import { NextRequest, NextResponse } from "next/server";
import { getVendorUser } from "@/lib/auth";
import { searchCatalog } from "@/lib/catalog-search";

/** Model search while a store types. The catalog is complete in advance: this is the whole catalog. */
export async function GET(req: NextRequest) {
  if (!(await getVendorUser())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  const brand = req.nextUrl.searchParams.get("brand") || null;
  const hits = await searchCatalog(q, { brand, limit: 12 });
  return NextResponse.json({ catalog: hits.map((h) => ({ productId: h.productId, label: h.label, kind: h.kind })) });
}
