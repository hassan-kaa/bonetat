import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
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
    const res = await r2.fetch(url, {
      method: "PUT",
      body: new Uint8Array(f.body),
      headers: { "Content-Type": f.contentType, "Cache-Control": CACHE_FOREVER },
    });
    if (!res.ok) throw new Error(`R2 upload failed for ${f.path}: ${res.status} ${await res.text()}`);
  }
}
