import type { Metadata } from "next";
import { isLang, ressources, type Lang } from "@/i18n";
import { alternates } from "@/lib/alternates";
import { KeysPage } from "@/sandbox/ressources/keys-page";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const l: Lang = isLang(lang) ? lang : "fr";
  return { title: ressources[l].keys.meta.title, description: ressources[l].keys.meta.description, alternates: alternates(l, "/cles-api") };
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return <KeysPage lang={isLang(lang) ? lang : "fr"} />;
}
