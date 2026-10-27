"use client";
import * as React from "react";
import { ArrowRight, Check, Lock, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { lgc } from "@/i18n";
import { useLang } from "@/i18n/lang";
import { Button, buttonClass } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { FIELDS, fieldsFor, type AnchorId } from "@/data/integration-lgc/fournier";
import { HOOKS, TOOLS, TOOL_IDS, type ToolId } from "@/data/integration-lgc/blocks";
import type { Draft } from "./model";
import { useDialogFocus } from "./use-dialog";

/**
 * L'assistant de brique, à la Zapier : 4 étapes, chacune repliée en une
 * ligne résumé une fois faite. Outil Locus → point d'injection → données
 * transmises → affichage de la sortie. Chaque étape ne propose que ce qui
 * a un sens pour l'outil choisi : ancrages, données exigées, affichages.
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
  if (step === 1) return !!d.tool;
  if (step === 2) return !!d.anchor;
  if (step === 3) return d.fields.length > 0;
  return !!d.display;
}

export function Wizard({ draft, setDraft, step, setStep, editing, onClose, onSubmit, pickAnchor, pickTool }: {
  draft: Draft; setDraft: (p: Partial<Draft>) => void; step: number; setStep: (n: number) => void; editing: boolean;
  onClose: () => void; onSubmit: () => void; pickAnchor: (a: AnchorId) => void; pickTool: (t: ToolId) => void;
}) {
  const lang = useLang();
  const t = lgc[lang];
  const w = t.wizard;
  const ready = canContinue(draft, step);
  const titles = w.steps;

  const chosen = draft.anchor ? fieldsFor(draft.anchor).filter((k) => draft.fields.includes(k)) : [];
  const sums = [
    draft.tool ? [t.tools[draft.tool].name, ...TOOLS[draft.tool].settings.map((s) => { const v = draft.settings[s.k]; return s.kind === "toggle" ? `${t.settings[s.k]} ${v ? w.on : w.off}` : t.options[String(v)]; })].join(" · ") : "",
    draft.anchor ? `${t.anchors[draft.anchor]} · ${HOOKS[draft.anchor]}` : "",
    w.data(chosen.length, chosen.map((k) => t.fields[k]).join(", ")),
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
              {open && n === 1 && <ToolStep draft={draft} setDraft={setDraft} pickTool={pickTool} />}
              {open && n === 2 && draft.tool && (
                <div role="radiogroup" aria-label={title} className="flex flex-col gap-1.5 pt-3">
                  {TOOLS[draft.tool].anchors.map((a) => (
                    <button key={a} type="button" role="radio" aria-checked={draft.anchor === a} onClick={() => pickAnchor(a)} className={cn(OPT, draft.anchor === a && OPT_SEL)}>
                      <span className="flex-1">{t.anchors[a]}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">{HOOKS[a]}</span>
                    </button>
                  ))}
                </div>
              )}
              {open && n === 3 && draft.anchor && <Fields draft={draft} setDraft={setDraft} />}
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
        // Une donnée exigée par l'outil reste cochée : sans elle, la brique n'aurait rien à dire.
        const locked = !!draft.tool && TOOLS[draft.tool].required.includes(k);
        return (
          <button key={k} type="button" role="checkbox" aria-checked={on} aria-disabled={locked || undefined} title={locked ? t.wizard.required : undefined} onClick={() => { if (!locked) setDraft({ fields: on ? draft.fields.filter((x) => x !== k) : [...draft.fields, k] }); }} className={cn("grid min-h-10 grid-cols-[20px_minmax(0,140px)_12px_minmax(0,1fr)] items-center gap-2 rounded-md px-2 py-1 text-left", locked ? "cursor-default" : "hover:bg-accent")}>
            <span className={cn("grid size-5 place-items-center rounded-[5px] border", on ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background")}>{locked ? <Lock size={11} strokeWidth={3} aria-hidden="true" /> : on && <Check size={12} strokeWidth={3} aria-hidden="true" />}</span>
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

function ToolStep({ draft, setDraft, pickTool }: { draft: Draft; setDraft: (p: Partial<Draft>) => void; pickTool: (t: ToolId) => void }) {
  const lang = useLang();
  const t = lgc[lang];
  return (
    <div className="flex flex-col gap-3 pt-3">
      <div role="radiogroup" aria-label={t.wizard.steps[0]} className="flex flex-col gap-1.5">
        {TOOL_IDS.map((id) => (
          <button key={id} type="button" role="radio" aria-checked={draft.tool === id} onClick={() => pickTool(id)} className={cn(OPT, draft.tool === id && OPT_SEL)}>
            <span className="grid gap-0.5"><span className="font-medium">{t.tools[id].name}</span><span className="text-xs text-muted-foreground">{t.tools[id].desc}</span></span>
          </button>
        ))}
      </div>
      {draft.tool && TOOLS[draft.tool].settings.length > 0 && (
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
    </div>
  );
}

function DisplayStep({ draft, setDraft }: { draft: Draft; setDraft: (p: Partial<Draft>) => void }) {
  const lang = useLang();
  const t = lgc[lang];
  const d = draft.display;
  const ring = "border-2 border-brand";
  return (
    <div className="flex flex-col gap-3 pt-3">
      <div role="radiogroup" aria-label={t.wizard.steps[3]} className="grid grid-cols-2 gap-1.5">
        {(draft.tool ? TOOLS[draft.tool].displays : []).map((x) => (
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
