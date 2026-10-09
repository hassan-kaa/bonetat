"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export default function ShipButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function ship() {
    setLoading(true);
    const res = await fetch(`/api/vendor/orders/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ship" }),
    });
    const d = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return toast(d.error ?? "Impossible de marquer l’envoi", "error");
    toast("Marquée expédiée");
    router.refresh();
  }

  return (
    <button type="button" onClick={ship} disabled={loading} className="btn-primary btn-sm">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Marquer expédiée"}
    </button>
  );
}
