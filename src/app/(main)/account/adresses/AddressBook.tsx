"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import AddressFields, { emptyAddress, type AddressDraft } from "@/components/account/AddressFields";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

type Address = AddressDraft & { id: string; isDefault: boolean };

export default function AddressBook({ user, addresses }: { user: { name: string; phone: string }; addresses: Address[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = useState<string | "new" | null>(addresses.length === 0 ? "new" : null);
  const [draft, setDraft] = useState<AddressDraft>(emptyAddress(user.name, user.phone));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function startEdit(a: Address | null) {
    setError("");
    if (a) {
      setDraft({ label: a.label, fullName: a.fullName, phone: a.phone, governorate: a.governorate, delegation: a.delegation, line: a.line, notes: a.notes });
      setEditing(a.id);
    } else {
      setDraft(emptyAddress(user.name, user.phone));
      setEditing("new");
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch(editing === "new" ? "/api/account/addresses" : `/api/account/addresses/${editing}`, {
      method: editing === "new" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, delegation: draft.delegation || null, notes: draft.notes || null }),
    });
    const d = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setError(d.error ?? "Adresse non enregistrée");
    toast(editing === "new" ? "Adresse ajoutée" : "Adresse modifiée");
    setEditing(null);
    router.refresh();
  }

  async function makeDefault(id: string) {
    const res = await fetch(`/api/account/addresses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    if (res.ok) router.refresh();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/account/addresses/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Adresse supprimée");
      router.refresh();
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">Mes adresses</h1>
        {editing === null && (
          <button type="button" onClick={() => startEdit(null)} className="btn-primary btn-sm">Ajouter une adresse</button>
        )}
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2">
        {addresses.map((a) => (
          <article key={a.id} className={cn("flex flex-col gap-3 rounded-[24px] bg-white p-[22px] text-sm leading-relaxed", a.isDefault ? "border-[1.5px] border-brand" : "border border-line")}>
            <div className="flex items-center justify-between gap-2">
              <b className="text-base font-semibold">{a.label}</b>
              {a.isDefault && <span className="pill bg-brand-tint text-brand">Par défaut</span>}
            </div>
            <p>
              {a.fullName}, {a.phone}
              <br />
              {a.line}{a.delegation ? `, ${a.delegation}` : ""}
              <br />
              {a.governorate}
              {a.notes && <span className="block text-ink-muted">{a.notes}</span>}
            </p>
            <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-medium">
              <button type="button" onClick={() => startEdit(a)} className="text-brand hover:underline">Modifier</button>
              {!a.isDefault && <button type="button" onClick={() => makeDefault(a.id)} className="text-brand hover:underline">Utiliser par défaut</button>}
              <button type="button" onClick={() => remove(a.id)} className="text-ink-muted hover:text-pop-dark">Supprimer</button>
            </div>
          </article>
        ))}
      </div>

      {editing !== null && (
        <form onSubmit={save} className="flex flex-col gap-4 rounded-[28px] border border-line bg-white p-6">
          <h2 className="text-lg font-semibold">{editing === "new" ? "Nouvelle adresse" : "Modifier l’adresse"}</h2>
          <AddressFields value={draft} onChange={setDraft} />
          {error && <p role="alert" className="text-sm text-pop-dark">{error}</p>}
          <div className="flex gap-2.5">
            <button type="submit" disabled={saving} className="btn-primary btn-sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer l’adresse"}
            </button>
            {addresses.length > 0 && <button type="button" onClick={() => setEditing(null)} className="btn-secondary btn-sm">Annuler</button>}
          </div>
        </form>
      )}
    </>
  );
}
