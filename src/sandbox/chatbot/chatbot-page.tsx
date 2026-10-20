"use client";
import * as React from "react";
import Link from "next/link";
import { ArrowUp, Code, Lock, RotateCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { chatbot, route, type Lang } from "@/i18n";
import { TOOL_ICONS } from "@/components/shell/tool-icons";
import { PageHead, PageInner } from "@/components/shell/page-inner";
import { Button, ButtonLink } from "@/components/ui/button";
import { Md } from "@/components/md";
import { citedSources, DEFAULT_SETTINGS, pendingClarifications, SCENARIOS, type Picks, type Scenario, type Settings, type SourceKey } from "@/data/chatbot/scenarios";
import type { ChatEvent, ChatSource, FormQuestion } from "./events";
import { APP_SURFACE, APP_VERSION, coreParams, type LocusSettings } from "./request";
import { chatStream, formatCourt, sansRenvois } from "./stream";
import { reveal, useProgress } from "./use-progress";
import { AlertBadge, AskChips, ColumnHead, Panel, SettingsPanel, SourceList, Steps, Sup } from "./parts";

/**
 * L'écran « Chatbot sourcé » : une question, deux colonnes côte à côte
 * (RAG simple, Locus), les réglages Locus, le panneau « Appel API » et le
 * composeur fixé en bas.
 *
 * - Visiteur : les questions suggérées sont des scénarios rejoués (aucun
 *   appel réseau) ; la saisie libre affiche l'invitation à demander un accès.
 * - Compte connecté : les deux colonnes partent en live (`/api/chatbot/rag`,
 *   `/api/chatbot/locus`). Si le serveur ferme le live, une question suggérée
 *   retombe sur son scénario rejoué.
 */

type ColState = { status: "idle" | "loading" | "done" | "error"; text: string; sources: ChatSource[]; error?: string };
type LocusState = ColState & { steps: string[]; form?: { token: string; questions: FormQuestion[] }; answers: Record<number, string[] | "skip">; round: number };

interface LiveRun {
  question: string;
  ranWith: LocusSettings;
  rag: ColState;
  locus: LocusState;
  /** Incrémenté à l'arrivée de la réponse Locus : relance la révélation progressive. */
  reveal: number;
}

const locusOf = (s: Settings): LocusSettings => ({ elic: s.elic, desamb: s.desamb, deep: s.deep, has: s.has, ansm: s.ansm });
const same = (a: LocusSettings, b: LocusSettings) => (Object.keys(a) as (keyof LocusSettings)[]).every((k) => a[k] === b[k]);

export function ChatbotPage({ lang, connected }: { lang: Lang; connected: boolean }) {
  const t = chatbot[lang];
  const Icon = TOOL_ICONS.chatbot;

  const [settings, setSettings] = React.useState<Settings>(DEFAULT_SETTINGS);
  const [scenario, setScenario] = React.useState<Scenario>(SCENARIOS[0]);
  const [picks, setPicks] = React.useState<Picks>({});
  const [run, setRun] = React.useState(0);
  const [api, setApi] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [gate, setGate] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [live, setLive] = React.useState<LiveRun | null>(null);
  const abort = React.useRef<AbortController | null>(null);

  const p = useProgress(run, 2200);

  const patchSettings = (patch: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...patch }));
    // Réactiver une clarification la repose (comme dans la maquette).
    if ("elic" in patch) setPicks((x) => ({ ...x, elic: undefined }));
    if ("desamb" in patch) setPicks((x) => ({ ...x, desamb: undefined }));
  };

  /* ---------- Rejoué ---------- */

  const rejouer = (sc: Scenario) => {
    abort.current?.abort();
    setLive(null);
    setScenario(sc);
    setPicks({});
    setRun((r) => r + 1);
  };

  /* ---------- Live ---------- */

  const lancer = async (question: string, s: Settings, sc?: Scenario) => {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    const ls = locusOf(s);
    setNotice(null);
    setLive({ question, ranWith: ls, rag: { status: "loading", text: "", sources: [] }, locus: { status: "loading", text: "", sources: [], steps: [], answers: {}, round: 0 }, reveal: 0 });
    let replay = false;
    const versRejoue = () => {
      if (replay) return;
      replay = true;
      ctrl.abort();
      if (sc) rejouer(sc);
      else { setLive(null); setNotice(t.live.replayOnly); }
    };

    const ragP = (async () => {
      for await (const ev of chatStream("/api/chatbot/rag", { lang, query: question }, ctrl.signal, t.live.error)) {
        if (ctrl.signal.aborted) return;
        if (ev.t === "replay") return versRejoue();
        setLive((l) => l && { ...l, rag: applyRag(l.rag, ev) });
      }
    })();
    // Plus de crédit : une question suggérée retombe sur son scénario rejoué, avec la raison affichée.
    const sansCredit = () => { if (!sc) return false; versRejoue(); setNotice(t.live.credits); return true; };
    const locusP = consommer(chatStream("/api/chatbot/locus", { lang, query: question, settings: ls }, ctrl.signal, t.live.error), ctrl, versRejoue, sansCredit);
    await Promise.all([ragP, locusP]);
  };

  async function consommer(gen: AsyncGenerator<ChatEvent>, ctrl: AbortController, versRejoue: () => void, sansCredit?: () => boolean) {
    for await (const ev of gen) {
      if (ctrl.signal.aborted) return;
      if (ev.t === "replay") return versRejoue();
      if (ev.t === "error" && ev.code === "credits" && sansCredit?.()) return;
      setLive((l) => {
        if (!l) return l;
        const loc = l.locus;
        switch (ev.t) {
          case "step": return { ...l, locus: { ...loc, steps: [...loc.steps, ev.text] } };
          case "form": return { ...l, locus: { ...loc, status: "done", form: { token: ev.token, questions: ev.questions }, answers: {} } };
          case "answer": return { ...l, reveal: l.reveal + 1, locus: { ...loc, status: "done", form: undefined, text: ev.markdown, sources: ev.sources } };
          case "error": return { ...l, locus: { ...loc, status: "error", error: ev.detail } };
          default: return l;
        }
      });
    }
  }

  const repondreFormulaire = async (token: string, answers: LocusState["answers"]) => {
    const ctrl = new AbortController();
    abort.current = ctrl;
    setLive((l) => l && { ...l, locus: { ...l.locus, status: "loading", round: l.locus.round + 1 } });
    const payload = Object.entries(answers).map(([i, v]) => (v === "skip" ? { i: Number(i), values: [], skipped: true } : { i: Number(i), values: v }));
    await consommer(chatStream("/api/chatbot/locus", { lang, reprise: { token, answers: payload } }, ctrl.signal, t.live.error), ctrl, () => setLive((l) => l && { ...l, locus: { ...l.locus, status: "error", error: t.live.error } }));
  };

  const choisirSuggestion = (sc: Scenario) => {
    setGate(false);
    setNotice(null);
    setDraft("");
    if (connected) void lancer(sc.question[lang], settings, sc);
    else rejouer(sc);
  };

  const envoyer = (e: React.FormEvent) => {
    e.preventDefault();
    const q = draft.trim();
    if (!q) return;
    if (!connected) { setGate(true); return; }
    setGate(false);
    setDraft("");
    const sc = SCENARIOS.find((x) => x.question[lang] === q || x.suggestion[lang] === q);
    void lancer(q, settings, sc);
  };

  React.useEffect(() => () => abort.current?.abort(), []);

  /* ---------- Rendu ---------- */

  const question = live ? live.question : scenario.question[lang];
  const meta = settings.deep ? t.locus.deep : t.locus.fast;

  return (
    <PageInner className="gap-5 pb-0 min-[821px]:pb-0">
      <PageHead title={<span className="flex items-center gap-2.5"><span className="grid size-8 shrink-0 place-items-center rounded-md border border-border bg-muted"><Icon size={16} aria-hidden="true" /></span>{t.meta.title}</span>}>
        <Button aria-pressed={api} onClick={() => setApi((a) => !a)} className={cn(api && "bg-accent")}><Code aria-hidden="true" />{t.head.api}</Button>
        {!connected && <ButtonLink variant="primary" href={route(lang, "acces")}>{t.head.request}</ButtonLink>}
      </PageHead>

      <div className="flex flex-wrap items-start gap-5">
        <div className="flex min-h-[calc(100dvh-180px)] min-w-0 min-[821px]:min-h-[calc(100dvh-112px)] flex-[999_1_560px] flex-col gap-4">
          <div className="max-w-[620px] self-end rounded-xl border border-border bg-secondary px-4 py-3 text-sm leading-[1.55] text-secondary-foreground">{question}</div>

          <div className="grid items-start gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
            {live ? <LiveRag lang={lang} st={live.rag} inline={settings.inline} /> : <ReplayRag lang={lang} sc={scenario} p={p} />}
            {live
              ? <LiveLocus lang={lang} run={live} settings={settings} meta={meta}
                  onAnswer={(i, v) => setLive((l) => l && { ...l, locus: { ...l.locus, answers: { ...l.locus.answers, [i]: v } } })}
                  onSubmit={repondreFormulaire}
                  onRerun={() => void lancer(live.question, settings, SCENARIOS.find((x) => x.question[lang] === live.question))} />
              : <ReplayLocus lang={lang} sc={scenario} s={settings} picks={picks} p={p} meta={meta} onPick={(k, v) => { setPicks((x) => ({ ...x, [k]: v })); setRun((r) => r + 1); }} />}
          </div>

          {api && <ApiPanel lang={lang} question={question} settings={settings} picks={live ? undefined : picks} sc={live ? undefined : scenario} live={live} />}

          <div className="sticky bottom-0 z-[2] mt-auto flex w-full flex-col gap-2.5 bg-background pb-5 pt-3">
            {(gate || notice) && (
              <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-border bg-card px-3.5 py-2.5 text-[13px] text-muted-foreground">
                <Lock size={16} aria-hidden="true" />
                <span className="flex-1">{notice ?? t.dock.gate}</span>
                {!connected && <Link href={route(lang, "acces")} className="font-medium text-foreground underline underline-offset-[3px]">{t.dock.request}</Link>}
              </div>
            )}
            <div role="group" aria-label={t.dock.suggestions} className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [contain:inline-size] [scrollbar-width:none] min-[821px]:mx-0 min-[821px]:flex-wrap min-[821px]:overflow-visible min-[821px]:px-0">
              {SCENARIOS.map((sc) => (
                <button key={sc.id} type="button" onClick={() => choisirSuggestion(sc)} className="min-h-8 shrink-0 whitespace-nowrap rounded-md border border-border bg-card px-3 py-[5px] text-left text-[13px] text-muted-foreground hover:border-ring hover:text-foreground min-[821px]:shrink min-[821px]:whitespace-normal">{sc.suggestion[lang]}</button>
              ))}
            </div>
            <form onSubmit={envoyer} className="flex items-end gap-2.5 rounded-xl border border-input bg-card py-2.5 pl-3.5 pr-2.5 shadow-sm focus-within:border-ring">
              <label htmlFor="chatbot-q" className="sr-only">{t.dock.label}</label>
              <textarea
                id="chatbot-q"
                rows={2}
                value={draft}
                maxLength={1000}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
                placeholder={t.dock.placeholder}
                className="min-w-0 flex-1 resize-none bg-transparent text-sm leading-normal text-foreground outline-none placeholder:text-muted-foreground"
              />
              <Button type="submit" variant="primary" size="icon" aria-label={t.dock.send}><ArrowUp aria-hidden="true" /></Button>
            </form>
          </div>
        </div>

        <SettingsPanel lang={lang} s={settings} onChange={patchSettings} live={!!live} />
      </div>
    </PageInner>
  );
}

