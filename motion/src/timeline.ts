import { Easing, interpolate, spring } from "remotion";
import { FPS } from "./theme";

/**
 * Le découpage du motion, en frames (30 i/s). Chaque temps du récit a sa
 * fenêtre : pour décaler un passage, on touche ici, pas dans les composants.
 *
 *   hook    la rencontre : qui entre, ce qu'il dit
 *   plan    ce que le médecin sait déjà devoir faire
 *   avant   le LGC d'aujourd'hui : les clics, pendant que le patient parle
 *   apres   Locus Studio : la note, l'agent, la signature
 *   compare 25 clics contre 8 secondes
 *   outro   le message, la marque
 */
export const T = {
  hook: { from: 0, to: 165 },
  plan: { from: 165, to: 285 },
  avant: { from: 285, to: 615 },
  apres: { from: 615, to: 1035 },
  compare: { from: 1035, to: 1155 },
  outro: { from: 1155, to: 1320 },
} as const;

export const DURATION = T.outro.to;

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 0 → 1 entre deux frames, lissé. */
export const ramp = (
  f: number,
  a: number,
  b: number,
  easing: (t: number) => number = Easing.bezier(0.65, 0, 0.35, 1),
) => interpolate(f, [a, b], [0, 1], { ...clamp, easing });

/** Un ressort qui démarre à `at`. */
export const pop = (f: number, at: number, config?: Parameters<typeof spring>[0]["config"]) =>
  spring({ frame: f - at, fps: FPS, config: { damping: 14, stiffness: 140, mass: 0.9, ...config } });

/** Entrée puis sortie : 0 → 1 → 0. */
export const inOut = (f: number, a: number, b: number, c: number, d: number) =>
  Math.min(ramp(f, a, b), 1 - ramp(f, c, d));

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Le texte tapé à `cps` caractères par seconde depuis `at`. */
export const typed = (s: string, f: number, at: number, cps = 40) =>
  s.slice(0, Math.max(0, Math.floor(((f - at) / FPS) * cps)));
