"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Toast = { id: string; message: string; type: "success" | "error" | "info" };
type ToastCtx = { toast: (message: string, type?: Toast["type"]) => void };

const ToastContext = createContext<ToastCtx>({ toast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const icons = { success: CheckCircle2, error: AlertCircle, info: Info };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 flex w-[calc(100%-32px)] max-w-md -translate-x-1/2 flex-col gap-2">
        {toasts.map((t) => {
          const Icon = icons[t.type];
          return (
            <div
              key={t.id}
              role="status"
              className={cn(
                "pointer-events-auto flex animate-toast-in items-center gap-3 rounded-2xl px-4 py-3 text-sm shadow-toast",
                t.type === "error" ? "bg-pop-dark text-white" : "bg-ink text-white"
              )}
            >
              <Icon className="h-4 w-4 flex-none" aria-hidden="true" />
              <span className="flex-1">{t.message}</span>
              <button
                type="button"
                onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}
                aria-label="Fermer"
                className="grid h-8 w-8 place-items-center rounded-lg bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
