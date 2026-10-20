"use client";
import * as React from "react";
import Link from "next/link";
import { Kbd, I } from "./chrome";
import { ComposeCard, useCompose } from "./compose";
import { useRouter } from "next/navigation";
import { ActionPanel, dialogOuvert, type PatientRendu } from "./rendu";
import { useCabinet, nid, patientPayload, type NoteLocal, type PatientLocal } from "@/store/cabinet";
import { materialize, isoParis, type Charge } from "@/locus/compose/materialize";
import type { ComposeAction, ComposePlan, ComposeInput, ComposeKind } from "@/locus/compose/contract";
import { cn } from "@/lib/cn";
import { fetchLive } from "@/lib/live";

/**
 * La consultation : un seul éditeur qui cumule trois sources — la dictée au
 * micro (reconnaissance vocale du navigateur), la dictée simulée (le script
 * du jeu de données, qui s'écrit tout seul), et la note libre ou collée depuis
 * un scribe. Puis « Générer » passe le tout au composer, qui le décline en
 * actions. Le chrono mesure saisie, composition, validation — et s'arrête
 * quand on quitte l'onglet.
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
export function readNotes(patientId: string): NoteLocal[] { try { const v = JSON.parse(localStorage.getItem(NOTES_KEY(patientId)) ?? "[]"); return Array.isArray(v) ? v.filter((n) => n && typeof n === "object" && typeof n.id === "string") : []; } catch { return []; } }
export function writeNotes(patientId: string, notes: NoteLocal[]) { try { localStorage.setItem(NOTES_KEY(patientId), JSON.stringify(notes)); } catch {} }

/**
 * Le brouillon de consultation : la note en cours, et le plan composé s'il
 * existe, avec ce qu'on y a modifié ou retiré. Sauvé à chaque frappe, repris
 * à l'ouverture — quitter l'écran ne perd rien, et les actions à valider
 * restent visibles depuis le dossier et l'accueil.
 *
 * Une consultation nouvelle et la modification d'une note signée ont chacune
 * leur clé : ouvrir « Modifier » n'écrase jamais ce qu'on était en train de dicter.
 */
export interface Brouillon { patientId: string; nom: string; href: string; texte: string; motif: string; debut: number | null; chrono: { saisie: number; composeDebut: number; composition: number; validation?: number }; input?: ComposeInput; plan?: ComposePlan; texteDuPlan?: string; edits: Record<string, ComposeAction>; retires: string[]; majLe: string; noteId?: string; noteDate?: string; transcript?: string }
export const BROUILLON_KEY = (patientId: string, noteId?: string) => `locus-studio-brouillon-${patientId}${noteId ? `-mod-${noteId}` : ""}`;
export function readBrouillon(patientId: string, noteId?: string): Brouillon | null { try { const raw = localStorage.getItem(BROUILLON_KEY(patientId, noteId)); const b = raw ? (JSON.parse(raw) as Brouillon) : null; return b && typeof b === "object" && typeof b.texte === "string" ? b : null; } catch { return null; } }
export function writeBrouillon(b: Brouillon) { try { localStorage.setItem(BROUILLON_KEY(b.patientId, b.noteId), JSON.stringify(b)); } catch {} }
export function clearBrouillon(patientId: string, noteId?: string) { try { localStorage.removeItem(BROUILLON_KEY(patientId, noteId)); } catch {} }
const vivant = (b: Brouillon | null): b is Brouillon => !!b && (b.texte.trim().length > 0 || !!b.plan || !!b.transcript?.trim());
/** Tous les brouillons du poste, les plus récents d'abord (consultations en cours et modifications de notes). */
export function listBrouillons(patientId?: string): Brouillon[] {
  const out: Brouillon[] = [];
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith("locus-studio-brouillon-")) { let b: Brouillon | null = null; try { b = JSON.parse(localStorage.getItem(k) ?? "null"); } catch { b = null; } if (vivant(b) && typeof b.patientId === "string" && (!patientId || b.patientId === patientId)) out.push(b); } } } catch {}
  return out.sort((a, b) => (b.majLe ?? "").localeCompare(a.majLe ?? ""));
}
const nActions = (b: Brouillon) => (b.plan ? b.plan.actions.filter((a) => a.kind !== "naviguer" && !(b.retires ?? []).includes(a.id)).length : 0);

