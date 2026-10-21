import { homeData } from "@/studio/view.server";
import { Home } from "@/components/studio/home";
import type { Metadata } from "next";
import { isLang } from "@/i18n";
import { alternates } from "@/lib/alternates";

export const dynamic = "force-static";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return { alternates: alternates(isLang(lang) ? lang : "fr", "/lgc-natif") };
}

export default function Page() {
  return <Home data={homeData()} />;
}
