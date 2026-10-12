/**
 * L'horloge du studio. Le produit parle des usages de demain, mais vit aujourd'hui : « aujourd'hui » est un jeudi
 * fixe pour que le jeu de données soit stable (échéances, « il y a 3 jours »).
 */
export const NOW_ISO = "2026-10-15T08:05:00+02:00";
export const TODAY = "2026-10-15";

export function now(): Date {
  return new Date(NOW_ISO);
}

/** Une date ISO (jour) à N jours d'aujourd'hui (négatif = passé). */
export function day(offset: number): string {
  const d = now();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

/** Aujourd'hui à HH:MM, en ISO avec fuseau Paris. */
export function at(hhmm: string, offsetDays = 0): string {
  return `${day(offsetDays)}T${hhmm}:00+02:00`;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}
