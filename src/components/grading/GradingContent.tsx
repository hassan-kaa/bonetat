import type { ConditionGrade } from "@prisma/client";
import { BatteryCharging, ScanSearch, ShieldCheck, Smartphone } from "lucide-react";
import { GRADES, GRADE_ORDER } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const CHECKS = [
  { Icon: Smartphone, title: "Aspect", desc: "Écran, contour, dos et caméras examinés à 20 cm, sous la même lumière, avec les mêmes critères pour tous les ateliers." },
  { Icon: BatteryCharging, title: "Batterie mesurée", desc: "La capacité réelle est relevée et affichée sur la fiche de chaque appareil, indépendamment de l’état. Jamais sous 75 % : en dessous, la batterie est remplacée avant la mise en vente." },
  { Icon: ScanSearch, title: "32 points testés", desc: "Appels, Wi-Fi, Bluetooth, capteurs, boutons, haut-parleurs, micros, Face ID ou Touch ID, caméras." },
  { Icon: ShieldCheck, title: "IMEI et données", desc: "Numéro vérifié ni volé ni bloqué. Données de l’ancien propriétaire effacées." },
];

/**
 * The grading standard, shared by the /grading page and the product page modal
 * so the two can never say different things.
 */
export default function GradingContent({ compact = false, current }: { compact?: boolean; current?: ConditionGrade }) {
  return (
    <>
      <div className={cn("grid gap-4", compact ? "sm:grid-cols-2" : "grid-cols-[repeat(auto-fit,minmax(240px,1fr))]")}>
        {GRADE_ORDER.map((g) => (
          <section
            key={g}
            aria-current={g === current ? "true" : undefined}
            className={cn("flex flex-col gap-3 rounded-[28px] border bg-white", compact ? "p-5" : "p-6", g === current ? "border-brand ring-2 ring-brand/20" : "border-line")}
          >
            <span className="meter w-[72px]">{[1, 2, 3, 4].map((i) => <span key={i} data-on={i <= GRADES[g].level} />)}</span>
            <h2 className={cn("font-semibold", compact ? "text-lg" : "text-[22px]")}>
              {GRADES[g].label}
              {g === current && <span className="ml-2 text-[13px] font-medium text-brand">Votre sélection</span>}
            </h2>
            <p className="text-sm leading-relaxed text-ink-soft">{GRADES[g].description}</p>
            <ul className="mt-auto flex flex-col gap-1.5 border-t border-line-soft pt-3 text-sm">
              {GRADES[g].criteria.map((c) => <li key={c}>{c}</li>)}
            </ul>
          </section>
        ))}
      </div>
      <section>
        <h2 className={cn(compact ? "mb-3 text-lg font-semibold" : "section-title mb-5")}>Ce qu’on vérifie sur chaque appareil</h2>
        <div className={cn("grid gap-4", compact ? "sm:grid-cols-2" : "grid-cols-[repeat(auto-fit,minmax(240px,1fr))]")}>
          {CHECKS.map(({ Icon, title, desc }) => (
            <div key={title} className={cn("rounded-[24px] bg-white ring-1 ring-line", compact ? "p-5" : "p-6")}>
              <Icon className="h-7 w-7 text-brand" aria-hidden="true" />
              <h3 className="mb-1.5 mt-4 text-lg font-semibold">{title}</h3>
              <p className="text-sm leading-relaxed text-ink-muted">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
