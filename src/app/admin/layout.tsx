import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Logo from "@/components/brand/Logo";
import LogoutButton from "@/components/auth/LogoutButton";
import { ToastProvider } from "@/components/ui/Toast";
import LiveUpdates from "@/components/live/LiveUpdates";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login?redirect=/admin");
  if (user.role !== "ADMIN") redirect("/");

  const [toReview, toConfirm, toApprove] = await Promise.all([
    prisma.offer.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.vendor.count({ where: { status: "PENDING" } }),
  ]);
  const nav = [
    { href: "/admin", label: "Vue d’ensemble", n: 0 },
    { href: "/admin/orders", label: "Commandes", n: toConfirm },
    { href: "/admin/listings", label: "Offres à contrôler", n: toReview },
    { href: "/admin/vendors", label: "Ateliers partenaires", n: toApprove },
    { href: "/admin/catalog/new-models", label: "Modèles ajoutés", n: 0 },
    { href: "/admin/catalog", label: "Photos du catalogue", n: 0 },
  ];

  return (
    <ToastProvider>
      <LiveUpdates />
      <div className="flex min-h-screen flex-wrap bg-chalk">
        <aside className="flex w-full flex-col gap-6 bg-ink px-4 py-6 text-white lg:sticky lg:top-0 lg:h-screen lg:w-[260px]">
          <div className="px-2"><Logo href="/admin" tone="white" suffix="admin" /></div>
          <nav aria-label="Administration" className="flex gap-0.5 overflow-x-auto lg:flex-col">
            {nav.map((i) => (
              <Link key={i.href} href={i.href} className="flex items-center gap-3 whitespace-nowrap rounded-control px-3.5 py-3 text-[15px] text-white/80 hover:bg-white/[.07]">
                <span className="flex-1">{i.label}</span>
                {i.n > 0 && <span className="grid h-[22px] min-w-[22px] place-items-center rounded-full bg-pop px-1.5 text-xs font-semibold text-white">{i.n}</span>}
              </Link>
            ))}
          </nav>
          <div className="mt-auto hidden flex-col gap-3 px-3 text-sm text-white/65 lg:flex">
            <Link href="/" className="hover:text-white">Voir le site</Link>
            <LogoutButton className="text-white/65 hover:text-white" />
          </div>
        </aside>
        <main className="flex min-w-0 flex-[999_1_640px] flex-col gap-5 px-4 pb-16 pt-8 sm:px-8 lg:px-10">{children}</main>
      </div>
    </ToastProvider>
  );
}
