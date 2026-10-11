"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import { formatPhone } from "@/lib/utils";

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const phone = params.get("phone") ?? "";
  const raw = params.get("redirect");
  // Only same-site paths: never let ?redirect= send someone to another domain
  const redirect = raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : null;
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!phone) router.replace("/auth/login");
    try {
      setDevCode(sessionStorage.getItem("bonetat-dev-otp"));
    } catch {}
    refs.current[0]?.focus();
  }, [phone, router]);

  async function submit(otp: string) {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otp, name: name.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Code invalide");
        setCode(["", "", "", "", "", ""]);
        refs.current[0]?.focus();
        setLoading(false);
        return;
      }
      try { sessionStorage.removeItem("bonetat-dev-otp"); } catch {}
      setSuccess(true);
      const dest = redirect ?? (data.user.role === "ADMIN" ? "/admin" : data.user.role === "VENDOR" ? "/vendor/dashboard" : "/");
      router.push(dest);
      router.refresh();
    } catch {
      setError("Connexion perdue. Réessayez.");
      setLoading(false);
    }
  }

  function change(i: number, v: string) {
    const clean = v.replace(/\D/g, "");
    const next = [...code];
    if (clean.length > 1) {
      // Pasted or autofilled code
      clean.slice(0, 6).split("").forEach((d, k) => { if (i + k < 6) next[i + k] = d; });
    } else next[i] = clean;
    setCode(next);
    const firstEmpty = next.findIndex((d) => !d);
    if (firstEmpty === -1) submit(next.join(""));
    else if (clean) refs.current[Math.min(firstEmpty, 5)]?.focus();
  }

  async function resend() {
    const res = await fetch("/api/auth/send-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) });
    const d = await res.json().catch(() => ({}));
    if (d.devCode) setDevCode(d.devCode);
    setCode(["", "", "", "", "", ""]);
    setError("");
    setResent(true);
    refs.current[0]?.focus();
  }

  if (success) {
    return (
      <AuthShell>
        <div className="flex flex-col items-center gap-3 text-center">
          <CheckCircle2 className="h-14 w-14 text-gain" aria-hidden="true" />
          <h1 className="text-2xl font-semibold">Vous êtes connecté</h1>
          <p className="text-ink-muted">Un instant…</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h1 className="text-[34px] font-semibold leading-tight tracking-[-0.035em]">Entrez le code</h1>
      <p className="mt-2 text-[15px] text-ink-muted">
        Envoyé par SMS au {formatPhone(phone)}. <Link href="/auth/login" className="text-brand-dark hover:underline">Changer de numéro</Link>
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (code.every(Boolean)) submit(code.join(""));
        }}
        className="mt-8 flex flex-col gap-5"
      >
        <fieldset>
          <legend className="sr-only">Code à 6 chiffres</legend>
          <div className="flex justify-between gap-2">
            {code.map((d, i) => (
              <input
                key={i}
                ref={(el) => { refs.current[i] = el; }}
                value={d}
                onChange={(e) => change(i, e.target.value)}
                onKeyDown={(e) => { if (e.key === "Backspace" && !code[i] && i > 0) refs.current[i - 1]?.focus(); }}
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                aria-label={`Chiffre ${i + 1}`}
                className="h-16 w-full min-w-0 rounded-control border-[1.5px] border-line-strong bg-white text-center text-2xl font-semibold text-ink outline-none focus:border-brand focus:ring-4 focus:ring-brand/15"
              />
            ))}
          </div>
        </fieldset>
        <label className="field">
          Votre prénom et nom (première connexion)
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Facultatif si vous avez déjà un compte" />
        </label>
        {error && <p role="alert" className="rounded-xl bg-pop-tint px-3 py-2.5 text-sm text-pop-dark">{error}</p>}
        <button type="submit" disabled={loading || !code.every(Boolean)} className="btn-primary h-14 rounded-control text-[17px]">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Se connecter"}
        </button>
        <button type="button" onClick={resend} className="text-sm text-brand-dark hover:underline">
          {resent ? "Nouveau code envoyé" : "Renvoyer le code"}
        </button>
      </form>
      {devCode && (
        <p className="mt-6 rounded-2xl bg-amber-50 p-4 text-[13px] text-amber-900">
          Mode développement, code reçu : <b className="font-semibold tracking-widest" data-testid="dev-otp">{devCode}</b>
        </p>
      )}
    </AuthShell>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
