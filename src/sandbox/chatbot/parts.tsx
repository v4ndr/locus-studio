"use client";
import * as React from "react";
import { BookOpen, Check, ChevronDown, ChevronRight, ExternalLink, RotateCw, SlidersHorizontal, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { chatbot, type Lang } from "@/i18n";
import { LocusMark } from "@/components/shell/locus-mark";
import { LocusMarkMotion } from "@/components/shell/locus-mark-motion";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { Settings } from "./request";
import type { ChatSource, Confiance, SourceKind } from "./events";

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
    <span className={cn("grid size-7 shrink-0 place-items-center rounded-md border", kind === "locus" ? "border-transparent bg-brand-soft text-brand" : "border-border bg-muted text-muted-foreground")}>
      {kind === "rag" ? <BookOpen size={16} aria-hidden="true" /> : <LocusMark size={16} />}
    </span>
  );
}

/**
 * L'état de la colonne en toutes lettres. Tant que Locus travaille, sa marque
 * se bâtit à côté (le loader Locus) ; le RAG simple, lui, n'a qu'un point fade.
 */
export function StatusPill({ kind = "locus", phase, lang, className }: { kind?: "rag" | "locus"; phase: Phase; lang: Lang; className?: string }) {
  const label = chatbot[lang].status[phase];
  const busy = phase === "waiting" || phase === "streaming";
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium", phase === "error" ? "text-destructive" : busy || phase === "form" ? "text-foreground" : "text-muted-foreground", className)}>
      {phase === "error" ? <TriangleAlert size={13} aria-hidden="true" />
        : phase === "done" ? <Check size={13} aria-hidden="true" />
        : busy && kind === "locus" ? <LocusMarkMotion size={18} className="text-brand" />
        : <i aria-hidden="true" className={cn("block size-1.5 shrink-0 rounded-full", phase === "form" && kind === "locus" ? "bg-brand" : "bg-ring opacity-60")} />}
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
      <StatusPill kind={kind} phase={phase} lang={lang} className="ml-auto" />
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

/** L'ordre des groupes de sources : la recommandation d'abord, le médicament ensuite, les instruments à la fin. */
const KINDS: SourceKind[] = ["doc", "table", "chunk", "rcp", "drug", "tree", "score"];

/**
 * Les sources sous une réponse, rangées par nature (recommandations,
 * tableaux, extraits, RCP, médicaments, arbres, scores), chacune avec son
 * éditeur. Numérotées quand les citations sont dans le texte ; une source
 * retenue sans être citée (le document d'un tableau cité, un médicament
 * prescrit par une règle citée) le dit, sans numéro.
 */
export function SourceList({ lang, sources, numbered }: { lang: Lang; sources: ChatSource[]; numbered: boolean }) {
  const t = chatbot[lang].locus;
  if (!sources.length) return null;
  const editeurs = [...new Set(sources.map((s) => s.publisher).filter((x): x is string => !!x))];
  const groupes = KINDS.map((k) => [k, sources.filter((s) => (s.kind ?? "doc") === k)] as const).filter(([, xs]) => xs.length);
  return (
    <div className="flex flex-col gap-3 border-t border-border pt-3.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">{t.sources}</span>
        {editeurs.length > 0 && <span className="text-xs text-muted-foreground">· {t.publishers(editeurs.length)}</span>}
        <span className="flex flex-wrap gap-1">
          {editeurs.map((e) => <span key={e} className="rounded-md border border-border bg-background px-1.5 py-px text-[11px] font-medium text-foreground">{e}</span>)}
        </span>
      </div>
      {groupes.map(([k, xs]) => (
        <div key={k} className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-[.04em] text-muted-foreground">{t.kinds[k]} <span className="font-mono">{xs.length}</span></span>
          <ul className="m-0 grid list-none gap-1 p-0">
            {xs.map((s) => {
              const corps = (
                <>
                  {numbered && s.cited !== false
                    ? <span className="mt-px min-w-4 font-mono text-[11px] font-medium text-foreground">{s.n}</span>
                    : <span aria-hidden="true" className="mt-px min-w-4 font-mono text-[11px] text-muted-foreground">·</span>}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[13px] leading-snug text-foreground">{s.label}{s.url && <ExternalLink size={12} aria-hidden="true" className="ml-1 inline-block align-[-1px] text-muted-foreground" />}</span>
                    <span className="text-xs leading-snug text-muted-foreground">
                      {[s.publisher, s.detail, s.cited === false ? (s.kind === "score" || s.kind === "tree" ? t.proposed : t.retained) : null].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </>
              );
              const cls = "flex gap-2 rounded-md px-1.5 py-1";
              return (
                <li key={`${k}-${s.n}`}>
                  {s.url
                    ? <a href={s.url} target="_blank" rel="noopener noreferrer" className={cn(cls, "hover:bg-muted")}>{corps}</a>
                    : <div className={cls}>{corps}</div>}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/**
 * Le degré de confiance, en tête de réponse, comme dans B2Pro : cinq crans,
 * en alerte aux deux premiers. Cliquable : la phrase du cran et les quatre
 * marches, franchies ou non, disent ce qui manque à la réponse.
 */
export function ConfidenceBar({ lang, c }: { lang: Lang; c: Confiance }) {
  const t = chatbot[lang].confidence;
  const [open, setOpen] = React.useState(false);
  const faible = c.level <= 2;
  const resume = t.levels[c.level - 1] ?? t.levels[0];
  return (
    <div className="flex flex-col gap-2">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} aria-label={`${t.label} : ${t.of(c.level)}. ${resume}`} className="-mx-1 flex w-fit items-center gap-2 rounded px-1 py-0.5 text-muted-foreground transition-colors hover:text-foreground">
        <span className="text-xs font-medium">{t.label}</span>
        <span aria-hidden="true" className="flex items-center gap-0.5">
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} className={cn("h-1.5 w-4 rounded-full border", i < c.level ? (faible ? "border-destructive bg-destructive" : "border-foreground bg-foreground") : "border-border bg-background")} />
          ))}
        </span>
        <ChevronDown size={13} aria-hidden="true" className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-muted px-3.5 py-3">
          <p className="m-0 text-[13px] leading-snug text-foreground">{resume}</p>
          <ul className="m-0 grid list-none gap-1 p-0">
            {t.conditions.map((label, i) => (
              <li key={i} className={cn("flex gap-2 text-xs leading-snug", c.ok[i] ? "text-foreground" : "text-muted-foreground")}>
                {c.ok[i] ? <Check size={13} aria-hidden="true" className="mt-px shrink-0" /> : <span aria-hidden="true" className="mt-[5px] block size-1.5 shrink-0 rounded-full border border-ring" />}
                {label}
              </li>
            ))}
          </ul>
        </div>
      )}
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
const TOGGLES: ToggleKey[] = ["deep", "elic", "desamb", "reason", "inline"];

/**
 * Les réglages Locus, en évidence au-dessus de la question et ouverts par
 * défaut : ils sont là pour qu'on les essaie. Repliés, ils restent lisibles
 * en une ligne, chaque réglage avec son état.
 */
export function SettingsPanel({ lang, s, onChange, id }: { lang: Lang; s: Settings; onChange: (patch: Partial<Settings>) => void; id: string }) {
  const t = chatbot[lang].settings;
  const [open, setOpen] = React.useState(true);
  return (
    <section id={id} aria-label={t.title} className="flex flex-col gap-3 rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
      <div className="flex items-center gap-2.5">
        <span className="grid size-7 shrink-0 place-items-center rounded-md border border-border bg-muted text-foreground"><SlidersHorizontal size={15} aria-hidden="true" /></span>
        <h2 className="m-0 text-[15px] font-semibold tracking-[-.01em]">{t.title}</h2>
        <Button size="sm" className="ml-auto" aria-expanded={open} aria-controls={`${id}-corps`} onClick={() => setOpen((o) => !o)}>
          {open ? t.collapse : t.expand}<ChevronDown aria-hidden="true" className={cn("transition-transform", open && "rotate-180")} />
        </Button>
      </div>
      {!open && (
        <p className="m-0 flex flex-wrap gap-1.5">
          {TOGGLES.map((k) => (
            <button key={k} type="button" onClick={() => onChange({ [k]: !s[k] })} aria-pressed={s[k]} className={chipClass(s[k], !s[k])}>{t[k][0]}</button>
          ))}
          <span className="inline-flex min-h-8 items-center rounded-md border border-input bg-background px-3 text-[13px] text-muted-foreground">{t.format} : {s.court ? t.short : t.long}</span>
        </p>
      )}
      {open && (
        <div id={`${id}-corps`} className="flex flex-col gap-3">
          <div className="grid gap-x-6 gap-y-1 [grid-template-columns:repeat(auto-fill,minmax(min(100%,230px),1fr))]">
            {TOGGLES.map((k) => {
              const [label, hint] = t[k];
              return (
                <label key={k} className="flex min-h-11 cursor-pointer items-center gap-3 py-1">
                  <span className="flex flex-1 flex-col gap-px">
                    <span className="text-sm font-medium text-foreground">{label}</span>
                    <span className="text-xs text-muted-foreground">{hint}</span>
                  </span>
                  <Switch checked={s[k]} onCheckedChange={(v) => onChange({ [k]: v })} aria-label={`${label} : ${s[k] ? t.on : t.off}`} />
                </label>
              );
            })}
            <div className="flex min-h-11 items-center gap-3 py-1">
              <span className="flex-1 text-sm font-medium text-foreground">{t.format}</span>
              <span role="group" aria-label={t.format} className="inline-flex gap-0.5 rounded-md bg-muted p-[3px]">
                {([[t.short, true], [t.long, false]] as const).map(([label, court]) => (
                  <button key={label} type="button" aria-pressed={s.court === court} onClick={() => onChange({ court })} className={cn("h-[30px] rounded-[6px] px-3.5 text-[13px] font-medium", s.court === court ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground")}>{label}</button>
                ))}
              </span>
            </div>
          </div>
          <p className="m-0 border-t border-border pt-3 text-xs text-muted-foreground">{t.hint}</p>
        </div>
      )}
    </section>
  );
}
