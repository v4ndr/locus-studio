"use client";
import { TriangleAlert } from "lucide-react";
import * as React from "react";
import Link from "./nav";
import { useRouter } from "./nav";
import type { ComposeEvent, ComposeInput, ComposePlan, ComposeAction } from "@/locus/compose/contract";
import { readNdjson } from "@/locus/ndjson";
import { Kbd, I, useT } from "./chrome";
import type { StudioDict } from "@/i18n/studio";
import { Md } from "../md";
import { ActionPanel, dialogOuvert, type PatientRendu } from "./rendu";
import { cn } from "@/lib/cn";
import { fetchLive } from "@/lib/live";

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
  const { t } = useT();
  const tc = React.useRef(t.compose);
  tc.current = t.compose;
  const ctrl = React.useRef<AbortController | null>(null);
  const run = React.useCallback(async (input: ComposeInput) => {
    ctrl.current?.abort();
    const ac = new AbortController(); ctrl.current = ac;
    setS({ input, steps: [], actions: [], busy: true });
    try {
      const r = await fetchLive("/api/compose", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), signal: ac.signal });
      if (!r.ok || !r.body) {
        const j = await r.json().catch(() => null) as { error?: string } | null;
        throw new Error(j?.error ? j.error : r.status === 413 ? tc.current.tooLong : r.status >= 500 ? tc.current.down : tc.current.refused(r.status));
      }
      for await (const ev of readNdjson<ComposeEvent>(r.body)) {
        if (ac.signal.aborted) return;
        setS((p) => {
          switch (ev.step) {
            case "reflexion": return { ...p, steps: [...p.steps, ev.titre] };
            // Étapes grossières seulement : pas de nom d'outil, pas de reformulation, pas de détail de pipeline.
            case "outil": { const l = ev.nom === "locus" ? "Je consulte Locus" : ev.detail; return p.steps[p.steps.length - 1] === l ? p : { ...p, steps: [...p.steps, l] }; }
            case "action": return { ...p, actions: [...p.actions, ev.action] };
            case "texte": return { ...p, texte: ev.texte };
            case "done": return { ...p, plan: ev.plan, actions: ev.plan.actions, busy: false };
            case "error": return { ...p, error: ev.detail, busy: false };
          }
        });
      }
      // Le flux s'est fermé sans « done » : on ne reste pas sur un point qui pulse.
      setS((p) => (p.busy ? { ...p, busy: false, error: p.plan ? undefined : tc.current.interrupted } : p));
    } catch (e) {
      if (ac.signal.aborted) return;
      const msg = e instanceof Error ? e.message : String(e);
      setS((p) => ({ ...p, error: /failed to fetch|networkerror|load failed/i.test(msg) ? tc.current.offline : msg, busy: false }));
    }
  }, []);
  const reset = React.useCallback(() => { ctrl.current?.abort(); setS({ steps: [], actions: [], busy: false }); }, []);
  /** Une action ajoutée à la main (sans passer par le serveur) : au plan existant, ou dans un plan neuf. */
  const ajoute = React.useCallback((a: ComposeAction, input?: ComposeInput) => {
    setS((p) => {
      const actions = [...p.actions, a];
      const plan: ComposePlan = p.plan ? { ...p.plan, actions } : { synthese: "", actions, references: [], via: "simulation", locus: 0 };
      return { ...p, input: p.input ?? input ?? { texte: "", ecran: "note" }, actions, plan, busy: false };
    });
  }, []);
  /** Remettre un plan déjà composé (un brouillon repris) sans rappeler le serveur. */
  const restore = React.useCallback((input: ComposeInput, plan: ComposePlan) => { ctrl.current?.abort(); setS({ input, steps: [], actions: plan.actions, plan, busy: false }); }, []);
  return { state: s, run, reset, restore, ajoute, open: !!s.input };
}

const statutOf = (t: StudioDict["compose"]): Record<string, { label: string; color: string }> => ({ pret: { label: t.ready, color: "var(--ok)" }, relire: { label: t.toReview, color: "var(--warn)" } });
/** La ligne du compte rendu : ce qui est parti, ou « inchangé » pour un document d'une note modifiée qui n'a pas bougé. */
const fait = (t: StudioDict["compose"], a: ComposeAction, resignature: boolean) => (a.renvoye ? t.resent : resignature ? t.unchanged : a.destination === "patient · remis" ? t.handedOver : t.done[a.kind] ?? t.doneDefault);

