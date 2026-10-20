import type { Metadata } from "next";
import { scribe, isLang, type Lang } from "@/i18n";
import { alternates } from "@/lib/alternates";
import { ComingSoon } from "@/components/shell/coming-soon";

// Page d'attente : remplacée par la PR de la zone (composants dans src/sandbox/scribe/).
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const l: Lang = isLang(lang) ? lang : "fr";
  return { title: scribe[l].meta.title, description: scribe[l].meta.description, alternates: alternates(l, "/scribe") };
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const l: Lang = isLang(lang) ? lang : "fr";
  return <ComingSoon lang={l} title={scribe[l].meta.title} />;
}
