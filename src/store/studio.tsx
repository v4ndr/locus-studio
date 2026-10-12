"use client";
import * as React from "react";
import type { Proposal } from "@/domain/types";

/**
 * L'état client du studio : les décisions prises sur les propositions pendant
 * la session (validées, rejetées), les éléments « vus », et les compteurs
 * qui en découlent. Le jeu de données est immuable côté serveur ; ce qui
 * change pendant la démo vit ici, et survit au rechargement (localStorage).
 */
export interface Decision {
  etat: Proposal["etat"];
  le: string;
  commentaire?: string;
}

interface State {
  decisions: Record<string, Decision>;
  vus: Record<string, string>;
  autonomie: Record<string, 0 | 1 | 2>;
  /** Propositions créées pendant la session (ex. depuis une réponse Locus). */
  propositions: Proposal[];
}

type Action =
  | { type: "decide"; id: string; etat: Proposal["etat"]; commentaire?: string }
  | { type: "vu"; id: string }
  | { type: "autonomie"; action: string; niveau: 0 | 1 | 2 }
  | { type: "ajouter"; proposal: Proposal }
  | { type: "reset" }
  | { type: "hydrate"; state: State };

const initial: State = { decisions: {}, vus: {}, autonomie: {}, propositions: [] };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "decide":
      return { ...s, decisions: { ...s.decisions, [a.id]: { etat: a.etat, le: new Date().toISOString(), commentaire: a.commentaire } } };
    case "vu":
      return { ...s, vus: { ...s.vus, [a.id]: new Date().toISOString() } };
    case "autonomie":
      return { ...s, autonomie: { ...s.autonomie, [a.action]: a.niveau } };
    case "ajouter":
      return { ...s, propositions: [a.proposal, ...s.propositions] };
    case "reset":
      return initial;
    case "hydrate":
      return a.state;
  }
}

interface Ctx {
  state: State;
  dispatch: React.Dispatch<Action>;
  etatDe: (p: Proposal) => Proposal["etat"];
  estVu: (id: string) => boolean;
  counts: { inbox: number; proposals: number };
  setCounts: (c: { inbox: number; proposals: number }) => void;
}

const StudioContext = React.createContext<Ctx | null>(null);
const KEY = "locus-studio-state-v1";

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, initial);
  const [counts, setCounts] = React.useState({ inbox: 0, proposals: 0 });
  const hydrated = React.useRef(false);
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) dispatch({ type: "hydrate", state: { ...initial, ...JSON.parse(raw) } });
    } catch {}
    hydrated.current = true;
  }, []);
  React.useEffect(() => {
    if (!hydrated.current) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }, [state]);
  const etatDe = React.useCallback((p: Proposal) => state.decisions[p.id]?.etat ?? p.etat, [state.decisions]);
  const estVu = React.useCallback((id: string) => !!state.vus[id], [state.vus]);
  const value = React.useMemo(() => ({ state, dispatch, etatDe, estVu, counts, setCounts }), [state, etatDe, estVu, counts]);
  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio(): Ctx {
  const ctx = React.useContext(StudioContext);
  if (!ctx) throw new Error("useStudio hors StudioProvider");
  return ctx;
}

/** Pose les compteurs de la barre latérale depuis une page qui les connaît. */
export function useSetCounts(inbox: number, proposalsCount: number) {
  const { setCounts, state } = useStudio();
  React.useEffect(() => {
    setCounts({ inbox, proposals: proposalsCount });
  }, [inbox, proposalsCount, setCounts, state.decisions, state.vus]);
}
