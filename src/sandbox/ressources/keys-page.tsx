import Link from "next/link";
import { BookOpen, KeyRound, Plus } from "lucide-react";
import { common, ressources, route, type Lang } from "@/i18n";
import { PageHead, PageInner } from "@/components/shell/page-inner";
import { buttonClass } from "@/components/ui/button";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Box, CardIcon } from "@/components/ui/card";
import { Rich, SectionTitle } from "./rich";

/** Clés API : délivrées sur invitation, renvoi vers la demande d'accès. */
export function KeysPage({ lang }: { lang: Lang }) {
  const t = ressources[lang].keys;
  const c = common[lang];
  return (
    <PageInner>
      <PageHead title={t.title} />
      <p className="m-0 -mt-4 max-w-[68ch] text-[15px] text-muted-foreground">{t.lead}</p>

      <Box className="grid gap-3 px-6 py-6 min-[700px]:grid-cols-[minmax(0,1fr)_auto] min-[700px]:items-center">
        <div className="grid gap-1.5">
          <CardIcon><KeyRound aria-hidden="true" /></CardIcon>
          <h2 className="m-0 flex items-center gap-2 text-[15px] font-semibold tracking-[-.01em]">{t.boxTitle}<Badge variant="secondary">{c.nav.invite}</Badge></h2>
          <p className="m-0 max-w-[60ch] text-[13.5px] text-muted-foreground">{t.boxText}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={route(lang, "acces")} className={buttonClass({ variant: "primary" })}><Plus aria-hidden="true" />{t.request}</Link>
          <Link href={route(lang, "documentation")} className={buttonClass()}><BookOpen aria-hidden="true" />{t.docs}</Link>
        </div>
      </Box>

      <section className="grid gap-3">
        <SectionTitle>{t.stepsTitle}</SectionTitle>
        <ol className="m-0 grid list-none grid-cols-1 gap-3 pl-0 min-[900px]:grid-cols-3">
          {t.steps.map((s, i) => (
            <li key={s.title} className="grid content-start gap-1.5 rounded-xl border border-border bg-card p-5 shadow-sm">
              <span className="font-mono text-[11.5px] text-muted-foreground">0{i + 1}</span>
              <b className="font-medium">{s.title}</b>
              <p className="m-0 text-[13.5px] text-muted-foreground"><Rich text={s.text} /></p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-3">
        <SectionTitle>{t.formatTitle}</SectionTitle>
        <p className="m-0 max-w-[68ch] text-[13.5px] text-muted-foreground"><Rich text={t.formatText} /></p>
        <div className="rounded-xl border border-border bg-card px-4 py-3 font-mono text-[12.5px] shadow-sm [overflow-wrap:anywhere]">Authorization: Bearer lsk_&lt;slug&gt;_&lt;random&gt;</div>
      </section>

      <p className="m-0 flex items-center gap-2 text-[13px] text-muted-foreground"><StatusDot active={false} />{t.sandboxNote}</p>
    </PageInner>
  );
}
