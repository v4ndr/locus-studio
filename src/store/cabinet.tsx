"use client";
import * as React from "react";
import { NOW_ISO } from "@/data/clock";
import type { ComposePlan, ComposeAction } from "@/locus/compose/contract";

/**
 * Le cabinet local : les patients créés sans carte Vitale et leurs notes,
 * tenus dans le navigateur (localStorage), exportables en JSON. C'est le
 * « vrai CRUD » du studio pour une journée de test en conditions réelles —
 * sans base ni compte : ce qui est saisi reste sur le poste.
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
  /** Le chrono : saisie, composition, validation — en millisecondes. */
  chrono: { saisie: number; composition: number; validation: number };
}

interface State { patients: Record<string, PatientLocal> }
type Action =
  | { type: "hydrate"; state: State }
  | { type: "upsert"; patient: PatientLocal }
  | { type: "delete"; id: string }
  | { type: "note"; patientId: string; note: NoteLocal }
  | { type: "deleteNote"; patientId: string; noteId: string }
  | { type: "import"; state: State };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "hydrate": case "import": return a.state;
    case "upsert": return { patients: { ...s.patients, [a.patient.id]: a.patient } };
    case "delete": { const p = { ...s.patients }; delete p[a.id]; return { patients: p }; }
    case "note": { const p = s.patients[a.patientId]; if (!p) return s; const notes = p.notes.some((n) => n.id === a.note.id) ? p.notes.map((n) => (n.id === a.note.id ? a.note : n)) : [a.note, ...p.notes]; return { patients: { ...s.patients, [a.patientId]: { ...p, notes, modifieLe: new Date().toISOString() } } }; }
    case "deleteNote": { const p = s.patients[a.patientId]; if (!p) return s; return { patients: { ...s.patients, [a.patientId]: { ...p, notes: p.notes.filter((n) => n.id !== a.noteId) } } }; }
  }
}

const Ctx = React.createContext<{ state: State; dispatch: React.Dispatch<Action>; ready: boolean } | null>(null);
const KEY = "locus-studio-cabinet-v1";

export function CabinetProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, { patients: {} });
  const [ready, setReady] = React.useState(false);
  const hydrated = React.useRef(false);
  React.useEffect(() => { try { const raw = localStorage.getItem(KEY); if (raw) dispatch({ type: "hydrate", state: JSON.parse(raw) }); } catch {} hydrated.current = true; setReady(true); }, []);
  React.useEffect(() => { if (!hydrated.current) return; try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} }, [state]);
  return <Ctx.Provider value={{ state, dispatch, ready }}>{children}</Ctx.Provider>;
}

export function useCabinet() {
  const c = React.useContext(Ctx);
  if (!c) throw new Error("useCabinet hors CabinetProvider");
  const list = React.useMemo(() => Object.values(c.state.patients).sort((a, b) => b.modifieLe.localeCompare(a.modifieLe)), [c.state.patients]);
  return {
    ready: c.ready,
    patients: list,
    get: (id: string) => c.state.patients[id],
    upsert: (p: PatientLocal) => c.dispatch({ type: "upsert", patient: { ...p, modifieLe: new Date().toISOString() } }),
    remove: (id: string) => c.dispatch({ type: "delete", id }),
    saveNote: (patientId: string, note: NoteLocal) => c.dispatch({ type: "note", patientId, note }),
    removeNote: (patientId: string, noteId: string) => c.dispatch({ type: "deleteNote", patientId, noteId }),
    exportJson: () => JSON.stringify({ exporteLe: new Date().toISOString(), horloge: NOW_ISO, ...c.state }, null, 2),
    importJson: (raw: string) => { const j = JSON.parse(raw) as Partial<State>; if (j && j.patients) c.dispatch({ type: "import", state: { patients: { ...c.state.patients, ...j.patients } } }); },
  };
}

export const nid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Le patient local vu par le composer : ce que le serveur reçoit avec la demande (il n'a pas de base). */
export function patientPayload(p: PatientLocal) {
  return { id: p.id, nomUsage: p.nomUsage, prenomUsuel: p.prenomUsuel, naissance: p.naissance, sexe: p.sexe, profession: p.profession, antecedents: p.antecedents, allergies: p.allergies, traitements: p.traitements, notes: p.notes.slice(0, 5).map((n) => ({ date: n.date, motif: n.motif, synthese: n.synthese ?? n.texte.slice(0, 300) })) };
}
export type PatientPayload = ReturnType<typeof patientPayload>;

export function ageDe(naissance: string, now = new Date()) {
  const d = new Date(naissance);
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}
