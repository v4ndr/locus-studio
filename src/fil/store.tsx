"use client";
import * as React from "react";
import type { FilEntry, Scene, Consigne, SessionEtat } from "./types";
import type { Proposal } from "@/domain/types";

/**
 * L'état de l'écran unique : le fil (entrées ajoutées pendant la session),
 * la scène ouverte, le patient en focus, les consignes, les brouillons
 * corrigés. Persisté en localStorage : on ferme, on rouvre, le fil est là.
 */
export interface FilState {
  entries: FilEntry[];
  scene: Scene;
  focus?: string;
  consignes: Consigne[];
  drafts: Record<string, Proposal>;
  solStopped: boolean;
  demoSoir: boolean;
}

type Action =
  | { type: "add"; entry: FilEntry }
  | { type: "session"; id: string; etat: SessionEtat; titre?: string }
  | { type: "scene"; scene: Scene }
  | { type: "focus"; patientId?: string }
  | { type: "consigne"; consigne: Consigne }
  | { type: "draft"; proposal: Proposal }
  | { type: "stop"; value: boolean }
  | { type: "demoSoir" }
  | { type: "reset" }
  | { type: "hydrate"; state: Partial<FilState> };

const initial: FilState = { entries: [], scene: { type: "vide" }, consignes: [], drafts: {}, solStopped: false, demoSoir: false };

function reducer(s: FilState, a: Action): FilState {
  switch (a.type) {
    case "add": {
      const i = s.entries.findIndex((e) => e.id === a.entry.id);
      if (i < 0) return { ...s, entries: [...s.entries, a.entry] };
      /* Un segment de consultation se complète tour par tour : on remplace, en gardant l'heure. */
      if (a.entry.who === "consult") return { ...s, entries: s.entries.map((e, j) => (j === i ? { ...a.entry, at: e.at } : e)) };
      return s;
    }
    case "session": return { ...s, entries: s.entries.map((e) => (e.id === a.id ? { ...e, session: { ...(e.session ?? { etat: "en-cours" }), etat: a.etat }, titre: a.titre ?? e.titre } : e)) };
    case "scene": return { ...s, scene: a.scene };
    case "focus": return { ...s, focus: a.patientId };
    case "consigne": return { ...s, consignes: [...s.consignes, a.consigne] };
    case "draft": return { ...s, drafts: { ...s.drafts, [a.proposal.id]: a.proposal } };
    case "stop": return { ...s, solStopped: a.value };
    case "demoSoir": return { ...s, demoSoir: true };
    case "reset": return initial;
    case "hydrate": return { ...s, ...a.state, scene: a.state.scene ?? s.scene };
  }
}

const Ctx = React.createContext<{ state: FilState; dispatch: React.Dispatch<Action> } | null>(null);
const KEY = "locus-studio-fil-v1";

export function FilProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, initial);
  const hydrated = React.useRef(false);
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<FilState>;
        /* Une scène Locus en cours de flux ne se rejoue pas ; on rouvre sur le vide. */
        if (saved.scene?.type === "locus") saved.scene = { type: "vide" };
        dispatch({ type: "hydrate", state: saved });
      }
    } catch {}
    hydrated.current = true;
  }, []);
  React.useEffect(() => {
    if (!hydrated.current) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }, [state]);
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useFil() {
  const c = React.useContext(Ctx);
  if (!c) throw new Error("useFil hors FilProvider");
  return c;
}
