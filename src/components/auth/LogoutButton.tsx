"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }
  return (
    <button type="button" onClick={handleLogout} className={cn("flex items-center gap-2 text-sm font-medium", className)}>
      <LogOut className="h-4 w-4" aria-hidden="true" />
      Se déconnecter
    </button>
  );
}
