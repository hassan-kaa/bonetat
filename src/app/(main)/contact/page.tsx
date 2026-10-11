import type { Metadata } from "next";
import { Mail, MessageCircle, Phone } from "lucide-react";
import InfoPage from "@/components/layout/InfoPage";

export const metadata: Metadata = { title: "Contact" };

// Replace with the real support line before launch
const WHATSAPP = "21600000000";
const PHONE = "+216 00 000 000";
const EMAIL = "aide@bonetat.tn";

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ sujet?: string; commande?: string }> }) {
  const { sujet, commande } = await searchParams;
  const warranty = sujet === "panne";
  const message = warranty
    ? `Bonjour Bonétat, je déclare une panne sous garantie${commande ? ` pour la commande ${commande}` : ""}. Le problème : `
    : `Bonjour Bonétat, ${commande ? `à propos de la commande ${commande} : ` : ""}`;
  const wa = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`;

  return (
    <InfoPage
      title={warranty ? "Déclarer une panne" : "Parlez à Bonétat"}
      intro={
        warranty
          ? `Décrivez ce qui ne marche pas${commande ? ` (commande ${commande})` : ""}. On vous répond dans la journée, on transmet à l’atelier qui a vendu l’appareil et on suit sa réponse.`
          : "Une question avant d’acheter, un suivi de commande, une garantie : écrivez-nous, du lundi au samedi de 9 h à 19 h. Pour la garantie et les retours, on transmet à l’atelier et on suit sa réponse."
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <a href={wa} target="_blank" rel="noopener noreferrer" className="flex flex-col gap-3 rounded-panel bg-brand p-7 text-white transition hover:-translate-y-1 hover:shadow-lift">
          <MessageCircle className="h-8 w-8" aria-hidden="true" />
          <b className="text-xl font-semibold">WhatsApp</b>
          <span className="text-white/85">Le plus rapide. Message prérempli{commande ? " avec votre commande" : ""}.</span>
        </a>
        <a href={`tel:${PHONE.replace(/\s/g, "")}`} className="flex flex-col gap-3 rounded-panel border border-line bg-white p-7 transition hover:border-line-strong">
          <Phone className="h-8 w-8 text-brand-dark" aria-hidden="true" />
          <b className="text-xl font-semibold">{PHONE}</b>
          <span className="text-ink-muted">Lundi au samedi, 9 h à 19 h</span>
        </a>
        <a href={`mailto:${EMAIL}?subject=${encodeURIComponent(warranty ? `Panne sous garantie ${commande ?? ""}` : "Question")}`} className="flex flex-col gap-3 rounded-panel border border-line bg-white p-7 transition hover:border-line-strong">
          <Mail className="h-8 w-8 text-brand-dark" aria-hidden="true" />
          <b className="text-xl font-semibold">{EMAIL}</b>
          <span className="text-ink-muted">Réponse sous 24 h</span>
        </a>
      </div>
    </InfoPage>
  );
}
