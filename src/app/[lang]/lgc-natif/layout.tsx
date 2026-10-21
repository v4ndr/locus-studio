import type { Metadata } from "next";
import { isLang, studio, type Lang } from "@/i18n";

/** LGC natif IA : le Studio historique, déplacé sous `/[lang]/lgc-natif`, dans la coque Noir. */
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const l: Lang = isLang(lang) ? lang : "fr";
  // Pas d'`alternates` ici : hérités, ils donneraient à chaque dossier patient l'accueil du LGC pour canonique. Voir `page.tsx`.
  return { title: { absolute: `${studio[l].meta.title} · Locus Studio` }, description: studio[l].meta.description };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
