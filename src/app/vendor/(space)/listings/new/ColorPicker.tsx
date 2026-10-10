"use client";

import type { ColorFamily } from "@prisma/client";
import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { FAMILY_OPTIONS } from "./types";

/** One of the product's colors, or a new one: family first, name optional */
export type ColorChoice = { finishId: string } | { name: string; family: ColorFamily } | null;

type Finish = { id: string; nameFr: string; hex: string; family: ColorFamily };

function Swatch({ hex, label, on, onClick, children }: { hex?: string; label: string; on: boolean; onClick: () => void; children?: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className="group flex w-[76px] flex-col items-center gap-1.5 text-center">
      <span
        className={cn(
          "grid h-11 w-11 place-items-center rounded-full border border-ink/15 ring-offset-2 transition group-hover:scale-105",
          on ? "ring-2 ring-brand" : "group-hover:ring-2 group-hover:ring-line-strong"
        )}
        style={hex ? { background: hex } : undefined}
      >
        {children ?? (on && <Check className={cn("h-4 w-4", isLight(hex) ? "text-ink" : "text-white")} strokeWidth={3} />)}
      </span>
      <span className={cn("text-[12px] leading-tight", on ? "font-medium text-ink" : "text-ink-muted")}>{label}</span>
    </button>
  );
}

function isLight(hex?: string) {
  if (!hex) return true;
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 > 160;
}

/**
 * The model's own colors first, as swatches. "Autre couleur" opens the families as swatches:
 * one click is enough (the name fills itself in), the exact name stays editable.
 */
export default function ColorPicker({ finishes, value, onChange }: { finishes: Finish[]; value: ColorChoice; onChange: (c: ColorChoice) => void }) {
  const custom = !!value && "name" in value ? value : null;
  const families = FAMILY_OPTIONS.filter((f) => f.value !== "OTHER");
  const label = (f: ColorFamily) => FAMILY_OPTIONS.find((o) => o.value === f)?.label ?? "";
  // This model already has a color in the picked family: probably that one
  const sibling = custom ? finishes.find((f) => f.family === custom.family) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-x-1 gap-y-3">
        {finishes.map((f) => (
          <Swatch key={f.id} hex={f.hex} label={f.nameFr} on={!!value && "finishId" in value && value.finishId === f.id} onClick={() => onChange({ finishId: f.id })} />
        ))}
        <Swatch label="Autre couleur" on={!!custom} onClick={() => onChange(custom ?? { name: "", family: "OTHER" })}>
          <Plus className="h-5 w-5 text-ink-muted" />
        </Swatch>
      </div>

      {custom && (
        <div className="flex flex-col gap-3 rounded-2xl bg-chalk p-4">
          <p className="text-sm font-medium">Quelle famille de couleur ?</p>
          <div className="flex flex-wrap gap-x-1 gap-y-3">
            {families.map((f) => (
              <Swatch
                key={f.value}
                hex={f.hex}
                label={f.label}
                on={custom.family === f.value}
                // The name follows the family until the store types its own
                onClick={() => onChange({ family: f.value, name: !custom.name || custom.name === label(custom.family) ? f.label : custom.name })}
              />
            ))}
          </div>
          {sibling && (
            <p className="text-sm">
              Ce modèle existe déjà en <b className="font-medium">{sibling.nameFr}</b>.{" "}
              <button type="button" onClick={() => onChange({ finishId: sibling.id })} className="font-medium text-brand hover:underline">C’est celle-ci</button>
            </p>
          )}
          {custom.family !== "OTHER" && (
            <label className="field max-w-xs">
              Nom exact (optionnel)
              <input className="input bg-white" value={custom.name} onChange={(e) => onChange({ ...custom, name: e.target.value })} maxLength={40} placeholder="ex. Bleu nuit" />
            </label>
          )}
        </div>
      )}
    </div>
  );
}
