import type * as React from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { ressources, route, type Lang } from "@/i18n";
import type { DocEndpoint, DocField, DocGroup } from "@/i18n/ressources";
import { PageHead, PageInner } from "@/components/shell/page-inner";
import { buttonClass } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Box } from "@/components/ui/card";
import { CodeBlock, CopyButton } from "./code-block";
import { Rich, SectionTitle } from "./rich";

export const BASE_URL = "https://core.locusmedical.fr";

/** Les extraits de code, construits ici pour rester alignés sur les routes réelles de core. */
function snippets(lang: Lang) {
  const t = ressources[lang].docs.examples;
  const body = { query: t.question, mode: "rapide", patient_ehr: t.ehr, app_surface: "embed" };
  const json = JSON.stringify(body, null, 2);
  const curl = [
    `curl -N ${BASE_URL}/v2/retrieve/stream \\`,
    `  -H "Authorization: Bearer $LOCUS_API_KEY" \\`,
    `  -H "X-Locus-User-Ref: usr_8f3a2c" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '${json}'`,
  ].join("\n");
  const ts = `const resp = await fetch("${BASE_URL}/v2/retrieve/stream", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.LOCUS_API_KEY}\`,
    "X-Locus-User-Ref": user.ref,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(${json.split("\n").join("\n  ")}),
});
if (!resp.ok || !resp.body) throw new Error(\`HTTP \${resp.status}\`);

const reader = resp.body.getReader();
const decoder = new TextDecoder();
let buffer = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split("\\n");
  buffer = lines.pop() ?? ""; // ${lang === "fr" ? "ligne incomplète : on la garde" : "incomplete line: keep it"}

  for (const line of lines) {
    if (!line.trim()) continue;
    const event = JSON.parse(line);
    if (event.step === "done") render(event.payload); // answer, docs, drugs…
    else if (event.step === "error") throw new Error(event.detail);
    else showProgress(event.step); // ${t.progress}
  }
}`;
  const ndjson = [
    `{"step": "…"}`,
    `{"step": "…"}`,
    `{"step": "done", "payload": {"trace_id": "…", "answer": "…", "answer_short": "…", "docs": […], "drugs": […], "elicitations": […], "source_scope": null}}`,
  ].join("\n");
  const head = (method: string, path: string, auth = "Bearer lsk_…") => `${method} ${path}\nAuthorization: ${auth}\nContent-Type: application/json\n\n`;
  const logic = head("POST", "/v2/logic/compute") + JSON.stringify({ mku_key: t.logicKey, answers: { [t.logicQuestion]: t.logicChoice } }, null, 2);
  const feedback = head("POST", "/v2/feedback") + JSON.stringify({ trace_id: "…", vote: -1, note: "…" }, null, 2);
  const session = [
    `curl ${BASE_URL}/v2/session-token \\`,
    `  -H "Authorization: Bearer $LOCUS_API_KEY" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '${JSON.stringify({ user_ref: t.account })}'`,
  ].join("\n");
  return { curl, ts, ndjson, logic, feedback, session };
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="border-b border-border px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{children}</th>;
}
function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return <td className={mono ? "whitespace-nowrap px-4 py-2.5 align-top font-mono text-[12.5px]" : "px-4 py-2.5 align-top text-[13.5px] text-muted-foreground"}>{children}</td>;
}
function Table({ head, children }: { head: React.ReactNode; children: React.ReactNode }) {
  return (
    <Box className="overflow-x-auto">
      <table className="w-full border-collapse [&_tbody_tr+tr]:border-t [&_tbody_tr+tr]:border-border max-[640px]:[&_thead]:hidden max-[640px]:[&_tr]:block max-[640px]:[&_tr]:py-2.5 max-[640px]:[&_td]:block max-[640px]:[&_td]:whitespace-normal max-[640px]:[&_td]:py-0.5">
        <thead><tr>{head}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </Box>
  );
}

function P({ text }: { text: string }) {
  return <p className="m-0 max-w-[68ch] text-[14px] leading-relaxed text-muted-foreground"><Rich text={text} /></p>;
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="m-0 mt-1 text-sm font-semibold">{children}</h3>;
}

