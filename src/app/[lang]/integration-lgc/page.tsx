import type { Metadata } from "next";
import { lgc, isLang, type Lang } from "@/i18n";
import { alternates } from "@/lib/alternates";
import { IntegrationLgc } from "@/sandbox/integration-lgc";

// Plein écran : la coque console (sidebar, fond) s'efface sur cette route, voir `IMMERSIVE` dans app-shell.
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const l: Lang = isLang(lang) ? lang : "fr";
  return { title: lgc[l].meta.title, description: lgc[l].meta.description, alternates: alternates(l, "/integration-lgc") };
}

export default function Page() {
  return <IntegrationLgc />;
}
