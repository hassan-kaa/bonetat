/* eslint-disable no-console */
// First setup of the production database from your local one: the catalog only, no demo data.
// Copies categories, brands and lines, every catalog model and color, the approved catalog photos (rows,
// plus their files into the production R2 bucket), and creates your admin account. Nothing else: no shops,
// buyers, orders, reviews, Icecat reference index, pending photos or sync history.
//
//   PROD_DATABASE_URL="<Neon direct url>" PROD_R2_BUCKET="bonetat-prod" ADMIN_PHONE="+216XXXXXXXX" npm run prod:setup
//
// Run `prisma db push` against Neon first. It is a first setup, never a sync: if production already has a
// catalog, the rows are left alone and only the files and the admin account are redone (both safe to repeat,
// so a run cut short by a file error can simply be run again). Your local database is only read.
import { PrismaClient } from "@prisma/client";
import { AwsClient } from "aws4fetch";
import { IMAGE_WIDTHS } from "../src/lib/image-url";

process.loadEnvFile();
const { PROD_DATABASE_URL, PROD_R2_BUCKET, ADMIN_PHONE, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;

function need(name: string, value: string | undefined): string {
  if (!value) throw new Error(`${name} is missing`);
  return value;
}

const local = new PrismaClient();
const prod = new PrismaClient({ datasourceUrl: need("PROD_DATABASE_URL", PROD_DATABASE_URL) });
const r2 = new AwsClient({ accessKeyId: need("R2_ACCESS_KEY_ID", R2_ACCESS_KEY_ID), secretAccessKey: need("R2_SECRET_ACCESS_KEY", R2_SECRET_ACCESS_KEY), service: "s3", region: "auto" });
const endpoint = `https://${need("R2_ACCOUNT_ID", R2_ACCOUNT_ID)}.r2.cloudflarestorage.com`;
const enc = (key: string) => key.split("/").map(encodeURIComponent).join("/");

/** Server-side copy inside R2 (no download): local bucket → production bucket */
async function copyFile(path: string): Promise<boolean> {
  const res = await r2.fetch(`${endpoint}/${PROD_R2_BUCKET}/${enc(path)}`, {
    method: "PUT",
    headers: { "x-amz-copy-source": `/${R2_BUCKET}/${enc(path)}`, "Content-Length": "0" },
  });
  if (res.ok) return true;
  const body = await res.text();
  // The source file isn't in the local bucket: counted, the run goes on. A missing BUCKET is an error.
  if (res.status === 404 && body.includes("NoSuchKey")) return false;
  throw new Error(`copy ${path}: ${res.status} ${body}`);
}

async function main() {
  const phone = need("ADMIN_PHONE", ADMIN_PHONE);
  if (!/^\+216\d{8}$/.test(phone)) throw new Error("ADMIN_PHONE must look like +216XXXXXXXX");
  need("PROD_R2_BUCKET", PROD_R2_BUCKET);
  if (PROD_R2_BUCKET === need("R2_BUCKET", R2_BUCKET)) throw new Error("PROD_R2_BUCKET must be a different bucket from your local one");
  const resume = (await prod.product.count()) > 0;

  const live = { status: { not: "MERGED" as const } };
  const categories = await local.category.findMany({ orderBy: { position: "asc" } });
  const brands = await local.brand.findMany();
  const lines = await local.productLine.findMany();
  const products = await local.product.findMany({ where: live });
  const finishes = await local.finish.findMany({ where: { product: live } });
  const images = await local.catalogImage.findMany({ where: { status: "APPROVED", product: live } });

  if (resume) console.log("Production already has its catalog: rows left as they are, files and admin only");
  else {
    console.log(`Copying ${categories.length} categories, ${brands.length} brands, ${lines.length} lines, ${products.length} models, ${finishes.length} colors, ${images.length} photos`);
    // Parents before children (categories reference each other)
    await prod.category.createMany({ data: categories.filter((c) => !c.parentId) });
    await prod.category.createMany({ data: categories.filter((c) => c.parentId) });
    await prod.brand.createMany({ data: brands });
    await prod.productLine.createMany({ data: lines });
    // Shops and the Icecat index don't exist in production: those links are dropped
    const rows = products.map((p) => ({ ...p, createdByVendorId: null, referenceId: null, mergedIntoId: null, specsJson: p.specsJson ?? undefined }));
    for (let i = 0; i < rows.length; i += 500) await prod.product.createMany({ data: rows.slice(i, i + 500) });
    for (let i = 0; i < finishes.length; i += 500) await prod.finish.createMany({ data: finishes.slice(i, i + 500) });
    for (let i = 0; i < images.length; i += 500) await prod.catalogImage.createMany({ data: images.slice(i, i + 500) });
  }

  // The photo files, every pre-built width, a few copies at a time
  const paths = [...new Set(images.map((i) => i.key))].flatMap((k) => IMAGE_WIDTHS.map((w) => `${k}-${w}.webp`));
  let done = 0;
  const missing: string[] = [];
  const queue = [...paths];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      for (let p = queue.shift(); p; p = queue.shift()) {
        if (!(await copyFile(p))) missing.push(p);
        if (++done % 500 === 0) console.log(`  ${done}/${paths.length} files`);
      }
    })
  );
  console.log(`  ${done}/${paths.length} files${missing.length ? `, ${missing.length} missing locally: ${missing.slice(0, 5).join(", ")}` : ""}`);

  await prod.user.upsert({ where: { phone }, update: { role: "ADMIN" }, create: { phone, name: "Admin Bonétat", role: "ADMIN" } });
  console.log(`✓ Production ready. Admin: ${phone}`);
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
