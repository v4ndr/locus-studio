"use client";
import * as React from "react";
import { BookOpen, Check, ChevronRight, RotateCw, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { chatbot, type Lang } from "@/i18n";
import { LocusMark } from "@/components/shell/locus-mark";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { Settings } from "./request";
import type { ChatSource } from "./events";

/* Briques visuelles de l'écran chatbot (identité Noir). */

/** L'état d'une colonne : avant la question, envoyée, en cours, formulaire, terminée, en erreur. */
export type Phase = "idle" | "waiting" | "streaming" | "form" | "done" | "error";

export function chipClass(on: boolean, off = false) {
  return cn(
    "min-h-8 rounded-md border px-3 text-[13px] transition-colors disabled:opacity-50",
    on ? "border-primary bg-primary text-primary-foreground" : off ? "border-input bg-background text-muted-foreground line-through" : "border-input bg-background text-foreground shadow-xs hover:bg-accent",
  );
}

export function Panel({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-2.5 rounded-[var(--radius)] border border-border bg-muted px-3.5 py-3", className)} {...rest} />;
}

export function ColumnIcon({ kind }: { kind: "rag" | "locus" }) {
  return (
    <span className="grid size-7 shrink-0 place-items-center rounded-md border border-border bg-muted text-foreground">
      {kind === "rag" ? <BookOpen size={16} aria-hidden="true" /> : <LocusMark size={16} />}
    </span>
  );
}

/** L'état de la colonne en toutes lettres : pastille teal tant que la colonne travaille. */
export function StatusPill({ phase, lang, className }: { phase: Phase; lang: Lang; className?: string }) {
  const label = chatbot[lang].status[phase];
  const busy = phase === "waiting" || phase === "streaming";
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium", phase === "error" ? "text-destructive" : busy || phase === "form" ? "text-foreground" : "text-muted-foreground", className)}>
      {phase === "error" ? <TriangleAlert size={13} aria-hidden="true" />
        : phase === "done" ? <Check size={13} aria-hidden="true" />
        : <i aria-hidden="true" className={cn("block size-1.5 shrink-0 rounded-full", busy || phase === "form" ? "bg-brand" : "bg-ring", busy && "animate-pulse")} />}
      {label}
    </span>
  );
}

export function ColumnHead({ kind, title, meta, phase, lang }: { kind: "rag" | "locus"; title: string; meta?: string; phase: Phase; lang: Lang }) {
  return (
    <div className="flex items-center gap-2.5">
      <ColumnIcon kind={kind} />
      <span className="flex min-w-0 flex-col">
        <span className="text-base font-semibold leading-tight tracking-[-.01em]">{title}</span>
        {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
      </span>
      <StatusPill phase={phase} lang={lang} className="ml-auto" />
    </div>
  );
}

/** L'erreur d'une colonne, dite telle quelle, avec de quoi relancer. */
export function ErrorNote({ detail, retry, onRetry }: { detail: string; retry: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-[var(--radius)] border border-border bg-muted px-3.5 py-3">
      <span className="flex gap-2 text-sm leading-normal text-foreground">
        <TriangleAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-destructive" />
        {detail}
      </span>
      {onRetry && <Button size="sm" onClick={onRetry}><RotateCw aria-hidden="true" />{retry}</Button>}
    </div>
  );
}

/** L'attente d'une réponse : trois lignes grises, sans compteur. */
export function Attente() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-2.5 py-1">
      <span className="h-3 w-11/12 animate-pulse rounded bg-muted" />
      <span className="h-3 w-4/5 animate-pulse rounded bg-muted" />
      <span className="h-3 w-3/5 animate-pulse rounded bg-muted" />
    </div>
  );
}

/** Les sources sous une réponse ; numérotées quand les citations sont dans le texte. */
export function SourceList({ title, sources, numbered }: { title: string; sources: ChatSource[]; numbered: boolean }) {
  if (!sources.length) return null;
  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3.5">
      <span className="text-xs font-medium text-muted-foreground">{title}</span>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((s) => {
          const body = <>{numbered && <span className="font-mono text-[11px] text-foreground">{s.n}</span>}{s.label}</>;
          const cls = "inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground";
          return s.url
            ? <a key={s.n} href={s.url} target="_blank" rel="noopener noreferrer" className={cn(cls, "hover:border-ring hover:text-foreground")}><span className="truncate">{body}</span></a>
            : <span key={s.n} className={cls}><span className="truncate">{body}</span></span>;
        })}
      </div>
    </div>
  );
}

