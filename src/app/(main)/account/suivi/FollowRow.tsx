"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DeviceKind } from "@prisma/client";
import DeviceVisual from "@/components/products/DeviceVisual";
import { formatPrice } from "@/lib/money";
import { formatShortDate } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

type Follow = {
  id: string;
  name: string;
  config: string;
  kind: DeviceKind;
  cameras: number | null;
  colorHex: string;
  imageKey: string | null;
  href: string;
  currentPriceMillimes: number | null;
  startPriceMillimes: number | null;
  alertEnabled: boolean;
  alertPriceMillimes: number | null;
  since: string;
};

export default function FollowRow({ follow }: { follow: Follow }) {
  const router = useRouter();
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(follow.alertEnabled);
  const [target, setTarget] = useState(
    String(Math.round((follow.alertPriceMillimes ?? Math.floor(((follow.currentPriceMillimes ?? 0) * 0.95) / 10_000) * 10_000) / 1000))
  );

  const diff = follow.currentPriceMillimes && follow.startPriceMillimes ? follow.currentPriceMillimes - follow.startPriceMillimes : 0;
  const trend =
    follow.currentPriceMillimes === null
      ? { text: "Épuisé pour le moment", cls: "text-ink-muted" }
      : diff < 0
        ? { text: `${formatPrice(-diff)} de moins depuis le ${formatShortDate(follow.since)}`, cls: "text-gain" }
        : diff > 0
          ? { text: `+${formatPrice(diff)} depuis le ${formatShortDate(follow.since)}`, cls: "text-ink-muted" }
          : { text: "Stable", cls: "text-ink-muted" };

  async function patch(data: object) {
    const res = await fetch(`/api/favorites/${follow.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) toast("Modification non enregistrée", "error");
    return res.ok;
  }

  async function toggle() {
    const next = !enabled;
    setEnabled(next);
    const ok = await patch({ alertEnabled: next, alertPriceMillimes: Number(target) > 0 ? Number(target) * 1000 : null });
    if (!ok) setEnabled(!next);
  }

  async function saveTarget() {
    const v = Number(target);
    if (!(v > 0)) return;
    if (await patch({ alertPriceMillimes: v * 1000 })) toast("Prix d’alerte enregistré");
  }

  async function remove() {
    const res = await fetch(`/api/favorites/${follow.id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <article className="flex flex-wrap items-center gap-[18px] rounded-panel border border-line bg-white px-[22px] py-[18px]">
      <Link href={follow.href} className="grid h-16 w-16 flex-none place-items-center overflow-hidden rounded-panel bg-brand-tint">
        <DeviceVisual
          imageKey={follow.imageKey}
          kind={follow.kind}
          colorHex={follow.colorHex}
          cameras={follow.cameras}
          artWidth={follow.kind === "PHONE" ? 34 : 46}
          artClassName={follow.kind === "PHONE" ? "translate-y-3 -rotate-[8deg]" : undefined}
          alt={`${follow.name}, ${follow.config}`}
          sizes="64px"
        />
      </Link>
      <div className="min-w-0 flex-[1_1_220px]">
        <Link href={follow.href} className="text-base font-medium hover:text-brand-dark">{follow.name}</Link>
        <p className="mt-0.5 text-sm text-ink-muted">{follow.config}</p>
      </div>
      <div className="text-right">
        <b className="price text-lg">{follow.currentPriceMillimes ? formatPrice(follow.currentPriceMillimes) : "—"}</b>
        <p className={`text-[13px] ${trend.cls}`}>{trend.text}</p>
      </div>
      <div className="flex flex-[1_1_100%] flex-wrap items-center gap-3 border-t border-line-soft pt-3.5 text-sm">
        <label htmlFor={`t-${follow.id}`} className="flex-1">Me prévenir par WhatsApp sous</label>
        <span className="flex items-center gap-1.5">
          <input
            id={`t-${follow.id}`}
            type="number"
            inputMode="numeric"
            min={1}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            onBlur={saveTarget}
            className="h-10 w-24 rounded-xl border-[1.5px] border-line-strong px-2.5 text-right text-[15px] outline-none focus:border-brand"
          />
          DT
        </span>
        <button type="button" className="toggle" aria-pressed={enabled} aria-label={`Alerte prix ${follow.name}`} onClick={toggle} />
        <button type="button" onClick={remove} className="text-[13px] text-ink-muted hover:text-pop-dark">Ne plus suivre</button>
      </div>
    </article>
  );
}
