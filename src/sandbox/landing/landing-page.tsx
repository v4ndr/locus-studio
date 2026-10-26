import Link from "next/link";
import { acces, common, LANGS, route, type Lang } from "@/i18n";
import { buttonClass } from "@/components/ui/button";
import { LocusMarkMotion } from "@/components/shell/locus-mark-motion";

/**
 * L'entrée (`/[lang]`), seule page publique avec l'accès : la marque en
 * mouvement, le nom, et deux portes. Rien d'autre n'est visible avant la
 * connexion ; un compte connecté ne la voit pas (le proxy l'envoie vers la
 * console).
 */
export function LandingPage({ lang }: { lang: Lang }) {
  const t = acces[lang].landing;
  const c = common[lang];
  return (
    <main className="grid min-h-dvh grid-rows-[1fr_auto] px-4">
      <div className="grid content-center justify-items-center gap-10 py-16">
        <LocusMarkMotion size={168} className="text-foreground" />
        <div className="grid justify-items-center gap-3 text-center">
          <h1 className="m-0 text-[34px] font-normal leading-none tracking-[-1px]">
            {c.brand.wordmarkA}<span className="text-muted-foreground">{c.brand.wordmarkB}</span>
          </h1>
          <p className="m-0 text-[15px] text-muted-foreground">{t.line}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href={route(lang, "acces")} className={buttonClass({ variant: "primary" })}>{t.signin}</Link>
          <Link href={route(lang, "acces", "?demande=1")} className={buttonClass()}>{t.request}</Link>
        </div>
      </div>
      <footer className="flex flex-wrap items-center justify-center gap-4 pb-6 text-[12.5px] text-muted-foreground">
        <span>{t.foot}</span>
        <nav aria-label={c.language.label} className="flex gap-2">
          {LANGS.map((l) => l === lang
            ? <span key={l} aria-current="true" className="font-medium text-foreground">{l.toUpperCase()}</span>
            : <Link key={l} href={route(l, "landing")} hrefLang={l} className="hover:text-foreground">{l.toUpperCase()}</Link>)}
        </nav>
      </footer>
    </main>
  );
}