/** Ce qu'on peut ajouter à la main, sans passer par le composer : une charge vide, le formulaire fait le reste. */
export type Ajout = "ordonnance" | "examen" | "imagerie" | "paramedical" | "arret" | "courrier" | "message" | "rdv" | "fiche";
export const AJOUTS: { k: Ajout; label: string }[] = [{ k: "ordonnance", label: "Ordonnance" }, { k: "examen", label: "Biologie" }, { k: "imagerie", label: "Imagerie" }, { k: "paramedical", label: "Kiné, soins" }, { k: "arret", label: "Arrêt de travail" }, { k: "courrier", label: "Courrier" }, { k: "message", label: "Message" }, { k: "rdv", label: "Rendez-vous" }, { k: "fiche", label: "Fiche du patient" }];
export function actionVide(k: Ajout, patient: PatientRendu): ComposeAction {
  const dans7 = new Date(); dans7.setDate(dans7.getDate() + 7);
  const c: Charge =
    k === "ordonnance" ? { kind: "ordonnance", type: "medicament", lignes: [{ libelle: "", posologie: "", duree: "3 mois" }] } :
    k === "examen" ? { kind: "ordonnance", type: "biologie", lignes: [{ libelle: "" }] } :
    k === "imagerie" ? { kind: "ordonnance", type: "imagerie", lignes: [{ libelle: "" }] } :
    k === "paramedical" ? { kind: "ordonnance", type: "paramedical", lignes: [{ libelle: "Kinésithérapie · 10 séances" }] } :
    k === "arret" ? { kind: "arret", jours: 3, sorties: "oui", motif: "" } :
    k === "courrier" ? { kind: "courrier", type: "adressage", destinataire: "", titre: "Adressage", corps: `Cher confrère, chère consœur,\n\nJe vous adresse ${patient.nom} pour avis.\n\nBien confraternellement,\nDr Vandepitterie` } :
    k === "message" ? { kind: "message", a: "patient", objet: "", corps: "" } :
    k === "rdv" ? { kind: "rdv", debut: isoParis(dans7.toISOString().slice(0, 10), "09:30"), duree_min: 20, motif: "Consultation" } :
    { kind: "dossier", type: "antecedent", libelle: "" };
  const kind: ComposeKind = c.kind;
  return { id: nid("m"), ...materialize(c, patient.nom), kind, justification: "Ajouté à la main.", statut: "relire" };
}

/** Une seconde s'écoule seulement quand l'onglet est visible : le chrono ne compte pas le café. */
function useHorloge(actif: boolean, onTick: () => void) {
  const cb = React.useRef(onTick); cb.current = onTick;
  React.useEffect(() => { if (!actif) return; const id = setInterval(() => { if (document.visibilityState === "visible") cb.current(); }, 1000); return () => clearInterval(id); }, [actif]);
}

