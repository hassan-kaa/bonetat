import Link from "next/link";
import type { Metadata } from "next";
import InfoPage from "@/components/layout/InfoPage";
import GradingContent from "@/components/grading/GradingContent";

export const metadata: Metadata = {
  title: "Les états Bonétat",
  description: "Quatre états, une seule grille appliquée par tous les ateliers partenaires : Comme neuf, Très bon, Bon, Correct. Batterie mesurée, IMEI vérifié.",
};

export default function GradingPage() {
  return (
    <InfoPage
      title="Quatre états, une seule grille."
      intro="Sur les réseaux sociaux, « très bon état » veut dire tout et son contraire. Chez Bonétat, chaque appareil est noté avec la même grille, quel que soit l’atelier qui l’a préparé. Ce que vous voyez sur la fiche est ce que vous recevez."
    >
      <GradingContent />
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-panel bg-brand p-8 text-white">
        <p className="max-w-[30em] text-xl font-medium leading-snug">Un état ne correspond pas à la fiche ? Retour gratuit sous 7 jours, et l’atelier perd des points de qualité.</p>
        <Link href="/catalog" className="inline-flex h-12 items-center rounded-control bg-white px-5 text-[15px] font-semibold text-brand-dark">Voir le catalogue</Link>
      </section>
    </InfoPage>
  );
}
