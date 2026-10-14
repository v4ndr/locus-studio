import { Easing, interpolate } from "remotion";
import { clamp } from "../timeline";

export type Clic = { x: number; y: number; at: number };

/**
 * Le curseur entre des clics : il part de `depart`, rejoint chaque cible juste
 * avant son clic, s'enfonce, et l'onde part au moment du clic.
 */
export function suivre(f: number, depart: { x: number; y: number }, clics: Clic[]) {
  let from = { ...depart, at: clics.length ? clics[0].at - 24 : 0 };
  let pos = { x: depart.x, y: depart.y };
  for (const c of clics) {
    if (f <= c.at) {
      const debut = Math.max(from.at + 3, c.at - 20);
      const t = interpolate(f, [debut, c.at - 4], [0, 1], { ...clamp, easing: Easing.bezier(0.45, 0, 0.2, 1) });
      pos = { x: from.x + (c.x - from.x) * t, y: from.y + (c.y - from.y) * t };
      break;
    }
    pos = { x: c.x, y: c.y };
    from = c;
  }
  const press = Math.max(0, ...clics.map((c) => 1 - Math.abs(f - c.at) / 4));
  const last = [...clics].reverse().find((c) => f >= c.at);
  const ripple = last ? interpolate(f, [last.at, last.at + 14], [0, 1], clamp) : 0;
  const n = clics.filter((c) => f >= c.at).length;
  return { ...pos, press, ripple, n };
}
