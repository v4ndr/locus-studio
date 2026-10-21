"use client";
import * as React from "react";
import { BookOpen, ChevronDown, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { chatbot, type Lang } from "@/i18n";
import { LocusMark } from "@/components/shell/locus-mark";
import type { AlertKind, Settings } from "@/data/chatbot/scenarios";
import type { ChatSource } from "./events";

/* Briques visuelles de l'écran chatbot (identité Noir, maquette Chatbot.dc). */

export function chipClass(on: boolean, off = false) {
  return cn(
    "min-h-8 rounded-md border px-3 text-[13px] transition-colors disabled:opacity-50",
    on ? "border-primary bg-primary text-primary-foreground" : off ? "border-input bg-background text-muted-foreground line-through" : "border-input bg-background text-foreground shadow-xs hover:bg-accent",
  );
}

export function Panel({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-2.5 rounded-[var(--radius)] border border-border bg-muted px-3.5 py-3", className)} {...rest} />;
}

export function ColumnHead({ kind, title, meta }: { kind: "rag" | "locus"; title: string; meta?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-7 shrink-0 place-items-center rounded-md border border-border bg-muted text-foreground">
        {kind === "rag" ? <BookOpen size={16} aria-hidden="true" /> : <LocusMark size={16} />}
      </span>
      <span className="text-base font-semibold tracking-[-.01em]">{title}</span>
      {meta && <span className="ml-auto text-xs text-muted-foreground">{meta}</span>}
    </div>
  );
}

export function AlertBadge({ kind, lang }: { kind: AlertKind; lang: Lang }) {
  const danger = kind === "ci" || kind === "risk";
  return (
    <span className={cn("inline-flex items-center gap-1.5 self-start rounded-md border px-2 py-0.5 text-xs font-medium", danger ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-border bg-background text-muted-foreground")}>
      <TriangleAlert size={13} aria-hidden="true" />
      {chatbot[lang].alerts[kind]}
    </span>
  );
}

/** Les sources sous une réponse ; numérotées quand les citations sont dans le texte. */
export function SourceList({ sources, numbered }: { sources: ChatSource[]; numbered: boolean }) {
  if (!sources.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {sources.map((s) => {
        const body = <>{numbered && <span className="font-mono text-[11px] text-foreground">{s.n}</span>}{s.label}</>;
        const cls = "inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground";
        return s.url
          ? <a key={s.n} href={s.url} target="_blank" rel="noopener noreferrer" className={cn(cls, "hover:border-ring hover:text-foreground")}><span className="truncate">{body}</span></a>
          : <span key={s.n} className={cls}><span className="truncate">{body}</span></span>;
      })}
    </div>
  );
}

export function Sup({ ns }: { ns: number[] }) {
  if (!ns.length) return null;
  return <sup className="ml-0.5 font-mono text-[10px] font-medium text-foreground">{ns.join(",")}</sup>;
}

export function Steps({ title, steps }: { title: string; steps: string[] }) {
  return (
    <Panel>
      <span className="text-xs font-medium text-muted-foreground">{title}</span>
      <ol className="m-0 grid list-none gap-1.5 p-0">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2.5 text-[13px] leading-[1.45]">
            <span className="min-w-3.5 font-mono text-xs font-medium text-muted-foreground">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </Panel>
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

export function SettingsPanel({ lang, s, onChange, live }: { lang: Lang; s: Settings; onChange: (patch: Partial<Settings>) => void; live: boolean }) {
  const t = chatbot[lang].settings;
  const [open, setOpen] = React.useState(false);
  const flipSource = (k: "has" | "ansm") => {
    const other = k === "has" ? "ansm" : "has";
    if (s[k] && !s[other]) return; // au moins une source
    onChange({ [k]: !s[k] });
  };
  return (
    <aside aria-label={t.title} className="order-first min-w-0 flex-[1_1_280px] rounded-xl border border-border bg-card shadow-sm min-[1200px]:sticky min-[1200px]:top-5 min-[1200px]:order-none">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={cn("flex w-full items-center gap-2 px-5 pt-[18px] text-left min-[1200px]:pointer-events-none min-[1200px]:pb-0", open ? "pb-0" : "pb-[18px]")}>
        <h2 className="m-0 flex-1 text-[15px] font-semibold tracking-[-.01em]">{t.title}</h2>
        <ChevronDown size={16} aria-hidden="true" className={cn("text-muted-foreground transition-transform min-[1200px]:hidden", open && "rotate-180")} />
      </button>
      <div className={cn("flex-col gap-[18px] px-5 pb-5 pt-[18px]", open ? "flex" : "hidden min-[1200px]:flex")}>
        <div className="flex flex-col">
          {TOGGLES.map((k) => {
            const [label, hint] = t[k];
            const on = s[k];
            return (
              <button key={k} type="button" role="switch" aria-checked={on} onClick={() => onChange({ [k]: !on })} className="flex min-h-11 w-full items-center gap-3 py-1 text-left">
                <span className="flex flex-1 flex-col gap-px">
                  <span className="text-sm font-medium text-foreground">{label}</span>
                  <span className="text-xs text-muted-foreground">{hint}</span>
                </span>
                <span aria-hidden="true" className={cn("relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors", on ? "bg-brand" : "bg-input")}>
                  <span className={cn("block size-4 rounded-full bg-white shadow-xs transition-transform", on ? "translate-x-[18px]" : "translate-x-0.5")} />
                </span>
              </button>
            );
          })}
        </div>
        <div className="h-px bg-border" />
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
        <p className="m-0 text-xs text-muted-foreground">{live ? t.fineLive : t.fineReplay}</p>
      </div>
    </aside>
  );
}
