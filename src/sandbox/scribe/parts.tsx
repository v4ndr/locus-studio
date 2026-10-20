"use client";
import * as React from "react";
import { AlertTriangle, Check, ChevronRight, Pause, Play } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Box } from "@/components/ui/card";
import type { CarteAide, RubriqueCr } from "@/data/scribe/consultations";
import type { ScribeDict } from "@/i18n";

/* ---------- Stepper numéroté (pas de pastilles) ---------- */

export type EtatEtape = "fait" | "encours" | "avenir";

export function Stepper({ t, step, unlocked, onPick }: { t: ScribeDict; step: number; unlocked: number; onPick: (n: number) => void }) {
  const ref = React.useRef<HTMLElement>(null);
  React.useEffect(() => {
    // Défilement horizontal du seul stepper (scrollIntoView ferait aussi défiler la page).
    const nav = ref.current;
    const el = nav?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!nav || !el) return;
    const g = el.offsetLeft - nav.offsetLeft, d = g + el.offsetWidth;
    if (g < nav.scrollLeft) nav.scrollLeft = g;
    else if (d > nav.scrollLeft + nav.clientWidth) nav.scrollLeft = d - nav.clientWidth;
  }, [step]);
  return (
    <nav ref={ref} aria-label={t.steps} className="flex overflow-x-auto border-b border-border [scrollbar-width:none]">
      {t.stepLabels.map((label, i) => {
        const n = i + 1;
        const cur = n === step;
        const done = !cur && n < unlocked;
        const locked = n > unlocked;
        return (
          <button
            key={label}
            type="button"
            disabled={locked}
            aria-current={cur ? "step" : undefined}
            onClick={() => !locked && !cur && onPick(n)}
            className={cn(
              "-mb-px flex h-11 min-w-[132px] flex-1 basis-0 items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-1 text-left text-sm font-medium text-muted-foreground",
              cur ? "cursor-default border-foreground text-foreground" : "hover:text-foreground",
              locked && "cursor-not-allowed opacity-45 hover:text-muted-foreground",
            )}
          >
            <span className={cn("grid size-[22px] shrink-0 place-items-center rounded-[6px] border border-border font-mono text-xs", cur && "border-transparent bg-brand-soft", done && "border-primary bg-primary text-primary-foreground")}>
              {done ? <Check size={12} strokeWidth={3} aria-hidden="true" /> : n}
            </span>
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/* ---------- 1 · Écouter ---------- */

const BASE = [6, 12, 18, 9, 22, 14, 7, 19, 11, 25, 16, 8, 13, 21, 10, 17, 6, 23, 12, 15, 9, 20, 14, 7, 18, 11, 24, 13, 8, 16, 21, 10, 6, 19, 12, 22, 15, 9, 17, 11, 7, 20, 13, 18, 10, 14, 8, 12];
/** 96 barres : de quoi remplir la largeur à 1120 px. */
const HAUTEURS = [...BASE, ...BASE.slice().reverse()];

export function Player({ t, playing, progress, etat, onToggle }: { t: ScribeDict; playing: boolean; progress: number; etat: string; onToggle: () => void }) {
  const lit = Math.round(progress * HAUTEURS.length);
  return (
    <Box aria-label={t.player} className="flex flex-wrap items-center gap-[18px] px-[18px] py-4">
      <button type="button" onClick={onToggle} aria-label={playing ? t.pause : t.play} className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90">
        {playing ? <Pause size={16} fill="currentColor" strokeWidth={0} aria-hidden="true" /> : <Play size={16} fill="currentColor" strokeWidth={0} aria-hidden="true" />}
      </button>
      <div aria-hidden="true" className="flex h-9 min-w-0 flex-[1_1_220px] items-center gap-[3px] overflow-hidden">
        {HAUTEURS.map((h, i) => <span key={i} className={cn("w-[3px] shrink-0 rounded-[2px] transition-colors", i < lit ? "bg-foreground" : "bg-input")} style={{ height: h }} />)}
      </div>
      <span className={cn("inline-flex min-w-[170px] items-center gap-1.5 text-[13px]", playing ? "text-foreground" : "text-muted-foreground")}>
        <StatusDot active={playing} />{etat}
      </span>
    </Box>
  );
}

export interface LigneVue { who: string; doc: boolean; texte: string }

export function TranscriptLines({ lignes, dim }: { lignes: LigneVue[]; dim?: boolean }) {
  return (
    <>
      {lignes.map((l, i) => (
        <div key={i} className="grid grid-cols-[96px_minmax(0,1fr)] gap-3.5 border-b border-border py-[11px] last:border-b-0 max-[480px]:grid-cols-1 max-[480px]:gap-0.5">
          <span className={cn("pt-px text-[13px] font-medium text-muted-foreground", l.doc && "font-semibold text-foreground")}>{l.who}</span>
          <span className={cn(dim && "text-muted-foreground")}>{l.texte}</span>
        </div>
      ))}
    </>
  );
}

/* ---------- 2 · Compte rendu ---------- */

export function NoteTable({ t, cr, vals, onEdit }: { t: ScribeDict; cr: RubriqueCr[]; vals: string[]; onEdit: (i: number, v: string) => void }) {
  return (
    <Box aria-label={t.note} className="overflow-hidden">
      {cr.map((r, i) => (
        <div key={i} className={cn("grid grid-cols-[minmax(140px,220px)_minmax(0,1fr)] gap-4 border-b border-border px-5 py-3 last:border-b-0 max-[820px]:grid-cols-1 max-[820px]:gap-1", r.titre && "bg-muted")}>
          <label htmlFor={`cr-${i}`} className={cn("pt-px font-semibold", r.sous && "pl-4 font-normal text-muted-foreground max-[820px]:pl-0")}>{r.label}</label>
          {!r.titre && (
            <textarea
              id={`cr-${i}`}
              rows={(vals[i] ?? "").length > 90 ? 2 : 1}
              value={vals[i] ?? ""}
              onChange={(e) => onEdit(i, e.target.value)}
              className="-mx-2 -my-[5px] w-[calc(100%+16px)] resize-y rounded-md border border-transparent bg-transparent px-2 py-[5px] leading-normal hover:border-border focus:border-ring focus:bg-background focus:outline-none"
            />
          )}
        </div>
      ))}
    </Box>
  );
}

/* ---------- 3 · Aide à la décision ---------- */

export function AideCard({ t, a, retained, open, onRetain, onWhy }: { t: ScribeDict; a: CarteAide; retained: boolean; open: boolean; onRetain: () => void; onWhy: () => void }) {
  return (
    <article className={cn("flex flex-col gap-3 rounded-xl border bg-card px-5 py-[18px] shadow-sm transition-colors", retained ? "border-ring" : "border-border")}>
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-1">
          <span className="text-base font-semibold leading-[1.4] tracking-[-.01em]">{a.titre}</span>
          {a.detail && <span className="text-muted-foreground">{a.detail}</span>}
        </div>
        <Button variant={retained ? "primary" : "default"} onClick={onRetain} aria-pressed={retained}>
          {retained && <Check aria-hidden="true" />}{retained ? t.retained : t.retain}
        </Button>
      </div>
      {a.alerte && (
        <div role="note" className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
          <AlertTriangle size={16} aria-hidden="true" className="mt-0.5 shrink-0" /><span>{a.alerte}</span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        {a.sources.map((s) => <Badge key={s} className="bg-muted font-normal text-muted-foreground">{s}</Badge>)}
        {a.pourquoi.length > 0 && (
          <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground" onClick={onWhy} aria-expanded={open}>
            {t.why}<ChevronRight aria-hidden="true" className={cn("transition-transform", open && "rotate-90")} />
          </Button>
        )}
      </div>
      {open && (
        <ul className="m-0 flex list-disc flex-col gap-1 rounded-md bg-muted py-3 pl-[30px] pr-3.5 text-muted-foreground">
          {a.pourquoi.map((w) => <li key={w}>{w}</li>)}
        </ul>
      )}
    </article>
  );
}

/* ---------- 4 · Actions ---------- */

export function ActionRow({ t, texte, statut, retained, editing, onOk, onIgn, onEdit, onText }: {
  t: ScribeDict; texte: string; statut?: "ok" | "ign"; retained: boolean; editing: boolean;
  onOk: () => void; onIgn: () => void; onEdit: () => void; onText: (v: string) => void;
}) {
  const ok = statut === "ok", ign = statut === "ign";
  return (
    <div className="flex flex-col gap-2.5 border-b border-border px-[18px] py-3.5 last:border-b-0">
      <div className="flex flex-wrap items-center gap-3">
        <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border-[1.5px] border-input", ok && "border-ok bg-ok text-background")}>
          {ok && <Check size={12} strokeWidth={3} aria-hidden="true" />}
        </span>
        <span className={cn("min-w-0 flex-[1_1_300px] leading-[1.45]", ign && "text-muted-foreground line-through")}>{texte}</span>
        {retained && <Badge className="bg-muted font-normal text-muted-foreground">{t.retainedBadge}</Badge>}
        <span className="flex flex-wrap gap-1.5">
          <Button size="sm" variant={ok ? "default" : "primary"} className={cn(ok && "border-transparent bg-ok-soft text-ok shadow-none hover:bg-ok-soft")} onClick={onOk} aria-pressed={ok}>{ok ? t.approved : t.approve}</Button>
          <Button size="sm" onClick={onEdit} aria-expanded={editing}>{editing ? t.close : t.edit}</Button>
          <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={onIgn} aria-pressed={ign}>{ign ? t.dismissed : t.dismiss}</Button>
        </span>
      </div>
      {editing && (
        <label className="flex flex-col gap-1.5 text-[13px] text-muted-foreground">
          {t.actionText}
          <textarea rows={2} value={texte} onChange={(e) => onText(e.target.value)} className="resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none" />
        </label>
      )}
    </div>
  );
}

/* ---------- 5 · Récapitulatif ---------- */

export function Recap({ t, rows, ok }: { t: ScribeDict; rows: { label: string; valeur: string }[]; ok: string[] }) {
  return (
    <div className="flex flex-wrap items-start gap-4">
      <Box aria-label={t.note} className="flex min-w-0 flex-[999_1_460px] flex-col gap-2.5 px-5 py-[18px]">
        <h2 className="m-0 text-[15px] font-semibold tracking-[-.01em]">{t.note}</h2>
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[minmax(120px,180px)_minmax(0,1fr)] gap-3 max-[820px]:grid-cols-1 max-[820px]:gap-0.5">
            <span className="text-muted-foreground">{r.label}</span><span>{r.valeur}</span>
          </div>
        ))}
      </Box>
      <Box aria-label={t.okTitle(ok.length)} className="flex min-w-0 flex-[1_1_340px] flex-col gap-2.5 px-5 py-[18px]">
        <h2 className="m-0 text-[15px] font-semibold tracking-[-.01em]">{t.okTitle(ok.length)}</h2>
        {ok.map((x, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className="mt-px grid size-[18px] shrink-0 place-items-center rounded-full bg-ok text-background"><Check size={12} strokeWidth={3} aria-hidden="true" /></span>
            <span>{x}</span>
          </div>
        ))}
      </Box>
    </div>
  );
}
