import Link from "next/link";
import type { Metadata } from "next";
import InfoPage from "@/components/layout/InfoPage";

export const metadata: Metadata = {
  title: "Comment ça marche",
  description: "Des ateliers tunisiens vérifiés par Bonétat vendent et garantissent leurs appareils. Bonétat contrôle chaque annonce, vous payez à la livraison.",
};

const STEPS = [
  ["Vous choisissez une configuration", "Modèle, état, stockage, couleur : chaque option affiche directement le prix. Quand plusieurs ateliers vendent le même appareil, vous comparez leur prix, leur batterie et leur garantie."],
  ["Bonétat vous appelle pour confirmer", "Le jour même, on confirme l’adresse et le créneau. Pas de compte à créer à l’avance, votre numéro suffit."],
  ["L’atelier prépare et expédie", "Emballage et bon de livraison Bonétat, expédition sous 24 h. Livraison en 2 à 4 jours ouvrés partout en Tunisie."],
  ["Vous vérifiez, puis vous payez", "Allumez l’appareil devant le livreur. Tout est conforme ? Vous payez en espèces. Sinon, vous refusez le colis."],
  ["L’atelier le garantit", "4 mois minimum, durée affichée sur l’offre. Une panne ? Déclarez-la à Bonétat : on transmet à l’atelier et on suit sa réponse."],
];

export default function HowItWorksPage() {
  return (
    <InfoPage
      title="De l’atelier à votre porte."
      intro="Bonétat réunit des ateliers de réparation tunisiens triés sur le volet. Chaque atelier vend et garantit ses appareils ; Bonétat vérifie les ateliers, contrôle chaque annonce et suit vos demandes."
    >
      <ol className="flex flex-col gap-4">
        {STEPS.map(([t, d], i) => (
          <li key={t} className="flex gap-5 rounded-panel border border-line bg-white p-6">
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
