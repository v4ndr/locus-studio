import { redirect } from "next/navigation";
import { isLang, route } from "@/i18n";

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  redirect(route(isLang(lang) ? lang : "fr", "lgcNatif", "/inbox/courriers"));
}
