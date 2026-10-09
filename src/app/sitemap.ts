import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SELLABLE } from "@/lib/queries";
import { imageUrl } from "@/lib/image-url";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/catalog`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${BASE_URL}/grading`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/comment-ca-marche`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/garanties`, changeFrequency: "monthly", priority: 0.5 },
  ];

  let devices: { slug: string; updatedAt: Date; finishes: { images: { key: string }[] }[] }[] = [];
  try {
    devices = await prisma.product.findMany({
      where: { variants: { some: { offers: { some: SELLABLE } } } },
      select: {
        slug: true,
        updatedAt: true,
        finishes: { select: { images: { where: { status: "APPROVED", angle: "FRONT" }, orderBy: { position: "asc" }, take: 1, select: { key: true } } } },
      },
    });
  } catch {
    // DB unavailable (e.g. at build time) — fall back to static pages only
  }

  return [
    ...staticPages,
    ...devices.map((d) => ({
      url: `${BASE_URL}/products/${d.slug}`,
      lastModified: d.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
      images: d.finishes.flatMap((f) => f.images.map((i) => imageUrl(i.key))),
    })),
  ];
}
