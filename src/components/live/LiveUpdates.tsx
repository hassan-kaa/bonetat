"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/Toast";

const EVERY_MS = 8000;

/**
 * Keeps the open page current without a manual refresh: asks /api/live every few seconds (only while
 * the tab is visible, and right away when it comes back), shows new messages as toasts, and re-renders
 * the page's server data when something changed. Client state (forms being filled) is kept.
 *
 * One check at a time: focus and visibilitychange fire together when the tab comes back, and a
 * timer tick can land on top. The server delivers each message once; this avoids the wasted calls.
 */
export default function LiveUpdates() {
  const router = useRouter();
  const { toast } = useToast();
  const version = useRef<string | null>(null);
  const shown = useRef(new Set<string>());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;
    let busy = false;

    async function check() {
      if (busy || stopped || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const res = await fetch("/api/live", { cache: "no-store" });
        if (!res.ok || stopped) return;
        const d: { version: string; notifications: { id: string; title: string }[] } = await res.json();
        if (stopped) return; // unmounted meanwhile (React dev mounts effects twice): this instance shows nothing
        const fresh = d.notifications.filter((n) => !shown.current.has(n.id));
        for (const n of fresh) {
          shown.current.add(n.id);
          toast(n.title, "info");
        }
        const changed = version.current !== null && version.current !== d.version;
        version.current = d.version;
        if (changed || fresh.length) router.refresh();
      } catch {
        /* offline: try again next tick */
      } finally {
        busy = false;
      }
    }

    function loop() {
      timer = setTimeout(async () => {
        await check();
        if (!stopped) loop();
      }, EVERY_MS);
    }

    check();
    loop();
    const onVisible = () => void check();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [router, toast]);

  return null;
}
