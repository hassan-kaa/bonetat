"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/types";

type CartStore = {
  items: CartItem[];
  /** Last thing added, for the confirmation toast */
  lastAdded: CartItem | null;
  addItem: (item: CartItem) => void;
  removeItem: (offerId: string) => void;
  has: (offerId: string) => boolean;
  clearCart: () => void;
  dismissLastAdded: () => void;
};

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      lastAdded: null,

      // Each offer is one physical unit, so it is either in the cart or not
      addItem: (item) =>
        set((state) => ({
          items: state.items.some((i) => i.offerId === item.offerId) ? state.items : [...state.items, item],
          lastAdded: item,
        })),

      removeItem: (offerId) => set((state) => ({ items: state.items.filter((i) => i.offerId !== offerId) })),


      has: (offerId) => get().items.some((i) => i.offerId === offerId),

      clearCart: () => set({ items: [], lastAdded: null }),

      dismissLastAdded: () => set({ lastAdded: null }),
    }),
    {
      // v4: one unit per line (no qty), catalog photo key
      name: "bonetat-cart-v4",
      partialize: (s) => ({ items: s.items }),
    }
  )
);

export const cartTotal = (items: CartItem[]) => items.reduce((sum, i) => sum + i.priceMillimes, 0);
export const cartCount = (items: CartItem[]) => items.length;
