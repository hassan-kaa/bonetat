import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AddedToCart from "@/components/cart/AddedToCart";
import { ToastProvider } from "@/components/ui/Toast";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const [user, categories] = await Promise.all([
    getSessionUser(),
    prisma.category.findMany({ orderBy: { position: "asc" }, select: { slug: true, nameFr: true } }),
  ]);

  const navUser = user
    ? { name: user.name, role: user.role, vendorApproved: user.vendor?.status === "APPROVED" }
    : null;

  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col">
        <Header user={navUser} categories={categories} />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
      <AddedToCart />
    </ToastProvider>
  );
}
