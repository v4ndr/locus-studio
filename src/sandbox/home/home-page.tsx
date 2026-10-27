import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen } from "lucide-react";
import { common, home, route, TOOLS, type Lang } from "@/i18n";
import { TOOL_ICONS, cibleOutil } from "@/components/shell/tool-icons";
import { LocusMarkMotion } from "@/components/shell/locus-mark-motion";

/** L'adresse de l'équipe, pour une clé d'API ou un accès MCP. */
const CONTACT = "contact@locusmedical.fr";

/**
 * L'accueil des sandbox, au DS de la landing : la couverture verte avec la
 * marque en mouvement, les quatre sandbox en cartes papier (un nom, quelques
 * mots), puis un seul appel : intégrer (la documentation), et pour une clé
 * d'API ou un accès MCP, nous écrire. Rien d'autre.
 */
export function HomePage({ lang }: { lang: Lang }) {
  const t = home[lang];
  const c = common[lang];
  return (
    <main className="mx-auto grid w-full max-w-[1272px] gap-4 px-4 pb-12 pt-2 min-[821px]:gap-5 min-[821px]:px-8 min-[821px]:pt-4">
      <section className="cover grid items-center gap-8 rounded-[20px] px-6 py-10 min-[821px]:grid-cols-[minmax(0,1fr)_auto] min-[821px]:px-12 min-[821px]:py-14">
        <div className="grid gap-5">
          <p className="eyebrow m-0">{t.eyebrow}</p>
          <h1 className="m-0 text-[52px] leading-[1.02] tracking-[-.03em] min-[821px]:text-[88px]">{t.title.a} <span className="lt">{t.title.b}</span></h1>
        </div>
        <LocusMarkMotion size={168} className="text-glow max-[820px]:justify-self-center min-[821px]:mr-4" />
      </section>

      <section aria-labelledby="home-sandbox">
        <h2 id="home-sandbox" className="sr-only">{t.sandbox}</h2>
        <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 min-[641px]:grid-cols-2 min-[1101px]:grid-cols-4 min-[821px]:gap-5">
          {TOOLS.map((k) => {
            const Icon = TOOL_ICONS[k];
            return (
              <li key={k} className="flex">
                <Link href={route(lang, k)} {...cibleOutil(k)} className="group flex w-full flex-col gap-7 rounded-[20px] border border-border bg-card p-5 min-[641px]:gap-12 min-[641px]:p-6 transition-colors hover:border-brand min-[821px]:p-7">
                  <span className="flex items-center justify-between">
                    <span className="tileico"><Icon aria-hidden="true" /></span>
                    <ArrowUpRight size={20} aria-hidden="true" className="text-muted-foreground transition-colors group-hover:text-brand" />
                  </span>
                  <span className="grid gap-1.5">
                    <span className="text-[22px] font-extrabold leading-[1.15] tracking-[-.015em] text-foreground">{c.tools[k]}</span>
                    <span className="text-[15px] text-muted-foreground">{t.cards[k]}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="home-integrer" className="grid gap-10 rounded-[20px] bg-green-ink px-6 py-9 text-on-green min-[821px]:grid-cols-2 min-[821px]:items-end min-[821px]:px-12 min-[821px]:py-12 dark:border dark:border-border dark:bg-[#1c2f2c]">
        <div className="grid justify-items-start gap-6">
          <p className="eyebrow m-0 text-glow">{t.integrate.eyebrow}</p>
          <h2 id="home-integrer" className="m-0 text-[36px] leading-[1.06] min-[821px]:text-[52px]">{t.integrate.title.a} <span className="lt text-glow">{t.integrate.title.b}</span></h2>
          <Link href={route(lang, "documentation")} className="inline-flex h-12 items-center gap-2.5 rounded-full bg-lin px-[22px] text-[15px] font-semibold text-green-ink transition-colors hover:bg-white [&_svg]:size-[17px]">
            <BookOpen aria-hidden="true" />{t.integrate.docs}<ArrowRight aria-hidden="true" />
          </Link>
        </div>
        <div className="grid min-w-0 justify-items-start gap-3">
          <p className="eyebrow m-0 text-glow">{t.integrate.access}</p>
          <a href={`mailto:${CONTACT}?subject=${encodeURIComponent(t.integrate.subject)}`} className="inline-flex max-w-full items-center gap-3 border-b border-on-green/35 pb-1.5 text-[20px] font-extrabold tracking-[-.02em] text-on-green [overflow-wrap:anywhere] hover:border-on-green min-[821px]:text-[34px]">
            {CONTACT}<ArrowUpRight aria-hidden="true" className="size-[.8em] shrink-0 text-glow" />
          </a>
        </div>
      </section>
    </main>
  );
}
