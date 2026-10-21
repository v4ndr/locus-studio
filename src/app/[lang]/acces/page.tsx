import type { Metadata } from "next";
import { acces, isLang, type Lang } from "@/i18n";
import { alternates } from "@/lib/alternates";
import { AccesPage } from "@/sandbox/acces/acces-page";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const l: Lang = isLang(lang) ? lang : "fr";
  return { title: acces[l].meta.title, description: acces[l].meta.description, alternates: alternates(l, "/acces") };
}

type Search = Record<string, string | string[] | undefined>;
const un = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

/**
 * `?invited=1` : retour du lien d'invitation (core pose ce `redirect_url`).
 * Clerk y ajoute `__clerk_ticket` et `__clerk_status` (`sign_up` ou `sign_in`).
 */
export default async function Page({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<Search> }) {
  const { lang } = await params;
  const sp = await searchParams;
  const ticket = un(sp.__clerk_ticket);
  return (
    <AccesPage
      lang={isLang(lang) ? lang : "fr"}
      invited={un(sp.invited) === "1" || !!ticket}
      ticket={ticket && ticket.length < 4096 ? ticket : null}
      ticketStatus={un(sp.__clerk_status)}
    />
  );
}
