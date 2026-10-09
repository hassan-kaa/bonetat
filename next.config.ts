import type { NextConfig } from "next";

// Images are pre-sized and served from our own storage (see src/lib/image-url.ts),
// so the Next.js optimizer only ever needs our image host. Never allow "**":
// that turns the optimizer into a free proxy for any site on the internet.
const imageHost = process.env.NEXT_PUBLIC_IMAGE_BASE_URL ? new URL(process.env.NEXT_PUBLIC_IMAGE_BASE_URL).hostname : null;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: imageHost ? [{ protocol: "https", hostname: imageHost }] : [],
  },
};

export default nextConfig;
