"use client";
import * as React from "react";
import { ArrowUp, CircleCheck, FileText, RotateCw, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { lgc } from "@/i18n";
import { useLang } from "@/i18n/lang";
import { buttonClass } from "@/components/ui/button";
import { LocusMark } from "@/components/shell/locus-mark";
import { LocusMarkMotion } from "@/components/shell/locus-mark-motion";
import { LocusLoader } from "@/components/shell/locus-loader";
import type { LocusOut, OutAction } from "@/data/integration-lgc/blocks";
import { blockOutput, errorText } from "./api";
import type { Brick } from "./model";
import s from "./locus.module.css";

/**
 * Les surfaces Locus injectées dans MédiCab 7 : elles suivent l'identité
 * Noir (fond de carte, typo Studio), pas le style legacy, et elles se
 * détachent nettement de l'écran (contour Locus, ombre, arrivée animée :
 * `locus.module.css`). Le contenu clinique reste en français ; les boutons
 * suivent la langue. L'étiquette Locus dit où en est le calcul.
 */

export type CardAction = OutAction;
export type Variant = "card" | "panel" | "widget" | "modal";

export type LiveState = "computing" | "done" | "error";

/** La classe d'une surface Locus : contour, ombre et arrivée. `arrive` rejoue l'animation quand la clé React change. */
export const surface = (arrive = true) => cn(s.surface, arrive && s.arrive, "rounded-xl bg-card font-sans text-card-foreground");

/**
 * L'étiquette Locus, sa marque en tête ; avec `state`, elle dit aussi l'état
 * du calcul en direct : pendant le calcul, la marque se bâtit (le loader Locus).
 */
export function LocusTag({ state }: { state?: LiveState }) {
  const lang = useLang();
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary py-0.5 pl-1.5 pr-2.5 text-xs font-semibold text-primary-foreground">
      {state === "computing" ? <LocusMarkMotion size={16} /> : <LocusMark size={14} className={cn(state === "error" && "opacity-50")} />}Locus
      {state && state !== "done" && <span className="font-normal opacity-75">· {lgc[lang].out.state[state]}</span>}
    </span>
  );
}

/** Le verdict d'un contrôle d'ordonnance, à côté du titre. */
export function Verdict({ alert }: { alert: boolean }) {
  const lang = useLang();
  const t = lgc[lang].out;
  const Icon = alert ? TriangleAlert : CircleCheck;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold", alert ? "bg-[#fde8e4] text-[#8a1c0e]" : "bg-muted text-foreground")}>
      <Icon size={14} aria-hidden="true" />{alert ? t.alert : t.clear}
    </span>
  );
}

/** Le bouton « Réessayer » d'une sortie en échec. */
export function RetryButton({ onRetry }: { onRetry: () => void }) {
  const lang = useLang();
  return <button type="button" onClick={onRetry} className={buttonClass({ size: "sm", className: "h-8 shrink-0 px-3 text-[13px]" })}><RotateCw aria-hidden="true" />{lgc[lang].out.retry}</button>;
}

/** Le champ « Question à Locus », avec les questions suggérées et la dernière réponse. */
export function AskBox({ brick, sugg = [], court = true }: { brick: Brick; sugg?: string[]; court?: boolean }) {
  const lang = useLang();
  const t = lgc[lang].out;
  const [q, setQ] = React.useState("");
  const [state, setState] = React.useState<{ q: string; out?: LocusOut; busy?: boolean; error?: string } | null>(null);
  const ask = async (question: string) => {
    const text = question.trim();
    if (!text) return;
    setState({ q: text, busy: true });
    try {
      const r = await blockOutput({ ...brick, settings: { court } }, text);
      setState({ q: text, out: r.output });
      setQ("");
    } catch (e) {
      setState({ q: text, error: errorText(e, t) });
    }
  };
  const live: LiveState | undefined = state ? (state.busy ? "computing" : state.error ? "error" : "done") : undefined;
  return (
    <div className="grid gap-2">
      <form onSubmit={(e) => { e.preventDefault(); void ask(q); }} className="flex gap-1.5">
        <input value={q} onChange={(e) => setQ(e.target.value)} aria-label={t.askAria} placeholder={t.ask} maxLength={300} className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs placeholder:text-muted-foreground focus:outline-2 focus:outline-offset-1 focus:outline-ring" />
        <button type="submit" aria-label={t.send} className={buttonClass({ variant: "primary", size: "icon", className: "size-10" })}><ArrowUp aria-hidden="true" /></button>
      </form>
      {sugg.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {sugg.map((x) => <button key={x} type="button" onClick={() => void ask(x)} className="rounded-full border border-border bg-background px-2.5 py-1 text-[13px] text-foreground hover:bg-accent">{x}</button>)}
        </div>
      )}
      {state && (
        <div className="grid gap-1.5 rounded-lg border border-border bg-muted px-3 py-2.5 text-sm" aria-live="polite">
          <span className="flex items-start gap-2"><span className="flex-1 font-semibold">{state.q}</span>{live === "error" && <LocusTag state={live} />}</span>
          {state.busy && <LocusLoader px={28} label={t.loading} />}
          {state.error && (
            <span className="flex flex-wrap items-center gap-2"><span className="flex-1 text-muted-foreground" role="alert">{state.error}</span><RetryButton onRetry={() => void ask(state.q)} /></span>
          )}
          {state.out?.lines.map((l, i) => <p key={i} className="m-0 leading-normal">{l}</p>)}
          {state.out && <Provenance out={state.out} />}
        </div>
      )}
    </div>
  );
}

