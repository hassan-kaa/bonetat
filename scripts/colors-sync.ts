// Colors and their official photos from Icecat, for models the catalog has no colors for.
//   npm run sync:colors -- --brand Samsung --kind WATCH
//   npm run sync:colors                          every model without colors
import type { DeviceKind } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { ensureColorsFromIcecat, ensureProductCover } from "../src/lib/auto-photos";

process.loadEnvFile();
const arg = (name: string) => process.argv[process.argv.indexOf(`--${name}`) + 1];

async function main() {
  const brand = process.argv.includes("--brand") ? arg("brand") : undefined;
  const kind = process.argv.includes("--kind") ? (arg("kind") as DeviceKind) : undefined;
  const products = await prisma.product.findMany({
    where: { status: { not: "MERGED" }, ...(brand ? { brand } : {}), ...(kind ? { kind } : {}), finishes: { none: { images: { some: { status: "APPROVED" } } } } },
    select: { id: true, model: true },
  });
  console.log(`${products.length} models without a color photo`);
  let photos = 0;
  for (const p of products) {
    photos += await ensureColorsFromIcecat(p.id, console.log);
    await ensureProductCover(p.id).catch(() => null);
  }
  console.log(`\n✓ ${photos} color photos added`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
