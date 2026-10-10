import Link from "next/link";
import Logo from "@/components/brand/Logo";

export default function Footer() {
  return (
    <footer className="mt-20 bg-ink text-white/80">
      <div className="container-page flex flex-wrap gap-x-16 gap-y-8 py-12 text-sm">
        <div className="flex-[1_1_260px]">
          <Logo tone="white" tagline />
          <p className="mt-2.5 max-w-[24em] leading-relaxed">
            La tech reconditionnée, contrôlée et garantie en Tunisie. Payée à la livraison.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <b className="font-semibold text-white">Acheter</b>
          <Link href="/catalog?category=iphone" className="hover:text-white">iPhone</Link>
          <Link href="/catalog?category=android" className="hover:text-white">Téléphones Android</Link>
          <Link href="/catalog?type=laptop" className="hover:text-white">Ordinateurs</Link>
          <Link href="/catalog?category=ipad" className="hover:text-white">Tablettes</Link>
          <Link href="/catalog?category=montres" className="hover:text-white">Montres et consoles</Link>
        </div>
        <div className="flex flex-col gap-2">
          <b className="font-semibold text-white">Aide</b>
          <Link href="/grading" className="hover:text-white">Les états</Link>
          <Link href="/garanties" className="hover:text-white">Garantie 12 mois et retours</Link>
          <Link href="/comment-ca-marche" className="hover:text-white">Comment ça marche</Link>
          <Link href="/contact" className="hover:text-white">Nous contacter</Link>
        </div>
        <div className="flex flex-col gap-2">
          <b className="font-semibold text-white">Partenaires</b>
          <Link href="/vendor/dashboard" className="hover:text-white">Espace partenaire</Link>
          <Link href="/vendor/apply" className="hover:text-white">Rejoindre Bonétat</Link>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-wrap justify-between gap-2 py-5 text-xs text-white/55">
          <span>© {new Date().getFullYear()} Bonétat</span>
          <span>Paiement à la livraison partout en Tunisie</span>
        </div>
      </div>
    </footer>
  );
}
