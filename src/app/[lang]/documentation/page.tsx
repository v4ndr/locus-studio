import type { Metadata } from "next";
import { isLang, ressources, type Lang } from "@/i18n";
import { alternates } from "@/lib/alternates";
import { DocsPage } from "@/sandbox/ressources/docs-page";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const l: Lang = isLang(lang) ? lang : "fr";
  return { title: ressources[l].docs.meta.title, description: ressources[l].docs.meta.description, alternates: alternates(l, "/documentation") };
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return <DocsPage lang={isLang(lang) ? lang : "fr"} />;
}
