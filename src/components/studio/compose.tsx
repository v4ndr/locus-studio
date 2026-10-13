"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComposeEvent, ComposeInput, ComposePlan, ComposeAction } from "@/locus/compose/contract";
import { readNdjson } from "@/locus/ndjson";
import { Kbd, I } from "./chrome";
import { Md } from "../md";
import { cn } from "@/lib/cn";

/**
 * Le composer côté navigateur : on envoie la demande, on reçoit les étapes,
 * puis un plan d'actions — pas une réponse rédigée. La carte le montre comme
 * l'écran des actions après la dictée : une ligne par action, éditable,
 * retirable, un geste pour tout valider, puis le compte rendu de ce qui est
 * parti où.
 */

export interface ComposeState { input?: ComposeInput; steps: string[]; actions: ComposeAction[]; texte?: string; plan?: ComposePlan; error?: string; busy: boolean }

export function useCompose() {
  const [s, setS] = React.useState<ComposeState>({ steps: [], actions: [], busy: false });
  const ctrl = React.useRef<AbortController | null>(null);
  const run = React.useCallback(async (input: ComposeInput) => {
    ctrl.current?.abort();
    const ac = new AbortController(); ctrl.current = ac;
    setS({ input, steps: [], actions: [], busy: true });
    try {
      const r = await fetch("/api/compose", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), signal: ac.signal });
      if (!r.ok || !r.body) throw new Error(`composer ${r.status}`);
      for await (const ev of readNdjson<ComposeEvent>(r.body)) {
        if (ac.signal.aborted) return;
        setS((p) => {
          switch (ev.step) {
            case "reflexion": return { ...p, steps: [...p.steps, ev.titre] };
            case "outil": return { ...p, steps: [...p.steps, `${ev.nom} · ${ev.detail}`] };
            case "action": return { ...p, actions: [...p.actions, ev.action] };
            case "texte": return { ...p, texte: ev.texte };
            case "done": return { ...p, plan: ev.plan, actions: ev.plan.actions, busy: false };
            case "error": return { ...p, error: ev.detail, busy: false };
          }
        });
      }
      setS((p) => (p.busy ? { ...p, busy: false } : p));
    } catch (e) {
      if (ac.signal.aborted) return;
      setS((p) => ({ ...p, error: e instanceof Error ? e.message : String(e), busy: false }));
    }
  }, []);
  const reset = React.useCallback(() => { ctrl.current?.abort(); setS({ steps: [], actions: [], busy: false }); }, []);
  /** Remettre un plan déjà composé (un brouillon repris) sans rappeler le serveur. */
  const restore = React.useCallback((input: ComposeInput, plan: ComposePlan) => { ctrl.current?.abort(); setS({ input, steps: [], actions: plan.actions, plan, busy: false }); }, []);
  return { state: s, run, reset, restore, open: !!s.input };
}

const STATUT: Record<string, { label: string; color: string }> = { pret: { label: "prêt", color: "var(--ok)" }, relire: { label: "à relire", color: "var(--warn)" } };
const FAIT: Record<string, string> = { ordonnance: "signée, envoyée en e-ordo", rdv: "réservé, SMS envoyé", message: "envoyé", courrier: "signé, envoyé par MSSanté", arret: "signé, télétransmis à la CPAM", dossier: "inscrit au dossier, partagé au DMP", naviguer: "ouvert" };

