import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Shell } from "@/components/shell";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Locus Studio — le LGC agentique",
  description: "Un cabinet de médecine générale AI-native, posé sur locus-core. Projet de recherche ouvert.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`dark ${inter.variable} ${mono.variable}`}>
      <body className="min-h-dvh">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
