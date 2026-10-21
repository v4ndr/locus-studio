import type { Metadata } from "next";
import { isLang, ressources, type Lang } from "@/i18n";
import { alternates } from "@/lib/alternates";
import { SourcesPage } from "@/sandbox/ressources/sources-page";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const l: Lang = isLang(lang) ? lang : "fr";
  return { title: ressources[l].sources.meta.title, description: ressources[l].sources.meta.description, alternates: alternates(l, "/sources") };
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return <SourcesPage lang={isLang(lang) ? lang : "fr"} />;
}
