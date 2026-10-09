import Link from "next/link";
import type { Metadata } from "next";
import InfoPage from "@/components/layout/InfoPage";

export const metadata: Metadata = {
  title: "Comment ça marche",
  description: "Des ateliers tunisiens vérifiés préparent les appareils, Bonétat les contrôle et les garantit, vous payez à la livraison.",
};

const STEPS = [
  ["Vous choisissez une configuration", "Modèle, état, stockage, couleur : chaque option affiche directement le prix que vous paierez. Le meilleur prix du moment s’affiche, parmi tous nos ateliers partenaires."],
  ["Bonétat vous appelle pour confirmer", "Le jour même, on confirme l’adresse et le créneau. Pas de compte à créer à l’avance, votre numéro suffit."],
  ["L’atelier prépare et expédie", "Emballage et bon de livraison Bonétat, expédition sous 24 h. Livraison en 2 à 4 jours ouvrés partout en Tunisie."],
  ["Vous vérifiez, puis vous payez", "Allumez l’appareil devant le livreur. Tout est conforme ? Vous payez en espèces. Sinon, vous refusez le colis."],
  ["12 mois de garantie Bonétat", "L’appareil apparaît dans « Mes appareils » avec sa garantie. Une panne ? Vous la déclarez en deux clics."],
];

export default function HowItWorksPage() {
  return (
    <InfoPage
      title="De l’atelier à votre porte."
      intro="Bonétat réunit des ateliers de réparation tunisiens triés sur le volet. Vous achetez à Bonétat : une seule grille d’état, une seule garantie, un seul service client."
    >
      <ol className="flex flex-col gap-4">
        {STEPS.map(([t, d], i) => (
          <li key={t} className="flex gap-5 rounded-[28px] border border-line bg-white p-6">
            <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-brand text-lg font-semibold text-white">{i + 1}</span>
            <div>
              <h2 className="text-lg font-semibold">{t}</h2>
              <p className="mt-1.5 max-w-[46em] text-[15px] leading-relaxed text-ink-soft">{d}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-3">
        <Link href="/catalog" className="btn-primary">Trouver un appareil</Link>
        <Link href="/vendor/apply" className="btn-secondary">Vous êtes un atelier ?</Link>
      </div>
    </InfoPage>
  );
}
