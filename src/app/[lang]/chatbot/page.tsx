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
 * Compte connecté ? La saisie libre et le live lui sont réservés.
 * TODO(accès) : remplacer par `(await getStudioUser()) !== null` (src/lib/server/user.ts)
 * quand la PR « Accès » l'ajoute. D'ici là, tout visiteur est « non connecté » :
 * l'écran tourne en scénarios rejoués. Sous `next dev`, `STUDIO_CHATBOT_DEV_CONNECTED=1`
 * simule un compte connecté pour essayer le live.
 */
async function connecte(): Promise<boolean> {
  return process.env.NODE_ENV === "development" && process.env.STUDIO_CHATBOT_DEV_CONNECTED === "1";
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const l: Lang = isLang(lang) ? lang : "fr";
  return <ChatbotPage lang={l} connected={await connecte()} />;
}
