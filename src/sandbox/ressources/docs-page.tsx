import type * as React from "react";
import Link from "next/link";
import { ArrowRight, KeyRound } from "lucide-react";
import { ressources, route, type Lang } from "@/i18n";
import { PageHead, PageInner } from "@/components/shell/page-inner";
import { buttonClass } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Box } from "@/components/ui/card";
import { CodeBlock, CopyButton } from "./code-block";
import { Rich, SectionTitle } from "./rich";

export const BASE_URL = "https://core.locusmedical.fr";

/** Les extraits de code, construits ici pour rester alignés sur le contrat public. */
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
    `{"step": "done", "payload": {"trace_id": "…", "answer": "…", "answer_short": "…", "docs": […], "drugs": […], "source_scope": null}}`,
  ].join("\n");
  const blocks = `POST /v2/blocks/prescription-check
Authorization: Bearer lsk_…
X-Locus-User-Ref: usr_8f3a2c
Content-Type: application/json

${JSON.stringify({
    hook: "order-select",
    tool: "prescription-check",
    data: { age: "58 ans", allergies: "Pénicilline (urticaire, 2019)", draft_order: "Amoxicilline 1 g ×2/j, 6 jours" },
    settings: { niveau: "info" },
    display: "inline-card",
    context: { patientId: "pseudo-7f3a91" },
  }, null, 2)}`;
  return { curl, ts, ndjson, blocks };
}

function Th({ children }: { children: React.ReactNode }) {
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

/** Le guide d'intégration éditeur : clé, en-tête de compte, retrieve en flux, exemples, erreurs, briques. */
export function DocsPage({ lang }: { lang: Lang }) {
  const t = ressources[lang].docs;
  const s = t.sections;
  const code = snippets(lang);
  const ids = ["auth", "user", "stream", "params", "response", "examples", "errors", "blocks"] as const;
  return (
    <PageInner>
      <PageHead title={t.title}>
        <Link href={route(lang, "clesApi")} className={buttonClass()}><KeyRound aria-hidden="true" />{t.auth.keysCta}</Link>
      </PageHead>

      <div className="grid items-start gap-10 min-[1101px]:grid-cols-[minmax(0,1fr)_188px]">
        <article className="grid min-w-0 gap-10">
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
          </section>

          <section className="grid gap-3.5">
            <SectionTitle id="user">{s.user}</SectionTitle>
            <P text={t.user.p1} />
            <P text={t.user.p2} />
          </section>

          <section className="grid gap-3.5">
            <SectionTitle id="stream" extra={<Badge variant="pill">POST /v2/retrieve/stream</Badge>}>{s.stream}</SectionTitle>
            <P text={t.stream.p1} />
            <P text={t.stream.p2} />
          </section>

          <section className="grid gap-3.5">
            <SectionTitle id="params">{s.params}</SectionTitle>
            <Table head={<><Th>{t.params.name}</Th><Th>{t.params.type}</Th><Th>{t.params.desc}</Th></>}>
              {t.params.rows.map((r) => (
                <tr key={r.name}>
                  <Td mono>{r.name}{"required" in r && r.required && <span className="ml-1.5 font-sans text-[11px] text-muted-foreground">{t.params.required}</span>}</Td>
                  <Td mono><span className="text-muted-foreground">{r.type}</span></Td>
                  <Td><Rich text={r.desc} /></Td>
                </tr>
              ))}
            </Table>
            <h3 className="m-0 mt-2 text-sm font-semibold">{t.params.headers}</h3>
            <Table head={<><Th>{t.params.name}</Th><Th>{t.params.desc}</Th></>}>
              {t.params.headerRows.map((r) => (
                <tr key={r.name}>
                  <Td mono>{r.name}{"required" in r && r.required && <span className="ml-1.5 font-sans text-[11px] text-muted-foreground">{t.params.required}</span>}</Td>
                  <Td><Rich text={r.desc} /></Td>
                </tr>
              ))}
            </Table>
          </section>

          <section className="grid gap-3.5">
            <SectionTitle id="response" extra={<Badge variant="pill">application/x-ndjson</Badge>}>{s.response}</SectionTitle>
            <P text={t.response.p1} />
            <Table head={<><Th>step</Th><Th>{t.params.desc}</Th></>}>
              {t.response.lines.map((r) => <tr key={r.step}><Td mono>{r.step}</Td><Td><Rich text={r.desc} /></Td></tr>)}
            </Table>
            <CodeBlock title="NDJSON" copy={t.copy} copied={t.copied} snippets={[{ id: "n", label: "NDJSON", code: code.ndjson }]} />
            <h3 className="m-0 mt-2 text-sm font-semibold">{t.response.payloadTitle}</h3>
            <Table head={<><Th>{t.params.name}</Th><Th>{t.params.desc}</Th></>}>
              {t.response.payload.map((r) => <tr key={r.name}><Td mono>{r.name}</Td><Td><Rich text={r.desc} /></Td></tr>)}
            </Table>
          </section>

          <section className="grid gap-3.5">
            <SectionTitle id="examples">{s.examples}</SectionTitle>
            <CodeBlock title={s.examples} copy={t.copy} copied={t.copied} snippets={[{ id: "curl", label: t.examples.curl, code: code.curl }, { id: "ts", label: t.examples.ts, code: code.ts }]} />
            <P text={t.response.buffer} />
          </section>

          <section className="grid gap-3.5">
            <SectionTitle id="errors">{s.errors}</SectionTitle>
            <Table head={<><Th>{t.errors.status}</Th><Th>{t.errors.code}</Th><Th>{t.errors.meaning}</Th></>}>
              {t.errors.rows.map((r) => <tr key={r.code}><Td mono>{r.status}</Td><Td mono>{r.code}</Td><Td><Rich text={r.meaning} /></Td></tr>)}
            </Table>
          </section>

          <section className="grid gap-3.5">
            <SectionTitle id="blocks" extra={<Badge variant="secondary">{t.blocks.badge}</Badge>}>{s.blocks}</SectionTitle>
            <P text={t.blocks.p1} />
            <P text={t.blocks.p2} />
            <CodeBlock title={s.blocks} copy={t.copy} copied={t.copied} snippets={[{ id: "b", label: "HTTP", code: code.blocks }]} />
            <Link href={route(lang, "integration")} className={buttonClass({ size: "sm", className: "justify-self-start" })}>{t.blocks.cta}<ArrowRight aria-hidden="true" /></Link>
          </section>
        </article>

        <nav aria-label={t.toc} className="sticky top-9 hidden gap-1 min-[1101px]:grid">
          <span className="px-2 pb-1 text-xs font-medium text-muted-foreground">{t.toc}</span>
          {ids.map((id) => <a key={id} href={`#${id}`} className="rounded-md px-2 py-1 text-[13px] text-muted-foreground hover:bg-accent hover:text-foreground">{s[id]}</a>)}
        </nav>
      </div>
    </PageInner>
  );
}

