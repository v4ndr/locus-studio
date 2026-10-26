import type { Metadata } from "next";
import { acces, isLang, type Lang } from "@/i18n";
import { alternates } from "@/lib/alternates";
import { LandingPage } from "@/sandbox/landing/landing-page";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const l: Lang = isLang(lang) ? lang : "fr";
  return { title: { absolute: acces[l].landing.meta.title }, description: acces[l].landing.meta.description, alternates: alternates(l, "") };
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return <LandingPage lang={isLang(lang) ? lang : "fr"} />;
}
