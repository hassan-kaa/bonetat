import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPhone, initials } from "@/lib/utils";
import AccountNav from "./AccountNav";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login?redirect=/account");

  const [inProgress, devices, follows, addresses] = await Promise.all([
    prisma.order.count({ where: { buyerId: user.id, status: { in: ["PENDING", "CONFIRMED", "SHIPPED"] } } }),
    prisma.orderItem.count({ where: { order: { buyerId: user.id }, fulfillmentStatus: "DELIVERED" } }),
    prisma.favorite.count({ where: { userId: user.id } }),
    prisma.address.count({ where: { userId: user.id } }),
  ]);

  return (
    <div className="container-page flex flex-wrap items-start gap-7 pb-6 pt-8">
      <aside className="flex w-full flex-col gap-3.5 lg:sticky lg:top-32 lg:w-[270px]">
        <div className="flex items-center gap-3.5 rounded-[26px] border border-line bg-white p-5">
          <span className="grid h-14 w-14 flex-none place-items-center rounded-[18px] bg-brand text-[22px] font-semibold text-white">{initials(user.name)}</span>
          <div className="min-w-0">
            <b className="block truncate text-[17px] font-semibold">{user.name ?? "Mon compte"}</b>
            <span className="text-sm text-ink-muted">{formatPhone(user.phone)}</span>
          </div>
        </div>
        <AccountNav
          badges={{
            orders: inProgress ? `${inProgress} en cours` : "",
            devices: devices ? String(devices) : "",
            follows: follows ? String(follows) : "",
            addresses: addresses ? String(addresses) : "",
          }}
          extra={
            user.role === "ADMIN"
              ? { href: "/admin", label: "Administration" }
              : user.vendor?.status === "APPROVED"
                ? { href: "/vendor/dashboard", label: "Espace partenaire" }
                : null
          }
        />
      </aside>
      <section className="flex min-w-0 flex-[999_1_560px] flex-col gap-[18px]">{children}</section>
    </div>
  );
}
