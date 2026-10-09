import { redirect } from "next/navigation";

export default async function OrderRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/account/orders/${id}`);
}
