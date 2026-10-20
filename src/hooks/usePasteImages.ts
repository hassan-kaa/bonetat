"use client";

import { useEffect, useRef } from "react";

/**
 * Images pasted anywhere on the page (Ctrl/Cmd+V of a screenshot or a copied photo) are handed to `onImages`,
 * the same way files picked from the gallery are. Pasted text still goes where it was pasted. Off while
 * `enabled` is false (no room left, or another step of the page is showing).
 */
export function usePasteImages(onImages: (files: File[]) => void, enabled = true) {
  const handler = useRef(onImages);
  handler.current = onImages;
  useEffect(() => {
    if (!enabled) return;
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.items ?? [])]
        .filter((i) => i.kind === "file" && i.type.startsWith("image/"))
        .map((i) => i.getAsFile())
        .filter((f): f is File => !!f);
      if (files.length) handler.current(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [enabled]);
}
