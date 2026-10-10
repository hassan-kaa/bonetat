import "server-only";
import type { ListingImage } from "./listing-ai";

// Best-effort reading of a public Facebook / Instagram post from its link: the same preview
// (title, text, image) a messaging app shows when the link is shared. Posts behind a login
// give nothing, and the store is asked for the text or a screenshot instead. No scraping.

const POST_HOSTS = ["facebook.com", "www.facebook.com", "m.facebook.com", "web.facebook.com", "fb.watch", "instagram.com", "www.instagram.com"];
const IMAGE_HOSTS = [/\.fbcdn\.net$/, /\.cdninstagram\.com$/];

export class PostLinkError extends Error {}

export function isSupportedPostLink(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && POST_HOSTS.includes(u.hostname);
  } catch {
    return false;
  }
}

const meta = (html: string, prop: string) =>
  html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)["']`, "i"))?.[1] ??
  html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${prop}["']`, "i"))?.[1] ??
  null;

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;|&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));

export async function readPostLink(raw: string): Promise<{ text: string; images: ListingImage[] }> {
  if (!isSupportedPostLink(raw)) throw new PostLinkError("Seuls les liens Facebook et Instagram sont acceptés");
  const res = await fetch(raw, {
    redirect: "follow",
    headers: { "Accept-Language": "fr-FR,fr;q=0.9", Accept: "text/html" },
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (!res?.ok) throw new PostLinkError("Publication inaccessible. Collez son texte ou ajoutez une capture d’écran.");
  // After redirects, still on Facebook or Instagram
  if (!isSupportedPostLink(res.url)) throw new PostLinkError("Publication privée ou réservée aux membres connectés. Collez son texte ou ajoutez une capture d’écran.");
  const html = (await res.text()).slice(0, 500_000);
  const text = [meta(html, "og:title"), meta(html, "og:description")].filter(Boolean).map((s) => decode(s!)).join("\n").trim();
  if (text.length < 15 || /log in|connectez-vous|se connecter/i.test(text)) {
    throw new PostLinkError("Publication privée ou réservée aux membres connectés. Collez son texte ou ajoutez une capture d’écran.");
  }

  const images: ListingImage[] = [];
  const imageUrl = meta(html, "og:image");
  if (imageUrl) {
    try {
      const u = new URL(decode(imageUrl));
      if (u.protocol === "https:" && IMAGE_HOSTS.some((re) => re.test(u.hostname))) {
        const img = await fetch(u, { signal: AbortSignal.timeout(10_000) });
        const type = img.headers.get("content-type") ?? "";
        const buf = Buffer.from(await img.arrayBuffer());
        if (img.ok && buf.length < 4_000_000 && /image\/(jpeg|png|webp)/.test(type)) {
          images.push({ mediaType: type.split(";")[0] as ListingImage["mediaType"], data: buf.toString("base64") });
        }
      }
    } catch {
      /* the text alone is enough */
    }
  }
  return { text, images };
}
