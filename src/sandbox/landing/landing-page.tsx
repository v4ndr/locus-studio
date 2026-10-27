import Link from "next/link";
import { acces, common, LANGS, route, type Lang } from "@/i18n";
import { LocusMarkMotion } from "@/components/shell/locus-mark-motion";

/**
 * L'entrée (`/[lang]`), seule page publique avec l'accès : la couverture
 * verte de la landing, la marque en mouvement, le nom, et deux portes. Rien d'autre n'est visible avant la
 * connexion ; un compte connecté ne la voit pas (le proxy l'envoie vers la
 * console).
 */
export function LandingPage({ lang }: { lang: Lang }) {
  const t = acces[lang].landing;
  const c = common[lang];
  return (
    <main className="cover grid min-h-dvh grid-rows-[1fr_auto] px-4">
      <div className="grid content-center justify-items-center gap-10 py-16">
        <LocusMarkMotion size={168} className="text-glow" />
        <div className="grid justify-items-center gap-4 text-center">
          <h1 className="m-0 text-[44px] font-extrabold leading-none tracking-[-.03em] min-[821px]:text-[64px]">
            {c.brand.wordmarkA}<span className="lt">{c.brand.wordmarkB}</span>
          </h1>
          <p className="eyebrow m-0">{t.line}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href={route(lang, "acces")} className="inline-flex h-12 items-center rounded-full bg-lin px-[22px] text-[15px] font-semibold text-green-ink transition-colors hover:bg-white">{t.signin}</Link>
          <Link href={route(lang, "acces", "?demande=1")} className="inline-flex h-12 items-center rounded-full border border-on-green/35 px-[22px] text-[15px] font-semibold text-on-green transition-colors hover:border-on-green">{t.request}</Link>
        </div>
      </div>
      <footer className="flex flex-wrap items-center justify-center gap-4 pb-6 text-[12.5px] text-on-green-2">
        <span>{t.foot}</span>
        <nav aria-label={c.language.label} className="flex gap-2 font-mono">
          {LANGS.map((l) => l === lang
            ? <span key={l} aria-current="true" className="font-medium text-on-green">{l.toUpperCase()}</span>
            : <Link key={l} href={route(l, "landing")} hrefLang={l} className="hover:text-on-green">{l.toUpperCase()}</Link>)}
        </nav>
      </footer>
    </main>
  );
}
