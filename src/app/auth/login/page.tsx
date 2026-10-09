"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") ?? "";
  const [digits, setDigits] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const phone = `+216${digits}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Le code n’a pas pu être envoyé");
        setLoading(false);
        return;
      }
      const q = new URLSearchParams({ phone });
      if (redirect) q.set("redirect", redirect);
      if (data.devCode) sessionStorage.setItem("bonetat-dev-otp", data.devCode);
      router.push(`/auth/verify?${q}`);
    } catch {
      setError("Connexion perdue. Vérifiez votre réseau et réessayez.");
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <h1 className="text-[34px] font-semibold leading-tight tracking-[-0.035em]">Connexion</h1>
      <p className="mt-2 text-[15px] text-ink-muted">Entrez votre numéro : on vous envoie un code par SMS.</p>
      <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
        <label className="field">
          Numéro de téléphone
          <span className="flex h-14 items-center overflow-hidden rounded-[14px] border-[1.5px] border-line-strong bg-white focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/15">
            <span className="flex h-full items-center border-r border-line px-4 text-[17px] font-medium text-ink">+216</span>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={digits.replace(/(\d{2})(\d{0,3})(\d{0,3})/, (_, a, b, c) => [a, b, c].filter(Boolean).join(" "))}
              onChange={(e) => setDigits(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="22 345 678"
              aria-label="Numéro à 8 chiffres"
              className="h-full flex-1 bg-transparent px-4 text-[17px] tracking-wide text-ink outline-none"
              autoFocus
            />
          </span>
        </label>
        {error && <p role="alert" className="rounded-xl bg-pop-tint px-3 py-2.5 text-sm text-pop-dark">{error}</p>}
        <button type="submit" disabled={loading || digits.length !== 8} className="btn-primary h-14 rounded-[18px] text-[17px]">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Recevoir le code"}
        </button>
      </form>
      {process.env.NODE_ENV !== "production" && (
        <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-[13px] text-amber-900">
          <b className="font-semibold">Mode développement.</b> Le code s’affiche sur l’écran suivant.
          <br />
          Client 44 444 444, partenaire 11 111 111, admin 00 000 000
        </div>
      )}
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
