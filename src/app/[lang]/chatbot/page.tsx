import type { Metadata } from "next";
import { chatbot, isLang, type Lang } from "@/i18n";
import { alternates } from "@/lib/alternates";
import { ChatbotPage } from "@/sandbox/chatbot";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const l: Lang = isLang(lang) ? lang : "fr";
  return { title: chatbot[l].meta.title, description: chatbot[l].meta.description, alternates: alternates(l, "/chatbot") };
}

/**
 * La page est derrière le mur d'accès : qui l'atteint a un compte, et chaque
 * question part en direct (`/api/chatbot/*`, revérifié par `guardLive`).
 */
export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const l: Lang = isLang(lang) ? lang : "fr";
  return <ChatbotPage lang={l} />;
}
