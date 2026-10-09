import Link from "next/link";
import type { Metadata } from "next";
import InfoPage from "@/components/layout/InfoPage";

export const metadata: Metadata = {
  title: "Garantie 12 mois et retours",
  description: "Chaque appareil Bonétat est garanti 12 mois, retour gratuit sous 7 jours, paiement à la livraison après vérification.",
};

const ITEMS = [
  {
    title: "Garantie Bonétat 12 mois",
    body: "Toute panne qui n’est pas due à une chute, un choc ou l’eau est couverte pendant 12 mois : réparation, remplacement par un appareil équivalent, ou remboursement. Vous déclarez la panne depuis « Mes appareils », Bonétat organise l’enlèvement.",
  },
  {
    title: "Retour gratuit sous 7 jours",
    body: "L’appareil ne vous convient pas, ou son état ne correspond pas à la fiche ? Renvoyez-le dans les 7 jours suivant la livraison, dans l’état où vous l’avez reçu. Vous êtes remboursé à réception.",
  },
  {
    title: "Vous vérifiez avant de payer",
    body: "Le paiement se fait au livreur. Allumez l’appareil, regardez l’écran, la batterie, les caméras. S’il y a un problème visible, refusez le colis : vous ne payez rien.",
  },
  {
    title: "Un seul interlocuteur",
    body: "L’appareil est préparé par un atelier partenaire, mais c’est Bonétat qui vous répond, qui gère la garantie et qui rembourse. Vous n’avez jamais à négocier avec un vendeur.",
  },
];

export default function GuaranteesPage() {
  return (
    <InfoPage
      title="Garanti 12 mois. Payé après vérification."
      intro="Acheter un appareil reconditionné ne devrait pas être un pari. Voici exactement ce qui vous protège, en clair."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {ITEMS.map((i) => (
          <section key={i.title} className="rounded-[28px] border border-line bg-white p-7">
            <h2 className="text-xl font-semibold">{i.title}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{i.body}</p>
          </section>
        ))}
      </div>
      <p className="text-[15px] text-ink-muted">
        Une question sur un achat ? <Link href="/contact" className="font-medium text-brand hover:underline">Contactez Bonétat</Link>
      </p>
    </InfoPage>
  );
}
