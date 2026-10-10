import type { NextConfig } from "next";

// Images are pre-sized and served from our own storage (see src/lib/image-url.ts),
// so the Next.js optimizer only ever needs our image host. Never allow "**":
// that turns the optimizer into a free proxy for any site on the internet.
// (In dev the base is a local path, /media, so there is no remote host to allow.)
const base = process.env.NEXT_PUBLIC_IMAGE_BASE_URL ?? "";
const imageHost = /^https?:\/\//.test(base) ? new URL(base).hostname : null;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: imageHost ? [{ protocol: "https", hostname: imageHost }] : [],
  },
};

export default nextConfig;
