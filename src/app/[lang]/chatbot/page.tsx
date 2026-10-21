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
 * La saisie libre et le live sont réservés aux comptes connectés. La page
 * reste statique : le compte est lu côté navigateur (`useStudioAccount`,
 * zone Accès) et les routes `/api/chatbot/*` le revérifient côté serveur
 * (`guardLive` → `getStudioUserId`). Sous `next dev` seulement,
 * `STUDIO_CHATBOT_DEV_CONNECTED=1` simule un compte connecté.
 */
async function connecte(): Promise<boolean> {
  return process.env.NODE_ENV === "development" && process.env.STUDIO_CHATBOT_DEV_CONNECTED === "1";
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const l: Lang = isLang(lang) ? lang : "fr";
  return <ChatbotPage lang={l} devConnected={await connecte()} />;
}