/**
 * D'où vient la sortie : les documents que la réponse cite, ou « d'après le
 * dossier transmis » pour une synthèse. Rien quand la réponse ne cite rien.
 */
function Provenance({ out }: { out: LocusOut }) {
  const lang = useLang();
  const t = lgc[lang].out;
  if (out.fromRecord) return <span className="inline-flex items-center gap-1.5 self-start text-xs text-muted-foreground"><FileText size={13} aria-hidden="true" />{t.fromRecord}</span>;
  if (!out.sources?.length) return null;
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{t.sources}</span>
      {out.sources.map((x) => <span key={x} className="rounded-md border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">{x}</span>)}
    </span>
  );
}

export function LocusBody({ brick, out, variant, onAction }: { brick: Brick; out: LocusOut; variant: Variant; onAction: (a: CardAction) => void }) {
  const lang = useLang();
  const t = lgc[lang].out;
  return (
    <>
      {variant !== "modal" && variant !== "card" && <span className="flex flex-wrap items-center gap-2"><span className="text-[15px] font-semibold tracking-[-.01em]">{out.title}</span>{out.alert !== undefined && <Verdict alert={out.alert} />}</span>}
      {out.lines.length > 0 && <div className="grid gap-1">{out.lines.map((l, i) => <p key={i} className="m-0 leading-normal">{l}</p>)}</div>}
      {out.question && <AskBox brick={brick} sugg={out.sugg} court={brick.settings.court !== false} />}
      {(out.fromRecord || out.sources?.length || out.actions?.length) && (
        <div className="flex flex-wrap items-center gap-2">
          <Provenance out={out} />
          <span className="flex-1" />
          {out.actions?.map((a) => <button key={a} type="button" onClick={() => onAction(a)} className={buttonClass({ size: "sm", className: "h-8 px-3 text-[13px]" })}>{t[a]}</button>)}
        </div>
      )}
    </>
  );
}

/** La carte Locus posée dans une zone de MédiCab (affichage « carte dans la zone »). */
export function LocusCard({ brick, out, onAction, className }: { brick: Brick; out: LocusOut; onAction: (a: CardAction) => void; className?: string }) {
  return (
    <section aria-label={`Locus · ${out.title}`} className={cn(surface(), "grid gap-2.5 px-4 py-3.5 text-sm", className)}>
      <div className="flex flex-wrap items-center gap-2"><LocusTag state="done" /><span className="text-[15px] font-semibold tracking-[-.01em]">{out.title}</span>{out.alert !== undefined && <Verdict alert={out.alert} />}</div>
      <LocusBody brick={brick} out={out} variant="card" onAction={onAction} />
    </section>
  );
}

/** En attente de la réponse de la brique : le loader Locus, en grand, dans la surface Locus. */
export function LocusLoading({ className }: { className?: string }) {
  const lang = useLang();
  return (
    <div aria-live="polite" className={cn(surface(), "px-4 py-3.5 text-sm", className)}>
      <LocusWorking label={lgc[lang].out.loading} />
    </div>
  );
}

/** Le loader Locus d'une brique en calcul (bandeau, panneau, widget, carte). */
export function LocusWorking({ label }: { label: string }) {
  return <LocusLoader size="card" px={40} label={label} />;
}

/** Une brique dont le calcul a échoué : le message, et « Réessayer ». Jamais de sortie de remplacement. */
export function LocusFailed({ message, onRetry, className }: { message: string; onRetry: () => void; className?: string }) {
  return (
    <div role="alert" className={cn(surface(), "flex flex-wrap items-center gap-2.5 px-4 py-3.5 text-sm", className)}>
      <LocusTag state="error" /><span className="min-w-[min(100%,200px)] flex-1">{message}</span><RetryButton onRetry={onRetry} />
    </div>
  );
}
