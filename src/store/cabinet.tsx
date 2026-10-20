"use client";
import * as React from "react";
import { NOW_ISO } from "@/data/clock";
import type { ComposePlan, ComposeAction } from "@/locus/compose/contract";

/**
 * Le cabinet local : les patients créés sans carte Vitale et leurs notes,
 * tenus dans le navigateur (localStorage), exportables en JSON. C'est le
 * « vrai CRUD » du studio pour une journée de test en conditions réelles —
 * sans base ni compte : ce qui est saisi reste sur le poste.
 *
 * Deux onglets ouverts se tiennent au courant (événement `storage`) ; une
 * donnée illisible est ignorée plutôt que de casser l'écran ; une écriture
 * refusée (quota) est signalée au lieu d'être perdue en silence.
 */

export interface PatientLocal {
  id: string; // loc_…
  nomUsage: string;
  prenomUsuel: string;
  naissance: string; // YYYY-MM-DD
  sexe: "F" | "M";
  telephone?: string;
  profession?: string;
  situation?: string;
  /** Lignes libres : une par antécédent / allergie / traitement. */
  antecedents: string[];
  allergies: string[];
  traitements: string[];
  notes: NoteLocal[];
  creeLe: string;
  modifieLe: string;
}

export interface NoteLocal {
  id: string;
  date: string;
  motif?: string;
  texte: string;
  /** Le plan composé et validé (les actions gardées). */
  actions: ComposeAction[];
  synthese?: string;
  via?: ComposePlan["via"];
  /** Modifiée en place après signature : les documents modifiés ont été renvoyés. */
  modifieLe?: string;
  /** « commande » : validée depuis ⌘K, hors consultation ; sinon une consultation. */
  origine?: "consultation" | "commande";
  /** Le transcript brut de la dictée, quand la note en est la synthèse. */
  transcript?: string;
}

interface State { patients: Record<string, PatientLocal> }
type Action =
  | { type: "hydrate"; state: State }
  | { type: "upsert"; patient: PatientLocal }
  | { type: "delete"; id: string }
  | { type: "note"; patientId: string; note: NoteLocal }
  | { type: "deleteNote"; patientId: string; noteId: string }
  | { type: "import"; state: State };

const INITIAL: State = { patients: {} };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "hydrate": case "import": return a.state;
    case "upsert": return { patients: { ...s.patients, [a.patient.id]: a.patient } };
    case "delete": { const p = { ...s.patients }; delete p[a.id]; return { patients: p }; }
    case "note": { const p = s.patients[a.patientId]; if (!p) return s; const notes = p.notes.some((n) => n.id === a.note.id) ? p.notes.map((n) => (n.id === a.note.id ? a.note : n)) : [a.note, ...p.notes]; return { patients: { ...s.patients, [a.patientId]: { ...p, notes, modifieLe: new Date().toISOString() } } }; }
    case "deleteNote": { const p = s.patients[a.patientId]; if (!p) return s; return { patients: { ...s.patients, [a.patientId]: { ...p, notes: p.notes.filter((n) => n.id !== a.noteId), modifieLe: new Date().toISOString() } } }; }
  }
}

