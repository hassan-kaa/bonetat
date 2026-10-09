import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Banknote, ShieldCheck, Truck } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import Logo from "@/components/brand/Logo";
import ApplyForm from "./ApplyForm";

export const metadata: Metadata = { title: "Devenir atelier partenaire" };

export default async function ApplyPage() {
  const user = await getSessionUser();
  if (user?.vendor?.status === "APPROVED") redirect("/vendor/dashboard");

  return (
    <div className="min-h-screen bg-chalk">
      <header className="border-b border-line bg-white">
        <div className="container-page flex items-center justify-between py-3.5">
          <Logo />
          <Link href="/" className="text-sm text-ink-muted hover:text-ink">Retour au site</Link>
        </div>
      </header>
      <div className="container-page flex flex-wrap items-start gap-10 py-10">
        <section className="flex min-w-0 flex-[1_1_380px] flex-col gap-6">
          <h1 className="text-[44px] font-semibold leading-[1.05] tracking-[-0.04em]">Vendez plus, sans gérer les DM ni l’encaissement.</h1>
          <p className="max-w-[34em] text-[17px] leading-relaxed text-ink-soft">
            Bonétat réunit les meilleurs ateliers de Tunisie derrière une seule marque de confiance. Vous publiez un appareil en deux minutes : photos et fiche viennent de notre catalogue.
          </p>
          <ul className="flex flex-col gap-4 text-[15px]">
            <li className="flex gap-3"><Truck className="h-6 w-6 flex-none text-brand" aria-hidden="true" /><span><b className="font-semibold">On s’occupe du client.</b> Confirmation par téléphone, livraison, réclamations.</span></li>
            <li className="flex gap-3"><Banknote className="h-6 w-6 flex-none text-brand" aria-hidden="true" /><span><b className="font-semibold">Paiement tous les 15 jours.</b> Le livreur encaisse, on vous vire le net. Commission de 5 %.</span></li>
            <li className="flex gap-3"><ShieldCheck className="h-6 w-6 flex-none text-brand" aria-hidden="true" /><span><b className="font-semibold">Une seule règle :</b> respecter la grille d’état Bonétat et la garantie de 12 mois.</span></li>
          </ul>
        </section>
        <section className="w-full flex-[1_1_440px] rounded-[28px] border border-line bg-white p-6 sm:p-8">
          {!user ? (
            <div className="flex flex-col gap-4">
              <h2 className="text-xl font-semibold">Commencez par vous connecter</h2>
              <p className="text-[15px] text-ink-muted">Votre numéro de téléphone sert d’identifiant, pour vous comme pour vos clients.</p>
              <Link href="/auth/login?redirect=/vendor/apply" className="btn-primary self-start">Se connecter avec mon numéro</Link>
            </div>
          ) : user.vendor ? (
            <div className="flex flex-col gap-3">
              <h2 className="text-xl font-semibold">{user.vendor.status === "PENDING" ? "Demande en cours d’examen" : "Compte suspendu"}</h2>
              <p className="text-[15px] leading-relaxed text-ink-muted">
                {user.vendor.status === "PENDING"
                  ? `Merci ! L’équipe Bonétat étudie la candidature de ${user.vendor.storeName} et vous appelle sous 48 h pour visiter l’atelier.`
                  : "Votre compte partenaire est suspendu. Contactez l’équipe Bonétat pour en savoir plus."}
              </p>
              <Link href="/" className="btn-secondary btn-sm self-start">Retour au site</Link>
            </div>
          ) : (
            <ApplyForm defaultName={user.name ?? ""} defaultPhone={user.phone} />
          )}
        </section>
      </div>
    </div>
  );
}