export function NoteEditor({ patientId, local, nom, retour, onSaved, script, motifInitial, consultHref, onRetour, onAnnuler, base, patient, ajout }: { patientId: string; local?: PatientLocal; nom: string; retour: string; onSaved?: (n: NoteLocal) => void; script?: string; motifInitial?: string; consultHref?: string; onRetour?: () => void; /** La modification d'une note signée est abandonnée. */ onAnnuler?: () => void; /** La note signée que l'on modifie en place : ses documents modifiés sont renvoyés. */ base?: NoteLocal; patient?: PatientRendu; /** Une action à ajouter à la main dès l'ouverture (depuis « + Consultation › Ordonnance »). */ ajout?: Ajout }) {
  const cab = useCabinet();
  const router = useRouter();
  const composer = useCompose();
  const [ouvrirId, setOuvrirId] = React.useState<string | null>(null);
  const [valideNonce, setValideNonce] = React.useState(0);
  const [menu, setMenu] = React.useState(false);
  const [texte, setTexte] = React.useState("");
  const [transcript, setTranscript] = React.useState("");
  const [transcriptOuvert, setTranscriptOuvert] = React.useState(false);
  const [synth, setSynth] = React.useState<{ busy: boolean; erreur?: string; via?: string }>({ busy: false });
  const [motif, setMotif] = React.useState(motifInitial ?? "");
  const [debut, setDebut] = React.useState<number | null>(null);
  const [pret, setPret] = React.useState(false);
  const [texteDuPlan, setTexteDuPlan] = React.useState<string | null>(null);
  const [edits, setEdits] = React.useState<Record<string, ComposeAction>>({});
  const [retires, setRetires] = React.useState<string[]>([]);
  const [signee, setSignee] = React.useState<NoteLocal | null>(null);
  const [repris, setRepris] = React.useState(false);
  const [chrono, setChrono] = React.useState({ saisie: 0, composeDebut: 0, composition: 0, validation: 0 });
  const noteId = base?.id;
  const pr: PatientRendu = patient ?? { nom };
  const [micro, setMicro] = React.useState<"absent" | "pret" | "ecoute" | "erreur">("absent");
  const [interim, setInterim] = React.useState("");
  const [simul, setSimul] = React.useState<"non" | "en-cours" | "pause" | "fini">("non");
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const rec = React.useRef<SR | null>(null);
  const simPos = React.useRef(0);
  const plan = composer.state.plan;

  /* À l'ouverture : le brouillon (de cette consultation, ou de cette modification) reprend sa place — note, chrono, plan, modifications. */
  React.useEffect(() => {
    setMicro(speechCtor() ? "pret" : "absent");
    const b = readBrouillon(patientId, noteId);
    if (vivant(b)) {
      setTexte(b.texte); setTranscript(b.transcript ?? ""); setMotif(b.motif); setDebut(b.debut); setChrono({ saisie: b.chrono?.saisie ?? 0, composeDebut: b.chrono?.composeDebut ?? 0, composition: b.chrono?.composition ?? 0, validation: b.chrono?.validation ?? 0 }); setEdits(b.edits ?? {}); setRetires(b.retires ?? []); setTexteDuPlan(b.texteDuPlan ?? null); setRepris(true);
      if (b.plan && b.input) composer.restore(b.input, b.plan);
    } else if (base) {
      // Modifier une note signée, en place : sa note et ses documents reviennent dans l'éditeur ; ce qui est modifié sera renvoyé.
      setTexte(base.texte); setTranscript(base.transcript ?? ""); setMotif(base.motif ?? ""); setDebut(null); setChrono({ saisie: 0, composeDebut: 0, composition: 0, validation: 0 }); setEdits({}); setRetires([]); setTexteDuPlan(base.texte);
      const p: ComposePlan = { synthese: base.synthese ?? "", actions: base.actions, references: [], via: base.via ?? "simulation", locus: 0 };
      composer.restore({ texte: "", note: base.texte, motif: base.motif, ecran: "note", patientId }, p);
    }
    setPret(true);
    ref.current?.focus();
    if (ajout && !vivant(b)) { const a = actionVide(ajout, patient ?? { nom }); composer.ajoute(a, { texte: "", note: "", ecran: "note", patientId }); setOuvrirId(a.id); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, noteId]);
  /* À chaque changement : le brouillon suit. Une modification sans aucun changement ne laisse pas de brouillon fantôme. */
  React.useEffect(() => {
    if (!pret || signee) return;
    const vide = !texte.trim() && !plan && !transcript.trim();
    const inchangee = !!base && texte === base.texte && motif === (base.motif ?? "") && !Object.keys(edits).length && !retires.length && (!plan || plan.actions === base.actions);
    if (vide || inchangee) { clearBrouillon(patientId, noteId); return; }
    writeBrouillon({ patientId, nom, href: consultHref ?? retour, texte, transcript: transcript || undefined, motif, debut, chrono, input: composer.state.input, plan, texteDuPlan: texteDuPlan ?? undefined, edits, retires, majLe: new Date().toISOString(), noteId, noteDate: base?.date });
  }, [pret, signee, texte, transcript, motif, debut, plan, composer.state.input, edits, retires, texteDuPlan, patientId, nom, retour, consultHref, noteId, base, chrono]);
  /* Le chrono : la saisie court tant qu'il n'y a pas de plan ; la validation court dès qu'il y en a un, jusqu'à la signature. */
  useHorloge(!signee && debut !== null && !plan, () => setChrono((c) => ({ ...c, saisie: c.saisie + 1000 })));
  useHorloge(!signee && !!plan && !composer.state.busy, () => setChrono((c) => ({ ...c, validation: c.validation + 1000 })));
  React.useEffect(() => { if (plan && chrono.composeDebut && !chrono.composition) setChrono((c) => ({ ...c, composition: Math.max(0, Date.now() - c.composeDebut) })); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [plan]);
  const demarre = React.useCallback(() => setDebut((d) => d ?? Date.now()), []);
  const ajoute = React.useCallback((t: string) => { demarre(); setTranscript((prev) => (prev && !/\s$/.test(prev) ? prev + " " : prev) + t); }, [demarre]);

  /* Dictée simulée : le script s'écrit dans la note, au rythme d'une voix, ⌥ espace pour pause. */
  React.useEffect(() => {
    if (simul !== "en-cours" || !script) return;
    if (simPos.current >= script.length) { setSimul("fini"); return; }
    const id = setTimeout(() => { const n = Math.min(script.length, simPos.current + (Math.random() < 0.08 ? 1 : 3)); const chunk = script.slice(simPos.current, n); simPos.current = n; demarre(); setTranscript((p) => p + chunk); }, 28);
    return () => clearTimeout(id);
  }, [simul, script, transcript, demarre]);
  const simuler = () => { if (!script) return; if (simul === "en-cours") { setSimul("pause"); return; } if (simul === "fini") { simPos.current = 0; } if (simul === "non" || simul === "fini") setTranscript((p) => (p.trim() ? p.replace(/\s*$/, "\n") : "")); setSimul("en-cours"); };

  /* La passe de synthèse : le transcript devient une note très courte, que l'on relit et corrige. « Régénérer » recommence depuis le transcript. */
  const synthCtrl = React.useRef<AbortController | null>(null);
  const synthetiser = React.useCallback(async () => {
    const t = transcript.trim(); if (!t) return;
    synthCtrl.current?.abort(); const ac = new AbortController(); synthCtrl.current = ac;
    setSynth({ busy: true });
    try {
      const r = await fetchLive("/api/note", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transcript: t, motif: motif || undefined, patientId, patient: local ? patientPayload(local) : undefined }), signal: ac.signal });
      const j = (await r.json().catch(() => null)) as { note?: string; via?: string; error?: string } | null;
      if (!r.ok || !j?.note) throw new Error(j?.error ?? "La synthèse n'a pas abouti.");
      setTexte(j.note); setSynth({ busy: false, via: j.via }); setTranscriptOuvert(false);
    } catch (e) { if (ac.signal.aborted) return; setSynth({ busy: false, erreur: e instanceof Error ? e.message : String(e) }); }
  }, [transcript, motif, patientId, local]);
  // Dès que la dictée s'arrête (micro ou simulée), la note se synthétise toute seule si elle est encore vide.
  const autoSynth = React.useRef(false);
  React.useEffect(() => { if (autoSynth.current && micro !== "ecoute" && simul !== "en-cours" && transcript.trim() && !texte.trim() && !synth.busy) { autoSynth.current = false; void synthetiser(); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [micro, simul]);
  React.useEffect(() => { if (micro === "ecoute" || simul === "en-cours") autoSynth.current = true; }, [micro, simul]);
  React.useEffect(() => () => synthCtrl.current?.abort(), []);

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

  const ajouter = (k: Ajout) => { setMenu(false); const a = actionVide(k, pr); composer.ajoute(a, { texte: "", note: texte, motif: motif || undefined, ecran: "note", patientId }); if (texteDuPlan === null) setTexteDuPlan(texte); setOuvrirId(a.id); };
  const modifiee = !!plan && texteDuPlan !== null && texteDuPlan !== texte;
  const touche = Object.keys(edits).length > 0 || retires.length > 0;
  const generer = React.useCallback((force = false) => {
    if (!texte.trim() || composer.state.busy) return;
    // Régénérer efface les modifications faites à la main sur le plan : on le dit avant.
    if (plan && touche && !force && !confirm("Régénérer les actions remplace le plan actuel, y compris ce que vous avez modifié ou retiré à la main. Continuer ?")) return;
    rec.current?.stop(); setSimul((s) => (s === "en-cours" ? "pause" : s));
    setChrono((c) => ({ ...c, composeDebut: Date.now(), composition: 0, validation: 0 }));
    setEdits({}); setRetires([]); setTexteDuPlan(texte);
    composer.run({ texte: "", note: texte, motif: motif || undefined, ecran: "note", patientId, patient: local ? patientPayload(local) : undefined });
  }, [texte, motif, composer, patientId, local, plan, touche]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ⌘⏎ dans la note : générer ; une fois le plan là et la note inchangée, c'est la carte qui valide (le focus peut rester dans la note).
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && noteId && !signee && !dialogOuvert()) { e.preventDefault(); e.stopPropagation(); enregistrer(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && document.activeElement === ref.current) { if (plan && !modifiee) return; e.preventDefault(); e.stopPropagation(); generer(); return; }
      // ⌘⏎ hors de tout champ, sans plan encore : générer (le bouton, au clavier).
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !plan && !signee && !dialogOuvert() && !(e.target as HTMLElement | null)?.closest("input, textarea, select")) { e.preventDefault(); e.stopPropagation(); generer(); }
      if (e.altKey && e.code === "Space" && script) { e.preventDefault(); simuler(); }
      if (e.key === "Escape" && menu) { e.preventDefault(); e.stopPropagation(); setMenu(false); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  const onValide = React.useCallback((actions: ComposeAction[], p: ComposePlan): ComposeAction[] => {
    const now = new Date().toISOString();
    // Un document déjà envoyé et modifié est renvoyé : même identifiant, nouvel envoi, l'ancien est remplacé. Inchangé : il garde sa date d'envoi.
    const avant = base?.actions ?? [];
    const envoyees = actions.map((a) => { const prev = avant.find((x) => x.id === a.id); const change = !prev || JSON.stringify(prev.charge) !== JSON.stringify(a.charge); return change ? { ...a, envoyeLe: now, renvoye: !!prev } : { ...prev, ...a, envoyeLe: prev.envoyeLe ?? now, renvoye: false }; });
    const note: NoteLocal = { id: noteId ?? nid("n"), date: base?.date ?? now, modifieLe: noteId ? now : undefined, motif: motif || undefined, texte, actions: envoyees, synthese: p.synthese, via: p.via, chrono: base ? base.chrono : { saisie: chrono.saisie, composition: chrono.composition, validation: chrono.validation }, origine: texte.trim() ? "consultation" : "commande", transcript: transcript.trim() || base?.transcript || undefined };
    if (local) {
      cab.saveNote(local.id, note);
      // Ce qui entre dans la fiche y entre vraiment : antécédent, allergie, traitement de fond.
      const nouveaux = envoyees.filter((a) => a.kind === "dossier" && a.renvoye === false && !avant.some((x) => x.id === a.id));
      if (nouveaux.length) {
        const cur = cab.get(local.id) ?? local;
        const add = (arr: string[], v: string) => (v.trim() && !arr.some((x) => x.trim().toLowerCase() === v.trim().toLowerCase()) ? [...arr, v.trim()] : arr);
        let p2 = { ...cur };
        for (const a of nouveaux) { const c = a.charge as { type?: string; libelle?: string; detail?: string } | undefined; const lib = `${c?.libelle ?? ""}${c?.detail ? ` (${c.detail})` : ""}`; if (c?.type === "allergie") p2 = { ...p2, allergies: add(p2.allergies, lib) }; else if (c?.type === "traitement") p2 = { ...p2, traitements: add(p2.traitements, lib) }; else p2 = { ...p2, antecedents: add(p2.antecedents, c?.type === "antecedent-familial" ? `Familial : ${lib}` : lib) }; }
        cab.upsert(p2);
      }
    }
    else { const prev = readNotes(patientId); writeNotes(patientId, prev.some((n) => n.id === note.id) ? prev.map((n) => (n.id === note.id ? note : n)) : [note, ...prev]); }
    setSignee(note); clearBrouillon(patientId, noteId);
    onSaved?.(note);
    // Une note modifiée : on enregistre et on revient, sans écran de confirmation.
    if (noteId) { if (onRetour) onRetour(); else router.push(retour); }
    return envoyees;
  }, [motif, texte, transcript, local, cab, patientId, onSaved, noteId, base, chrono, onRetour, router, retour]);

  const inchangee = !!base && texte === base.texte && motif === (base.motif ?? "") && !touche && (!plan || plan.actions === base.actions);
  const enregistrer = () => {
    if (!plan) return;
    if (inchangee) { clearBrouillon(patientId, noteId); if (onRetour) onRetour(); else router.push(retour); return; }
    const gardes = plan.actions.filter((a) => a.kind !== "naviguer" && !retires.includes(a.id));
    if (gardes.length) setValideNonce((n) => n + 1); else onValide([], plan);
  };
  const nouvelle = () => { setTexte(""); setTranscript(""); setSynth({ busy: false }); setMotif(motifInitial ?? ""); setDebut(null); setChrono({ saisie: 0, composeDebut: 0, composition: 0, validation: 0 }); setEdits({}); setRetires([]); setTexteDuPlan(null); setSignee(null); setRepris(false); simPos.current = 0; setSimul("non"); composer.reset(); clearBrouillon(patientId, noteId); if (noteId) onAnnuler?.(); else ref.current?.focus(); };
  const enCours = debut !== null && !signee;
  const aValider = plan ? plan.actions.filter((a) => a.kind !== "naviguer" && !retires.includes(a.id)).length : 0;

  return (
    <div className="flex flex-col gap-4">
      {repris && !signee && <div className="flex items-center gap-2.5 rounded-[10px] bg-accent-soft-2 px-3.5 py-2.5 text-sm"><span className="h-2 w-2 shrink-0 rounded-full bg-accent" /><span className="flex-1">{noteId ? "Modification reprise là où vous l'aviez laissée" : "Consultation reprise là où vous l'aviez laissée"}{plan ? ` · ${aValider} action${aValider > 1 ? "s" : ""} à valider` : ""}.</span><button type="button" onClick={nouvelle} className="min-h-9 text-xs text-muted-2 hover:text-ink">{noteId ? "Abandonner" : "Repartir de zéro"}</button></div>}
      {signee && <div className="flex items-center gap-2.5 rounded-[10px] bg-ok-soft px-3.5 py-2.5 text-sm text-ok"><I.check size={14} w={2.5} /><span className="flex-1">{signee.modifieLe ? "Note modifiée · les documents modifiés ont été renvoyés" : `Note signée · inscrite au dossier · saisie ${fmtMs(signee.chrono.saisie)} · composition ${fmtMs(signee.chrono.composition)} · validation ${fmtMs(signee.chrono.validation)}`}</span></div>}
      {micro === "absent" && !signee && <p className="m-0 text-xs text-muted-2">La dictée au micro demande un navigateur avec reconnaissance vocale (Chrome, Edge, Safari récents) : ici, écrivez, collez la sortie d'un scribe{script ? ", ou lancez la dictée simulée" : ""}.</p>}
      <div className="flex flex-wrap items-center gap-2.5">
        <button type="button" onClick={ecouter} disabled={micro === "absent" || !!signee} title={micro === "absent" ? "Reconnaissance vocale indisponible dans ce navigateur" : micro === "erreur" ? "Micro refusé : autorisez-le dans la barre d'adresse" : "Dicter au micro"} className={cn("flex min-h-10 items-center gap-2 rounded-full border px-3.5 py-[8px] text-sm", micro === "ecoute" ? "border-rec bg-paper text-rec-text" : "border-line bg-paper text-ink hover:bg-hover", (micro === "absent" || signee) && "opacity-40")}>
          <span className={cn("h-2 w-2 rounded-full", micro === "ecoute" ? "bg-rec animate-pulse-soft" : "bg-gray-dot")} />{micro === "ecoute" ? "Écoute… arrêter" : micro === "erreur" ? "Micro refusé" : "Dicter"}
        </button>
        {script && !signee && <button type="button" onClick={simuler} className="flex min-h-10 items-center gap-2 rounded-full border border-line bg-paper px-3.5 py-[8px] text-sm text-ink hover:bg-hover"><span className={cn("h-2 w-2 rounded-full", simul === "en-cours" ? "bg-accent animate-pulse-soft" : "bg-gray-dot")} />{simul === "en-cours" ? "Pause" : simul === "pause" ? "Reprendre la dictée simulée" : simul === "fini" ? "Rejouer la dictée simulée" : "Simuler la dictée"} <Kbd>⌥ espace</Kbd></button>}
        {!signee && <button type="button" onClick={() => { setTexte((t) => (t.trim() ? t : MODELE)); ref.current?.focus(); }} className="min-h-10 rounded-full border border-line bg-paper px-3.5 py-[8px] text-sm text-ink hover:bg-hover">Structure</button>}
        <span className="flex-1" />
        <input name="locus-motif" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Motif" aria-label="Motif de consultation" readOnly={!!signee} className="min-h-10 w-full min-w-0 rounded-[8px] border border-line bg-paper px-3 py-1.5 text-base text-ink placeholder:text-muted-3 sm:w-[220px] sm:text-sm" />
        <span className={cn("d text-[11px]", enCours && "text-ink")} title="Temps de saisie, hors absences">{enCours || plan ? `⏱ ${fmtMs(chrono.saisie)}` : "⏱ 0 s"}</span>
      </div>
      {(transcript.trim() || micro === "ecoute" || simul === "en-cours") && (
        <section className={cn("flex flex-col rounded-[12px] border", micro === "ecoute" || simul === "en-cours" ? "border-rec/40 bg-paper" : "border-line-3 bg-bg")} aria-label="Transcript de la dictée">
          <div className="flex flex-wrap items-center gap-2 px-3.5 py-2">
            <button type="button" onClick={() => setTranscriptOuvert((o) => !o)} aria-expanded={transcriptOuvert || micro === "ecoute" || simul === "en-cours"} className="flex min-h-9 items-center gap-2 text-sm text-ink-2 hover:text-ink"><I.chevron open={transcriptOuvert || micro === "ecoute" || simul === "en-cours"} /> Transcript <span className="d">{transcript.trim().split(/\s+/).filter(Boolean).length} mots</span></button>
            <span className="flex-1" />
            {synth.busy && <span className="flex items-center gap-2 text-xs text-muted-2"><span className="h-2 w-2 rounded-full bg-accent animate-pulse-soft" /> Synthèse en cours…</span>}
            {!synth.busy && !signee && transcript.trim() && micro !== "ecoute" && simul !== "en-cours" && <button type="button" onClick={() => void synthetiser()} className="min-h-9 rounded-[8px] border border-line bg-paper px-3 py-1.5 text-xs text-ink hover:bg-hover">{texte.trim() ? "Régénérer la note" : "Synthétiser en note"}</button>}
          </div>
          {(transcriptOuvert || micro === "ecoute" || simul === "en-cours") && <div className="border-t border-line-4 px-3.5 py-3 text-[14px] leading-[1.6] text-ink-2"><span className="whitespace-pre-wrap">{transcript}</span>{interim && <span className="text-muted-3"> {interim}</span>}{(micro === "ecoute" || simul === "en-cours") && <span className="caret" />}</div>}
          {synth.erreur && <div className="border-t border-line-4 px-3.5 py-2 text-xs text-rec-text">{synth.erreur}</div>}
        </section>
      )}
      <div className="relative">
        <textarea ref={ref} autoComplete="off" value={texte} readOnly={!!signee} aria-label="Note de consultation" data-cmd-enter={plan && !modifiee && !signee ? "valider" : undefined} onChange={(e) => { if (e.target.value.trim()) demarre(); setTexte(e.target.value); }} placeholder={transcript.trim() ? "La note synthétique s'écrit ici. Corrigez-la, puis générez les actions." : `Dictez au micro (la note se synthétise toute seule), collez la sortie d'un scribe, ou écrivez.\n\n${MODELE}`} rows={transcript.trim() ? 7 : 12} className="w-full resize-y rounded-[14px] border border-line bg-paper px-5 py-4 text-[17px] leading-[1.75] text-ink placeholder:text-muted-3" />
        {texte.trim() && synth.via && !signee && <span className="d pointer-events-none absolute right-4 top-3 text-[10px]">note synthétisée · {synth.via === "claude" ? "Claude" : "règles"}</span>}
      </div>
      {!signee && <p className="-mt-2 text-xs text-muted-2">Patients fictifs uniquement : n&apos;utilisez pas de données réelles (nom, numéro de sécurité sociale, date de naissance).</p>}
      <div className="flex flex-wrap items-center gap-2.5">
        {!signee && noteId && <><button type="button" onClick={enregistrer} className="flex min-h-11 items-center gap-2 rounded-[10px] bg-ink px-4 py-[9px] text-sm text-paper">{inchangee ? "Retour" : "Enregistrer"} {!inchangee && <Kbd dark>⌘⏎</Kbd>}</button><button type="button" onClick={nouvelle} className="min-h-11 rounded-[10px] px-3 py-[9px] text-sm text-muted-2 hover:bg-hover hover:text-ink">Annuler</button>{modifiee && <button type="button" onClick={() => generer()} disabled={composer.state.busy} className="min-h-11 rounded-[10px] border border-line bg-paper px-3 py-[9px] text-sm text-ink hover:bg-hover disabled:opacity-40">Régénérer les actions</button>}</>}
        {!signee && !noteId && <button type="button" onClick={() => generer()} disabled={!texte.trim() || composer.state.busy} className={cn("flex min-h-11 items-center gap-2 rounded-[10px] px-4 py-[9px] text-sm disabled:opacity-40", modifiee ? "border border-accent-line bg-accent-soft-2 text-ink" : plan ? "border border-line bg-paper text-ink" : "bg-ink text-paper")}>{modifiee ? "Régénérer les actions · la note a changé" : plan ? "Régénérer les actions" : "Générer les actions"} {(!plan || modifiee) && <Kbd dark={!plan}>⌘⏎</Kbd>}</button>}
        {!signee && <div className="relative"><button type="button" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-haspopup="menu" className="min-h-11 rounded-[10px] border border-line bg-paper px-3 py-[9px] text-sm text-ink hover:bg-hover">+ Ajouter</button>{menu && <div role="menu" className="absolute bottom-full left-0 z-20 mb-1 flex min-w-[200px] flex-col rounded-[12px] border border-line bg-paper p-1" style={{ boxShadow: "var(--shadow)" }}>{AJOUTS.map((a) => <button key={a.k} type="button" role="menuitem" onClick={() => ajouter(a.k)} className="min-h-10 rounded-[8px] px-3 py-2 text-left text-sm text-ink hover:bg-hover">{a.label}</button>)}</div>}</div>}
        {signee && <button type="button" onClick={nouvelle} className="min-h-11 rounded-[10px] border border-line bg-paper px-4 py-[9px] text-sm text-ink hover:bg-hover">Nouvelle consultation</button>}
        <span className="text-xs text-muted-2">{nom}</span>
        <span className="flex-1" />
        {plan && !signee && <span className="d text-[11px]">saisie {fmtMs(chrono.saisie)} · composition {fmtMs(chrono.composition)} · validation {fmtMs(chrono.validation)}</span>}
      </div>
      {composer.open && (
        <ComposeCard key={composer.state.input ? `${texteDuPlan?.length ?? 0}-${plan ? "p" : "c"}` : "x"} state={composer.state} onClose={composer.reset} onRetry={() => generer(true)} suivreSeul={false} onValide={onValide} libelleValider="Signer" patient={pr} ouvrirId={ouvrirId} valideNonce={valideNonce} masquerValider={!!noteId}
          initialActions={{ edits, retires }} onChange={(e, r) => { setEdits(e); setRetires(r); }}
          apres={<>{onRetour ? <button type="button" onClick={onRetour} className="min-h-11 rounded-[10px] bg-ink px-4 py-[9px] text-sm text-paper">Retour au dossier</button> : <Link href={retour} className="flex min-h-11 items-center rounded-[10px] bg-ink px-4 py-[9px] text-sm text-paper hover:text-paper">Retour au dossier</Link>}<button type="button" onClick={nouvelle} className="min-h-11 rounded-[10px] border border-line bg-paper px-4 py-[9px] text-sm text-ink hover:bg-hover">Nouvelle consultation</button></>} />
      )}
    </div>
  );
}

/** Une note enregistrée, telle qu'elle s'affiche dans le dossier : ses actions s'ouvrent sur le document envoyé. */
export function NoteRow({ n, onDelete, onModifier, modifierHref, patient }: { n: NoteLocal; onDelete?: () => void; onModifier?: () => void; modifierHref?: string; patient?: PatientRendu }) {
  const [open, setOpen] = React.useState(false);
  const [doc, setDoc] = React.useState<ComposeAction | null>(null);
  const d = new Date(n.date);
  const chrono = n.chrono.saisie + n.chrono.composition + n.chrono.validation > 0 ? ` · saisie ${fmtMs(n.chrono.saisie)} · composition ${fmtMs(n.chrono.composition)} · validation ${fmtMs(n.chrono.validation)}` : "";
  return (
    <div className="card overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-hover">
        <span className="d w-[92px] shrink-0">{String(d.getDate()).padStart(2, "0")}/{String(d.getMonth() + 1).padStart(2, "0")} {String(d.getHours()).padStart(2, "0")}:{String(d.getMinutes()).padStart(2, "0")}</span>
        <span className="flex min-w-0 flex-1 flex-col"><span className="truncate text-[15px]">{n.origine === "commande" ? `Hors consultation · ${n.motif || "commande"}` : n.motif || n.synthese?.slice(0, 80) || "Consultation"}{n.modifieLe && <span className="ml-2 text-[11px] text-muted-2">modifiée le {new Date(n.modifieLe).toLocaleDateString("fr-FR")}</span>}</span><span className="truncate text-[13px] text-muted-2">{n.actions.length} action{n.actions.length > 1 ? "s" : ""}{chrono}{n.via ? ` · ${n.via}` : ""}</span></span>
        <I.chevron open={open} />
      </button>
      {open && (
        <div className="flex flex-col gap-3 border-t border-line-4 px-4 py-3">
          {n.synthese && <p className="m-0 text-sm leading-relaxed">{n.synthese}</p>}
          {n.texte && <pre className="m-0 whitespace-pre-wrap rounded-[10px] bg-bg px-3.5 py-3 font-sans text-sm leading-relaxed text-ink-2">{n.texte}</pre>}
          {n.transcript && <details className="rounded-[10px] border border-line-4 px-3.5 py-2 text-sm"><summary className="cursor-pointer text-xs text-muted-2">Transcript de la dictée · {n.transcript.trim().split(/\s+/).length} mots</summary><p className="m-0 mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-2">{n.transcript}</p></details>}
          {n.actions.length > 0 && <div className="flex flex-col gap-0.5">{n.actions.map((a) => <button key={a.id} type="button" onClick={() => setDoc(a)} className="flex min-h-11 items-center gap-3 rounded-[8px] px-2 py-1.5 text-left text-sm hover:bg-hover" title="Voir le document envoyé"><span className="d flex h-6 min-w-6 shrink-0 items-center justify-center rounded-[6px] bg-soft px-1 text-[10px] text-ink-3">{a.code}</span><span className="min-w-0 flex-1 truncate">{a.titre}</span><span className="hidden text-[11px] text-muted-2 sm:inline">{a.destination}</span>{a.renvoye && <span className="text-[11px] text-ok">renvoyé</span>}<I.chevron /></button>)}</div>}
          <div className="flex flex-wrap items-center gap-3">
            {modifierHref && <Link href={modifierHref} className="flex min-h-9 items-center rounded-[8px] border border-line bg-paper px-3 py-1.5 text-xs text-ink hover:bg-hover hover:text-ink">Modifier</Link>}
            {onModifier && !modifierHref && <button type="button" onClick={onModifier} className="min-h-9 rounded-[8px] border border-line bg-paper px-3 py-1.5 text-xs text-ink hover:bg-hover">Modifier</button>}
            {onDelete && <button type="button" onClick={() => { if (confirm(`Supprimer cette note${n.actions.length ? ` et ses ${n.actions.length} action${n.actions.length > 1 ? "s" : ""}` : ""} ? Les documents déjà envoyés ne sont pas rappelés.`)) onDelete(); }} className="min-h-9 text-xs text-muted-2 hover:text-rec-text">Supprimer</button>}
          </div>
        </div>
      )}
      {doc && <ActionPanel action={doc} patient={patient ?? { nom: "" }} onClose={() => setDoc(null)} />}
    </div>
  );
}

/** Les consultations et modifications en cours d'un patient : le rappel qui ramène à l'éditeur. */
export function BrouillonBanner({ patientId, href, onOpen, version }: { patientId: string; /** Le lien vers l'éditeur ; `?modifie=` est ajouté pour une modification. */ href: string; /** À la place d'un lien : ouvrir en place (dossier local). */ onOpen?: (b: Brouillon) => void; /** Change pour relire. */ version?: number }) {
  const [list, setList] = React.useState<Brouillon[]>([]);
  React.useEffect(() => { setList(listBrouillons(patientId)); }, [patientId, version]);
  if (!list.length) return null;
  return (
    <div className="flex flex-col gap-2">
      {list.map((b) => {
        const n = nActions(b);
        const inner = (<>
          <span className="h-2 w-2 shrink-0 rounded-full bg-accent animate-pulse-soft" />
          <span className="flex min-w-0 flex-1 flex-col"><span className="font-medium">{b.noteId ? `Modification de la note${b.noteDate ? ` du ${new Date(b.noteDate).toLocaleDateString("fr-FR")}` : ""} en cours` : b.plan ? `${n} action${n > 1 ? "s" : ""} à valider` : "Consultation en cours"}</span><span className="truncate text-[13px] text-muted-2">{b.motif ? `${b.motif} · ` : ""}{b.texte.replace(/\s+/g, " ").slice(0, 90) || "note vide"}</span></span>
          <span className="shrink-0 text-[13px]">Reprendre →</span>
        </>);
        const cls = "flex min-h-12 w-full items-center gap-3 rounded-[12px] border border-accent-line bg-accent-soft-2 px-4 py-3 text-left text-sm text-ink hover:text-ink";
        return onOpen ? <button key={b.noteId ?? "nouvelle"} type="button" onClick={() => onOpen(b)} className={cls} style={{ boxShadow: "var(--shadow-accent)" }}>{inner}</button> : <Link key={b.noteId ?? "nouvelle"} href={b.noteId ? `${href}?modifie=${b.noteId}` : href} className={cls} style={{ boxShadow: "var(--shadow-accent)" }}>{inner}</Link>;
      })}
    </div>
  );
}

/** Les notes de la session pour un patient du jeu de données (localStorage), affichées dans son dossier. */
export function NotesSession({ patientId, patient, version }: { patientId: string; patient?: PatientRendu; /** Change pour relire (après une signature sur le même écran). */ version?: number }) {
  const [notes, setNotes] = React.useState<NoteLocal[]>([]);
  React.useEffect(() => { setNotes(readNotes(patientId)); }, [patientId, version]);
  if (!notes.length) return null;
  return (
    <section className="flex flex-col gap-2">
      <span className="k px-1">Notes de la session · {notes.length}</span>
      {notes.map((n) => <NoteRow key={n.id} n={n} patient={patient} modifierHref={`/p/${patientId}/rencontre?modifie=${n.id}`} onDelete={() => { const next = notes.filter((x) => x.id !== n.id); writeNotes(patientId, next); clearBrouillon(patientId, n.id); setNotes(next); }} />)}
    </section>
  );
}

/** Sur l'accueil : les consultations laissées en cours sur ce poste, avec leurs actions à valider. */
export function BrouillonsAccueil() {
  const cab = useCabinet();
  const [list, setList] = React.useState<Brouillon[]>([]);
  React.useEffect(() => { setList(listBrouillons()); }, []);
  // Un dossier local supprimé n'a plus de consultation à reprendre.
  const rows = cab.ready ? list.filter((b) => !b.patientId.startsWith("loc_") || cab.get(b.patientId)) : list;
  if (!rows.length) return null;
  return (
    <section className="flex flex-col gap-1">
      <div className="k px-3.5 pb-2" style={{ color: "var(--accent)" }}>À valider · {rows.length}</div>
      {rows.map((b) => { const n = nActions(b); return (
        <Link key={`${b.patientId}-${b.noteId ?? ""}`} href={b.noteId && !b.patientId.startsWith("loc_") ? `${b.href}?modifie=${b.noteId}` : b.href} className="flex min-h-12 items-center gap-3 rounded-[10px] px-3.5 py-3 text-ink hover:bg-hover hover:text-ink sm:gap-4">
          <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
          <span className="min-w-0 flex-1 truncate text-[15px]">{b.nom}</span>
          <span className="truncate text-[13px] text-muted-2">{b.noteId ? "note en modification" : b.plan ? `${n} action${n > 1 ? "s" : ""} à valider` : "note en cours"}{b.motif ? ` · ${b.motif}` : ""}</span>
          <I.chevron />
        </Link>
      ); })}
    </section>
  );
}
