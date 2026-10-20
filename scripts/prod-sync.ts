/* eslint-disable no-console */
// Push what the local catalog workshop added to production: new models, their colors, their approved photos
// and the photo files (copied inside R2 into the production bucket). ADDS ONLY: nothing in production is
// changed or deleted, so edits made on the live admin are safe. Safe to rerun after every sync session.
//
//   PROD_DATABASE_URL="<Neon direct url>" PROD_R2_BUCKET="bonetat-prod" npm run prod:sync [-- --dry-run]
//
// Matches by identity, not by id: a model by its canonical key, a color by (model, slug), a photo by
// (model, color, file). Deletions made locally are NOT propagated (delete on the live admin instead).
import { PrismaClient } from "@prisma/client";
import { AwsClient } from "aws4fetch";
import { IMAGE_WIDTHS } from "../src/lib/image-url";

process.loadEnvFile();
const { PROD_DATABASE_URL, PROD_R2_BUCKET, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
const DRY = process.argv.includes("--dry-run");

function need(name: string, value: string | undefined): string {
  if (!value) throw new Error(`${name} is missing`);
  return value;
}

const local = new PrismaClient();
const prod = new PrismaClient({ datasourceUrl: need("PROD_DATABASE_URL", PROD_DATABASE_URL) });
const r2 = new AwsClient({ accessKeyId: need("R2_ACCESS_KEY_ID", R2_ACCESS_KEY_ID), secretAccessKey: need("R2_SECRET_ACCESS_KEY", R2_SECRET_ACCESS_KEY), service: "s3", region: "auto" });
const endpoint = `https://${need("R2_ACCOUNT_ID", R2_ACCOUNT_ID)}.r2.cloudflarestorage.com`;
const enc = (key: string) => key.split("/").map(encodeURIComponent).join("/");

/** Server-side copy inside R2: local bucket → production bucket. A file missing locally is counted, not fatal. */
async function copyFile(path: string): Promise<boolean> {
  const res = await r2.fetch(`${endpoint}/${PROD_R2_BUCKET}/${enc(path)}`, {
    method: "PUT",
    headers: { "x-amz-copy-source": `/${R2_BUCKET}/${enc(path)}`, "Content-Length": "0" },
  });
  if (res.ok) return true;
  const body = await res.text();
  if (res.status === 404 && body.includes("NoSuchKey")) return false;
  throw new Error(`copy ${path}: ${res.status} ${body}`);
}

async function main() {
  if (need("PROD_R2_BUCKET", PROD_R2_BUCKET) === need("R2_BUCKET", R2_BUCKET)) throw new Error("PROD_R2_BUCKET must be a different bucket from your local one");
  if (!(await prod.category.count())) throw new Error("Production has no catalog yet: run npm run prod:setup first");
  const live = { status: { not: "MERGED" as const } };

  // 1. Lines (a new model may bring a new line)
  const brandsProd = new Map((await prod.brand.findMany()).map((b) => [b.name, b.id]));
  const brandsLocal = new Map((await local.brand.findMany()).map((b) => [b.id, b.name]));
  const linesProd = new Set((await prod.productLine.findMany()).map((l) => `${l.brandId}|${l.slug}`));
  const newLines = (await local.productLine.findMany())
    .map((l) => ({ ...l, brandId: brandsProd.get(brandsLocal.get(l.brandId) ?? "") }))
    .filter((l): l is typeof l & { brandId: string } => !!l.brandId && !linesProd.has(`${l.brandId}|${l.slug}`));

  // 2. Models, by canonical key
  const prodProducts = new Map((await prod.product.findMany({ select: { id: true, canonicalKey: true } })).map((p) => [p.canonicalKey, p.id]));
  const prodSlugs = new Set((await prod.product.findMany({ select: { slug: true } })).map((p) => p.slug));
  const categoriesProd = new Map((await prod.category.findMany()).map((c) => [c.slug, c.id]));
  const categoriesLocal = new Map((await local.category.findMany()).map((c) => [c.id, c.slug]));
  const localProducts = await local.product.findMany({ where: live });
  const newProducts = localProducts
    .filter((p) => !prodProducts.has(p.canonicalKey))
    .map((p) => {
      let slug = p.slug;
      for (let i = 2; prodSlugs.has(slug); i++) slug = `${p.slug}-${i}`;
      prodSlugs.add(slug);
      return { ...p, slug, categoryId: categoriesProd.get(categoriesLocal.get(p.categoryId) ?? "") ?? "", createdByVendorId: null, referenceId: null, mergedIntoId: null, specsJson: p.specsJson ?? undefined };
    })
    .filter((p) => p.categoryId);
  console.log(`${newLines.length} lines, ${newProducts.length} models to add`);
  if (!DRY) {
    for (let i = 0; i < newLines.length; i += 500) await prod.productLine.createMany({ data: newLines.slice(i, i + 500), skipDuplicates: true });
    for (let i = 0; i < newProducts.length; i += 500) await prod.product.createMany({ data: newProducts.slice(i, i + 500), skipDuplicates: true });
  }
  // local product id → production product id
  const productMap = new Map<string, string>();
  for (const p of localProducts) {
    const id = prodProducts.get(p.canonicalKey) ?? (newProducts.some((n) => n.id === p.id) ? p.id : undefined);
    if (id) productMap.set(p.id, id);
  }

  // 3. Colors, by (model, slug)
  const prodFinishes = new Map((await prod.finish.findMany({ select: { id: true, productId: true, slug: true } })).map((f) => [`${f.productId}|${f.slug}`, f.id]));
  const localFinishes = await local.finish.findMany({ where: { product: live } });
  const newFinishes = localFinishes
    .filter((f) => productMap.has(f.productId) && !prodFinishes.has(`${productMap.get(f.productId)}|${f.slug}`))
    .map((f) => ({ ...f, productId: productMap.get(f.productId)!, icecatId: null, icecatMatch: null }));
  console.log(`${newFinishes.length} colors to add`);
  if (!DRY) for (let i = 0; i < newFinishes.length; i += 500) await prod.finish.createMany({ data: newFinishes.slice(i, i + 500), skipDuplicates: true });
  const finishMap = new Map<string, string>();
  for (const f of localFinishes) {
    const pid = productMap.get(f.productId);
    const id = pid ? prodFinishes.get(`${pid}|${f.slug}`) ?? (newFinishes.some((n) => n.id === f.id) ? f.id : undefined) : undefined;
    if (id) finishMap.set(f.id, id);
  }

  // 4. Approved photos, by (model, color, file); a slot production already filled is left alone
  const prodImages = await prod.catalogImage.findMany({ select: { productId: true, finishId: true, key: true, angle: true, status: true } });
  const have = new Set(prodImages.map((i) => `${i.productId}|${i.finishId ?? ""}|${i.key}`));
  const filled = new Set(prodImages.filter((i) => i.status === "APPROVED").map((i) => `${i.productId}|${i.finishId ?? ""}|${i.angle}`));
  const localImages = await local.catalogImage.findMany({ where: { status: "APPROVED", product: live } });
  const newImages = localImages
    .map((img) => {
      const productId = productMap.get(img.productId);
      const finishId = img.finishId ? finishMap.get(img.finishId) : null;
      if (!productId || finishId === undefined) return null;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...rest } = img;
      return { ...rest, productId, finishId };
    })
    .filter((i): i is NonNullable<typeof i> => !!i && !have.has(`${i.productId}|${i.finishId ?? ""}|${i.key}`) && !filled.has(`${i.productId}|${i.finishId ?? ""}|${i.angle}`));
  const files = [...new Set(newImages.map((i) => i.key))].flatMap((k) => IMAGE_WIDTHS.map((w) => `${k}-${w}.webp`));
  console.log(`${newImages.length} photos to add (${files.length} files)`);
  if (DRY) {
    console.log("Dry run: nothing written");
    return;
  }

  // Files first, rows after: a row never points to a file production doesn't have
  let done = 0;
  const missing = new Set<string>();
  const queue = [...files];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      for (let p = queue.shift(); p; p = queue.shift()) {
        if (!(await copyFile(p))) missing.add(p.replace(/-\d+\.webp$/, ""));
        if (++done % 500 === 0) console.log(`  ${done}/${files.length} files`);
      }
    })
  );
  const rows = newImages.filter((i) => !missing.has(i.key));
  for (let i = 0; i < rows.length; i += 500) await prod.catalogImage.createMany({ data: rows.slice(i, i + 500) });
  console.log(`✓ ${newProducts.length} models, ${newFinishes.length} colors, ${rows.length} photos added${missing.size ? ` (${missing.size} files missing locally, skipped)` : ""}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await local.$disconnect();
    await prod.$disconnect();
  });
