import type { Metadata } from "next";
import { isLang, studio, type Lang } from "@/i18n";
import { alternates } from "@/lib/alternates";

/** LGC natif IA : le Studio historique, déplacé sous `/[lang]/lgc-natif`, dans la coque Noir. */
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const l: Lang = isLang(lang) ? lang : "fr";
  return { title: { absolute: `${studio[l].meta.title} · Locus Studio` }, description: studio[l].meta.description, alternates: alternates(l, "/lgc-natif") };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
