"use client";

import { cn } from "@/lib/utils";
import { CPU_BRANDS, CPU_FAMILIES, GPUS, VRAMS, generationsFor, specsFromText, type LaptopSpecs } from "@/lib/laptop-specs";

type Props = {
  value: LaptopSpecs;
  onChange: (s: LaptopSpecs) => void;
  /** The model name already names the chip (MacBook Air M1): no processor to pick */
  cpuInModel: string | null;
  /** Labels of configurations already listed for this model: one click fills everything */
  known: string[];
  brand: string;
  cpuModel: string;
  onCpuModel: (v: string) => void;
};

const chip = (on: boolean) => cn("opt px-3.5 py-2 text-sm", on && "opt-on");

/** Processor and graphics card by clicks. RAM and SSD stay in the main form (shared with phones). */
export default function LaptopSpecsPicker({ value, onChange, cpuInModel, known, brand, cpuModel, onCpuModel }: Props) {
  const set = (patch: Partial<LaptopSpecs>) => onChange({ ...value, ...patch });
  const gens = generationsFor(value.cpuFamily);

  function typeModel(v: string) {
    onCpuModel(v);
    const read = specsFromText(v, brand);
    if (read.cpuFamily) set({ cpuBrand: read.cpuBrand, cpuFamily: read.cpuFamily, cpuGen: read.cpuGen });
  }

  return (
    <div className="flex flex-col gap-5">
      {known.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-ink-muted">Déjà en vente pour ce modèle</h3>
          <div className="flex flex-wrap gap-2">
            {known.map((k) => (
              <button key={k} type="button" onClick={() => onChange(specsFromText(k, brand))} className="opt px-3.5 py-2 text-sm">{k}</button>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-2.5 text-[15px] font-semibold">Processeur</h2>
        {cpuInModel ? (
          <p className="text-sm text-ink-muted">Puce {cpuInModel}, indiquée dans le nom du modèle.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {CPU_BRANDS.map((b) => (
                <button key={b.value} type="button" aria-pressed={value.cpuBrand === b.value} onClick={() => set({ cpuBrand: b.value, cpuFamily: null, cpuGen: null })} className={chip(value.cpuBrand === b.value)}>
                  {b.label}
                </button>
              ))}
            </div>
            {value.cpuBrand && (
              <div className="flex flex-wrap gap-2">
                {CPU_FAMILIES[value.cpuBrand].map((f) => (
                  <button key={f.id} type="button" aria-pressed={value.cpuFamily === f.id} onClick={() => set({ cpuFamily: f.id, cpuGen: null })} className={chip(value.cpuFamily === f.id)}>
                    {f.label}
                  </button>
                ))}
              </div>
            )}
            {gens.length > 0 && (
              <div>
                <p className="mb-1.5 text-[13px] text-ink-muted">Génération {value.cpuBrand === "APPLE" ? "" : "(si vous la connaissez)"}</p>
                <div className="flex flex-wrap gap-2">
                  {gens.map((g) => (
                    <button key={g.value} type="button" aria-pressed={(value.cpuGen ?? "") === g.value && value.cpuGen !== null} onClick={() => set({ cpuGen: value.cpuGen === g.value ? null : g.value })} className={chip(value.cpuGen === g.value)}>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <label className="field max-w-sm">
              Modèle exact du processeur (optionnel)
              <input className="input" value={cpuModel} onChange={(e) => typeModel(e.target.value)} maxLength={40} placeholder="ex. i5-1145G7, Ryzen 7 5800H" />
            </label>
            <p className="-mt-1.5 text-[13px] text-ink-muted">Sous Windows : Paramètres, Système, Informations système. Il remplit la famille et la génération, et s’affiche dans la description.</p>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2.5 text-[15px] font-semibold">Carte graphique</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={!value.gpu} onClick={() => set({ gpu: null, vramGb: null })} className={chip(!value.gpu)}>Intégrée</button>
          {GPUS.map((g) => (
            <button key={g} type="button" aria-pressed={value.gpu === g} onClick={() => set({ gpu: g })} className={chip(value.gpu === g)}>{g}</button>
          ))}
        </div>
        {value.gpu && (
          <div className="mt-3">
            <p className="mb-1.5 text-[13px] text-ink-muted">Mémoire de la carte (si vous la connaissez)</p>
            <div className="flex flex-wrap gap-2">
              {VRAMS.map((v) => (
                <button key={v} type="button" aria-pressed={value.vramGb === v} onClick={() => set({ vramGb: value.vramGb === v ? null : v })} className={chip(value.vramGb === v)}>{v} Go</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