export function ComposeCard({ state, onClose, suivreSeul = true, onValide, libelleValider, initialActions, onChange, apres }: {
  state: ComposeState;
  onClose: () => void;
  suivreSeul?: boolean;
  onValide?: (actions: ComposeAction[], plan: ComposePlan) => void;
  libelleValider?: string;
  /** Les actions telles que l'utilisateur les a déjà modifiées ou retirées (brouillon repris). */
  initialActions?: { edits: Record<string, ComposeAction>; retires: string[] };
  /** Appelé à chaque modification ou retrait, pour persister le brouillon. */
  onChange?: (edits: Record<string, ComposeAction>, retires: string[]) => void;
  /** Ce qui s'affiche sous le compte rendu une fois validé (liens de sortie). */
  apres?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState<string | null>(null);
  const [edits, setEdits] = React.useState<Record<string, ComposeAction>>(initialActions?.edits ?? {});
  const [retires, setRetires] = React.useState<Set<string>>(new Set(initialActions?.retires ?? []));
  const [valide, setValide] = React.useState<ComposeAction[] | null>(null);
  const done = !!state.plan;
  const vue = (a: ComposeAction) => edits[a.id] ?? a;
  const nav = state.actions.filter((a) => a.kind === "naviguer");
  const docs = state.actions.filter((a) => a.kind !== "naviguer").map(vue);
  const gardes = docs.filter((a) => !retires.has(a.id));

  const signal = React.useCallback((e: Record<string, ComposeAction>, r: Set<string>) => onChange?.(e, [...r]), [onChange]);
  const edite = (a: ComposeAction, patch: Partial<ComposeAction>) => setEdits((e) => { const n = { ...e, [a.id]: { ...vue(a), ...patch } }; signal(n, retires); return n; });
  const bascule = (id: string) => setRetires((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); signal(edits, n); return n; });

  // Une navigation seule : on y va, sans carte à valider.
  React.useEffect(() => {
    if (done && suivreSeul && nav.length === 1 && docs.length === 0 && nav[0].href) { const h = nav[0].href; const t = setTimeout(() => { onClose(); router.push(h); }, 350); return () => clearTimeout(t); }
  }, [done, suivreSeul, nav, docs.length, router, onClose]);

  const valider = React.useCallback(() => { if (done && gardes.length && !valide) { setValide(gardes); onValide?.(gardes, state.plan!); } }, [done, gardes, valide, onValide, state.plan]);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !(e.target as HTMLElement | null)?.closest("textarea, input")) { e.preventDefault(); valider(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [valider]);

  const last = state.steps[state.steps.length - 1];
  const via = state.plan ? (state.plan.via === "claude" ? `${state.plan.modele} · ${state.plan.locus ? `locus ×${state.plan.locus}` : "sans locus"}` : `simulation · ${state.plan.locus ? `locus ×${state.plan.locus}` : "règles"}`) : null;

  if (valide) {
    return (
      <div className="flex flex-col gap-3 rounded-[14px] border border-line bg-paper px-[18px] py-4" style={{ boxShadow: "var(--shadow)" }}>
        <div className="flex items-center gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ok-soft text-ok"><I.check size={13} w={2.5} /></span>
          <span className="text-[15px] font-medium">{valide.length} action{valide.length > 1 ? "s" : ""} signée{valide.length > 1 ? "s" : ""} · tout est au journal</span>
          <span className="flex-1" />
          <button type="button" onClick={onClose} aria-label="Fermer" className="px-1 text-base text-muted-3">×</button>
        </div>
        <div className="flex flex-col">
          {valide.map((a, i) => <div key={a.id} className={cn("flex items-center gap-3 py-2 text-sm", i > 0 && "border-t border-line-4")}><span className="d flex h-6 min-w-6 items-center justify-center rounded-[6px] bg-soft px-1 text-[10px] text-ink-3">{a.code}</span><span className="min-w-0 flex-1 truncate">{a.titre}</span><span className="text-xs text-ok">{FAIT[a.kind] ?? "fait"}</span></div>)}
        </div>
        {apres && <div className="flex flex-wrap items-center gap-2 pt-1">{apres}</div>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-accent-line bg-paper px-[18px] py-4" style={{ boxShadow: "var(--shadow-accent)" }}>
      <div className="flex items-center gap-2.5">
        <span className="k whitespace-nowrap" style={{ color: "var(--accent)" }}>{done ? `${gardes.length} action${gardes.length > 1 ? "s" : ""} à valider` : "locus · composer"}</span>
        {state.input && !done && <span className="truncate text-[13px] text-muted-2">« {state.input.texte || state.input.note?.replace(/\s+/g, " ").slice(0, 80)} »</span>}
        <span className="flex-1" />
        <button type="button" onClick={onClose} aria-label="Fermer" className="px-1 text-base text-muted-3">×</button>
      </div>

      {!done && !state.error && (
        <div className="flex items-center gap-2.5 text-sm text-muted-2"><span className="h-2 w-2 rounded-full bg-accent animate-pulse-soft" />{last ?? "Je lis la demande…"}</div>
      )}
      {state.error && <div className="text-sm text-rec-text">{state.error}</div>}

      {(state.plan?.synthese || state.texte) && <div className="max-h-[32vh] overflow-y-auto text-[15px] leading-relaxed"><Md text={state.plan?.synthese ?? state.texte ?? ""} /></div>}

      {docs.length > 0 && (
        <div className="flex flex-col gap-0.5 rounded-xl border border-line-3 bg-bg p-1">
          {docs.map((a) => {
            const off = retires.has(a.id); const isOpen = open === a.id; const modifie = !!edits[a.id];
            return (
              <div key={a.id} className={cn(off && "opacity-45")}>
                <div className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-hover">
                  <button type="button" onClick={() => bascule(a.id)} aria-pressed={!off} aria-label={off ? "Remettre" : "Retirer"} title={off ? "Remettre" : "Retirer du plan"} className={cn("flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px]", off ? "border-[1.5px] border-gray-dot" : "bg-ink text-paper")}>{!off && <I.check size={12} color="var(--paper)" w={3} />}</button>
                  <button type="button" onClick={() => setOpen(isOpen ? null : a.id)} aria-expanded={isOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span className="d flex h-6 min-w-6 shrink-0 items-center justify-center rounded-[6px] bg-soft px-1 text-[10px] text-ink-3">{a.code}</span>
                    <span className="flex min-w-0 flex-1 flex-col"><span className={cn("truncate text-sm", off && "line-through")}>{a.titre}{modifie && <span className="ml-2 text-[11px] text-accent" style={{ color: "var(--accent)" }}>modifié</span>}</span><span className="truncate text-xs text-muted-2">{a.ligne}</span></span>
                    <span className="hidden text-xs sm:inline" style={{ color: STATUT[a.statut]?.color }}>{STATUT[a.statut]?.label}</span>
                    <span className="hidden text-[11px] text-muted-3 sm:inline">{a.destination}</span>
                    <I.chevron open={isOpen} />
                  </button>
                </div>
                {isOpen && (
                  <div className="flex flex-col gap-1 px-3 pb-3 pt-1 sm:pl-[64px]">
                    <label className="flex flex-col gap-1 border-t border-line-4 py-2 text-sm sm:flex-row sm:gap-4"><span className="w-[96px] shrink-0 text-muted-2">Titre</span><input value={a.titre} onChange={(e) => edite(a, { titre: e.target.value })} className="min-w-0 flex-1 rounded-[8px] border border-line bg-paper px-2.5 py-1.5 text-sm text-ink outline-none focus:border-accent-line" /></label>
                    {a.fields.map((f, i) => (
                      <label key={i} className="flex flex-col gap-1 border-t border-line-4 py-2 text-sm sm:flex-row sm:gap-4"><span className="w-[96px] shrink-0 text-muted-2">{f.k}</span><textarea value={f.v} rows={Math.min(6, Math.max(1, Math.ceil(f.v.length / 70)))} onChange={(e) => edite(a, { fields: a.fields.map((g, j) => (j === i ? { ...g, v: e.target.value } : g)) })} className="min-w-0 flex-1 resize-y rounded-[8px] border border-line bg-paper px-2.5 py-1.5 text-sm leading-[1.45] text-ink outline-none focus:border-accent-line" /></label>
                    ))}
                    {a.justification && <div className="flex gap-4 border-t border-line-4 py-2 text-sm leading-[1.45]"><span className="w-[96px] shrink-0 text-muted-2">Pourquoi</span><span className="flex-1 text-ink-2">{a.justification}</span></div>}
                    <div className="flex gap-2 pt-1">
                      {a.statut === "relire" && <button type="button" onClick={() => edite(a, { statut: "pret" })} className="rounded-[8px] border border-line bg-paper px-2.5 py-1 text-xs text-ink hover:bg-hover">Marquer relu</button>}
                      {modifie && <button type="button" onClick={() => setEdits((e) => { const n = { ...e }; delete n[a.id]; signal(n, retires); return n; })} className="rounded-[8px] px-2.5 py-1 text-xs text-muted-2 hover:bg-hover">Revenir à la proposition</button>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {nav.length > 0 && (docs.length > 0 || nav.length > 1) && (
        <div className="flex flex-wrap gap-2">{nav.map((a) => a.href && <Link key={a.id} href={a.href} onClick={onClose} className="flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-[6px] text-[13px] text-ink hover:bg-hover hover:text-ink">→ {a.titre}</Link>)}</div>
      )}

      {state.plan && state.plan.references.length > 0 && (
        <div className="text-xs text-muted-2">{state.plan.references.map((r, i) => <span key={i} className="mr-3">[{i + 1}] {r.url ? <a href={r.url} target="_blank" rel="noreferrer" className="underline decoration-line underline-offset-2">{r.titre}</a> : r.titre} · {r.editeur}{r.annee ? ` ${r.annee}` : ""}</span>)}</div>
      )}

      {done && (
        <div className="flex flex-wrap items-center gap-2">
          {gardes.length > 0 && <button type="button" onClick={valider} className="flex items-center gap-2 rounded-[10px] bg-ink px-4 py-[9px] text-sm text-paper">{libelleValider ?? `Valider ${gardes.length > 1 ? `les ${gardes.length}` : ""}`} <Kbd dark>⌘⏎</Kbd></button>}
          {gardes.length === 0 && docs.length === 0 && nav.length === 0 && <button type="button" onClick={onClose} className="rounded-[10px] border border-line bg-paper px-4 py-[9px] text-sm text-ink">Fermer</button>}
          {docs.length > 0 && <span className="text-xs text-muted-2">Cliquez une ligne pour la modifier, la case pour la retirer.</span>}
          <span className="flex-1" />
          {via && <span className="d text-[11px]">{via}</span>}
        </div>
      )}
    </div>
  );
}
