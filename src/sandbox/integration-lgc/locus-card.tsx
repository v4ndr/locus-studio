"use client";
import * as React from "react";
import Link from "next/link";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/cn";
import { lgc, route } from "@/i18n";
import { useLang } from "@/i18n/lang";
import { buttonClass } from "@/components/ui/button";
import type { LocusOut, OutAction } from "@/data/integration-lgc/blocks";
import { blockOutput, errorText } from "./api";
import type { Brick } from "./model";

/**
 * Les surfaces Locus injectées dans MédiCab 7 : elles suivent l'identité
 * Noir (bordure pleine de 1 px, fond de carte), pas le style legacy.
 * Le contenu clinique reste en français ; les boutons suivent la langue.
 */

export type CardAction = OutAction;
export type Variant = "card" | "panel" | "widget" | "modal";

export function LocusTag() {
  return (
    <span className="inline-flex items-center gap-[5px] rounded-full border border-border bg-background px-2 py-px text-[11px] font-medium text-foreground">
      <i aria-hidden="true" className="block size-1.5 rounded-full bg-brand" />Locus
    </span>
  );
}

function ActionButton({ a, label, onClick }: { a: CardAction; label: string; onClick: () => void }) {
  const primary = a === "replace" || a === "wfAction";
  return <button type="button" onClick={onClick} className={buttonClass({ variant: primary ? "primary" : "default", size: "sm", className: "h-8 px-3 text-[13px]" })}>{label}</button>;
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
  return (
    <div className="grid gap-1.5">
      <form onSubmit={(e) => { e.preventDefault(); void ask(q); }} className="flex gap-1.5">
        <input value={q} onChange={(e) => setQ(e.target.value)} aria-label={t.askAria} placeholder={t.ask} maxLength={300} className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2.5 text-[13px] text-foreground shadow-xs placeholder:text-muted-foreground focus:outline-2 focus:outline-offset-1 focus:outline-ring" />
        <button type="submit" aria-label={t.send} className={buttonClass({ size: "icon" })}><ArrowUp aria-hidden="true" /></button>
      </form>
      {sugg.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {sugg.map((s) => <button key={s} type="button" onClick={() => void ask(s)} className="rounded-full border border-border bg-background px-2.5 py-[3px] text-xs text-foreground hover:bg-accent">{s}</button>)}
        </div>
      )}
      {state && (
        <div className="grid gap-1 rounded-md border border-border bg-muted px-2.5 py-2 text-[13px]" aria-live="polite">
          <span className="font-medium">{state.q}</span>
          {state.busy && <span className="text-muted-foreground">{t.loading}</span>}
          {state.error && <span className="text-muted-foreground">{state.error}</span>}
          {state.out?.locked && (
            <span className="text-muted-foreground">{t.locked} <Link href={route(lang, "acces")} className="font-medium text-foreground underline underline-offset-2">{lgc[lang].bar.access}</Link></span>
          )}
          {state.out?.lines.map((l, i) => <p key={i} className="m-0 leading-[1.45]">{l}</p>)}
          {state.out?.source && <Source s={state.out.source} />}
        </div>
      )}
    </div>
  );
}

function Source({ s }: { s: string }) {
  return <span className="self-start rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">{s}</span>;
}

export function LocusBody({ brick, out, variant, onAction }: { brick: Brick; out: LocusOut; variant: Variant; onAction: (a: CardAction) => void }) {
  const lang = useLang();
  const t = lgc[lang].out;
  const label = (a: CardAction) => (a === "wfAction" ? out.actionLabel ?? "" : t[a]);
  return (
    <>
      {variant !== "modal" && variant !== "card" && <span className="text-[13px] font-semibold">{out.title}</span>}
      {out.lines.map((l, i) => <p key={i} className={cn("m-0 leading-[1.45]", variant === "widget" || variant === "modal" ? "text-muted-foreground" : "")}>{l}</p>)}
      {!!out.alts?.length && (
        <div className="grid gap-1.5">
          {out.alts.map((a) => (
            <div key={a.name} className="grid gap-0.5 rounded-md border border-border bg-muted px-2.5 py-2">
              <span className="font-medium">{a.name}</span>
              <span className="text-xs text-muted-foreground">{a.note}</span>
            </div>
          ))}
        </div>
      )}
      {out.question && <AskBox brick={brick} sugg={out.sugg} court={brick.settings.court !== false} />}
      {(out.source || out.actions?.length) && (
        <div className="flex flex-wrap items-center gap-2">
          {out.source && <Source s={out.source} />}
          <span className="flex-1" />
          {out.actions?.map((a) => <ActionButton key={a} a={a} label={label(a)} onClick={() => onAction(a)} />)}
        </div>
      )}
    </>
  );
}

/** La carte Locus posée dans une zone de MédiCab (affichage « carte dans la zone »). */
export function LocusCard({ brick, out, onAction, className }: { brick: Brick; out: LocusOut; onAction: (a: CardAction) => void; className?: string }) {
  return (
    <div className={cn("grid gap-2 rounded-xl border border-border bg-card px-4 py-3.5 font-sans text-[13px] text-card-foreground shadow-sm", className)}>
      <div className="flex items-center gap-2"><LocusTag /><span className="font-semibold">{out.title}</span></div>
      <LocusBody brick={brick} out={out} variant="card" onAction={onAction} />
    </div>
  );
}

/** En attente de la réponse de la brique. */
export function LocusLoading({ className }: { className?: string }) {
  const lang = useLang();
  return (
    <div className={cn("flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 font-sans text-[13px] text-muted-foreground shadow-sm", className)}>
      <LocusTag />{lgc[lang].out.loading}
    </div>
  );
}
