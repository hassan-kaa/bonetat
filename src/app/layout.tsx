import type { Metadata, Viewport } from "next";
// Self-hosted variable fonts, no request to Google.
// Plus Jakarta Sans: the interface. Readex Pro: the "Bonétat" wordmark only (the logo was drawn with it),
// and the Arabic fallback until the Arabic version gets its own face.
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/readex-pro";
import "./globals.css";
import { THEME, THEMES } from "@/lib/theme";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Bonétat · La tech reconditionnée, contrôlée et garantie en Tunisie",
    template: "%s | Bonétat",
  },
  description:
    "Téléphones, tablettes, ordinateurs et montres reconditionnés par des ateliers tunisiens vérifiés, contrôlés par Bonétat, garantis 12 mois et payés à la livraison.",
  keywords: ["téléphone reconditionné", "Tunisie", "iPhone occasion", "Samsung reconditionné", "MacBook reconditionné"],
  openGraph: { siteName: "Bonétat", locale: "fr_TN", type: "website", images: [{ url: "/brand/app-icon-512.png", width: 512, height: 512 }] },
};

export const viewport: Viewport = {
  themeColor: THEMES[THEME].browserBar,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-theme={THEME}>
      <body>{children}</body>
    </html>
  );
}
