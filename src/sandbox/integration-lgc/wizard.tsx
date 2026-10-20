"use client";
import * as React from "react";
import { ArrowRight, Check, ListTree, Play, Plus, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { lgc } from "@/i18n";
import { useLang } from "@/i18n/lang";
import { Button, buttonClass } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ANCHOR_IDS, FIELDS, defaultFields, fieldsFor, type AnchorId } from "@/data/integration-lgc/fournier";
import { DISPLAY_IDS, HOOKS, TOOLS, TOOL_IDS, defaultSettings } from "@/data/integration-lgc/blocks";
import { INSERTABLE, WF_EXAMPLE, type RunResult } from "@/data/integration-lgc/workflow";
import { errorText, runWorkflow, structureWorkflow } from "./api";
import type { Draft } from "./model";
import { useDialogFocus } from "./use-dialog";

/**
 * L'assistant de brique, à la Zapier : 4 étapes, chacune repliée en une
 * ligne résumé une fois faite. Point d'injection → données transmises →
 * outil Locus (ou workflow) → affichage de la sortie.
 */

const OPT = "flex min-h-11 items-center gap-2.5 rounded-md border border-border bg-card px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent";
const OPT_SEL = "border-foreground bg-accent";

function Badge({ n, state }: { n: number; state: "done" | "open" | "todo" }) {
  return (
    <span className={cn("grid size-[26px] shrink-0 place-items-center rounded-full text-xs font-semibold", state === "done" && "border border-border bg-secondary text-foreground", state === "open" && "bg-primary text-primary-foreground", state === "todo" && "border border-border bg-muted text-muted-foreground")}>
      {state === "done" ? <Check size={14} aria-hidden="true" /> : n}
    </span>
  );
}

export function canContinue(d: Draft, step: number) {
  if (step === 1) return !!d.anchor;
  if (step === 2) return d.fields.length > 0;
  if (step === 3) return d.kind === "workflow" ? !!d.steps?.length : !!d.tool;
  return !!d.display;
}

