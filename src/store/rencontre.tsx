"use client";
import * as React from "react";

/** L'état des rencontres de la session : réponses aux questions, signature, carte de résultat ouverte. */
export interface RencontreState { answers: Record<string, string>; signed?: boolean; cmd?: string | null; cmdQuestion?: string | null }
type State = Record<string, RencontreState>;
type Action = { type: "answer"; patientId: string; questionId: string; optionId: string } | { type: "sign"; patientId: string } | { type: "cmd"; patientId: string; cmd: string | null; question?: string | null } | { type: "hydrate"; state: State } | { type: "reset" };

function reducer(s: State, a: Action): State {
  const cur = (id: string): RencontreState => s[id] ?? { answers: {} };
  switch (a.type) {
    case "answer": return { ...s, [a.patientId]: { ...cur(a.patientId), answers: { ...cur(a.patientId).answers, [a.questionId]: a.optionId } } };
    case "sign": return { ...s, [a.patientId]: { ...cur(a.patientId), signed: true } };
    case "cmd": return { ...s, [a.patientId]: { ...cur(a.patientId), cmd: a.cmd, cmdQuestion: a.question ?? null } };
    case "hydrate": return a.state;
    case "reset": return {};
  }
}

const Ctx = React.createContext<{ state: State; dispatch: React.Dispatch<Action> } | null>(null);
const KEY = "locus-studio-rencontres-v1";

export function RencontreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(reducer, {});
  const hydrated = React.useRef(false);
  React.useEffect(() => { try { const raw = localStorage.getItem(KEY); if (raw) dispatch({ type: "hydrate", state: JSON.parse(raw) }); } catch {} hydrated.current = true; }, []);
  React.useEffect(() => { if (!hydrated.current) return; try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} }, [state]);
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useRencontre(patientId: string) {
  const c = React.useContext(Ctx);
  if (!c) throw new Error("useRencontre hors RencontreProvider");
  return { ...c, me: c.state[patientId] ?? { answers: {} } };
}
