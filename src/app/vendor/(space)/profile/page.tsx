import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getVendorUser } from "@/lib/auth";
import StoreProfileForm from "./StoreProfileForm";

export const metadata: Metadata = { title: "Profil de l’atelier" };

export default async function StoreProfilePage() {
  const auth = await getVendorUser();
  if (!auth) redirect("/vendor/apply");
  const v = auth.vendor;
  return (
    <>
      <h1 className="page-title">Profil de l’atelier</h1>
      <p className="-mt-2 text-[15px] text-ink-muted">Visible uniquement par l’équipe Bonétat. Les acheteurs ne voient jamais ces informations.</p>
      <StoreProfileForm
        initial={{
          storeName: v.storeName,
          legalName: v.legalName ?? "",
          taxId: v.taxId ?? "",
          rne: v.rne ?? "",
          contactName: v.contactName ?? "",
          phone: v.phone ?? "",
          pickupAddress: v.pickupAddress ?? "",
          pickupHours: v.pickupHours ?? "Lun. à sam., 9 h à 18 h",
          rib: v.rib ?? "",
          description: v.description ?? "",
        }}
        partnerCode={v.partnerCode}
      />
    </>
  );
}
