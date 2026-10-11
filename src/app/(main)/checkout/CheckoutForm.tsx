"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Banknote, Loader2, ShieldCheck } from "lucide-react";
import AddressFields, { emptyAddress, type AddressDraft } from "@/components/account/AddressFields";
import DeviceVisual from "@/components/products/DeviceVisual";
import { GRADES, SHIPPING_FEE_MILLIMES } from "@/lib/catalog";
import { formatPrice } from "@/lib/money";
import { cartTotal, useCart } from "@/store/cart";
import { useHydrated } from "@/hooks/useHydrated";
import { cn } from "@/lib/utils";

type SavedAddress = AddressDraft & { id: string; isDefault: boolean; delegation: string | null; notes: string | null };

export default function CheckoutForm({
  user,
  addresses,
}: {
  user: { name: string; phone: string };
  addresses: (Omit<SavedAddress, "delegation" | "notes"> & { delegation: string | null; notes: string | null })[];
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const items = useCart((s) => s.items);
  const clearCart = useCart((s) => s.clearCart);
  const [addressId, setAddressId] = useState<string | "new">(addresses[0]?.id ?? "new");
  const [draft, setDraft] = useState<AddressDraft>(emptyAddress(user.name, user.phone));
  const [saveAddress, setSaveAddress] = useState(true);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (hydrated && items.length === 0 && !loading) router.replace("/cart");
  }, [hydrated, items.length, loading, router]);

  if (!hydrated || items.length === 0) return <div className="container-page min-h-[50vh] py-10" />;

  const subtotal = cartTotal(items);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ offerId: i.offerId, priceMillimes: i.priceMillimes })),
          ...(addressId === "new" ? { address: draft, saveAddress } : { addressId }),
          notes: notes || undefined,
          paymentMethod: "COD",
        }),
      });
      const data = await res.json();
      if (res.status === 401) return router.push("/auth/login?redirect=/checkout");
      if (!res.ok) {
        setError(data.error ?? "La commande n’a pas pu être passée.");
        setLoading(false);
        return;
      }
      clearCart();
      router.push(`/account/orders/${data.orderId}?placed=1`);
    } catch {
      setError("Connexion perdue. Vérifiez votre réseau et réessayez.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="container-page pb-6 pt-8">
      <Link href="/cart" className="text-sm text-ink-muted hover:text-ink">Retour au panier</Link>
      <h1 className="page-title mb-6 mt-2">Commander</h1>
      <div className="flex flex-wrap items-start gap-8">
        <div className="flex min-w-0 flex-[1_1_560px] flex-col gap-5">
          <section className="rounded-panel border border-line bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">Adresse de livraison</h2>
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Adresse de livraison">
              {addresses.map((a) => (
                <label key={a.id} className={cn("opt cursor-pointer p-4 text-sm leading-relaxed", addressId === a.id && "opt-on")}>
                  <input type="radio" name="address" className="sr-only" checked={addressId === a.id} onChange={() => setAddressId(a.id)} />
                  <span className="mb-1 flex items-center justify-between">
                    <b className="text-[15px] font-semibold">{a.label}</b>
                    {a.isDefault && <span className="pill bg-white text-brand-dark">Par défaut</span>}
                  </span>
                  {a.fullName}, {a.phone}
                  <br />
                  {a.line}{a.delegation ? `, ${a.delegation}` : ""}, {a.governorate}
                </label>
              ))}
              <label className={cn("opt flex cursor-pointer items-center justify-center p-4 text-[15px] font-medium", addressId === "new" && "opt-on")}>
                <input type="radio" name="address" className="sr-only" checked={addressId === "new"} onChange={() => setAddressId("new")} />
                Nouvelle adresse
              </label>
            </div>
            {addressId === "new" && (
              <div className="mt-5 flex flex-col gap-4">
                <AddressFields value={draft} onChange={setDraft} />
                <label className="flex items-center gap-2.5 text-sm">
                  <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="h-4 w-4 accent-brand" />
                  Enregistrer cette adresse dans mon espace
                </label>
              </div>
            )}
          </section>

          <section className="rounded-panel border border-line bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">Paiement</h2>
            <div className="opt opt-on flex items-start gap-3 p-4">
              <Banknote className="mt-0.5 h-5 w-5 flex-none text-brand-dark" aria-hidden="true" />
              <div className="text-sm leading-relaxed">
                <b className="text-[15px] font-semibold">Paiement à la livraison</b>
                <br />
                <span className="text-ink-muted">Allumez l’appareil devant le livreur, vérifiez-le, puis payez en espèces.</span>
              </div>
            </div>
            <p className="mt-3 text-[13px] text-ink-muted">Paiement par carte (Flouci, Konnect) bientôt disponible.</p>
            <label className="field mt-5">
              Une précision pour cette commande ? (facultatif)
              <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
            </label>
          </section>
        </div>

        <aside className="flex w-full flex-col gap-4 rounded-panel border border-line bg-white p-6 shadow-buy lg:sticky lg:top-32 lg:w-[380px]">
          <h2 className="text-lg font-semibold">Votre commande</h2>
          <ul className="flex flex-col gap-3">
            {items.map((i) => (
              <li key={i.offerId} className="flex items-center gap-3 text-sm">
                <span className="grid h-14 w-14 flex-none place-items-center overflow-hidden rounded-2xl bg-brand-tint">
                  <DeviceVisual
                    imageKey={i.imageKey}
                    kind={i.kind}
                    colorHex={i.colorHex}
                    cameras={i.cameras}
                    artWidth={i.kind === "PHONE" ? 28 : 40}
                    artClassName={i.kind === "PHONE" ? "translate-y-2.5 -rotate-6" : undefined}
                    alt={`${i.name}, ${i.config}`}
                    sizes="56px"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block font-medium">{i.name}</b>
                  <span className="text-ink-muted">{i.config}, {GRADES[i.grade].label.toLowerCase()}</span>
                </span>
                <b className="price">{formatPrice(i.priceMillimes)}</b>
              </li>
            ))}
          </ul>
          <dl className="flex flex-col gap-2 border-t border-line pt-4 text-[15px]">
            <div className="flex justify-between"><dt className="text-ink-muted">Articles</dt><dd>{formatPrice(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-muted">Livraison</dt><dd>{formatPrice(SHIPPING_FEE_MILLIMES)}</dd></div>
            <div className="flex justify-between pt-1 text-lg font-semibold"><dt>À payer au livreur</dt><dd className="price text-xl">{formatPrice(subtotal + SHIPPING_FEE_MILLIMES)}</dd></div>
          </dl>
          {error && <p role="alert" className="rounded-xl bg-pop-tint px-3 py-2.5 text-sm text-pop-dark">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary h-14 rounded-control text-[17px]">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirmer la commande"}
          </button>
          <p className="flex items-start gap-2.5 text-[13px] text-ink-muted">
            <ShieldCheck className="h-5 w-5 flex-none text-brand-dark" aria-hidden="true" />
            Bonétat vous appelle pour confirmer, puis l’atelier partenaire expédie sous 24 h.
          </p>
        </aside>
      </div>
    </form>
  );
}