/* ---------- Lecture défensive : ce qui vient du disque ou d'un fichier n'est jamais cru sur parole. ---------- */
const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);
const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean) : []);
function sanitizeNote(v: unknown): NoteLocal | null {
  if (!v || typeof v !== "object") return null;
  const n = v as Record<string, unknown>;
  if (!str(n.id) || !str(n.date)) return null;
  return { id: str(n.id), date: str(n.date), motif: str(n.motif) || undefined, texte: str(n.texte), actions: Array.isArray(n.actions) ? (n.actions as ComposeAction[]).filter((a) => a && typeof a === "object" && typeof a.id === "string") : [], synthese: str(n.synthese) || undefined, via: n.via === "simulation" ? "simulation" : typeof n.via === "string" && n.via ? "live" : undefined, modifieLe: str(n.modifieLe) || undefined, origine: n.origine === "commande" ? "commande" : undefined, transcript: str(n.transcript) || undefined };
}
export function sanitizePatient(v: unknown): PatientLocal | null {
  if (!v || typeof v !== "object") return null;
  const p = v as Record<string, unknown>;
  const id = str(p.id);
  if (!id.startsWith("loc_") || !str(p.nomUsage) || !str(p.prenomUsuel) || !/^\d{4}-\d{2}-\d{2}$/.test(str(p.naissance))) return null;
  const now = new Date().toISOString();
  return { id, nomUsage: str(p.nomUsage), prenomUsuel: str(p.prenomUsuel), naissance: str(p.naissance), sexe: p.sexe === "M" ? "M" : "F", telephone: str(p.telephone) || undefined, profession: str(p.profession) || undefined, situation: str(p.situation) || undefined, antecedents: arr(p.antecedents), allergies: arr(p.allergies), traitements: arr(p.traitements), notes: Array.isArray(p.notes) ? p.notes.map(sanitizeNote).filter((n): n is NoteLocal => !!n) : [], creeLe: str(p.creeLe) || now, modifieLe: str(p.modifieLe) || now };
}
/** Un état lisible depuis n'importe quoi : les dossiers valides sont gardés, le reste est compté. */
export function sanitizeState(v: unknown): { state: State; ignores: number } {
  const out: State = { patients: {} }; let ignores = 0;
  const src = v && typeof v === "object" && (v as { patients?: unknown }).patients && typeof (v as { patients?: unknown }).patients === "object" ? (v as { patients: Record<string, unknown> }).patients : null;
  if (!src) return { state: out, ignores: v ? 1 : 0 };
  for (const raw of Object.values(src)) { const p = sanitizePatient(raw); if (p) out.patients[p.id] = p; else ignores++; }
  return { state: out, ignores };
}

const Ctx = React.createContext<{ state: State; dispatch: React.Dispatch<Action>; ready: boolean; persistError: string | null } | null>(null);
const KEY = "locus-studio-cabinet-v1";
const BROUILLON_PREFIX = "locus-studio-brouillon-";

function lire(): State | null {
  try { const raw = localStorage.getItem(KEY); if (!raw) return null; return sanitizeState(JSON.parse(raw)).state; } catch { return null; }
}

export function CabinetProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, INITIAL);
  const [ready, setReady] = React.useState(false);
  const [persistError, setPersistError] = React.useState<string | null>(null);
  const hydrated = React.useRef(false);
  const dernierEcrit = React.useRef<string | null>(null);
  React.useEffect(() => {
    const s = lire(); if (s) dispatch({ type: "hydrate", state: s });
    hydrated.current = true; setReady(true);
    // Un autre onglet a écrit : on relit, pour ne pas écraser son travail au prochain geste.
    const onStorage = (e: StorageEvent) => { if (e.key === KEY && e.newValue && e.newValue !== dernierEcrit.current) { const n = lire(); if (n) dispatch({ type: "hydrate", state: n }); } };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  React.useEffect(() => {
    // Jamais l'état initial vide : il effacerait le cabinet avant que l'hydratation ne soit rendue.
    if (!hydrated.current || state === INITIAL) return;
    try { const raw = JSON.stringify(state); localStorage.setItem(KEY, raw); dernierEcrit.current = raw; setPersistError(null); }
    catch (e) { setPersistError(e instanceof Error && /quota/i.test(e.name + e.message) ? "Le navigateur refuse d'enregistrer (espace plein) : exportez le cabinet maintenant, puis libérez de la place." : "Impossible d'enregistrer sur ce poste : exportez le cabinet maintenant."); }
  }, [state]);
  return <Ctx.Provider value={{ state, dispatch, ready, persistError }}>{children}</Ctx.Provider>;
}

/** Efface tous les brouillons d'un patient (consultation en cours et modifications de notes). */
export function purgeBrouillons(patientId: string, noteId?: string) {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith(`${BROUILLON_PREFIX}${patientId}`) && (!noteId || k.endsWith(`-mod-${noteId}`))) keys.push(k); }
    keys.forEach((k) => localStorage.removeItem(k));
    if (!noteId) localStorage.removeItem(`locus-studio-notes-${patientId}`);
  } catch {}
}

