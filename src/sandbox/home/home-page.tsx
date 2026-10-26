import Link from "next/link";
import { ArrowRight, BookOpen, Globe, KeyRound, Library, Plug, Zap } from "lucide-react";
import { common, home, route, TOOLS, type Lang } from "@/i18n";
import { TOOL_ICONS } from "@/components/shell/tool-icons";
import { PageHead, PageInner } from "@/components/shell/page-inner";
import { buttonClass } from "@/components/ui/button";
import { Box, Card, CardAction, CardBody, CardFooter, CardIcon, CardText, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/** L'accueil (Main.dc.html) : quatre cartes à égalité, nouveautés, ressources. */
export function HomePage({ lang }: { lang: Lang }) {
  const t = home[lang];
  const c = common[lang];
  const updIcons = [Zap, Globe, Library];
  return (
    <PageInner>
      <PageHead title={t.title}>
        <Link href={route(lang, "documentation")} aria-label={t.docs} title={t.docs} className={buttonClass({ size: "icon", className: "max-[560px]:hidden" })}><BookOpen aria-hidden="true" /></Link>
        <Link href={route(lang, "integration")} className={buttonClass({ variant: "primary" })}><Plug aria-hidden="true" />{t.build}</Link>
      </PageHead>

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="m-0 text-[15px] font-semibold tracking-[-.01em]">{t.sandbox.title}</h2>
          <span className="text-[13px] text-muted-foreground">{t.sandbox.note}</span>
        </div>
        <div className="grid grid-cols-1 gap-3 min-[641px]:grid-cols-2 min-[1720px]:grid-cols-4">
          {TOOLS.map((k) => {
            const Icon = TOOL_ICONS[k];
            const card = t.cards[k];
            return (
              <Link key={k} href={route(lang, k)} className="flex">
                <Card interactive className="w-full">
                  <CardBody>
                    <CardIcon><Icon aria-hidden="true" /></CardIcon>
                    <CardTitle>{c.tools[k]}</CardTitle>
                    <CardText>{card.text}</CardText>
                    <div className="flex flex-wrap gap-[5px]">{card.chips.map((x) => <Badge key={x}>{x}</Badge>)}</div>
                  </CardBody>
                  <CardFooter><CardAction>{card.cta}<ArrowRight aria-hidden="true" /></CardAction></CardFooter>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid items-start gap-3 min-[1101px]:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Box>
          <div className="flex items-center justify-between gap-2.5 border-b border-border px-6 pb-4 pt-5"><h2 className="m-0 text-[15px] font-semibold tracking-[-.01em]">{t.updates.title}</h2></div>
          <ul className="m-0 list-none py-1 pl-0">
            {t.updates.items.map((u, i) => {
              const Icon = updIcons[i] ?? Zap;
              return (
                <li key={u.title} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 px-6 py-3.5 [&+&]:border-t [&+&]:border-border">
                  <span className="grid size-7 place-items-center rounded-[7px] border border-input text-muted-foreground"><Icon size={16} aria-hidden="true" /></span>
                  <div><time className="font-mono text-[11.5px] text-muted-foreground">{u.date}</time><b className="block font-medium">{u.title}</b><p className="m-0 mt-0.5 text-[13px] text-muted-foreground">{u.text}</p></div>
                </li>
              );
            })}
          </ul>
        </Box>
        <section className="grid gap-3">
          <Box className="grid content-start gap-1.5 px-5 py-[18px]">
            <h3 className="m-0 flex items-center gap-2 text-sm font-semibold"><Library size={16} aria-hidden="true" />{c.nav.sources}</h3>
            <p className="m-0 text-[13px] text-muted-foreground">{t.resources.sources.text}</p>
            <Link href={route(lang, "sources")} className={buttonClass({ size: "sm", className: "mt-1 justify-self-start" })}>{t.resources.sources.cta}</Link>
          </Box>
          <Box className="grid content-start gap-1.5 px-5 py-[18px]">
            <h3 className="m-0 flex items-center gap-2 text-sm font-semibold"><BookOpen size={16} aria-hidden="true" />{c.nav.docs}</h3>
            <p className="m-0 text-[13px] text-muted-foreground">{t.resources.docs.text}</p>
            <Link href={route(lang, "documentation")} className={buttonClass({ size: "sm", className: "mt-1 justify-self-start" })}>{t.resources.docs.cta}</Link>
          </Box>
          <Box className="grid content-start gap-1.5 px-5 py-[18px]">
            <h3 className="m-0 flex items-center gap-2 text-sm font-semibold"><KeyRound size={16} aria-hidden="true" />{c.nav.keys}</h3>
            <p className="m-0 text-[13px] text-muted-foreground">{t.resources.keys.text}</p>
            <Link href={route(lang, "clesApi")} className={buttonClass({ size: "sm", className: "mt-1 justify-self-start" })}>{t.resources.keys.cta}</Link>
          </Box>
        </section>
      </div>

    </PageInner>
  );
}
