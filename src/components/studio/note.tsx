"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Kbd, I } from "./chrome";
import { ComposeCard, useCompose } from "./compose";
import { useCabinet, nid, patientPayload, type NoteLocal, type PatientLocal } from "@/store/cabinet";
import type { ComposeAction, ComposePlan } from "@/locus/compose/contract";
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

export function NoteEditor({ patientId, local, nom, retour, onSaved, script, motifInitial }: { patientId: string; local?: PatientLocal; nom: string; retour: string; onSaved?: (n: NoteLocal) => void; script?: string; motifInitial?: string }) {
  const router = useRouter();
  const cab = useCabinet();
  const composer = useCompose();
  const [texte, setTexte] = React.useState("");
  const [motif, setMotif] = React.useState(motifInitial ?? "");
  const [debut, setDebut] = React.useState<number | null>(null);
  const [tick, setTick] = React.useState(0);
  const [micro, setMicro] = React.useState<"absent" | "pret" | "ecoute" | "erreur">("absent");
  const [interim, setInterim] = React.useState("");
  const [simul, setSimul] = React.useState<"non" | "en-cours" | "pause" | "fini">("non");
  const chrono = React.useRef({ saisie: 0, composeDebut: 0, composition: 0 });
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const rec = React.useRef<SR | null>(null);
  const simPos = React.useRef(0);

  React.useEffect(() => { ref.current?.focus(); setMicro(speechCtor() ? "pret" : "absent"); }, []);
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
    const note: NoteLocal = { id: nid("n"), date: new Date().toISOString(), motif: motif || undefined, texte, actions, synthese: plan.synthese, via: plan.via, chrono: { saisie: chrono.current.saisie, composition: chrono.current.composition, validation } };
    if (local) cab.saveNote(local.id, note); else writeNotes(patientId, [note, ...readNotes(patientId)]);
    onSaved?.(note);
    setTimeout(() => router.push(retour), 900);
  }, [motif, texte, local, cab, patientId, onSaved, router, retour]);

  const ecoule = debut ? Date.now() - debut : 0;
  void tick;

  return (
    <div className="flex flex-col gap-4">
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
        <textarea ref={ref} value={texte} onChange={(e) => { if (e.target.value.trim()) demarre(); setTexte(e.target.value); }} placeholder={`Dictez au micro, lancez la dictée simulée, collez la sortie d'un scribe, ou écrivez.\n\n${MODELE}`} rows={12} className="w-full resize-y rounded-[14px] border border-line bg-paper px-5 py-4 text-[17px] leading-[1.75] text-ink outline-none placeholder:text-muted-3 focus:border-accent-line" />
        {interim && <div className="pointer-events-none absolute inset-x-5 bottom-3 truncate text-[15px] text-muted-3">{interim}<span className="caret" /></div>}
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <button type="button" onClick={generer} disabled={!texte.trim() || composer.state.busy} className="flex items-center gap-2 rounded-[10px] bg-ink px-4 py-[9px] text-sm text-paper disabled:opacity-40">Générer les actions <Kbd dark>⌘⏎</Kbd></button>
        <span className="text-xs text-muted-2">{nom}</span>
        <span className="flex-1" />
        {composer.state.plan && <span className="d text-[11px]">saisie {fmtMs(chrono.current.saisie)} · composition {fmtMs(chrono.current.composition)}</span>}
      </div>
      {composer.open && <ComposeCard state={composer.state} onClose={composer.reset} suivreSeul={false} onValide={onValide} libelleValider="Signer et verser au dossier" />}
    </div>
  );
}

/** Une note enregistrée, telle qu'elle s'affiche dans le dossier. */
export function NoteRow({ n, onDelete }: { n: NoteLocal; onDelete?: () => void }) {
  const [open, setOpen] = React.useState(false);
  const d = new Date(n.date);
  return (
    <div className="card overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-hover">
        <span className="d w-[92px] shrink-0">{String(d.getDate()).padStart(2, "0")}/{String(d.getMonth() + 1).padStart(2, "0")} {String(d.getHours()).padStart(2, "0")}:{String(d.getMinutes()).padStart(2, "0")}</span>
        <span className="flex min-w-0 flex-1 flex-col"><span className="truncate text-[15px]">{n.motif || n.synthese?.slice(0, 80) || "Consultation"}</span><span className="truncate text-[13px] text-muted-2">{n.actions.length} action{n.actions.length > 1 ? "s" : ""} · saisie {fmtMs(n.chrono.saisie)} · composition {fmtMs(n.chrono.composition)} · validation {fmtMs(n.chrono.validation)}{n.via ? ` · ${n.via}` : ""}</span></span>
        <I.chevron open={open} />
      </button>
      {open && (
        <div className="flex flex-col gap-3 border-t border-line-4 px-4 py-3">
          {n.synthese && <p className="m-0 text-sm leading-relaxed">{n.synthese}</p>}
          <pre className="m-0 whitespace-pre-wrap rounded-[10px] bg-bg px-3.5 py-3 font-sans text-sm leading-relaxed text-ink-2">{n.texte}</pre>
          {n.actions.length > 0 && <div className="flex flex-col gap-1">{n.actions.map((a) => <div key={a.id} className="flex items-center gap-3 text-sm"><span className="d flex h-6 min-w-6 items-center justify-center rounded-[6px] bg-soft px-1 text-[10px] text-ink-3">{a.code}</span><span className="min-w-0 flex-1 truncate">{a.titre}</span><span className="text-[11px] text-muted-3">{a.destination}</span></div>)}</div>}
          {onDelete && <button type="button" onClick={onDelete} className="self-start text-xs text-muted-2 hover:text-rec-text">Supprimer cette note</button>}
        </div>
      )}
    </div>
  );
}

/** Les notes de la session pour un patient du jeu de données (localStorage), affichées dans son dossier. */
export function NotesSession({ patientId }: { patientId: string }) {
  const [notes, setNotes] = React.useState<NoteLocal[]>([]);
  React.useEffect(() => { setNotes(readNotes(patientId)); }, [patientId]);
  if (!notes.length) return null;
  return (
    <section className="flex flex-col gap-2">
      <span className="k px-1">Notes de la session · {notes.length}</span>
      {notes.map((n) => <NoteRow key={n.id} n={n} onDelete={() => { const next = notes.filter((x) => x.id !== n.id); writeNotes(patientId, next); setNotes(next); }} />)}
    </section>
  );
}