export function ComposeCard({ state, onClose, onRetry, suivreSeul = true, onValide, libelleValider, initialActions, onChange, apres, patient, ouvrirId, valideNonce, masquerValider }: {
  state: ComposeState;
  onClose: () => void;
  /** Ouvre ce document dans le panneau dès qu'il change (une action ajoutée à la main). */
  ouvrirId?: string | null;
  /** Change pour valider depuis l'extérieur (le bouton « Enregistrer » de l'éditeur). */
  valideNonce?: number;
  /** L'écran porte lui-même le bouton de validation. */
  masquerValider?: boolean;
  /** Relancer la même demande après une erreur. */
  onRetry?: (input: ComposeInput) => void;
  /** Le patient, pour le rendu des documents (en-tête, identité). */
  patient?: PatientRendu;
  suivreSeul?: boolean;
  /** Peut renvoyer les actions telles qu'envoyées (horodatage, renvoi) pour que la carte les montre ainsi. */
  onValide?: (actions: ComposeAction[], plan: ComposePlan) => ComposeAction[] | void;
  libelleValider?: string;
  /** Les actions telles que l'utilisateur les a déjà modifiées ou retirées (brouillon repris). */
  initialActions?: { edits: Record<string, ComposeAction>; retires: string[] };
  /** Appelé à chaque modification ou retrait, pour persister le brouillon. */
  onChange?: (edits: Record<string, ComposeAction>, retires: string[]) => void;
  /** Ce qui s'affiche sous le compte rendu une fois validé (liens de sortie). */
  apres?: React.ReactNode;
}) {
  const { t: d, L } = useT();
  const t = d.compose;
  const STATUT = statutOf(t);
  const router = useRouter();
  const [open, setOpen] = React.useState<string | null>(null);
  React.useEffect(() => { if (ouvrirId) setOpen(ouvrirId); }, [ouvrirId]);
  // Le patient vient de l'écran quand il le connaît, sinon du plan (le serveur l'a résolu, depuis l'accueil par exemple).
  const pr: PatientRendu = patient ? { ...state.plan?.patient, ...patient, allergies: patient.allergies ?? state.plan?.patient?.allergies } : state.plan?.patient ?? { nom: "" };
  const [edits, setEdits] = React.useState<Record<string, ComposeAction>>(initialActions?.edits ?? {});
  const [retires, setRetires] = React.useState<Set<string>>(new Set(initialActions?.retires ?? []));
  const [valide, setValide] = React.useState<ComposeAction[] | null>(null);
  const done = !!state.plan;
  const vue = (a: ComposeAction) => edits[a.id] ?? a;
  const nav = state.actions.filter((a) => a.kind === "naviguer");
  const docs = state.actions.filter((a) => a.kind !== "naviguer").map(vue);
  const gardes = docs.filter((a) => !retires.has(a.id));

  const signal = React.useCallback((e: Record<string, ComposeAction>, r: Set<string>) => onChange?.(e, [...r]), [onChange]);
  const bascule = (id: string) => setRetires((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); signal(edits, n); return n; });

  // Une navigation seule : on y va, sans carte à valider.
  React.useEffect(() => {
    if (done && suivreSeul && nav.length === 1 && docs.length === 0 && nav[0].href) { const h = nav[0].href; const t = setTimeout(() => { onClose(); router.push(h); }, 350); return () => clearTimeout(t); }
  }, [done, suivreSeul, nav, docs.length, router, onClose]);

  // Valider : l'écran peut renvoyer les actions telles qu'elles sont parties (horodatées, renvoyées) ; sinon la carte les estampille elle-même.
  const valider = React.useCallback(() => {
    if (!done || !gardes.length || valide) return;
    const now = new Date().toISOString();
    const retour = onValide?.(gardes, state.plan!);
    setValide(Array.isArray(retour) && retour.length ? retour : gardes.map((a) => ({ ...a, envoyeLe: a.envoyeLe ?? now })));
  }, [done, gardes, valide, onValide, state.plan]);
  const nonceVu = React.useRef(valideNonce);
  React.useEffect(() => { if (valideNonce !== undefined && valideNonce !== nonceVu.current) { nonceVu.current = valideNonce; valider(); } }, [valideNonce, valider]);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (dialogOuvert()) return;
      const cible = e.target as HTMLElement | null;
      const dansChamp = !!cible?.closest("textarea, input, select, [contenteditable=true]");
      // ⌘⏎ valide, sauf depuis un champ qui a quelque chose à envoyer (une saisie en cours) ; la note déjà déclinée en plan, elle, valide.
      const noteDeclinee = !!cible?.closest("[data-cmd-enter=valider]");
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && (!dansChamp || noteDeclinee || !(cible as HTMLInputElement).value?.trim())) { e.preventDefault(); valider(); }
      // esc ferme la carte avant de remonter d'un cran — un plan non validé ne se perd pas sur un réflexe.
      if (e.key === "Escape" && !valide && !dansChamp && (docs.length > 0 || !done)) { e.stopPropagation(); e.preventDefault(); onClose(); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [valider, valide, docs.length, done, onClose]);

  const last = state.steps[state.steps.length - 1];
  // Ni modèle, ni compteur d'appels : seulement le scénario rejoué quand c'en est un.
  const via = state.plan?.via === "simulation" ? d.replay : null;

  // Une re-signature : le plan venait d'une note déjà signée (ses actions portaient déjà un envoi).
  const resignature = !!state.plan?.actions.some((a) => a.envoyeLe);
  if (valide) {
    return (
      <div className="flex flex-col gap-3 rounded-[14px] border border-line bg-paper px-[18px] py-4" style={{ boxShadow: "var(--shadow)" }}>
        <div className="flex items-center gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ok-soft text-ok"><I.check size={13} w={2.5} /></span>
          <span className="text-[15px] font-medium">{t.signedHead(valide.length, valide.some((a) => a.renvoye))}</span>
          <span className="flex-1" />
          <button type="button" onClick={onClose} aria-label={d.close} className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-dim-2 hover:bg-hover hover:text-ink">×</button>
        </div>
        <div className="flex flex-col">
          {valide.map((a, i) => <button key={a.id} type="button" onClick={() => setOpen(a.id)} className={cn("flex min-h-11 items-center gap-3 rounded-[8px] px-1 py-2 text-left text-sm hover:bg-hover", i > 0 && "border-t border-line-4")}><span className="d flex h-6 min-w-6 shrink-0 items-center justify-center rounded-[6px] bg-soft px-1 text-[10px] text-ink-3">{a.code}</span><span className="flex min-w-0 flex-1 flex-col"><span className="line-clamp-2 sm:truncate">{a.titre}</span><span className="text-xs text-ok">{fait(t, a, resignature)}</span></span><I.chevron /></button>)}
        </div>
        {apres && <div className="flex flex-wrap items-center gap-2 pt-1">{apres}</div>}
        {open && valide.find((a) => a.id === open) && <ActionPanel action={valide.find((a) => a.id === open)!} patient={pr} onClose={() => setOpen(null)} />}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-agent-line bg-paper px-[18px] py-4" style={{ boxShadow: "var(--shadow-accent)" }}>
      <div className="flex items-center gap-2.5">
        <span className="k whitespace-nowrap" style={{ color: "var(--agent)" }}>{done ? (gardes.length ? d.toValidateN(gardes.length) : docs.length ? t.nothing : state.plan?.references.length || state.plan?.locus ? t.answer : t.composer) : t.composer}</span>
        {state.input && !done && <span className="truncate text-[13px] text-dim-2">« {state.input.texte || state.input.note?.replace(/\s+/g, " ").slice(0, 80)} »</span>}
        <span className="flex-1" />
        <button type="button" onClick={onClose} aria-label={d.close} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg text-dim-2 hover:bg-hover hover:text-ink">×</button>
      </div>

      {!done && !state.error && (
        <div className="flex items-center gap-2.5 text-sm text-dim-2"><span className="h-2 w-2 rounded-full bg-brand animate-pulse-soft" />{last ? L(last) : t.reading}</div>
      )}
      {state.error && <div className="flex flex-wrap items-center gap-3 text-sm text-rec-text"><span className="flex-1">{state.error}</span>{state.input && onRetry && <button type="button" onClick={() => onRetry(state.input!)} className="rounded-[8px] border border-line bg-paper px-3 py-1.5 text-xs text-ink hover:bg-hover">{t.retry}</button>}</div>}

      {(state.plan?.synthese || state.texte) && <div className="max-h-[32vh] overflow-y-auto text-[15px] leading-relaxed"><Md text={state.plan?.synthese ?? state.texte ?? ""} /></div>}
      {(state.plan?.synthese || state.texte) && d.answerInFrench && <span className="d -mt-1 text-[11px]">{d.answerInFrench}</span>}

      {docs.length > 0 && (
        <div className="flex flex-col gap-0.5 rounded-xl border border-line-3 bg-bg p-1">
          {docs.map((a) => {
            const off = retires.has(a.id); const modifie = !!edits[a.id];
            return (
              <div key={a.id} className={cn("flex w-full items-center gap-1 rounded-lg pl-1 pr-3 py-1 text-left hover:bg-hover sm:gap-2", off && "opacity-45")}>
                <button type="button" onClick={() => bascule(a.id)} aria-pressed={!off} aria-label={off ? t.putBack : t.takeOut} title={off ? t.putBackShort : t.takeOut} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"><span className={cn("flex h-[18px] w-[18px] items-center justify-center rounded-[5px]", off ? "border-[1.5px] border-gray-dot" : "bg-ink text-paper")}>{!off && <I.check size={12} color="var(--paper)" w={3} />}</span></button>
                <button type="button" onClick={() => setOpen(a.id)} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 py-1.5 text-left" title={d.openDoc}>
                  <span className="d flex h-6 min-w-6 shrink-0 items-center justify-center rounded-[6px] bg-soft px-1 text-[10px] text-ink-3">{a.code}</span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className={cn("truncate text-sm", off && "line-through")}>{a.titre}{modifie && <span className="ml-2 text-[11px]" style={{ color: "var(--agent)" }}>{t.edited}</span>}</span>
                    <span className="truncate text-xs text-dim-2">{a.ligne}<span className="sm:hidden"> · <span style={{ color: STATUT[a.statut]?.color }}>{STATUT[a.statut]?.label}</span> · {L(a.destination)}</span></span>
                    {a.alerte && <span className="mt-0.5 text-xs font-medium text-warn"><TriangleAlert size={16} aria-hidden="true" className="mr-1 inline-block shrink-0 align-[-3px]" />{t.allergy} {a.alerte}</span>}
                  </span>
                  <span className="hidden shrink-0 text-xs sm:inline" style={{ color: STATUT[a.statut]?.color }}>{STATUT[a.statut]?.label}</span>
                  <span className="hidden shrink-0 text-[11px] text-dim-2 sm:inline">{L(a.destination)}</span>
                  <I.chevron />
                </button>
              </div>
            );
          })}
        </div>
      )}
      {open && docs.find((a) => a.id === open) && <ActionPanel action={docs.find((a) => a.id === open)!} patient={pr} onChange={(na) => setEdits((e) => { const n = { ...e, [na.id]: na }; signal(n, retires); return n; })} onRemove={() => { if (!retires.has(open)) bascule(open); }} onClose={() => setOpen(null)} />}

      {nav.length > 0 && (docs.length > 0 || nav.length > 1) && (
        <div className="flex flex-wrap gap-2">{nav.map((a) => a.href && <Link key={a.id} href={a.href} onClick={onClose} className="flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-[6px] text-[13px] text-ink hover:bg-hover hover:text-ink">→ {a.titre}</Link>)}</div>
      )}

      {state.plan && state.plan.references.length > 0 && (
        <div className="text-xs text-dim-2">{state.plan.references.map((r, i) => <span key={i} className="mr-3">[{i + 1}] {r.url ? <a href={r.url} target="_blank" rel="noreferrer" className="underline decoration-line underline-offset-2">{r.titre}</a> : r.titre} · {r.editeur}{r.annee ? ` ${r.annee}` : ""}</span>)}</div>
      )}

      {done && (
        <div className="flex flex-wrap items-center gap-2">
          {gardes.length > 0 && !masquerValider && <button type="button" onClick={valider} className="flex min-h-11 items-center gap-2 rounded-[10px] bg-ink px-4 py-[9px] text-sm text-paper">{libelleValider ?? t.validateN(gardes.length)} <Kbd dark>⌘⏎</Kbd></button>}
          {!masquerValider && <button type="button" onClick={onClose} className="flex min-h-11 items-center gap-2 rounded-[10px] px-3 py-[9px] text-sm text-dim-2 hover:bg-hover hover:text-ink">{gardes.length > 0 || docs.length > 0 ? d.cancel : d.close} <Kbd>esc</Kbd></button>}
          <span className="flex-1" />
          {via && <span className="d text-[11px]">{via}</span>}
        </div>
      )}
    </div>
  );
}
