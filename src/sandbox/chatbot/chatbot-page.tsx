"use client";
import * as React from "react";
import { ArrowUp, Code, RotateCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { chatbot, type Lang } from "@/i18n";
import { TOOL_ICONS } from "@/components/shell/tool-icons";
import { PageHead, PageInner } from "@/components/shell/page-inner";
import { LocusLoader, PlainLoader } from "@/components/shell/locus-loader";
import { LocusMarkMotion } from "@/components/shell/locus-mark-motion";
import { Button } from "@/components/ui/button";
import { Md } from "@/components/md";
import { SUGGESTIONS } from "@/data/chatbot/suggestions";
import type { ChatEvent, ChatSource, Confiance, FormQuestion } from "./events";
import { APP_SURFACE, APP_VERSION, coreParams, DEFAULT_SETTINGS, locusOf, type LocusSettings, type Settings } from "./request";
import { chatStream, formatCourt, sansRenvois, type StreamErrors } from "./stream";
import { AskChips, ColumnHead, ConfidenceBar, ErrorNote, Panel, SettingsPanel, SourceList, StatusPill, Steps, type Phase } from "./parts";

/**
 * L'écran « Chatbot sourcé » : la question en haut, une fois ; dessous, deux
 * colonnes de même largeur (RAG simple, Locus), en onglets sur mobile ; le
 * composeur fixé en bas, hors des réponses. Les réglages Locus sont en
 * évidence au-dessus de la question ; le panneau « Appel API » s'ouvre
 * depuis l'en-tête.
 *
 * Le contraste est le propos de l'écran : le RAG simple lit un seul corpus et
 * ne dit rien de sa fiabilité ; Locus répond comme l'app B2Pro, avec le degré
 * de confiance et toutes les sources de tous les éditeurs de son périmètre.
 *
 * Tout part en direct : une question, suggérée ou libre, appelle
 * `/api/chatbot/rag` et `/api/chatbot/locus` en parallèle. Chaque colonne
 * dit son état (envoyée, en cours, terminée, en erreur) ; une erreur est
 * affichée telle quelle dans sa colonne, jamais remplacée par une réponse.
 */

interface ColState { phase: Phase; text: string; sources: ChatSource[]; error?: string }
interface LocusState extends ColState {
  confidence?: Confiance;
  /** Ce sur quoi la réponse reste conditionnelle (une question passée du formulaire). */
  conditional: string[];
  steps: string[];
  form?: { token: string; questions: FormQuestion[] };
  answers: Record<number, string[] | "skip">;
  round: number;
  /** Les réglages de la requête en cours : les changer propose de relancer. */
  ranWith: LocusSettings;
}

const ragInit = (): ColState => ({ phase: "waiting", text: "", sources: [] });
const locusInit = (s: LocusSettings): LocusState => ({ phase: "waiting", text: "", sources: [], conditional: [], steps: [], answers: {}, round: 0, ranWith: s });
const same = (a: LocusSettings, b: LocusSettings) => (Object.keys(a) as (keyof LocusSettings)[]).every((k) => a[k] === b[k]);
/** Un flux fini sans réponse ni erreur (connexion coupée) : une erreur, pas un silence. */
const inacheve = (p: Phase) => p === "waiting" || p === "streaming";

export function ChatbotPage({ lang }: { lang: Lang }) {
  const t = chatbot[lang];
  const Icon = TOOL_ICONS.chatbot;
  const msg: StreamErrors = { error: t.live.error, quota: t.live.quota, rateLimited: t.live.rateLimited, auth: t.live.auth };

  const [settings, setSettings] = React.useState<Settings>(DEFAULT_SETTINGS);
  const [api, setApi] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [question, setQuestion] = React.useState<string | null>(null);
  const [rag, setRag] = React.useState<ColState>({ phase: "idle", text: "", sources: [] });
  const [locus, setLocus] = React.useState<LocusState>({ ...locusInit(locusOf(DEFAULT_SETTINGS)), phase: "idle" });
  const [tab, setTab] = React.useState<"rag" | "locus">("locus");
  const ragAbort = React.useRef<AbortController | null>(null);
  const locusAbort = React.useRef<AbortController | null>(null);

  const nouveau = (ref: React.RefObject<AbortController | null>) => {
    ref.current?.abort();
    const c = new AbortController();
    ref.current = c;
    return c;
  };

  /* ---------- RAG simple ---------- */

  const lancerRag = async (q: string) => {
    const ctrl = nouveau(ragAbort);
    setRag(ragInit());
    for await (const ev of chatStream("/api/chatbot/rag", { lang, query: q }, ctrl.signal, msg)) {
      if (ctrl.signal.aborted) return;
      setRag((st) => applyRag(st, ev));
    }
    if (!ctrl.signal.aborted) setRag((st) => (inacheve(st.phase) ? { ...st, phase: "error", error: t.live.ragDown } : st));
  };

  /* ---------- Locus ---------- */

  async function consommer(gen: AsyncGenerator<ChatEvent>, ctrl: AbortController) {
    for await (const ev of gen) {
      if (ctrl.signal.aborted) return;
      setLocus((loc) => {
        switch (ev.t) {
          case "step": return { ...loc, phase: "streaming", steps: [...loc.steps, ev.text] };
          case "form": return { ...loc, phase: "form", form: { token: ev.token, questions: ev.questions }, answers: {} };
          case "answer": return { ...loc, phase: "done", form: undefined, text: ev.markdown, sources: ev.sources, confidence: ev.confidence, conditional: ev.conditional ?? [] };
          case "error": return { ...loc, phase: "error", error: ev.detail };
          default: return loc;
        }
      });
    }
    if (!ctrl.signal.aborted) setLocus((loc) => (inacheve(loc.phase) ? { ...loc, phase: "error", error: t.live.unavailable } : loc));
  }

  const lancerLocus = async (q: string, s: Settings) => {
    const ctrl = nouveau(locusAbort);
    const ls = locusOf(s);
    setLocus(locusInit(ls));
    await consommer(chatStream("/api/chatbot/locus", { lang, query: q, settings: ls }, ctrl.signal, msg), ctrl);
  };

  const repondreFormulaire = async (token: string, answers: LocusState["answers"]) => {
    const ctrl = nouveau(locusAbort);
    setLocus((loc) => ({ ...loc, phase: "waiting", round: loc.round + 1 }));
    const payload = Object.entries(answers).map(([i, v]) => (v === "skip" ? { i: Number(i), values: [], skipped: true } : { i: Number(i), values: v }));
    await consommer(chatStream("/api/chatbot/locus", { lang, reprise: { token, answers: payload } }, ctrl.signal, msg), ctrl);
  };

  /* ---------- La question ---------- */

  const poser = (q: string) => {
    setQuestion(q);
    setDraft("");
    void lancerRag(q);
    void lancerLocus(q, settings);
  };

  const envoyer = (e: React.FormEvent) => {
    e.preventDefault();
    const q = draft.trim();
    if (q) poser(q);
  };

  React.useEffect(() => () => { ragAbort.current?.abort(); locusAbort.current?.abort(); }, []);

  /* ---------- Rendu ---------- */

  const mode = settings.deep ? t.locus.deep : t.locus.fast;
  const locusMeta = `${t.locus.meta} · ${mode}`;
  const ragMd = settings.court ? formatCourt(rag.text) : rag.text;
  const changed = !!question && !same(locus.ranWith, locusOf(settings)) && !inacheve(locus.phase);

  return (
    <PageInner className="gap-5 pb-0 min-[821px]:pb-0">
      <PageHead title={<span className="flex items-center gap-2.5"><span className="grid size-8 shrink-0 place-items-center rounded-md border border-border bg-muted"><Icon size={16} aria-hidden="true" /></span>{t.meta.title}</span>}>
        <Button aria-pressed={api} onClick={() => setApi((v) => !v)} title={t.head.api} className={cn("max-[820px]:w-9 max-[820px]:px-0", api && "bg-accent")}><Code aria-hidden="true" /><span className="max-[820px]:sr-only">{t.head.api}</span></Button>
      </PageHead>

      <SettingsPanel id="chatbot-reglages" lang={lang} s={settings} onChange={(patch) => setSettings((s) => ({ ...s, ...patch }))} />
      {api && <ApiPanel lang={lang} question={question ?? t.dock.placeholder} settings={settings} round={locus.round} />}

      <div className="flex min-h-[calc(100dvh-180px)] min-w-0 flex-col gap-4 min-[821px]:min-h-[calc(100dvh-112px)]">
        {/* La question, une seule fois, et les questions suggérées. */}
        <section aria-label={t.question.label} className="flex flex-col gap-3 rounded-xl border border-border bg-secondary px-5 py-4 text-secondary-foreground">
          <span className="text-xs font-medium text-muted-foreground">{t.question.label}</span>
          {question
            ? <p className="m-0 max-w-[80ch] text-[15px] leading-[1.55] text-foreground">{question}</p>
            : <p className="m-0 max-w-[70ch] text-[15px] leading-[1.55] text-muted-foreground">{t.question.empty}</p>}
          <div role="group" aria-label={t.question.suggestions} className="-mx-5 flex gap-1.5 overflow-x-auto px-5 [scrollbar-width:none] min-[821px]:mx-0 min-[821px]:flex-wrap min-[821px]:overflow-visible min-[821px]:px-0">
            {SUGGESTIONS.map((sg) => (
              <button key={sg.id} type="button" onClick={() => poser(sg.question[lang])} aria-pressed={question === sg.question[lang]} className={cn("min-h-8 shrink-0 whitespace-nowrap rounded-md border px-3 py-[5px] text-left text-[13px] transition-colors min-[821px]:shrink min-[821px]:whitespace-normal", question === sg.question[lang] ? "border-ring bg-background text-foreground" : "border-border bg-card text-muted-foreground hover:border-ring hover:text-foreground")}>{sg.label[lang]}</button>
            ))}
          </div>
        </section>

        {/* Mobile : une colonne à la fois, l'état de chacune dans son onglet. */}
        <div role="tablist" aria-label={t.tabs} className="grid grid-cols-2 gap-0.5 rounded-md bg-muted p-[3px] min-[821px]:hidden">
          {(["rag", "locus"] as const).map((k) => (
            <button key={k} type="button" role="tab" id={`chatbot-tab-${k}`} aria-selected={tab === k} aria-controls={`chatbot-col-${k}`} onClick={() => setTab(k)} className={cn("flex h-9 items-center justify-center gap-2 rounded-[6px] px-2 text-[13px] font-medium", tab === k ? "bg-background text-foreground shadow-xs" : "text-muted-foreground")}>
              {k === "rag" ? t.rag.title : t.locus.title}
              <StatusPill kind={k} phase={k === "rag" ? rag.phase : locus.phase} lang={lang} className="sr-only" />
              {k === "locus" && inacheve(locus.phase) ? <LocusMarkMotion size={16} className="text-brand" /> : <i aria-hidden="true" className={cn("block size-1.5 rounded-full", phaseDot(k, k === "rag" ? rag.phase : locus.phase))} />}
            </button>
          ))}
        </div>

        <div className="grid items-start gap-4 min-[821px]:grid-cols-2">
          <Column kind="rag" lang={lang} meta={t.rag.meta} phase={rag.phase} hidden={tab !== "rag"}>
            {rag.phase === "idle" ? <Idle text={t.rag.idle} />
              : rag.phase === "error" ? <ErrorNote detail={rag.error ?? t.live.error} retry={t.retry} onRetry={question ? () => void lancerRag(question) : undefined} />
              : rag.text ? <Md text={settings.inline ? ragMd : sansRenvois(ragMd)} />
              : <PlainLoader />}
            {rag.phase === "done" && <SourceList lang={lang} sources={rag.sources} numbered={settings.inline} />}
            {rag.phase === "done" && <p className="m-0 text-xs leading-relaxed text-muted-foreground">{t.rag.corpus}</p>}
          </Column>

          <Column kind="locus" lang={lang} meta={locusMeta} phase={locus.phase} hidden={tab !== "locus"}>
            <LocusBody
              lang={lang}
              st={locus}
              settings={settings}
              onAnswer={(i, v) => setLocus((l) => ({ ...l, answers: { ...l.answers, [i]: v } }))}
              onSubmit={repondreFormulaire}
              onRetry={question ? () => void lancerLocus(question, settings) : undefined}
            />
            {changed && <Button size="sm" className="self-start" onClick={() => void lancerLocus(question!, settings)}><RotateCw aria-hidden="true" />{t.locus.rerun}</Button>}
          </Column>
        </div>

        {/* Le composeur : dans le flux, collé en bas ; sa place est réservée sous les réponses. */}
        <div className="sticky bottom-0 z-[2] mt-auto flex w-full flex-col gap-2 border-t border-border bg-background pb-4 pt-3">
          <form onSubmit={envoyer} className="flex items-end gap-2.5 rounded-xl border border-input bg-card py-2 pl-3.5 pr-2 shadow-sm focus-within:border-ring">
            <label htmlFor="chatbot-q" className="sr-only">{t.dock.label}</label>
            <textarea
              id="chatbot-q"
              rows={1}
              value={draft}
              maxLength={1000}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
              placeholder={t.dock.placeholder}
              className="field-sizing-content max-h-32 focus-visible:shadow-none min-h-9 min-w-0 flex-1 resize-none bg-transparent py-1.5 text-sm leading-normal text-foreground outline-none placeholder:text-muted-foreground"
            />
            <Button type="submit" variant="primary" size="icon" aria-label={t.dock.send} disabled={!draft.trim()}><ArrowUp aria-hidden="true" /></Button>
          </form>
          <p className="m-0 text-xs text-muted-foreground">{t.dock.fine}</p>
        </div>
      </div>
    </PageInner>
  );
}

/** Le point d'un onglet mobile : Locus en cours a sa marque animée (plus haut), le RAG simple reste fade. */
const phaseDot = (k: "rag" | "locus", p: Phase) => (p === "error" ? "bg-destructive" : k === "rag" && inacheve(p) ? "animate-pulse-soft bg-ring" : p === "form" ? "bg-brand" : p === "done" ? "bg-foreground" : "bg-ring");

function applyRag(st: ColState, ev: ChatEvent): ColState {
  switch (ev.t) {
    case "delta": return { ...st, phase: "streaming", text: st.text + ev.text };
    case "answer": return { phase: "done", text: ev.markdown, sources: ev.sources };
    case "error": return { ...st, phase: "error", error: ev.detail };
    default: return st;
  }
}

/* ---------- Une colonne ---------- */

function Column({ kind, lang, meta, phase, hidden, children }: { kind: "rag" | "locus"; lang: Lang; meta: string; phase: Phase; hidden: boolean; children: React.ReactNode }) {
  const t = chatbot[lang];
  const title = kind === "rag" ? t.rag.title : t.locus.title;
  return (
    <section
      id={`chatbot-col-${kind}`}
      role="tabpanel"
      aria-labelledby={`chatbot-tab-${kind}`}
      className={cn("min-w-0 flex-col gap-4 rounded-xl border border-border bg-card px-5 py-[18px] shadow-sm min-[821px]:flex min-[821px]:px-6", hidden ? "hidden" : "flex")}
    >
      <ColumnHead kind={kind} title={title} meta={meta} phase={phase} lang={lang} />
      <div aria-live="polite" aria-busy={phase === "waiting" || phase === "streaming"} className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  );
}

function Idle({ text }: { text: string }) {
  return <p className="m-0 text-sm leading-relaxed text-muted-foreground">{text}</p>;
}

function LocusBody({ lang, st, settings, onAnswer, onSubmit, onRetry }: { lang: Lang; st: LocusState; settings: Settings; onAnswer: (i: number, v: string[] | "skip") => void; onSubmit: (token: string, answers: LocusState["answers"]) => void; onRetry?: () => void }) {
  const t = chatbot[lang];
  const questions = st.form?.questions ?? [];
  // Une question dépendante est posée si l'une de ses branches est prise, et que la question dont elle dépend est elle-même posée.
  const visible = (q: FormQuestion, prof = 0): boolean => !q.dependsOn || (prof < 10 && q.dependsOn.some((d) => {
    const dep = st.answers[d.i];
    const parent = questions.find((x) => x.i === d.i);
    return Array.isArray(dep) && dep.some((v) => d.values.includes(v)) && !!parent && visible(parent, prof + 1);
  }));
  const visibles = questions.filter((q) => visible(q));
  const complet = !!st.form && visibles.every((q) => st.answers[q.i] !== undefined);
  // Une question à cases peut recevoir plusieurs réponses : le formulaire attend alors qu'on le valide.
  const aCases = visibles.some((q) => q.multiple);
  const envoyer = () => {
    if (!st.form) return;
    onSubmit(st.form.token, Object.fromEntries(visibles.map((q) => [q.i, st.answers[q.i]])));
  };

  // Toutes les questions visibles ont une réponse, et aucune n'est à cases : la reprise part d'elle-même.
  React.useEffect(() => {
    if (complet && !aCases && st.phase === "form") envoyer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complet]);

  if (st.phase === "idle") return <Idle text={t.locus.idle} />;
  const md = st.text ? (settings.court ? formatCourt(st.text) : st.text) : "";

  return (
    <>
      {st.form && (
        <Panel>
          {visibles.map((q) => {
            const v = st.answers[q.i];
            return (
              <AskChips
                key={q.i}
                question={q.question}
                disabled={st.phase !== "form"}
                options={[...q.options.map((o) => ({ key: o.v, label: o.label })), { key: "__skip", label: q.skip }]}
                value={v === "skip" ? "__skip" : v}
                onPick={(k) => {
                  if (k === "__skip") return onAnswer(q.i, "skip");
                  if (!q.multiple) return onAnswer(q.i, [k]);
                  const cur = Array.isArray(v) ? v : [];
                  onAnswer(q.i, cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]);
                }}
              />
            );
          })}
          {aCases && st.phase === "form" && <Button size="sm" variant="primary" className="self-start" disabled={!complet} onClick={envoyer}>{t.locus.submit}</Button>}
        </Panel>
      )}
      {settings.reason && st.steps.length > 0 && <Steps title={t.locus.reasoning} steps={st.steps} folded={st.phase === "done"} />}
      {st.phase === "error" ? <ErrorNote detail={st.error ?? t.live.unavailable} retry={t.retry} onRetry={onRetry} />
        : st.phase === "form" ? (
          <div className="flex flex-col gap-1">
            <p className="m-0 text-sm font-semibold">{t.locus.waitVerdict}</p>
            <p className="m-0 text-sm text-muted-foreground">{t.locus.waitWhy}</p>
          </div>
        )
        : md ? (
          <>
            {st.confidence && <ConfidenceBar lang={lang} c={st.confidence} />}
            {t.live.frenchNote && <span className="self-start rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">{t.live.frenchNote}</span>}
            <Md text={settings.inline ? md : sansRenvois(md)} />
            {st.conditional.length > 0 && (
              <div className="flex flex-col gap-1 rounded-[var(--radius)] border border-border bg-muted px-3.5 py-2.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{t.locus.conditional}</span>
                <span>{st.conditional.join(" · ")}</span>
              </div>
            )}
          </>
        )
        : <LocusLoader size="card" label={t.locus.thinking} />}
      {st.phase === "done" && <SourceList lang={lang} sources={st.sources} numbered={settings.inline} />}
    </>
  );
}

