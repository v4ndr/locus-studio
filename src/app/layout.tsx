import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeScript } from "@/components/studio/theme";
import { CabinetProvider } from "@/store/cabinet";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap", weight: ["400", "500", "600", "700"] });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap", weight: ["400", "500"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")),
  title: { default: "Locus Studio", template: "Locus Studio" },
  description: "Locus Studio",
  applicationName: "Locus Studio",
  openGraph: { title: "Locus Studio", description: "Locus Studio", siteName: "Locus Studio", type: "website", locale: "fr_FR", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Locus Studio" }] },
  twitter: { card: "summary_large_image", title: "Locus Studio", description: "Locus Studio", images: ["/og.png"] },
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning className={`${geist.variable} ${mono.variable}`}>
      <body className="min-h-dvh font-sans">
        <ThemeScript />
        <CabinetProvider>{children}</CabinetProvider>
      </body>
    </html>
  );
}
