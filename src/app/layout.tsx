import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Shell } from "@/components/shell";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap", weight: ["400", "500", "600", "700"] });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap", weight: ["400", "500"] });

export const metadata: Metadata = {
  title: { default: "Locus Studio", template: "Locus Studio" },
  description: "Locus Studio",
  applicationName: "Locus Studio",
  openGraph: { title: "Locus Studio", description: "Locus Studio", siteName: "Locus Studio", type: "website", locale: "fr_FR" },
  twitter: { card: "summary", title: "Locus Studio", description: "Locus Studio" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${geist.variable} ${mono.variable}`}>
      <body className="min-h-dvh font-sans">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
