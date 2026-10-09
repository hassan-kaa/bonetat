import Link from "next/link";
import Logo from "@/components/brand/Logo";
import DeviceArt from "@/components/products/DeviceArt";

/** Split layout for login/verify: the form, and the blue Bonétat stage */
export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-wrap bg-chalk">
      <div className="flex min-w-0 flex-[1_1_480px] flex-col px-6 py-6 sm:px-10">
        <Logo />
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[400px]">{children}</div>
        </div>
        <p className="text-[13px] text-ink-muted">
          Besoin d’aide ? <Link href="/contact" className="text-brand hover:underline">Contactez Bonétat</Link>
        </p>
      </div>
      <div aria-hidden="true" className="relative hidden flex-[1_1_420px] items-center justify-center overflow-hidden bg-brand lg:flex">
        <span className="absolute h-[520px] w-[520px] rounded-full border-[1.5px] border-white/15" />
        <span className="absolute h-[360px] w-[360px] rounded-full bg-white/[.07]" />
        <span className="relative -rotate-6"><DeviceArt kind="PHONE" color="#43544A" cameras={3} width={200} /></span>
        <p className="absolute bottom-10 left-10 right-10 text-[28px] font-semibold leading-tight tracking-[-0.03em] text-white">
          Votre numéro suffit. Pas de mot de passe à retenir.
        </p>
      </div>
    </div>
  );
}
