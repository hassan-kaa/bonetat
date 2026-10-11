import Link from "next/link";
import type { Metadata } from "next";
import InfoPage from "@/components/layout/InfoPage";

export const metadata: Metadata = {
  title: "Garanties et retours",
  description: "Chaque appareil est garanti par l’atelier qui le vend, 4 mois minimum. Paiement à la livraison après vérification, et Bonétat suit chaque demande.",
};

const ITEMS = [
  {
    title: "Garanti par l’atelier, 4 mois minimum",
    body: "Chaque appareil est garanti par l’atelier qui le vend. La durée est affichée sur l’offre avant l’achat : 4 mois au minimum, souvent plus. Elle apparaît ensuite dans « Mes appareils », avec sa date de fin.",
  },
  {
    title: "Retours selon l’atelier",
    body: "Chaque atelier gère ses retours. Un état qui ne correspond pas à la fiche, un problème à la réception : signalez-le, l’atelier vous propose une solution.",
  },
  {
    title: "Vous vérifiez avant de payer",
    body: "Le paiement se fait au livreur. Allumez l’appareil, regardez l’écran, la batterie, les caméras. S’il y a un problème visible, refusez le colis : vous ne payez rien.",
  },
  {
    title: "Bonétat suit votre demande",
    body: "Écrivez d’abord à Bonétat : on transmet votre demande à l’atelier et on suit sa réponse jusqu’au bout. Vous pouvez aussi contacter l’atelier directement. Un atelier qui ne tient pas ses engagements perd sa place sur Bonétat.",
  },
];

export default function GuaranteesPage() {
  return (
    <InfoPage
      title="Garanti par l’atelier. Payé après vérification."
      intro="Bonétat n’accepte que des ateliers vérifiés et contrôle chaque annonce avant sa mise en ligne. Voici exactement ce qui vous protège, en clair."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {ITEMS.map((i) => (
          <section key={i.title} className="rounded-panel border border-line bg-white p-7">
            <h2 className="text-xl font-semibold">{i.title}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{i.body}</p>
          </section>
        ))}
      </div>
      <p className="text-[15px] text-ink-muted">
        Une question sur un achat ? <Link href="/contact" className="font-medium text-brand-dark hover:underline">Contactez Bonétat</Link>
      </p>
    </InfoPage>
  );
}
