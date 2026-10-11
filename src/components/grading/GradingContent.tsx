import type { ConditionGrade } from "@prisma/client";
import { BatteryCharging, ScanSearch, ShieldCheck, Smartphone } from "lucide-react";
import { GRADES, GRADE_ORDER } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const CHECKS = [
  { Icon: Smartphone, title: "Aspect", desc: "Écran, contour, dos et caméras examinés à 20 cm, sous la même lumière : chaque atelier applique les mêmes critères." },
  { Icon: BatteryCharging, title: "Batterie mesurée", desc: "L’atelier relève la capacité réelle et l’indique sur la fiche, indépendamment de l’état. Jamais sous 75 % : Bonétat refuse les annonces en dessous." },
  { Icon: ScanSearch, title: "Fonctions testées", desc: "L’atelier s’engage à tester appels, Wi-Fi, Bluetooth, capteurs, boutons, haut-parleurs, micros, Face ID ou Touch ID, caméras." },
  { Icon: ShieldCheck, title: "IMEI et données", desc: "L’atelier fournit le numéro de série et s’engage : appareil ni volé ni bloqué, données de l’ancien propriétaire effacées." },
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
            className={cn("flex flex-col gap-3 rounded-panel border bg-white", compact ? "p-5" : "p-6", g === current ? "border-brand ring-2 ring-brand/20" : "border-line")}
          >
            <span className="meter w-[72px]">{[1, 2, 3, 4].map((i) => <span key={i} data-on={i <= GRADES[g].level} />)}</span>
            <h2 className={cn("font-semibold", compact ? "text-lg" : "text-[22px]")}>
              {GRADES[g].label}
              {g === current && <span className="ml-2 text-[13px] font-medium text-brand-dark">Votre sélection</span>}
            </h2>
            <p className="text-sm leading-relaxed text-ink-soft">{GRADES[g].description}</p>
            <ul className="mt-auto flex flex-col gap-1.5 border-t border-line-soft pt-3 text-sm">
              {GRADES[g].criteria.map((c) => <li key={c}>{c}</li>)}
            </ul>
          </section>
        ))}
      </div>
      <section>
        <h2 className={cn(compact ? "mb-3 text-lg font-semibold" : "section-title mb-5")}>Ce que chaque atelier s’engage à vérifier</h2>
        <div className={cn("grid gap-4", compact ? "sm:grid-cols-2" : "grid-cols-[repeat(auto-fit,minmax(240px,1fr))]")}>
          {CHECKS.map(({ Icon, title, desc }) => (
            <div key={title} className={cn("rounded-panel bg-white ring-1 ring-line", compact ? "p-5" : "p-6")}>
              <Icon className="h-7 w-7 text-brand-dark" aria-hidden="true" />
              <h3 className="mb-1.5 mt-4 text-lg font-semibold">{title}</h3>
              <p className="text-sm leading-relaxed text-ink-muted">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
