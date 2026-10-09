// Where catalog and unit photos are served from. Safe to import from client and server.
//
// Every image is resized ONCE when it is imported or uploaded, into these widths,
// and stored as <key>-<width>.webp on our own storage (Cloudflare R2 behind a CDN).
// Keys are content-hashed, so a stored file never changes and is cached forever.
// We never ask Next.js to resize on the fly: free on any host, nothing billed per transform.
import type { ImageLoader } from "next/image";

export const IMAGE_WIDTHS = [400, 800, 1600] as const;

const BASE = (process.env.NEXT_PUBLIC_IMAGE_BASE_URL ?? "").replace(/\/$/, "");

/** Public URL of a stored image at the smallest pre-built width that covers `width` */
export function imageUrl(key: string, width: number = 1600): string {
  const w = IMAGE_WIDTHS.find((x) => x >= width) ?? IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1];
  return `${BASE}/${key}-${w}.webp`;
}

/** next/image loader: pass the storage key as `src` */
export const storedImageLoader: ImageLoader = ({ src, width }) => imageUrl(src, width);