/** Un tableau de champs : nom (requis ou non), type, rôle. */
function Fields({ lang, rows }: { lang: Lang; rows: DocField[] }) {
  const t = ressources[lang].docs.params;
  return (
    <Table head={<><Th>{t.name}</Th><Th>{t.type}</Th><Th>{t.desc}</Th></>}>
      {rows.map((r) => (
        <tr key={r.name}>
          <Td mono>{r.name}{r.required && <span className="ml-1.5 font-sans text-[11px] text-muted-foreground">{t.required}</span>}</Td>
          <Td mono><span className="text-muted-foreground">{r.type || "—"}</span></Td>
          <Td><Rich text={r.desc} /></Td>
        </tr>
      ))}
    </Table>
  );
}

/** Un endpoint : méthode et chemin réels, accès, rôle, champs, réponse, erreurs propres. */
function Endpoint({ lang, e }: { lang: Lang; e: DocEndpoint }) {
  const t = ressources[lang].docs;
  return (
    <div className="grid min-w-0 gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="pill">{e.method}</Badge>
        <code className="min-w-0 font-mono text-[13.5px] font-medium [overflow-wrap:anywhere]">{e.path}</code>
      </div>
      <p className="m-0 text-xs text-muted-foreground"><Rich text={t.access.long[e.auth]} /></p>
      <P text={e.summary} />
      {e.params && e.where && <><span className="mt-1 text-xs font-medium text-muted-foreground">{t.params.where[e.where]}</span><Fields lang={lang} rows={e.params} /></>}
      {e.returns && <><span className="mt-1 text-xs font-medium text-muted-foreground">{t.params.returns}</span><Fields lang={lang} rows={e.returns} /></>}
      {e.errors && <p className="m-0 max-w-[68ch] text-[13px] leading-relaxed text-muted-foreground"><span className="mr-1.5 font-medium text-foreground">{t.params.errors}</span><Rich text={e.errors} /></p>}
    </div>
  );
}