function applyRag(st: ColState, ev: ChatEvent): ColState {
  switch (ev.t) {
    case "delta": return { ...st, status: "loading", text: st.text + ev.text };
    case "answer": return { status: "done", text: ev.markdown, sources: ev.sources };
    case "error": return { ...st, status: "error", error: ev.detail };
    default: return st;
  }
}

/* ---------- Colonne RAG simple ---------- */

function RagCard({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const t = chatbot[lang];
  return (
    <section aria-label={t.rag.title} className="flex min-w-0 flex-col gap-3.5 rounded-xl border border-border bg-card px-5 py-[18px] shadow-sm">
      <ColumnHead kind="rag" title={t.rag.title} meta={t.rag.meta} />
      {children}
    </section>
  );
}

function ReplayRag({ lang, sc, p }: { lang: Lang; sc: Scenario; p: number }) {
  const r = sc.rag[lang];
  const full = r.paras.join("\n");
  const shown = reveal(full, Math.min(1, p / 0.7));
  return (
    <RagCard lang={lang}>
      <div aria-live="polite" aria-busy={p < 1} className="flex flex-col gap-2.5 text-sm leading-relaxed">{shown.split("\n").map((x, i) => <p key={i} className="m-0">{x}</p>)}</div>
      {p >= 0.7 && <SourceList sources={[{ n: 1, label: r.cite }]} numbered={false} />}
    </RagCard>
  );
}

function Attente() {
  return <div aria-hidden="true" className="flex flex-col gap-2"><span className="h-3 w-4/5 animate-pulse rounded bg-muted" /><span className="h-3 w-3/5 animate-pulse rounded bg-muted" /></div>;
}

function LiveRag({ lang, st, inline }: { lang: Lang; st: ColState; inline: boolean }) {
  return (
    <RagCard lang={lang}>
      <div aria-live="polite" aria-busy={st.status === "loading"}>
        {st.status === "error" ? <p className="m-0 text-sm text-muted-foreground">{st.error}</p>
          : st.text ? <Md text={inline ? st.text : sansRenvois(st.text)} className="!text-sm" />
          : <Attente />}
      </div>
      {st.status === "done" && <SourceList sources={st.sources} numbered={inline} />}
    </RagCard>
  );
}

/* ---------- Colonne Locus ---------- */

function LocusCard({ lang, meta, children, action }: { lang: Lang; meta: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section aria-label={chatbot[lang].locus.title} className="flex min-w-0 flex-col gap-3.5 rounded-xl border border-border bg-card px-5 py-[18px] shadow-sm">
      <ColumnHead kind="locus" title={chatbot[lang].locus.title} meta={meta} />
      {children}
      {action}
    </section>
  );
}

function ReplayLocus({ lang, sc, s, picks, p, meta, onPick }: { lang: Lang; sc: Scenario; s: Settings; picks: Picks; p: number; meta: string; onPick: (k: "desamb" | "elic", v: string) => void }) {
  const t = chatbot[lang];
  const pend = pendingClarifications(sc, s, picks);
  const showDesamb = s.desamb && !!sc.desamb;
  const showElic = s.elic && !!sc.elic;
  const a = sc.answer(s, picks, lang);
  const steps = sc.steps(s, picks, lang);
  const keys = citedSources(a, s);
  const num = (c: SourceKey[]) => c.filter((k) => keys.includes(k)).map((k) => keys.indexOf(k) + 1);
  const sources: ChatSource[] = keys.map((k, i) => ({ n: i + 1, label: sc.sources[lang][k] }));

  // Révélation : étapes d'abord, puis la réponse bloc par bloc.
  const nSteps = Math.ceil(Math.min(1, p / 0.35) * steps.length);
  const q = p < 0.4 ? 0 : (p - 0.4) / 0.6;
  const nPoints = Math.floor(Math.min(1, q / 0.8) * (a.points.length + 1));

  return (
    <LocusCard lang={lang} meta={meta}>
      {(showDesamb || showElic) && (
        <Panel>
          {showDesamb && <AskChips question={sc.desamb![lang].question} options={sc.desamb![lang].options} value={picks.desamb} onPick={(v) => onPick("desamb", v)} />}
          {showElic && <AskChips question={sc.elic![lang].question} options={sc.elic![lang].options} value={picks.elic} onPick={(v) => onPick("elic", v)} />}
        </Panel>
      )}
      {s.reason && pend.done && <Steps title={t.locus.reasoning} steps={steps.slice(0, nSteps)} />}
      <div aria-live="polite" aria-busy={pend.done && p < 1} className="flex flex-col gap-2.5 text-sm leading-relaxed">
        {!pend.done ? (
          <>
            <p className="m-0 font-semibold">{t.locus.waitVerdict}</p>
            <p className="m-0 text-muted-foreground">{t.locus.waitWhy}</p>
          </>
        ) : p < 0.4 ? <Attente /> : (
          <>
            {a.alert && <AlertBadge kind={a.alert} lang={lang} />}
            <p className="m-0 font-semibold">{reveal(a.verdict, q / 0.15)}</p>
            {q > 0.15 && <p className="m-0 text-muted-foreground">{reveal(a.why, (q - 0.15) / 0.2)}</p>}
            {nPoints > 1 && (
              <ul className="m-0 flex list-disc flex-col gap-1 pl-[18px]">
                {a.points.slice(0, nPoints - 1).map((x, i) => <li key={i}>{x.text}{s.inline && <Sup ns={num(x.cite)} />}</li>)}
              </ul>
            )}
          </>
        )}
      </div>
      {pend.done && a.also && p >= 0.9 && (
        <Panel className="text-[13px] leading-normal">
          <span><b className="font-semibold">{t.locus.alsoChecked}</b> {a.also.text}{s.inline && <Sup ns={num(a.also.cite)} />}</span>
        </Panel>
      )}
      {pend.done && p >= 0.9 && <SourceList sources={sources} numbered={s.inline} />}
    </LocusCard>
  );
}

function LiveLocus({ lang, run, settings, meta, onAnswer, onSubmit, onRerun }: { lang: Lang; run: LiveRun; settings: Settings; meta: string; onAnswer: (i: number, v: string[] | "skip") => void; onSubmit: (token: string, answers: LocusState["answers"]) => void; onRerun: () => void }) {
  const t = chatbot[lang];
  const st = run.locus;
  const p = useProgress(run.reveal, 1400);
  const visibles = (st.form?.questions ?? []).filter((q) => {
    if (!q.dependsOn) return true;
    const dep = st.answers[q.dependsOn.i];
    return Array.isArray(dep) && dep.some((v) => q.dependsOn!.values.includes(v));
  });
  const complet = !!st.form && visibles.every((q) => st.answers[q.i] !== undefined);

  React.useEffect(() => {
    if (complet && st.status === "done" && st.form) {
      const ans = Object.fromEntries(visibles.map((q) => [q.i, st.answers[q.i]]));
      onSubmit(st.form.token, ans);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complet]);

  const changed = !same(run.ranWith, locusOf(settings));
  const md = st.text ? (settings.court ? formatCourt(st.text) : st.text) : "";
  const shown = reveal(md, p);

  return (
    <LocusCard lang={lang} meta={meta} action={changed && st.status !== "loading" ? <Button size="sm" className="self-start" onClick={onRerun}><RotateCw aria-hidden="true" />{t.locus.rerun}</Button> : undefined}>
      {st.form && (
        <Panel>
          {visibles.map((q) => {
            const v = st.answers[q.i];
            return (
              <AskChips
                key={q.i}
                question={q.question}
                disabled={st.status === "loading"}
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
        </Panel>
      )}
      {settings.reason && st.steps.length > 0 && <Steps title={t.locus.reasoning} steps={st.steps} />}
      {st.text && t.live.frenchNote && <span className="self-start rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">{t.live.frenchNote}</span>}
      <div aria-live="polite" aria-busy={st.status === "loading" || (!!st.text && p < 1)} className="text-sm leading-relaxed">
        {st.status === "error" ? <p className="m-0 text-muted-foreground">{st.error}</p>
          : st.form && !st.text ? (
            <div className="flex flex-col gap-2.5">
              <p className="m-0 font-semibold">{t.locus.waitVerdict}</p>
              <p className="m-0 text-muted-foreground">{t.locus.waitWhy}</p>
            </div>
          )
          : shown ? <Md text={settings.inline ? shown : sansRenvois(shown)} className="!text-sm" />
          : <Attente />}
      </div>
      {st.text && p >= 1 && <SourceList sources={st.sources} numbered={settings.inline} />}
    </LocusCard>
  );
}

/* ---------- Appel API ---------- */

function ApiPanel({ lang, question, settings, picks, sc, live }: { lang: Lang; question: string; settings: Settings; picks?: Picks; sc?: Scenario; live: LiveRun | null }) {
  const t = chatbot[lang];
  const [copied, setCopied] = React.useState(false);
  const slots: { key: string; values: string[] }[] = [];
  if (sc && picks) {
    if (settings.desamb && picks.desamb && sc.desamb) slots.push({ key: t.api.formKey, values: [sc.desamb[lang].options.find((o) => o.key === picks.desamb)?.label ?? ""] });
    if (settings.elic && picks.elic && sc.elic) slots.push({ key: t.api.formKey, values: [sc.elic[lang].options.find((o) => o.key === picks.elic)?.label ?? ""] });
  } else if (live?.locus.round) {
    slots.push({ key: t.api.formKey, values: ["…"] });
  }
  const body = {
    query: question,
    ...coreParams(locusOf(settings)),
    ...(slots.length ? { slot_answers: slots, elicitation_round: 1, contexte: t.api.contexte } : {}),
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
      <Panel><pre className="m-0 overflow-x-auto whitespace-pre-wrap break-words font-mono text-[13px] leading-[1.6] text-foreground">{text}</pre></Panel>
    </section>
  );
}

