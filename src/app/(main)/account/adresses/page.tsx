import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AddressBook from "./AddressBook";

export const metadata: Metadata = { title: "Mes adresses" };

export default async function AddressesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login?redirect=/account/adresses");
  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  return (
    <AddressBook
      user={{ name: user.name ?? "", phone: user.phone }}
      addresses={addresses.map((a) => ({
        id: a.id, label: a.label, fullName: a.fullName, phone: a.phone, governorate: a.governorate,
        delegation: a.delegation ?? "", line: a.line, notes: a.notes ?? "", isDefault: a.isDefault,
      }))}
    />
  );
}