/** Les étapes de Locus : dépliées pendant la réponse, repliées une fois la réponse arrivée. */
export function Steps({ title, steps, folded }: { title: string; steps: string[]; folded?: boolean }) {
  const [open, setOpen] = React.useState(!folded);
  React.useEffect(() => setOpen(!folded), [folded]);
  return (
    <details open={open} onToggle={(e) => setOpen(e.currentTarget.open)} className="group/steps rounded-[var(--radius)] border border-border bg-muted px-3.5 py-3">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
        <ChevronRight size={14} aria-hidden="true" className="transition-transform group-open/steps:rotate-90" />
        {title}
        <span className="font-mono text-[11px]">{steps.length}</span>
      </summary>
      <ol className="m-0 mt-2.5 grid list-none gap-1.5 p-0">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2.5 text-[13px] leading-[1.45]">
            <span className="min-w-3.5 font-mono text-xs font-medium text-muted-foreground">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </details>
  );
}

/** Une question de clarification et ses pastilles. */
export function AskChips({ question, options, value, onPick, disabled }: { question: string; options: { key: string; label: string }[]; value?: string | string[]; onPick: (k: string) => void; disabled?: boolean }) {
  const on = (k: string) => (Array.isArray(value) ? value.includes(k) : value === k);
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{question}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button key={o.key} type="button" disabled={disabled} aria-pressed={on(o.key)} onClick={() => onPick(o.key)} className={chipClass(on(o.key))}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Réglages ---------- */

type ToggleKey = "elic" | "desamb" | "deep" | "reason" | "inline";
const TOGGLES: ToggleKey[] = ["elic", "desamb", "deep", "reason", "inline"];

/**
 * Les réglages Locus, ouverts depuis l'en-tête : un panneau en largeur, au-dessus
 * de la question, qui laisse toute la place aux deux réponses une fois refermé.
 */
export function SettingsPanel({ lang, s, onChange, onClose, id }: { lang: Lang; s: Settings; onChange: (patch: Partial<Settings>) => void; onClose: () => void; id: string }) {
  const t = chatbot[lang].settings;
  const flipSource = (k: "has" | "ansm") => {
    const other = k === "has" ? "ansm" : "has";
    if (s[k] && !s[other]) return; // au moins une source
    onChange({ [k]: !s[k] });
  };
  return (
    <section id={id} aria-label={t.title} onKeyDown={(e) => { if (e.key === "Escape") onClose(); }} className="flex flex-col gap-4 rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
      <div className="flex items-center gap-2">
        <h2 className="m-0 flex-1 text-[15px] font-semibold tracking-[-.01em]">{t.title}</h2>
        <Button variant="ghost" size="icon" aria-label={t.close} onClick={onClose} className="-mr-2 size-8"><X aria-hidden="true" /></Button>
      </div>
      <div className="grid gap-x-6 gap-y-1 [grid-template-columns:repeat(auto-fill,minmax(min(100%,230px),1fr))]">
        {TOGGLES.map((k) => {
          const [label, hint] = t[k];
          return (
            <label key={k} className="flex min-h-11 cursor-pointer items-center gap-3 py-1">
              <span className="flex flex-1 flex-col gap-px">
                <span className="text-sm font-medium text-foreground">{label}</span>
                <span className="text-xs text-muted-foreground">{hint}</span>
              </span>
              <Switch checked={s[k]} onCheckedChange={(v) => onChange({ [k]: v })} aria-label={label} />
            </label>
          );
        })}
      </div>
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3 border-t border-border pt-4">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">{t.sources}</span>
          <div className="flex flex-wrap gap-1.5">
            {(["has", "ansm"] as const).map((k) => (
              <button key={k} type="button" aria-pressed={s[k]} onClick={() => flipSource(k)} title={s[k] && !s[k === "has" ? "ansm" : "has"] ? t.lastSource : undefined} className={chipClass(s[k], !s[k])}>{k.toUpperCase()}</button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">{t.format}</span>
          <span role="group" aria-label={t.format} className="inline-flex gap-0.5 self-start rounded-md bg-muted p-[3px]">
            {([[t.short, true], [t.long, false]] as const).map(([label, court]) => (
              <button key={label} type="button" aria-pressed={s.court === court} onClick={() => onChange({ court })} className={cn("h-[30px] rounded-[6px] px-3.5 text-[13px] font-medium", s.court === court ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground")}>{label}</button>
            ))}
          </span>
        </div>
        <p className="m-0 min-w-[min(100%,240px)] flex-1 text-xs text-muted-foreground">{t.hint}</p>
      </div>
    </section>
  );
}
