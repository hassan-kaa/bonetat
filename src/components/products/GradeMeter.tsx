import type { ConditionGrade } from "@prisma/client";
import { GRADES } from "@/lib/catalog";
import { cn } from "@/lib/utils";

/** Four bars: more filled = fewer traces of use. Never a judgement color. */
export default function GradeMeter({ grade, className }: { grade: ConditionGrade; className?: string }) {
  const level = GRADES[grade].level;
  return (
    <span className={cn("meter w-14", className)} aria-hidden="true">
      {[1, 2, 3, 4].map((i) => (
        <span key={i} data-on={i <= level} />
      ))}
    </span>
  );
}
