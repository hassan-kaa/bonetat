// Cleaning what a store writes before any buyer can see it. Safe on client and server.
// Stores are never shown to buyers, and their posts carry phone numbers, page links and
// "contactez-nous" lines: those must never reach an offer note or a spec.

const PHONE = /(\+?216[\s.-]?)?\b\d{2}[\s.-]?\d{3}[\s.-]?\d{3}\b/g;
const URL = /\b(https?:\/\/\S+|www\.\S+|\S+\.(com|tn|net|org|shop|store)\b\S*)/gi;
const HANDLE = /(^|\s)@[a-z0-9_.]{3,}/gi;
const CONTACT = /\b(tel|tél|téléphone|phone|whatsapp|viber|contact(ez)?(-nous)?|appel(ez)?|inbox|dm|mp)\b(\s*[:.])?(\s+(le|au|sur|nous|via)\b)?/gi;

/** Remove phone numbers, links, @handles and contact words; collapse what's left */
export function sanitizeSellerText(text: string): string {
  return text
    .replace(URL, " ")
    .replace(PHONE, " ")
    .replace(HANDLE, " ")
    .replace(CONTACT, " ")
    .replace(/[☎📞📱]/gu, " ")
    .replace(/\s*[-–—,;:]\s*(?=[-–—,;:]|$)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when the text still looks like it carries contact details (used to warn in moderation) */
export function hasContactDetails(text: string): boolean {
  return new RegExp(PHONE.source).test(text) || new RegExp(URL.source, "i").test(text);
}
