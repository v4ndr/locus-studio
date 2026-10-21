import type { Metadata } from "next";
import { home, isLang, type Lang } from "@/i18n";
import { alternates } from "@/lib/alternates";
import { HomePage } from "@/sandbox/home/home-page";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const l: Lang = isLang(lang) ? lang : "fr";
  return { title: { absolute: home[l].meta.title }, description: home[l].meta.description, alternates: alternates(l, "") };
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return <HomePage lang={isLang(lang) ? lang : "fr"} />;
}
