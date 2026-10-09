import Link from "next/link";
import type { Metadata } from "next";
import { BatteryCharging, ScanSearch, ShieldCheck, Smartphone } from "lucide-react";
import InfoPage from "@/components/layout/InfoPage";
import { GRADES, GRADE_ORDER } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Les états Bonétat",
  description: "Quatre états, une seule grille appliquée par tous les ateliers partenaires : Comme neuf, Très bon, Bon, Correct. Batterie mesurée, IMEI vérifié.",
};

const CHECKS = [
  { Icon: Smartphone, title: "Aspect", desc: "Écran, contour, dos et caméras examinés à 20 cm, sous la même lumière, avec les mêmes critères pour tous les ateliers." },
  { Icon: BatteryCharging, title: "Batterie mesurée", desc: "La capacité réelle est relevée et affichée sur la fiche. Chaque état impose un minimum." },
  { Icon: ScanSearch, title: "32 points testés", desc: "Appels, Wi-Fi, Bluetooth, capteurs, boutons, haut-parleurs, micros, Face ID ou Touch ID, caméras." },
  { Icon: ShieldCheck, title: "IMEI et données", desc: "Numéro vérifié ni volé ni bloqué. Données de l’ancien propriétaire effacées." },
];

export default function GradingPage() {
  return (
    <InfoPage
      title="Quatre états, une seule grille."
      intro="Sur les réseaux sociaux, « très bon état » veut dire tout et son contraire. Chez Bonétat, chaque appareil est noté avec la même grille, quel que soit l’atelier qui l’a préparé. Ce que vous voyez sur la fiche est ce que vous recevez."
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
        {[...GRADE_ORDER].map((g) => (
          <section key={g} className="flex flex-col gap-3 rounded-[28px] border border-line bg-white p-6">
            <span className="meter w-[72px]">{[1, 2, 3, 4].map((i) => <span key={i} data-on={i <= GRADES[g].level} />)}</span>
            <h2 className="text-[22px] font-semibold">{GRADES[g].label}</h2>
            <p className="text-sm leading-relaxed text-ink-soft">{GRADES[g].description}</p>
            <ul className="mt-auto flex flex-col gap-1.5 border-t border-line-soft pt-3 text-sm">
              {GRADES[g].criteria.map((c) => <li key={c}>{c}</li>)}
            </ul>
          </section>
        ))}
      </div>
      <section>
        <h2 className="section-title mb-5">Ce qu’on vérifie sur chaque appareil</h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
          {CHECKS.map(({ Icon, title, desc }) => (
            <div key={title} className="rounded-[24px] bg-white p-6 ring-1 ring-line">
              <Icon className="h-7 w-7 text-brand" aria-hidden="true" />
              <h3 className="mb-1.5 mt-4 text-lg font-semibold">{title}</h3>
              <p className="text-sm leading-relaxed text-ink-muted">{desc}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-[32px] bg-brand p-8 text-white">
        <p className="max-w-[30em] text-xl font-medium leading-snug">Un état ne correspond pas à la fiche ? Retour gratuit sous 7 jours, et l’atelier perd des points de qualité.</p>
        <Link href="/catalog" className="inline-flex h-12 items-center rounded-[14px] bg-white px-5 text-[15px] font-semibold text-brand">Voir le catalogue</Link>
      </section>
    </InfoPage>
  );
}
