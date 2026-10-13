"use client";
import * as React from "react";
import Link from "next/link";
import { Kbd, I } from "./chrome";
import { ComposeCard, useCompose } from "./compose";
import { ActionPanel, type PatientRendu } from "./rendu";
import { useCabinet, nid, patientPayload, type NoteLocal, type PatientLocal } from "@/store/cabinet";
import type { ComposeAction, ComposePlan, ComposeInput } from "@/locus/compose/contract";
import { cn } from "@/lib/cn";

/**
 * La consultation : un seul éditeur qui cumule trois sources — la dictée au
 * micro (reconnaissance vocale du navigateur), la dictée simulée (le script
 * du jeu de données, qui s'écrit tout seul), et la note libre ou collée depuis
 * un scribe. Puis « Générer » passe le tout au composer, qui le décline en
 * actions. Le chrono mesure saisie, composition, validation.
 */

const MODELE = `Motif : 
Histoire : 
Examen : 
Conclusion : 
Conduite à tenir : `;

export function fmtMs(ms: number) { const s = Math.round(ms / 1000); return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")}`; }

/* La reconnaissance vocale du navigateur (Chrome, Safari récents) : fr-FR, continue, résultats intermédiaires. */
type SR = { lang: string; continuous: boolean; interimResults: boolean; onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null; onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null; start: () => void; stop: () => void };
function speechCtor(): (new () => SR) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const NOTES_KEY = (patientId: string) => `locus-studio-notes-${patientId}`;
export function readNotes(patientId: string): NoteLocal[] { try { return JSON.parse(localStorage.getItem(NOTES_KEY(patientId)) ?? "[]"); } catch { return []; } }
export function writeNotes(patientId: string, notes: NoteLocal[]) { try { localStorage.setItem(NOTES_KEY(patientId), JSON.stringify(notes)); } catch {} }

/**
 * Le brouillon de consultation : la note en cours, et le plan composé s'il
 * existe, avec ce qu'on y a modifié ou retiré. Sauvé à chaque frappe, repris
 * à l'ouverture — quitter l'écran ne perd rien, et les actions à valider
 * restent visibles depuis le dossier et l'accueil.
 */
export interface Brouillon { patientId: string; nom: string; href: string; texte: string; motif: string; debut: number | null; chrono: { saisie: number; composeDebut: number; composition: number }; input?: ComposeInput; plan?: ComposePlan; texteDuPlan?: string; edits: Record<string, ComposeAction>; retires: string[]; majLe: string; noteId?: string }
export const BROUILLON_KEY = (patientId: string) => `locus-studio-brouillon-${patientId}`;
export function readBrouillon(patientId: string): Brouillon | null { try { const raw = localStorage.getItem(BROUILLON_KEY(patientId)); return raw ? (JSON.parse(raw) as Brouillon) : null; } catch { return null; } }
export function writeBrouillon(b: Brouillon) { try { localStorage.setItem(BROUILLON_KEY(b.patientId), JSON.stringify(b)); } catch {} }
export function clearBrouillon(patientId: string) { try { localStorage.removeItem(BROUILLON_KEY(patientId)); } catch {} }
/** Tous les brouillons du poste, les plus récents d'abord. */
export function listBrouillons(): Brouillon[] {
  const out: Brouillon[] = [];
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith("locus-studio-brouillon-")) { const b = JSON.parse(localStorage.getItem(k) ?? "null") as Brouillon | null; if (b && (b.texte.trim() || b.plan)) out.push(b); } } } catch {}
  return out.sort((a, b) => b.majLe.localeCompare(a.majLe));
}

