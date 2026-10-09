"use client";

import { GOVERNORATES } from "@/lib/catalog";

export type AddressDraft = {
  label: string;
  fullName: string;
  phone: string;
  governorate: string;
  delegation: string;
  line: string;
  notes: string;
};

export const emptyAddress = (name = "", phone = "+216"): AddressDraft => ({
  label: "Maison", fullName: name, phone, governorate: "", delegation: "", line: "", notes: "",
});

/** The address form used in checkout and in the client space */
export default function AddressFields({ value, onChange }: { value: AddressDraft; onChange: (v: AddressDraft) => void }) {
  const set = (k: keyof AddressDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    onChange({ ...value, [k]: e.target.value });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="field">Nom de l’adresse<input className="input" value={value.label} onChange={set("label")} placeholder="Maison, Bureau, Parents…" required /></label>
      <label className="field">Nom du destinataire<input className="input" value={value.fullName} onChange={set("fullName")} autoComplete="name" required minLength={2} /></label>
      <label className="field">Téléphone pour le livreur<input className="input" type="tel" value={value.phone} onChange={set("phone")} autoComplete="tel" pattern="\+216\d{8}" title="+216 suivi de 8 chiffres" required /></label>
      <label className="field">
        Gouvernorat
        <select className="input" value={value.governorate} onChange={set("governorate")} required>
          <option value="" disabled>Choisir</option>
          {GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </label>
      <label className="field">Délégation ou quartier<input className="input" value={value.delegation} onChange={set("delegation")} placeholder="Sahloul, La Marsa…" /></label>
      <label className="field">Adresse<input className="input" value={value.line} onChange={set("line")} placeholder="Rue, numéro, immeuble" autoComplete="street-address" required minLength={4} /></label>
      <label className="field sm:col-span-2">Indications pour le livreur<textarea className="input" rows={2} value={value.notes} onChange={set("notes")} placeholder="Étage, repère, horaires" /></label>
    </div>
  );
}
