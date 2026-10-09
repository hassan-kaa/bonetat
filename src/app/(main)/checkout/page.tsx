import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CheckoutForm from "./CheckoutForm";

export const metadata: Metadata = { title: "Commander" };

export default async function CheckoutPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login?redirect=/checkout");
  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  return (
    <CheckoutForm
      user={{ name: user.name ?? "", phone: user.phone }}
      addresses={addresses.map((a) => ({
        id: a.id, label: a.label, fullName: a.fullName, phone: a.phone, governorate: a.governorate,
        delegation: a.delegation, line: a.line, notes: a.notes, isDefault: a.isDefault,
      }))}
    />
  );
}
