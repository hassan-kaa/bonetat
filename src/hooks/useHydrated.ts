"use client";

import { useEffect, useState } from "react";

/** True after the first client render — use it before reading persisted client state (the cart). */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
