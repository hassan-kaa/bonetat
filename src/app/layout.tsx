import type { Metadata, Viewport } from "next";
// Self-hosted variable font (Latin + Arabic), no request to Google
import "@fontsource-variable/readex-pro";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Bonétat · La tech reconditionnée, contrôlée et garantie en Tunisie",
    template: "%s | Bonétat",
  },
  description:
    "Téléphones, tablettes, ordinateurs et montres reconditionnés par des ateliers tunisiens vérifiés, contrôlés par Bonétat, garantis 12 mois et payés à la livraison.",
  keywords: ["téléphone reconditionné", "Tunisie", "iPhone occasion", "Samsung reconditionné", "MacBook reconditionné"],
  openGraph: { siteName: "Bonétat", locale: "fr_TN", type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#1747C8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