export function Wizard({ draft, setDraft, step, setStep, editing, onClose, onSubmit, pickAnchor }: {
  draft: Draft; setDraft: (p: Partial<Draft>) => void; step: number; setStep: (n: number) => void; editing: boolean;
  onClose: () => void; onSubmit: () => void; pickAnchor: (a: AnchorId) => void;
}) {
  const lang = useLang();
  const t = lgc[lang];
  const w = t.wizard;
  const isWf = draft.kind === "workflow";
  const ready = canContinue(draft, step);
  const titles = w.steps.map((x, i) => (i === 2 && isWf ? w.stepsWorkflow : x));

  const chosen = draft.anchor ? fieldsFor(draft.anchor).filter((k) => draft.fields.includes(k)) : [];
  const sums = [
    draft.anchor ? `${t.anchors[draft.anchor]} · ${HOOKS[draft.anchor]}` : "",
    w.data(chosen.length, chosen.map((k) => t.fields[k]).join(", ")),
    isWf
      ? w.workflowSummary(draft.steps?.length ?? 0)
      : draft.tool ? [t.tools[draft.tool].name, ...TOOLS[draft.tool].settings.map((s) => { const v = draft.settings[s.k]; return s.kind === "toggle" ? `${t.settings[s.k]} ${v ? w.on : w.off}` : t.options[String(v)]; })].join(" · ") : "",
    draft.display ? t.displays[draft.display] : "",
  ];

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Le focus entre dans l'assistant et revient au bouton d'origine à la fermeture ; Tab peut sortir vers « Injecter ici ».
  const ref = useDialogFocus<HTMLElement>(false);

  return (
    <section ref={ref} role="dialog" aria-labelledby="lgc-wiz-title" className="absolute inset-y-0 right-0 z-30 flex w-[min(460px,100%)] flex-col border-l border-border bg-background font-sans text-sm text-foreground shadow-[0_16px_40px_rgba(0,0,0,.45)]">
      <div className="flex items-center gap-2.5 border-b border-border py-3.5 pl-5 pr-4">
        <span className="grid flex-1 gap-0.5">
          <span id="lgc-wiz-title" data-autofocus tabIndex={-1} className="text-base font-semibold tracking-[-.01em] outline-none">{editing ? w.editBrick : w.newBrick}</span>
          <span className="font-mono text-xs text-muted-foreground">{w.step} {step} {w.of} 4</span>
        </span>
        <button type="button" onClick={onClose} aria-label={w.close} className={buttonClass({ variant: "ghost", size: "icon" })}><X aria-hidden="true" /></button>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 overflow-auto px-5 py-4">
        {titles.map((title, i) => {
          const n = i + 1;
          const open = step === n;
          const done = step > n;
          return (
            <div key={n} className={cn("flex flex-col rounded-xl border bg-card px-4 py-3.5 shadow-sm", open ? "border-ring" : "border-border", step < n && "opacity-50")}>
              <div className="flex items-center gap-2.5">
                <Badge n={n} state={done ? "done" : open ? "open" : "todo"} />
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="text-[15px] font-semibold tracking-[-.01em]">{title}</span>
                  {done && <span className="truncate text-[13px] text-muted-foreground">{sums[i]}</span>}
                </span>
                {done && <Button variant="ghost" size="sm" onClick={() => setStep(n)}>{w.edit}</Button>}
              </div>
              {open && n === 1 && (
                <div role="radiogroup" aria-label={title} className="flex flex-col gap-1.5 pt-3">
                  {ANCHOR_IDS.map((a) => (
                    <button key={a} type="button" role="radio" aria-checked={draft.anchor === a} onClick={() => pickAnchor(a)} className={cn(OPT, draft.anchor === a && OPT_SEL)}>
                      <span className="flex-1">{t.anchors[a]}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">{HOOKS[a]}</span>
                    </button>
                  ))}
                </div>
              )}
              {open && n === 2 && draft.anchor && <Fields draft={draft} setDraft={setDraft} />}
              {open && n === 3 && <ToolStep draft={draft} setDraft={setDraft} />}
              {open && n === 4 && <DisplayStep draft={draft} setDraft={setDraft} />}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 border-t border-border px-5 py-3.5">
        {step > 1 && <Button onClick={() => setStep(step - 1)}>{w.back}</Button>}
        <span className="flex-1" />
        <Button variant="primary" disabled={!ready} onClick={() => (step < 4 ? setStep(step + 1) : onSubmit())}>{step < 4 ? w.next : editing ? w.save : w.activate}</Button>
      </div>
    </section>
  );
}

function Fields({ draft, setDraft }: { draft: Draft; setDraft: (p: Partial<Draft>) => void }) {
  const lang = useLang();
  const t = lgc[lang];
  return (
    <div className="flex flex-col gap-1 pt-3">
      {fieldsFor(draft.anchor!).map((k) => {
        const on = draft.fields.includes(k);
        return (
          <button key={k} type="button" role="checkbox" aria-checked={on} onClick={() => setDraft({ fields: on ? draft.fields.filter((x) => x !== k) : [...draft.fields, k] })} className="grid min-h-10 grid-cols-[20px_minmax(0,140px)_12px_minmax(0,1fr)] items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-accent">
            <span className={cn("grid size-5 place-items-center rounded-[5px] border", on ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background")}>{on && <Check size={12} strokeWidth={3} aria-hidden="true" />}</span>
            <span className="text-[13px] font-medium">{t.fields[k]}</span>
            <ArrowRight size={12} aria-hidden="true" className="text-muted-foreground" />
            <span className={cn("truncate text-[13px]", on ? "text-foreground" : "text-muted-foreground opacity-60")}>{FIELDS[k].value}</span>
          </button>
        );
      })}
      <span className="px-2 pt-1.5 text-xs text-muted-foreground">{t.wizard.pseudo}</span>
    </div>
  );
}

function ToolStep({ draft, setDraft }: { draft: Draft; setDraft: (p: Partial<Draft>) => void }) {
  const lang = useLang();
  const t = lgc[lang];
  const isWf = draft.kind === "workflow";
  return (
    <div className="flex flex-col gap-3 pt-3">
      <div role="radiogroup" aria-label={t.chooser.label} className="grid grid-cols-2 gap-1.5">
        {(["tool", "workflow"] as const).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={draft.kind === k} onClick={() => setDraft(k === "workflow" ? { kind: k, instruction: draft.instruction || WF_EXAMPLE[lang], fields: draft.anchor ? [...new Set([...draft.fields, ...defaultFields(draft.anchor, true)])] : draft.fields } : { kind: k })} className={cn(OPT, "items-start", draft.kind === k && OPT_SEL)}>
            <span className="grid gap-0.5"><span className="font-medium">{t.kinds[k].label}</span><span className="text-xs text-muted-foreground">{t.kinds[k].desc}</span></span>
          </button>
        ))}
      </div>
      {isWf ? <WorkflowEditor draft={draft} setDraft={setDraft} /> : (
        <>
          <div role="radiogroup" aria-label={t.wizard.steps[2]} className="flex flex-col gap-1.5">
            {TOOL_IDS.map((id) => (
              <button key={id} type="button" role="radio" aria-checked={draft.tool === id} onClick={() => setDraft({ tool: id, settings: draft.tool === id ? draft.settings : defaultSettings(id) })} className={cn(OPT, draft.tool === id && OPT_SEL)}>
                <span className="grid gap-0.5"><span className="font-medium">{t.tools[id].name}</span><span className="text-xs text-muted-foreground">{t.tools[id].desc}</span></span>
              </button>
            ))}
          </div>
          {draft.tool && (
            <div className="flex flex-col rounded-lg border border-border bg-card px-3 py-2">
              <span className="py-1 text-xs font-medium text-muted-foreground">{t.wizard.settings}</span>
              {TOOLS[draft.tool].settings.map((s) => {
                const v = draft.settings[s.k];
                return (
                  <div key={s.k} className="flex min-h-11 flex-wrap items-center gap-2">
                    <span className="flex-1 text-[13px]">{t.settings[s.k]}</span>
                    {s.kind === "toggle" ? (
                      <Switch checked={!!v} onCheckedChange={(x) => setDraft({ settings: { ...draft.settings, [s.k]: x } })} aria-label={t.settings[s.k]} />
                    ) : (
                      <span role="group" aria-label={t.settings[s.k]} className="inline-flex gap-0.5 rounded-md bg-muted p-[3px]">
                        {s.options.map((o) => (
                          <button key={o} type="button" aria-pressed={v === o} onClick={() => setDraft({ settings: { ...draft.settings, [s.k]: o } })} className={cn("h-7 rounded-[6px] px-2.5 text-xs font-medium", v === o ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground")}>{t.options[o]}</button>
                        ))}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

type Test = { result: RunResult; idx: number; running: boolean; nonDiab: boolean } | null;

function WorkflowEditor({ draft, setDraft }: { draft: Draft; setDraft: (p: Partial<Draft>) => void }) {
  const lang = useLang();
  const t = lgc[lang];
  const wf = t.wf;
  const steps = draft.steps ?? [];
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [editIdx, setEditIdx] = React.useState<number | null>(null);
  const [insertIdx, setInsertIdx] = React.useState<number | null>(null);
  const [nonDiab, setNonDiab] = React.useState(false);
  const [test, setTest] = React.useState<Test>(null);
  const timer = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const stop = () => { if (timer.current) clearInterval(timer.current); timer.current = null; };
  React.useEffect(() => stop, []);

  const setSteps = (s: typeof steps, previews = draft.previews) => { stop(); setTest(null); setDraft({ steps: s, previews }); };

  const structure = async () => {
    setBusy(true); setError(""); setEditIdx(null); setInsertIdx(null);
    try {
      const r = await structureWorkflow(draft.instruction ?? "", lang);
      setSteps(r.steps, r.preview);
    } catch (e) {
      setError(errorText(e, { realData: t.out.realData, error: wf.error }));
    } finally { setBusy(false); }
  };

  const run = async () => {
    stop(); setError("");
    try {
      const result = await runWorkflow(steps, { anchor: draft.anchor ?? "pv", fields: draft.fields }, nonDiab ? "non-diabetique" : "fournier");
      const last = result.halted ? result.steps.findIndex((s) => s.status === "stopped") : steps.length;
      setTest({ result, idx: 0, running: true, nonDiab });
      let i = 0;
      timer.current = setInterval(() => {
        i += 1;
        if (i > last) {
          stop();
          setTest({ result, idx: steps.length, running: false, nonDiab });
          if (!nonDiab) setDraft({ previews: result.steps.map((s) => ({ value: s.value, source: s.source, status: s.status })) });
          return;
        }
        setTest({ result, idx: i, running: true, nonDiab });
      }, 600);
    } catch (e) {
      setError(errorText(e, t.out));
    }
  };

  const finished = test && !test.running;
  const out = test?.result.output;

  return (
    <div className="flex flex-col gap-2.5">
      <label htmlFor="wf-text" className="text-[13px] font-medium">{wf.describe}</label>
      <textarea id="wf-text" rows={3} maxLength={500} value={draft.instruction ?? ""} onChange={(e) => setDraft({ instruction: e.target.value })} className="resize-y rounded-md border border-input bg-background px-3 py-2.5 text-sm leading-[1.45] text-foreground shadow-xs focus:outline-2 focus:outline-offset-1 focus:outline-ring" />
      <Button onClick={structure} disabled={busy || !(draft.instruction ?? "").trim()} className="self-start"><ListTree aria-hidden="true" />{busy ? wf.structuring : steps.length ? wf.restructure : wf.structure}</Button>
      {error && <p className="m-0 text-[13px] text-muted-foreground" role="alert">{error}</p>}

      {steps.length > 0 && (
        <>
          <div className="flex flex-col pt-1.5">
            {steps.map((st, i) => {
              const r = test?.result.steps[i];
              const status = !test ? "idle" : r?.status === "stopped" && test.idx >= i ? "stopped" : r?.status === "skipped" && !test.running ? "skipped" : i < test.idx ? "done" : i === test.idx && test.running ? "running" : "pending";
              const prev = draft.previews?.[i];
              const value = status === "done" || status === "stopped" || status === "skipped" ? r?.value ?? "" : status === "idle" ? prev?.value ?? wf.pending : prev?.value ?? wf.pending;
              const source = status === "done" ? r?.source : status === "idle" ? prev?.source : undefined;
              const notLast = i < steps.length - 1;
              return (
                <div key={i} className="flex gap-2.5">
                  <div className="flex w-7 shrink-0 flex-col items-center">
                    <span className={cn("grid size-[26px] place-items-center rounded-full text-xs font-semibold", status === "done" && "border border-border bg-secondary text-foreground", status === "running" && "border border-brand bg-brand-soft text-brand", status === "stopped" && "border border-dashed border-ring bg-background text-foreground", (status === "skipped" || status === "pending") && "border border-border bg-muted text-muted-foreground", status === "idle" && "bg-primary text-primary-foreground")}>
                      {status === "done" ? <Check size={14} aria-hidden="true" /> : i + 1}
                    </span>
                    {notLast && <span aria-hidden="true" className="min-h-[18px] w-px flex-1 bg-border" />}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5 pb-3">
                    <div className="flex min-h-7 items-center gap-1">
                      <span className="flex-1 text-xs text-muted-foreground">{wf.types[st.type]}</span>
                      <button type="button" onClick={() => setEditIdx(editIdx === i ? null : i)} className={buttonClass({ variant: "ghost", size: "sm", className: "h-7 text-xs" })}>{t.wizard.edit}</button>
                      {steps.length > 1 && <button type="button" onClick={() => { setSteps(steps.filter((_, j) => j !== i), draft.previews?.filter((_, j) => j !== i)); setEditIdx(null); setInsertIdx(null); }} className={buttonClass({ variant: "ghost", size: "sm", className: "h-7 text-xs text-muted-foreground" })}>{wf.remove}</button>}
                    </div>
                    {editIdx === i ? (
                      <form className="flex gap-1.5" onSubmit={(e) => { e.preventDefault(); setEditIdx(null); }}>
                        <input autoFocus aria-label={wf.configAria} value={st.config} maxLength={200} onChange={(e) => { const s = steps.map((x, j) => (j === i ? { ...x, config: e.target.value } : x)); const p = [...(draft.previews ?? [])]; p[i] = null; setSteps(s, p); }} className="h-9 min-w-0 flex-1 rounded-md border border-ring bg-background px-2.5 text-[13px] text-foreground shadow-xs" />
                        <Button type="submit" variant="primary">{wf.ok}</Button>
                      </form>
                    ) : <span className="text-sm font-medium leading-[1.35]">{st.config}</span>}
                    <div className={cn("flex gap-2 rounded-lg px-2.5 py-[7px] text-[13px] leading-[1.4]", status === "stopped" ? "border border-dashed border-ring bg-background" : status === "skipped" ? "border border-border text-muted-foreground" : "border border-border bg-muted", (status === "pending" || (status === "idle" && !prev)) && "text-muted-foreground")}>
                      <ArrowRight size={12} aria-hidden="true" className="mt-[3px] shrink-0 opacity-60" />
                      <span className="min-w-0 flex-1">{status === "running" ? wf.testing : value}</span>
                    </div>
                    {source && <span className="self-start rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">{source}</span>}
                    {st.action && <span className="self-start rounded-md border border-input bg-background px-2.5 py-1 text-xs">{st.action}</span>}
                    {notLast && (
                      <button type="button" onClick={() => setInsertIdx(insertIdx === i ? null : i)} aria-label={wf.insert} aria-expanded={insertIdx === i} className="-ml-[33px] grid size-[26px] place-items-center self-start rounded-full border border-border bg-background text-muted-foreground hover:text-foreground"><Plus size={12} aria-hidden="true" /></button>
                    )}
                    {insertIdx === i && (
                      <div className="flex flex-wrap gap-1.5">
                        {INSERTABLE.map((ty) => (
                          <button key={ty} type="button" onClick={() => { const s = [...steps]; s.splice(i + 1, 0, { type: ty, config: wf.newStep }); const p = [...(draft.previews ?? steps.map(() => null))]; p.splice(i + 1, 0, null); setSteps(s, p); setInsertIdx(null); setEditIdx(i + 1); }} className="min-h-7 rounded-full border border-border bg-background px-2.5 text-xs hover:bg-accent">{wf.types[ty]}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <label className="flex min-h-10 flex-1 cursor-pointer items-center gap-2 text-[13px]">
              <Switch checked={nonDiab} onCheckedChange={(v) => { stop(); setTest(null); setNonDiab(v); }} aria-label={wf.nonDiab} />
              {wf.nonDiab}
            </label>
            <Button variant="primary" onClick={run} disabled={!!test?.running}><Play aria-hidden="true" />{test?.running ? wf.testing : wf.test}</Button>
          </div>
          {finished && (
            <div className={cn("flex flex-col gap-1.5 rounded-[10px] px-3.5 py-3", test!.result.halted ? "border border-dashed border-ring bg-background" : "border border-border bg-muted")} aria-live="polite">
              <span className="text-xs font-medium text-muted-foreground">{wf.result}</span>
              <span className="text-sm leading-[1.45]">{test!.result.halted || !out ? wf.halted : out.lines[0]}</span>
              {!test!.result.halted && out?.actionLabel && <span className="self-start rounded-md bg-primary px-2.5 py-[5px] text-xs font-medium text-primary-foreground">{out.actionLabel}</span>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DisplayStep({ draft, setDraft }: { draft: Draft; setDraft: (p: Partial<Draft>) => void }) {
  const lang = useLang();
  const t = lgc[lang];
  const d = draft.display;
  const ring = "border border-ring";
  return (
    <div className="flex flex-col gap-3 pt-3">
      <div role="radiogroup" aria-label={t.wizard.steps[3]} className="grid grid-cols-2 gap-1.5">
        {DISPLAY_IDS.map((x) => (
          <button key={x} type="button" role="radio" aria-checked={d === x} onClick={() => setDraft({ display: x })} className={cn(OPT, "justify-center text-center text-[13px]", d === x && OPT_SEL)}>{t.displays[x]}</button>
        ))}
      </div>
      <span className="text-xs font-medium text-muted-foreground">{t.wizard.preview}</span>
      <div aria-hidden="true" className="relative h-[140px] overflow-hidden rounded-lg border border-[#c9d1dc] bg-[#eef1f5]">
        <div className="h-3.5 bg-[#24364f]" />
        <div className="flex gap-1.5 p-2">
          <div className="h-[90px] w-10 border border-[#c9d1dc] bg-white" />
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="h-[34px] border border-[#c9d1dc] bg-white" />
            <div className="h-[46px] border border-[#c9d1dc] bg-white p-1.5">{d === "inline" && <div className={cn("h-full rounded bg-card", ring)} />}</div>
          </div>
          {d === "panel" && <div className={cn("h-[90px] w-[54px] rounded bg-card", ring)} />}
        </div>
        {d === "banner" && <div className="absolute inset-x-0 top-3.5 h-3 border-b border-ring bg-card" />}
        {d === "widget" && <div className={cn("absolute bottom-2 right-2 h-[50px] w-16 rounded-md bg-popover shadow-sm", ring)} />}
        {d === "modal" && <div className="absolute inset-0 grid place-items-center bg-black/35"><div className={cn("h-[60px] w-[110px] rounded-md bg-popover", ring)} /></div>}
      </div>
    </div>
  );
}
