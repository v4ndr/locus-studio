import Link from "next/link";
import { ArrowRight, BookOpen, Check, FileText, Filter, Pill } from "lucide-react";
import { common, ressources, route, type Lang } from "@/i18n";
import { PageHead, PageInner } from "@/components/shell/page-inner";
import { buttonClass } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Box, Card, CardBody, CardIcon, CardText, CardTitle } from "@/components/ui/card";
import { Rich, SectionTitle } from "./rich";

/** Les corpus que Locus interroge : éditeurs vérifiés dans core, sans chiffres. */
export function SourcesPage({ lang }: { lang: Lang }) {
  const t = ressources[lang].sources;
  const c = common[lang];
  const icons = [FileText, Pill];
  return (
    <PageInner>
      <PageHead title={t.title}>
        <Link href={route(lang, "documentation")} className={buttonClass()}><BookOpen aria-hidden="true" />{t.docsCta}</Link>
      </PageHead>
      <p className="m-0 -mt-4 max-w-[68ch] text-[15px] text-muted-foreground">{t.lead}</p>

      <section className="grid gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <SectionTitle>{t.corpusTitle}</SectionTitle>
          <span className="text-[13px] text-muted-foreground">{t.corpusNote}</span>
        </div>
        <div className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-2">
          {t.publishers.map((p, i) => {
            const Icon = icons[i] ?? FileText;
            return (
              <Card key={p.id}>
                <CardBody className="flex flex-col gap-3 pb-5">
                  <div className="flex items-start justify-between gap-3">
                    <CardIcon className="mb-0"><Icon aria-hidden="true" /></CardIcon>
                    <Badge>{p.kind}</Badge>
                  </div>
                  <div className="grid gap-1.5">
                    <CardTitle>{p.name}</CardTitle>
                    <CardText>{p.text}</CardText>
                  </div>
                  <ul className="m-0 grid list-none gap-1.5 pl-0 text-[13.5px]">
                    {p.items.map((x) => <li key={x} className="flex items-center gap-2"><Check size={16} aria-hidden="true" className="shrink-0 text-muted-foreground" />{x}</li>)}
                  </ul>
                  <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border pt-3 text-[12.5px] text-muted-foreground">
                    {p.filter
                      ? <><span>{t.idLabel}</span><Badge variant="pill">{p.id}</Badge><span className="flex-1" /><span className="inline-flex items-center gap-1.5"><Filter size={14} aria-hidden="true" /><Rich text={t.filterYes} /></span></>
                      : <span>{t.filterNo}</span>}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="grid gap-3">
        <SectionTitle>{t.howTitle}</SectionTitle>
        <Box>
          <ul className="m-0 list-none py-1 pl-0">
            {t.how.map((h, i) => (
              <li key={h.title} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 px-6 py-3.5 [&+&]:border-t [&+&]:border-border">
                <span className="grid size-7 place-items-center rounded-[7px] border border-input font-mono text-[11.5px] text-muted-foreground">{i + 1}</span>
                <div><b className="block font-medium">{h.title}</b><p className="m-0 mt-0.5 text-[13.5px] text-muted-foreground"><Rich text={h.text} /></p></div>
              </li>
            ))}
          </ul>
        </Box>
      </section>

      <Box className="grid gap-1.5 px-6 py-5">
        <h2 className="m-0 text-[15px] font-semibold tracking-[-.01em]">{t.listTitle}</h2>
        <p className="m-0 text-[13.5px] text-muted-foreground"><Rich text={t.listText} /></p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link href={`${route(lang, "documentation")}#params`} className={buttonClass({ size: "sm" })}>{t.docsCta}<ArrowRight aria-hidden="true" /></Link>
          <Link href={route(lang, "chatbot")} className={buttonClass({ size: "sm", variant: "ghost" })}>{c.tools.chatbot}<ArrowRight aria-hidden="true" /></Link>
        </div>
      </Box>
    </PageInner>
  );
}
