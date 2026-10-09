import { redirect } from "next/navigation";

// Orders now live in the client space
export default function OrdersRedirect() {
  redirect("/account");
}
