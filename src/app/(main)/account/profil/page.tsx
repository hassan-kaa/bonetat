import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { formatPhone } from "@/lib/utils";
import ProfileForm from "./ProfileForm";

export const metadata: Metadata = { title: "Mon profil" };

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login?redirect=/account/profil");
  return (
    <ProfileForm
      initial={{
        name: user.name ?? "",
        phone: formatPhone(user.phone),
        email: user.email ?? "",
        locale: user.locale,
        notifySms: user.notifySms,
        notifyWhatsapp: user.notifyWhatsapp,
        notifyPromos: user.notifyPromos,
      }}
    />
  );
}
