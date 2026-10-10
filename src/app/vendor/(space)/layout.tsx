import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Logo from "@/components/brand/Logo";
import LogoutButton from "@/components/auth/LogoutButton";
import { ToastProvider } from "@/components/ui/Toast";
import LiveUpdates from "@/components/live/LiveUpdates";
import VendorNav from "./VendorNav";

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login?redirect=/vendor/dashboard");
  if (!user.vendor) redirect("/vendor/apply");
  if (user.vendor.status !== "APPROVED") redirect("/vendor/apply");

  const toShip = await prisma.orderItem.count({
    where: { vendorId: user.vendor.id, fulfillmentStatus: "PENDING", order: { status: "CONFIRMED" } },
  });

  return (
    <ToastProvider>
      <LiveUpdates />
      <div className="flex min-h-screen flex-wrap bg-chalk">
        <aside className="flex w-full flex-col gap-[22px] bg-ink px-4 py-6 text-white lg:sticky lg:top-0 lg:h-screen lg:w-[270px]">
          <div className="px-2">
            <Logo href="/vendor/dashboard" tone="white" suffix="partenaires" />
          </div>
          <div className="rounded-[18px] bg-white/[.07] p-3.5 text-sm">
            <b className="font-semibold">{user.vendor.storeName}</b>
            <br />
            <span className="text-white/65">Atelier partenaire {user.vendor.partnerCode ? `n° ${user.vendor.partnerCode}` : ""}</span>
          </div>
          <VendorNav toShip={toShip} />
          <div className="mt-auto hidden flex-col gap-3 px-3 text-sm text-white/65 lg:flex">
            <Link href="/" className="hover:text-white">Voir le site Bonétat</Link>
            <LogoutButton className="text-white/65 hover:text-white" />
          </div>
        </aside>
        <main className="flex min-w-0 flex-[999_1_640px] flex-col gap-5 px-4 pb-16 pt-8 sm:px-8 lg:px-10">{children}</main>
      </div>
    </ToastProvider>
  );
}