export function NoteEditor({ patientId, local, nom, retour, onSaved, script, motifInitial, consultHref, onRetour, base, patient }: { patientId: string; local?: PatientLocal; nom: string; retour: string; onSaved?: (n: NoteLocal) => void; script?: string; motifInitial?: string; consultHref?: string; onRetour?: () => void; /** La note signée que l'on modifie en place : ses documents modifiés sont renvoyés. */ base?: NoteLocal; patient?: PatientRendu }) {
  const cab = useCabinet();
  const composer = useCompose();
  const [texte, setTexte] = React.useState("");
  const [motif, setMotif] = React.useState(motifInitial ?? "");
  const [debut, setDebut] = React.useState<number | null>(null);
  const [pret, setPret] = React.useState(false);
  const [texteDuPlan, setTexteDuPlan] = React.useState<string | null>(null);
  const [edits, setEdits] = React.useState<Record<string, ComposeAction>>({});
  const [retires, setRetires] = React.useState<string[]>([]);
  const [signee, setSignee] = React.useState<NoteLocal | null>(null);
  const [repris, setRepris] = React.useState(false);
  const [noteId, setNoteId] = React.useState<string | undefined>(undefined);
  const pr: PatientRendu = patient ?? { nom };
  const [tick, setTick] = React.useState(0);
  const [micro, setMicro] = React.useState<"absent" | "pret" | "ecoute" | "erreur">("absent");
  const [interim, setInterim] = React.useState("");
  const [simul, setSimul] = React.useState<"non" | "en-cours" | "pause" | "fini">("non");
  const chrono = React.useRef({ saisie: 0, composeDebut: 0, composition: 0 });
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const rec = React.useRef<SR | null>(null);
  const simPos = React.useRef(0);

  /* À l'ouverture : le brouillon de ce patient, s'il y en a un, reprend sa place — note, chrono, plan, modifications. */
  React.useEffect(() => {
    setMicro(speechCtor() ? "pret" : "absent");
    const b = readBrouillon(patientId);
    if (base && (!b || b.noteId !== base.id)) {
      // Modifier une note signée, en place : sa note et ses documents reviennent dans l'éditeur ; ce qui est modifié sera renvoyé.
      setTexte(base.texte); setMotif(base.motif ?? ""); setDebut(null); chrono.current = { saisie: 0, composeDebut: 0, composition: 0 }; setEdits({}); setRetires([]); setTexteDuPlan(base.texte); setNoteId(base.id);
      const plan: ComposePlan = { synthese: base.synthese ?? "", actions: base.actions, references: [], via: base.via ?? "simulation", locus: 0 };
      composer.restore({ texte: "", note: base.texte, ecran: "note", patientId }, plan);
    } else if (b && (b.texte.trim() || b.plan)) {
      setTexte(b.texte); setMotif(b.motif); setDebut(b.debut); chrono.current = b.chrono; setEdits(b.edits ?? {}); setRetires(b.retires ?? []); setTexteDuPlan(b.texteDuPlan ?? null); setRepris(true); setNoteId(b.noteId);
      if (b.plan && b.input) composer.restore(b.input, b.plan);
    }
    setPret(true);
    ref.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);
  /* À chaque changement : le brouillon suit. */
  React.useEffect(() => {
    if (!pret || signee) return;
    if (!texte.trim() && !composer.state.plan) { clearBrouillon(patientId); return; }
    writeBrouillon({ patientId, nom, href: consultHref ?? retour, texte, motif, debut, chrono: chrono.current, input: composer.state.input, plan: composer.state.plan, texteDuPlan: texteDuPlan ?? undefined, edits, retires, majLe: new Date().toISOString(), noteId });
  }, [pret, signee, texte, motif, debut, composer.state.plan, composer.state.input, edits, retires, texteDuPlan, patientId, nom, retour, consultHref, noteId]);
  React.useEffect(() => { if (debut === null) return; const id = setInterval(() => setTick((t) => t + 1), 1000); return () => clearInterval(id); }, [debut]);
  React.useEffect(() => { if (composer.state.plan && chrono.current.composeDebut && !chrono.current.composition) chrono.current.composition = Date.now() - chrono.current.composeDebut; }, [composer.state.plan]);
  const demarre = React.useCallback(() => setDebut((d) => d ?? Date.now()), []);
  const ajoute = React.useCallback((t: string) => { demarre(); setTexte((prev) => (prev && !/\s$/.test(prev) ? prev + " " : prev) + t); }, [demarre]);

  /* Dictée simulée : le script s'écrit dans la note, au rythme d'une voix, ⌥ espace pour pause. */
  React.useEffect(() => {
    if (simul !== "en-cours" || !script) return;
    if (simPos.current >= script.length) { setSimul("fini"); return; }
    const id = setTimeout(() => { const n = Math.min(script.length, simPos.current + (Math.random() < 0.08 ? 1 : 3)); const chunk = script.slice(simPos.current, n); simPos.current = n; demarre(); setTexte((p) => p + chunk); }, 28);
    return () => clearTimeout(id);
  }, [simul, script, texte, demarre]);
  const simuler = () => { if (!script) return; if (simul === "en-cours") { setSimul("pause"); return; } if (simul === "fini") { simPos.current = 0; } if (simul === "non" || simul === "fini") setTexte((p) => (p.trim() ? p.replace(/\s*$/, "\n") : "")); setSimul("en-cours"); };

  /* Dictée au micro. */
  const ecouter = () => {
    const C = speechCtor();
    if (!C) return;
    if (micro === "ecoute") { rec.current?.stop(); return; }
    const r = new C(); r.lang = "fr-FR"; r.continuous = true; r.interimResults = true;
    r.onresult = (e) => { let fin = ""; let tmp = ""; for (let i = e.resultIndex; i < e.results.length; i++) { const res = e.results[i]; if (res.isFinal) fin += res[0].transcript; else tmp += res[0].transcript; } if (fin) ajoute(fin.trim()); setInterim(tmp); };
    r.onend = () => { setMicro("pret"); setInterim(""); rec.current = null; };
    r.onerror = (e) => { setMicro(e.error === "not-allowed" || e.error === "service-not-allowed" ? "erreur" : "pret"); setInterim(""); };
    rec.current = r; setMicro("ecoute"); try { r.start(); } catch { setMicro("erreur"); }
  };
  React.useEffect(() => () => rec.current?.stop(), []);

  const generer = React.useCallback(() => {
    if (!texte.trim()) return;
    rec.current?.stop(); setSimul((s) => (s === "en-cours" ? "pause" : s));
    chrono.current.saisie = debut ? Date.now() - debut : 0;
    chrono.current.composeDebut = Date.now(); chrono.current.composition = 0;
    setEdits({}); setRetires([]); setTexteDuPlan(texte);
    composer.run({ texte: "", note: (motif ? `Motif : ${motif}\n` : "") + texte, ecran: "note", patientId, patient: local ? patientPayload(local) : undefined });
  }, [texte, motif, debut, composer, patientId, local]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && document.activeElement === ref.current) { e.preventDefault(); generer(); }
      if (e.altKey && e.code === "Space" && script) { e.preventDefault(); simuler(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const onValide = React.useCallback((actions: ComposeAction[], plan: ComposePlan) => {
    const validation = Date.now() - (chrono.current.composeDebut + chrono.current.composition);
    const now = new Date().toISOString();
    // Un document déjà envoyé et modifié est renvoyé : même identifiant, nouvel envoi, l'ancien est remplacé.
    const avant = base?.actions ?? [];
    const envoyees = actions.map((a) => { const prev = avant.find((x) => x.id === a.id); const change = !prev || JSON.stringify(prev.charge) !== JSON.stringify(a.charge); return change ? { ...a, envoyeLe: now, renvoye: !!prev } : { ...a, renvoye: false }; });
    const note: NoteLocal = { id: noteId ?? nid("n"), date: base?.date ?? now, modifieLe: noteId ? now : undefined, motif: motif || undefined, texte, actions: envoyees, synthese: plan.synthese, via: plan.via, chrono: base ? base.chrono : { saisie: chrono.current.saisie, composition: chrono.current.composition, validation } };
    if (local) cab.saveNote(local.id, note);
    else { const prev = readNotes(patientId); writeNotes(patientId, prev.some((n) => n.id === note.id) ? prev.map((n) => (n.id === note.id ? note : n)) : [note, ...prev]); }
    setSignee(note); clearBrouillon(patientId);
    onSaved?.(note);
  }, [motif, texte, local, cab, patientId, onSaved, noteId, base]);

  const modifiee = !!composer.state.plan && texteDuPlan !== null && texteDuPlan !== texte;
  const nouvelle = () => { setTexte(""); setMotif(motifInitial ?? ""); setDebut(null); chrono.current = { saisie: 0, composeDebut: 0, composition: 0 }; setEdits({}); setRetires([]); setTexteDuPlan(null); setSignee(null); setRepris(false); setNoteId(undefined); simPos.current = 0; setSimul("non"); composer.reset(); clearBrouillon(patientId); ref.current?.focus(); };

  const ecoule = debut ? Date.now() - debut : 0;
  void tick;

  return (
    <div className="flex flex-col gap-4">
      {noteId && !signee && <div className="flex items-center gap-2.5 rounded-[10px] bg-soft px-3.5 py-2.5 text-sm"><span className="h-2 w-2 shrink-0 rounded-full bg-warn-dot" /><span className="flex-1">Modification d'une note signée : ses documents sont là, ouvrez-les pour les corriger. À la signature, ce qui a changé est renvoyé et remplace l'envoi précédent.</span><button type="button" onClick={nouvelle} className="text-xs text-muted-2 hover:text-ink">Annuler</button></div>}
      {repris && !signee && <div className="flex items-center gap-2.5 rounded-[10px] bg-accent-soft-2 px-3.5 py-2.5 text-sm"><span className="h-2 w-2 shrink-0 rounded-full bg-accent" /><span className="flex-1">Consultation reprise là où vous l'aviez laissée{composer.state.plan ? ` · ${composer.state.plan.actions.filter((a) => a.kind !== "naviguer" && !retires.includes(a.id)).length} action(s) à valider` : ""}.</span><button type="button" onClick={nouvelle} className="text-xs text-muted-2 hover:text-ink">Repartir de zéro</button></div>}
      {signee && <div className="flex items-center gap-2.5 rounded-[10px] bg-ok-soft px-3.5 py-2.5 text-sm text-ok"><I.check size={14} w={2.5} /><span className="flex-1">{signee.modifieLe ? "Note modifiée et re-signée · les documents modifiés ont été renvoyés" : "Note signée et versée au dossier"} · saisie {fmtMs(signee.chrono.saisie)} · composition {fmtMs(signee.chrono.composition)} · validation {fmtMs(signee.chrono.validation)}</span></div>}
      <div className="flex flex-wrap items-center gap-2.5">
        <button type="button" onClick={ecouter} disabled={micro === "absent"} title={micro === "absent" ? "Reconnaissance vocale indisponible dans ce navigateur (Chrome recommandé)" : micro === "erreur" ? "Micro refusé : autorisez-le dans la barre d'adresse" : "Dicter au micro"} className={cn("flex items-center gap-2 rounded-full border px-3.5 py-[8px] text-sm", micro === "ecoute" ? "border-rec bg-paper text-rec-text" : "border-line bg-paper text-ink hover:bg-hover", micro === "absent" && "opacity-40")}>
          <span className={cn("h-2 w-2 rounded-full", micro === "ecoute" ? "bg-rec animate-pulse-soft" : "bg-gray-dot")} />{micro === "ecoute" ? "Écoute… arrêter" : micro === "erreur" ? "Micro refusé" : "Dicter"}
        </button>
        {script && <button type="button" onClick={simuler} className="flex items-center gap-2 rounded-full border border-line bg-paper px-3.5 py-[8px] text-sm text-ink hover:bg-hover"><span className={cn("h-2 w-2 rounded-full", simul === "en-cours" ? "bg-accent animate-pulse-soft" : "bg-gray-dot")} />{simul === "en-cours" ? "Pause" : simul === "pause" ? "Reprendre la dictée simulée" : simul === "fini" ? "Rejouer la dictée simulée" : "Simuler la dictée"} <Kbd>⌥ espace</Kbd></button>}
        <button type="button" onClick={() => { setTexte((t) => (t.trim() ? t : MODELE)); ref.current?.focus(); }} className="rounded-full border border-line bg-paper px-3.5 py-[8px] text-sm text-ink hover:bg-hover">Structure</button>
        <span className="flex-1" />
        <input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Motif" className="w-[160px] min-w-0 rounded-[8px] border border-line bg-paper px-3 py-1.5 text-sm text-ink outline-none placeholder:text-muted-3 sm:w-[220px]" />
        <span className={cn("d text-[11px]", debut && "text-ink")}>{debut ? `⏱ ${fmtMs(ecoule)}` : "⏱ 0 s"}</span>
      </div>
      <div className="relative">
        <textarea ref={ref} value={texte} readOnly={!!signee} onChange={(e) => { if (e.target.value.trim()) demarre(); setTexte(e.target.value); }} placeholder={`Dictez au micro, lancez la dictée simulée, collez la sortie d'un scribe, ou écrivez.\n\n${MODELE}`} rows={12} className="w-full resize-y rounded-[14px] border border-line bg-paper px-5 py-4 text-[17px] leading-[1.75] text-ink outline-none placeholder:text-muted-3 focus:border-accent-line" />
        {interim && <div className="pointer-events-none absolute inset-x-5 bottom-3 truncate text-[15px] text-muted-3">{interim}<span className="caret" /></div>}
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        {!signee && <button type="button" onClick={generer} disabled={!texte.trim() || composer.state.busy} className={cn("flex items-center gap-2 rounded-[10px] px-4 py-[9px] text-sm disabled:opacity-40", modifiee ? "border border-accent-line bg-accent-soft-2 text-ink" : composer.state.plan ? "border border-line bg-paper text-ink" : "bg-ink text-paper")}>{modifiee ? "Régénérer les actions · la note a changé" : composer.state.plan ? "Régénérer les actions" : "Générer les actions"} <Kbd dark={!composer.state.plan}>⌘⏎</Kbd></button>}
        {signee && <button type="button" onClick={nouvelle} className="rounded-[10px] border border-line bg-paper px-4 py-[9px] text-sm text-ink hover:bg-hover">Nouvelle consultation</button>}
        <span className="text-xs text-muted-2">{nom}</span>
        <span className="flex-1" />
        {composer.state.plan && <span className="d text-[11px]">saisie {fmtMs(chrono.current.saisie)} · composition {fmtMs(chrono.current.composition)}</span>}
      </div>
      {composer.open && (
        <ComposeCard key={composer.state.input ? `${texteDuPlan?.length ?? 0}-${composer.state.plan ? "p" : "c"}` : "x"} state={composer.state} onClose={composer.reset} suivreSeul={false} onValide={onValide} libelleValider={noteId ? "Re-signer et renvoyer ce qui a changé" : "Signer et verser au dossier"} patient={pr}
          initialActions={{ edits, retires }} onChange={(e, r) => { setEdits(e); setRetires(r); }}
          apres={<>{onRetour ? <button type="button" onClick={onRetour} className="rounded-[10px] bg-ink px-4 py-[9px] text-sm text-paper">Retour au dossier</button> : <Link href={retour} className="rounded-[10px] bg-ink px-4 py-[9px] text-sm text-paper hover:text-paper">Retour au dossier</Link>}<button type="button" onClick={nouvelle} className="rounded-[10px] border border-line bg-paper px-4 py-[9px] text-sm text-ink hover:bg-hover">Nouvelle consultation</button></>} />
      )}
    </div>
  );
}

/** Une note enregistrée, telle qu'elle s'affiche dans le dossier : ses actions s'ouvrent sur le document envoyé. */
export function NoteRow({ n, onDelete, onModifier, modifierHref, patient }: { n: NoteLocal; onDelete?: () => void; onModifier?: () => void; modifierHref?: string; patient?: PatientRendu }) {
  const [open, setOpen] = React.useState(false);
  const [doc, setDoc] = React.useState<ComposeAction | null>(null);
  const d = new Date(n.date);
  return (
    <div className="card overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-hover">
        <span className="d w-[92px] shrink-0">{String(d.getDate()).padStart(2, "0")}/{String(d.getMonth() + 1).padStart(2, "0")} {String(d.getHours()).padStart(2, "0")}:{String(d.getMinutes()).padStart(2, "0")}</span>
        <span className="flex min-w-0 flex-1 flex-col"><span className="truncate text-[15px]">{n.motif || n.synthese?.slice(0, 80) || "Consultation"}{n.modifieLe && <span className="ml-2 text-[11px] text-muted-2">modifiée le {new Date(n.modifieLe).toLocaleDateString("fr-FR")}</span>}</span><span className="truncate text-[13px] text-muted-2">{n.actions.length} action{n.actions.length > 1 ? "s" : ""} · saisie {fmtMs(n.chrono.saisie)} · composition {fmtMs(n.chrono.composition)} · validation {fmtMs(n.chrono.validation)}{n.via ? ` · ${n.via}` : ""}</span></span>
        <I.chevron open={open} />
      </button>
      {open && (
        <div className="flex flex-col gap-3 border-t border-line-4 px-4 py-3">
          {n.synthese && <p className="m-0 text-sm leading-relaxed">{n.synthese}</p>}
          <pre className="m-0 whitespace-pre-wrap rounded-[10px] bg-bg px-3.5 py-3 font-sans text-sm leading-relaxed text-ink-2">{n.texte}</pre>
          {n.actions.length > 0 && <div className="flex flex-col gap-0.5">{n.actions.map((a) => <button key={a.id} type="button" onClick={() => setDoc(a)} className="flex items-center gap-3 rounded-[8px] px-2 py-1.5 text-left text-sm hover:bg-hover" title="Voir le document envoyé"><span className="d flex h-6 min-w-6 items-center justify-center rounded-[6px] bg-soft px-1 text-[10px] text-ink-3">{a.code}</span><span className="min-w-0 flex-1 truncate">{a.titre}</span><span className="text-[11px] text-muted-3">{a.destination}</span>{a.renvoye && <span className="text-[11px] text-ok">renvoyé</span>}<I.chevron /></button>)}</div>}
          <div className="flex flex-wrap items-center gap-3">
            {modifierHref && <Link href={modifierHref} className="rounded-[8px] border border-line bg-paper px-3 py-1.5 text-xs text-ink hover:bg-hover hover:text-ink">Modifier</Link>}
            {onModifier && !modifierHref && <button type="button" onClick={onModifier} className="rounded-[8px] border border-line bg-paper px-3 py-1.5 text-xs text-ink hover:bg-hover">Modifier</button>}
            {onDelete && <button type="button" onClick={onDelete} className="text-xs text-muted-2 hover:text-rec-text">Supprimer</button>}
          </div>
        </div>
      )}
      {doc && <ActionPanel action={doc} patient={patient ?? { nom: "" }} onClose={() => setDoc(null)} />}
    </div>
  );
}

/** La consultation en cours d'un patient, s'il y en a une : le rappel qui ramène à l'éditeur. */
export function BrouillonBanner({ patientId, href }: { patientId: string; href: string }) {
  const [b, setB] = React.useState<Brouillon | null>(null);
  React.useEffect(() => { setB(readBrouillon(patientId)); }, [patientId]);
  if (!b || (!b.texte.trim() && !b.plan)) return null;
  const n = b.plan ? b.plan.actions.filter((a) => a.kind !== "naviguer" && !(b.retires ?? []).includes(a.id)).length : 0;
  return (
    <Link href={href} className="flex items-center gap-3 rounded-[12px] border border-accent-line bg-accent-soft-2 px-4 py-3 text-sm text-ink hover:text-ink" style={{ boxShadow: "var(--shadow-accent)" }}>
      <span className="h-2 w-2 shrink-0 rounded-full bg-accent animate-pulse-soft" />
      <span className="flex min-w-0 flex-1 flex-col"><span className="font-medium">{b.plan ? `${n} action${n > 1 ? "s" : ""} à valider` : "Consultation en cours"}</span><span className="truncate text-[13px] text-muted-2">{b.motif ? `${b.motif} · ` : ""}{b.texte.replace(/\s+/g, " ").slice(0, 90) || "note vide"}</span></span>
      <span className="text-[13px]">Reprendre →</span>
    </Link>
  );
}

/** Les notes de la session pour un patient du jeu de données (localStorage), affichées dans son dossier. */
export function NotesSession({ patientId, patient }: { patientId: string; patient?: PatientRendu }) {
  const [notes, setNotes] = React.useState<NoteLocal[]>([]);
  React.useEffect(() => { setNotes(readNotes(patientId)); }, [patientId]);
  if (!notes.length) return null;
  return (
    <section className="flex flex-col gap-2">
      <span className="k px-1">Notes de la session · {notes.length}</span>
      {notes.map((n) => <NoteRow key={n.id} n={n} patient={patient} modifierHref={`/p/${patientId}/rencontre?modifie=${n.id}`} onDelete={() => { const next = notes.filter((x) => x.id !== n.id); writeNotes(patientId, next); setNotes(next); }} />)}
    </section>
  );
}

/** Sur l'accueil : les consultations laissées en cours sur ce poste, avec leurs actions à valider. */
export function BrouillonsAccueil() {
  const [list, setList] = React.useState<Brouillon[]>([]);
  React.useEffect(() => { setList(listBrouillons()); }, []);
  if (!list.length) return null;
  return (
    <section className="flex flex-col gap-1">
      <div className="k px-3.5 pb-2" style={{ color: "var(--accent)" }}>À valider · {list.length}</div>
      {list.map((b) => { const n = b.plan ? b.plan.actions.filter((a) => a.kind !== "naviguer" && !(b.retires ?? []).includes(a.id)).length : 0; return (
        <Link key={b.patientId} href={b.href} className="flex items-center gap-3 rounded-[10px] px-3.5 py-3 text-ink hover:bg-hover hover:text-ink sm:gap-4">
          <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
          <span className="min-w-0 flex-1 truncate text-[15px]">{b.nom}</span>
          <span className="hidden truncate text-[13px] text-muted-2 sm:inline">{b.plan ? `${n} action${n > 1 ? "s" : ""} à valider` : "note en cours"}{b.motif ? ` · ${b.motif}` : ""}</span>
          <I.chevron />
        </Link>
      ); })}
    </section>
  );
}
