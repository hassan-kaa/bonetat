import "server-only";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { IMAGE_WIDTHS } from "./image-url";
import path from "node:path";
import { AwsClient } from "aws4fetch";

// Where image files are written. Two drivers, picked by STORAGE_DRIVER:
//   local (default): public/media/<path>, served by Next at /media/<path>. Dev only.
//   r2:              Cloudflare R2 bucket (S3 API), served from NEXT_PUBLIC_IMAGE_BASE_URL.
// Keys are content-hashed, so a file is never overwritten with different bytes:
// every file can be cached forever.

export type StoredFile = { path: string; body: Buffer; contentType: string };

const CACHE_FOREVER = "public, max-age=31536000, immutable";

export async function putFiles(files: StoredFile[]): Promise<void> {
  if ((process.env.STORAGE_DRIVER ?? "local") === "r2") return putR2(files);
  return putLocal(files);
}

async function putLocal(files: StoredFile[]) {
  const root = path.join(process.cwd(), "public", "media");
  for (const f of files) {
    const target = path.join(root, f.path);
    if (!target.startsWith(root + path.sep)) throw new Error(`Invalid storage path: ${f.path}`);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, f.body);
  }
}

let r2: AwsClient | null = null;

function r2Url(filePath: string) {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    throw new Error("STORAGE_DRIVER=r2 needs R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET");
  }
  r2 ??= new AwsClient({ accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, service: "s3", region: "auto" });
  return { client: r2, url: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}/${filePath.split("/").map(encodeURIComponent).join("/")}` };
}

async function putR2(files: StoredFile[]) {
  for (const f of files) {
    const { client: r2, url } = r2Url(f.path);
    // R2 refuses an upload without a length, and Next's patched fetch may stream the body without one
    // (411 MissingContentLength): a plain ArrayBuffer plus an explicit Content-Length works in both runtimes.
    const body = f.body.buffer.slice(f.body.byteOffset, f.body.byteOffset + f.body.byteLength) as ArrayBuffer;
    const res = await r2.fetch(url, {
      method: "PUT",
      body,
      headers: { "Content-Type": f.contentType, "Cache-Control": CACHE_FOREVER, "Content-Length": String(body.byteLength) },
    });
    if (!res.ok) throw new Error(`R2 upload failed for ${f.path}: ${res.status} ${await res.text()}`);
  }
}

/**
 * Deletes a stored image in every width (key without size suffix). Missing files are fine:
 * deleting twice, or a key that was never uploaded, is not an error.
 */
export async function deleteImage(key: string): Promise<void> {
  const paths = IMAGE_WIDTHS.map((w) => `${key}-${w}.webp`);
  if ((process.env.STORAGE_DRIVER ?? "local") === "r2") {
    for (const p of paths) {
      const { client, url } = r2Url(p);
      const res = await client.fetch(url, { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error(`R2 delete failed for ${p}: ${res.status}`);
    }
    return;
  }
  const root = path.join(process.cwd(), "public", "media");
  for (const p of paths) {
    const target = path.join(root, p);
    if (target.startsWith(root + path.sep)) await rm(target, { force: true });
  }
}
