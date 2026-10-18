// Sends every image of public/media/ to the Cloudflare R2 bucket, under the same keys, so the site
// can serve them from R2 (NEXT_PUBLIC_IMAGE_BASE_URL) without re-importing anything.
// Safe to run again: keys are content-hashed, a re-upload writes the same bytes.
//   npm run media:upload
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { putFiles, type StoredFile } from "../src/lib/storage";

process.loadEnvFile();
if (process.env.STORAGE_DRIVER !== "r2") throw new Error("Set STORAGE_DRIVER=r2 and the R2_* variables in .env first");

const ROOT = path.join(process.cwd(), "public", "media");
const TYPES: Record<string, string> = { ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };
const PARALLEL = 8;

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (TYPES[path.extname(e.name).toLowerCase()]) out.push(p);
  }
  return out;
}

async function main() {
  const files = await walk(ROOT);
  console.log(`${files.length} images to send to the "${process.env.R2_BUCKET}" bucket`);
  let done = 0;
  let failed = 0;
  const queue = [...files];
  await Promise.all(
    Array.from({ length: PARALLEL }, async () => {
      for (let f = queue.shift(); f; f = queue.shift()) {
        const file: StoredFile = { path: path.relative(ROOT, f).split(path.sep).join("/"), body: await readFile(f), contentType: TYPES[path.extname(f).toLowerCase()] };
        try {
          await putFiles([file]);
        } catch (e) {
          failed++;
          console.error(`✗ ${file.path}: ${(e as Error).message}`);
        }
        if (++done % 200 === 0) console.log(`  ${done}/${files.length}`);
      }
    })
  );
  console.log(`✓ ${done - failed} sent${failed ? `, ${failed} failed (run again to retry)` : ""}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
