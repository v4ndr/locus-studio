import { Easing, interpolate, spring } from "remotion";
import { dureeAvant } from "./avant";
import type { Story } from "./story";
import { FPS } from "./theme";

/**
 * Le découpage du motion, en frames (30 i/s). Chaque temps du récit a sa
 * fenêtre : pour décaler un passage, on touche ici, pas dans les composants.
 * La fenêtre « avant » dure ce que dure le scénario du LGC (`avant.ts`).
 *
 *   hook    la rencontre : qui entre, ce qu'il dit
 *   plan    ce que le médecin a déjà décidé
 *   avant   le LGC d'aujourd'hui : menus, clics, saisie, pendant que le patient parle
 *   apres   Locus Studio : la note, l'agent, le carrousel de relecture, la validation
 *   compare 25 clics contre 8 secondes
 *   outro   le message, la marque
 */
export const timeline = (s: Story) => {
  const hook = { from: 0, to: 165 };
  const plan = { from: hook.to, to: hook.to + 135 };
  const avant = { from: plan.to, to: plan.to + dureeAvant(s) };
  const apres = { from: avant.to, to: avant.to + 105 + s.secondes * FPS + 75 };
  const compare = { from: apres.to, to: apres.to + 130 };
  const outro = { from: compare.to, to: compare.to + 165 };
  return { hook, plan, avant, apres, compare, outro, duree: outro.to };
};

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