/* ---------- Appel API ---------- */

function ApiPanel({ lang, question, settings, round }: { lang: Lang; question: string; settings: Settings; round: number }) {
  const t = chatbot[lang];
  const [copied, setCopied] = React.useState(false);
  const body = {
    query: question,
    ...coreParams(locusOf(settings)),
    ...(round ? { slot_answers: [{ key: t.api.formKey, values: ["…"] }], elicitation_round: round, contexte: t.api.contexte } : {}),
    app_surface: APP_SURFACE,
    app_platform: "web",
    app_version: APP_VERSION,
  };
  const text = `POST /v2/retrieve/stream\nAuthorization: Bearer lsk_…\nX-Locus-User-Ref: <${t.api.account}>\nContent-Type: application/json\n\n${JSON.stringify(body, null, 2)}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* presse-papiers refusé */ }
  };
  return (
    <section aria-label={t.head.api} className="flex min-w-0 flex-col gap-3.5 rounded-xl border border-border bg-card px-5 py-[18px] shadow-sm">
      <div className="flex items-center gap-2.5">
        <span className="text-[15px] font-semibold tracking-[-.01em]">{t.api.title}</span>
        <Button size="sm" className="ml-auto" onClick={copy}>{copied ? t.api.copied : t.api.copy}</Button>
      </div>
      <Panel><pre className="m-0 max-h-80 overflow-auto whitespace-pre-wrap break-words font-mono text-[13px] leading-[1.6] text-foreground">{text}</pre></Panel>
    </section>
  );
}
