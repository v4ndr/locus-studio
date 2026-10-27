import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { DM_Sans, Geist_Mono } from "next/font/google";
import "../globals.css";
import { ThemeScript } from "@/components/shell/theme";
import { AppShell } from "@/components/shell/app-shell";
import { LangProvider } from "@/i18n/lang";
import { LANGS, isLang } from "@/i18n";
import { CabinetProvider } from "@/store/cabinet";
import { AuthRoot } from "@/sandbox/acces/auth-root";
import { StudioAnalytics } from "@/components/shell/analytics";

/* Les polices de la landing : DM Sans (variable, avec l'italique léger des accents) et Geist Mono. */
const sans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap", style: ["normal", "italic"], axes: ["opsz"] });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });

export function generateStaticParams() { return LANGS.map((lang) => ({ lang })); }

export const viewport: Viewport = { themeColor: "#f3efe8", colorScheme: "light dark" };

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")),
    title: { default: "Locus Studio", template: "%s · Locus Studio" },
    description: "Locus Studio",
    applicationName: "Locus Studio",
    openGraph: { title: "Locus Studio", description: "Locus Studio", siteName: "Locus Studio", type: "website", locale: lang === "en" ? "en_US" : "fr_FR", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Locus Studio" }] },
    twitter: { card: "summary_large_image", title: "Locus Studio", description: "Locus Studio", images: ["/og.png"] },
    icons: { icon: "/icon.svg" },
  };
}

export default async function RootLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <html lang={lang} suppressHydrationWarning className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh font-sans">
        <ThemeScript />
        <LangProvider lang={lang}>
          <AuthRoot lang={lang}>
            <StudioAnalytics />
            <CabinetProvider>
              <AppShell>{children}</AppShell>
            </CabinetProvider>
          </AuthRoot>
        </LangProvider>
      </body>
    </html>
  );
}