/** La documentation de l'API : uniquement les routes que core sert, regroupées par usage. */
export function DocsPage({ lang }: { lang: Lang }) {
  const t = ressources[lang].docs;
  const s = t.sections;
  const code = snippets(lang);
  const groups: DocGroup[] = t.groups;
  const ids = ["auth", "user", "overview", ...groups.map((g) => g.id), "workflows", "errors"] as const;

  /** Ce qui suit les endpoints d'un groupe : flux, réponse et exemples pour la question, un extrait ailleurs. */
  const extra: Partial<Record<DocGroup["id"], React.ReactNode>> = {
    answer: (
      <>
        <H3>{t.params.headers}</H3>
        <Table head={<><Th>{t.params.name}</Th><Th>{t.params.desc}</Th></>}>
          {t.answer.headerRows.map((r) => (
            <tr key={r.name}>
              <Td mono>{r.name}{r.required && <span className="ml-1.5 font-sans text-[11px] text-muted-foreground">{t.params.required}</span>}</Td>
              <Td><Rich text={r.desc} /></Td>
            </tr>
          ))}
        </Table>
        <H3>{t.answer.linesTitle}</H3>
        <P text={t.answer.linesLead} />
        <Table head={<><Th>step</Th><Th>{t.params.desc}</Th></>}>
          {t.answer.lines.map((r) => <tr key={r.step}><Td mono>{r.step}</Td><Td><Rich text={r.desc} /></Td></tr>)}
        </Table>
        <CodeBlock title="NDJSON" copy={t.copy} copied={t.copied} snippets={[{ id: "n", label: "NDJSON", code: code.ndjson }]} />
        <H3>{t.answer.payloadTitle}</H3>
        <P text={t.answer.payloadLead} />
        <Table head={<><Th>{t.params.name}</Th><Th>{t.params.desc}</Th></>}>
          {t.answer.payload.map((r) => <tr key={r.name}><Td mono>{r.name}</Td><Td><Rich text={r.desc} /></Td></tr>)}
        </Table>
        <H3>{t.answer.examplesTitle}</H3>
        <CodeBlock title={t.answer.examplesTitle} copy={t.copy} copied={t.copied} snippets={[{ id: "curl", label: t.examples.curl, code: code.curl }, { id: "ts", label: t.examples.ts, code: code.ts }]} />
        <P text={t.answer.buffer} />
      </>
    ),
    logic: <CodeBlock title="HTTP" copy={t.copy} copied={t.copied} snippets={[{ id: "l", label: "HTTP", code: code.logic }]} />,
    feedback: <CodeBlock title="HTTP" copy={t.copy} copied={t.copied} snippets={[{ id: "f", label: "HTTP", code: code.feedback }]} />,
    widget: <CodeBlock title={t.examples.curl} copy={t.copy} copied={t.copied} snippets={[{ id: "s", label: t.examples.curl, code: code.session }]} />,
  };

  return (
    <PageInner>
      <PageHead title={t.title}>
        <Link href={route(lang, "clesApi")} className={buttonClass()}><KeyRound aria-hidden="true" />{t.auth.keysCta}</Link>
      </PageHead>

      <div className="grid items-start gap-10 min-[1101px]:grid-cols-[minmax(0,1fr)_188px]">
        <article className="grid min-w-0 gap-12">
          <p className="m-0 -mt-4 max-w-[68ch] text-[15px] text-muted-foreground">{t.lead}</p>

          <section className="grid gap-3.5">
            <SectionTitle id="auth">{s.auth}</SectionTitle>
            <P text={t.auth.p1} />
            <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
              <span className="text-xs font-medium text-muted-foreground">{t.auth.baseUrl}</span>
              <code className="min-w-0 flex-1 font-mono text-[13px] [overflow-wrap:anywhere]">{BASE_URL}</code>
              <CopyButton text={BASE_URL} label={t.copy} done={t.copied} />
            </div>
            <CodeBlock title="HTTP" copy={t.copy} copied={t.copied} snippets={[{ id: "h", label: "HTTP", code: "Authorization: Bearer lsk_<slug>_<random>" }]} />
            <P text={t.auth.p2} />
            <P text={t.auth.p3} />
          </section>

          <section className="grid gap-3.5">
            <SectionTitle id="user">{s.user}</SectionTitle>
            <P text={t.user.p1} />
            <P text={t.user.p2} />
          </section>

          <section className="grid gap-3.5">
            <SectionTitle id="overview">{s.overview}</SectionTitle>
            <Table head={<><Th>{t.overview.use}</Th><Th>{t.overview.endpoint}</Th><Th>{t.overview.access}</Th></>}>
              {groups.flatMap((g) => g.endpoints.map((e) => (
                <tr key={`${e.method} ${e.path}`}>
                  <Td><a href={`#${g.id}`} className="text-foreground underline-offset-2 hover:underline">{e.use}</a></Td>
                  <Td mono>{e.method} {e.path}</Td>
                  <Td>{t.access.short[e.auth]}</Td>
                </tr>
              )))}
            </Table>
          </section>

          {groups.map((g) => (
            <section key={g.id} className="grid gap-3.5">
              <SectionTitle id={g.id}>{s[g.id]}</SectionTitle>
              <P text={g.lead} />
              <div className="grid gap-8 pt-1">
                {g.endpoints.map((e) => <Endpoint key={`${e.method} ${e.path}`} lang={lang} e={e} />)}
              </div>
              {extra[g.id]}
            </section>
          ))}

          <section className="grid gap-3.5">
            <SectionTitle id="workflows">{s.workflows}</SectionTitle>
            <P text={t.workflows.p1} />
            <Table head={<><Th>{t.workflows.workflow}</Th><Th>{t.workflows.call}</Th></>}>
              {t.workflows.rows.map((r) => <tr key={r.name}><Td><span className="text-foreground">{r.name}</span></Td><Td><Rich text={r.call} /></Td></tr>)}
            </Table>
            <P text={t.workflows.p2} />
          </section>

          <section className="grid gap-3.5">
            <SectionTitle id="errors">{s.errors}</SectionTitle>
            <P text={t.errors.p1} />
            <Table head={<><Th>{t.errors.status}</Th><Th>{t.errors.code}</Th><Th>{t.errors.meaning}</Th></>}>
              {t.errors.rows.map((r) => <tr key={r.code}><Td mono>{r.status}</Td><Td mono>{r.code}</Td><Td><Rich text={r.meaning} /></Td></tr>)}
            </Table>
          </section>
        </article>

        <nav aria-label={t.toc} className="sticky top-20 hidden gap-1 min-[1101px]:grid">
          <span className="px-2 pb-1 text-xs font-medium text-muted-foreground">{t.toc}</span>
          {ids.map((id) => <a key={id} href={`#${id}`} className="rounded-md px-2 py-1 text-[13px] text-muted-foreground hover:bg-accent hover:text-foreground">{s[id]}</a>)}
        </nav>
      </div>
    </PageInner>
  );
}