export function useCabinet() {
  const c = React.useContext(Ctx);
  if (!c) throw new Error("useCabinet hors CabinetProvider");
  const list = React.useMemo(() => Object.values(c.state.patients).sort((a, b) => b.modifieLe.localeCompare(a.modifieLe)), [c.state.patients]);
  return {
    ready: c.ready,
    persistError: c.persistError,
    patients: list,
    get: (id: string) => c.state.patients[id],
    /** Un dossier qui a déjà la même identité (nom, prénom, naissance), pour éviter le doublon. */
    homonyme: (nom: string, prenom: string, naissance: string, saufId?: string) => { const k = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, ""); return list.find((p) => p.id !== saufId && k(p.nomUsage) === k(nom) && k(p.prenomUsuel) === k(prenom) && p.naissance === naissance); },
    upsert: (p: PatientLocal) => c.dispatch({ type: "upsert", patient: { ...p, modifieLe: new Date().toISOString() } }),
    remove: (id: string) => { purgeBrouillons(id); c.dispatch({ type: "delete", id }); },
    saveNote: (patientId: string, note: NoteLocal) => c.dispatch({ type: "note", patientId, note }),
    removeNote: (patientId: string, noteId: string) => { purgeBrouillons(patientId, noteId); c.dispatch({ type: "deleteNote", patientId, noteId }); },
    exportJson: () => JSON.stringify({ exporteLe: new Date().toISOString(), horloge: NOW_ISO, ...c.state }, null, 2),
    /** Importe un export : les dossiers du fichier rejoignent le cabinet ; un dossier déjà présent n'est remplacé que si le fichier est plus récent. */
    importJson: (raw: string): { importes: number; misAJour: number; conserves: number; ignores: number } => {
      const { state: j, ignores } = sanitizeState(JSON.parse(raw));
      let importes = 0, misAJour = 0, conserves = 0;
      const patients = { ...c.state.patients };
      for (const p of Object.values(j.patients)) {
        const cur = patients[p.id];
        if (!cur) { patients[p.id] = p; importes++; }
        else if (p.modifieLe > cur.modifieLe) { patients[p.id] = p; misAJour++; }
        else conserves++;
      }
      if (importes || misAJour) c.dispatch({ type: "import", state: { patients } });
      return { importes, misAJour, conserves, ignores };
    },
  };
}

export const nid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Le patient local vu par le composer : ce que le serveur reçoit avec la demande (il n'a pas de base). */
export function patientPayload(p: PatientLocal) {
  return { id: p.id, nomUsage: p.nomUsage, prenomUsuel: p.prenomUsuel, naissance: p.naissance, sexe: p.sexe, profession: p.profession, antecedents: p.antecedents, allergies: p.allergies, traitements: p.traitements, notes: p.notes.slice(0, 5).map((n) => ({ date: n.date, motif: n.motif, synthese: n.synthese ?? n.texte.slice(0, 300) })) };
}
export type PatientPayload = ReturnType<typeof patientPayload>;

/** L'âge en années révolues, sur des dates calendaires (pas d'heure, pas de fuseau : le jour de l'anniversaire compte à minuit). */
export function ageDe(naissance: string, now = new Date()) {
  const [y, m, d] = naissance.slice(0, 10).split("-").map(Number);
  const ny = now.getFullYear(), nm = now.getMonth() + 1, nd = now.getDate();
  let age = ny - y;
  if (nm < m || (nm === m && nd < d)) age--;
  return Number.isFinite(age) ? age : 0;
}
