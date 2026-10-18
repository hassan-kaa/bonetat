// Icecat coverage report, and the clean-up of photos that are not the brand's own:
//   • every Icecat photo of an iPhone (Apple doesn't publish on Icecat: those come from refurbishers)
//   • every photo taken from a refurbisher's listing (title says refurbished, or names a refurbisher)
//   • recovered covers whose likely source (the listing the old code picked) is a refurbisher's
// Rejected photos leave the site at once, are never re-imported, files deleted by `npm run media:cleanup`.
//   npm run icecat:audit            report only
//   npm run icecat:audit -- --apply report, then reject
import { prisma } from "../src/lib/prisma";
import { cachedIcecatProduct } from "../src/lib/icecat-index";
import { referenceEntriesForModel } from "../src/lib/reference-catalog";
import { isRefurbished } from "../src/lib/icecat-match";
import { rejectCatalogImage } from "../src/lib/catalog-photos";

process.loadEnvFile();
const apply = process.argv.includes("--apply");

async function coverage(label: string) {
  const rows = await prisma.product.findMany({
    where: { status: { not: "MERGED" } },
    select: { brand: true, kind: true, images: { where: { status: "APPROVED" }, select: { finishId: true } } },
  });
  const by = new Map<string, { total: number; photo: number }>();
  for (const r of rows) {
    for (const k of [`kind ${r.kind}`, `brand ${r.brand}`]) {
      const e = by.get(k) ?? { total: 0, photo: 0 };
      e.total++;
      if (r.images.length) e.photo++;
      by.set(k, e);
    }
  }
  const withPhoto = rows.filter((r) => r.images.length).length;
  console.log(`\n■ Coverage ${label}: ${withPhoto}/${rows.length} models have an official photo (${Math.round((withPhoto / rows.length) * 100)} %)`);
  const line = ([k, e]: [string, { total: number; photo: number }]) => `  ${k.padEnd(22)} ${String(e.photo).padStart(4)}/${String(e.total).padEnd(4)} ${Math.round((e.photo / e.total) * 100)} %`;
  console.log([...by].filter(([k]) => k.startsWith("kind")).sort((a, b) => b[1].total - a[1].total).map(line).join("\n"));
  console.log([...by].filter(([k]) => k.startsWith("brand")).sort((a, b) => b[1].total - a[1].total).slice(0, 16).map(line).join("\n"));
}

/** The listing the old cover code would have picked: first reference entry with an image, no filter */
async function likelyCoverSource(brand: string, model: string) {
  for (const ref of await referenceEntriesForModel(brand, model, 8)) {
    try {
      const entry = await cachedIcecatProduct(ref.icecatId);
      if (entry.images[0]) return entry;
    } catch {
      /* restricted entry */
    }
  }
  return null;
}

async function main() {
  await coverage("before");

  const icecat = await prisma.catalogImage.findMany({
    where: { source: "ICECAT", status: { not: "REJECTED" } },
    select: { id: true, sourceRef: true, finishId: true, product: { select: { brand: true, kind: true, model: true } } },
  });
  const doomed = new Map<string, string>();

  for (const img of icecat) {
    const p = img.product;
    if (p.brand === "Apple" && p.kind === "PHONE") {
      doomed.set(img.id, "iPhone : Icecat n’a pas de photo officielle Apple");
      continue;
    }
    const id = img.sourceRef?.match(/^icecat:(\d+)/)?.[1];
    if (id) {
      try {
        const entry = await cachedIcecatProduct(Number(id));
        if (isRefurbished(entry.title)) doomed.set(img.id, `annonce de reconditionneur : ${entry.title.slice(0, 80)}`);
      } catch {
        /* entry gone: keep */
      }
    } else if (img.sourceRef === "recovered cover") {
      const entry = await likelyCoverSource(p.brand, p.model);
      if (entry && isRefurbished(entry.title)) doomed.set(img.id, `couverture probablement issue d’un reconditionneur : ${entry.title.slice(0, 80)}`);
    }
  }

  const reasons = new Map<string, number>();
  for (const r of doomed.values()) {
    const kind = r.split(" :")[0];
    reasons.set(kind, (reasons.get(kind) ?? 0) + 1);
  }
  console.log(`\n■ ${icecat.length} Icecat photos checked, ${doomed.size} not official:`);
  for (const [k, n] of reasons) console.log(`  ${n} × ${k}`);

  if (apply) {
    for (const [id, reason] of doomed) await rejectCatalogImage(id, reason);
    console.log(`✓ ${doomed.size} rejected (off the site, never re-imported)`);
    await coverage("after the clean-up");
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
