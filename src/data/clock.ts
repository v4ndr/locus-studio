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

/** Le décalage de Paris ce jour-là : +02:00 l'été, +01:00 l'hiver (le 25/10/2026 est dans l'horizon du studio). */
export function offsetParis(ymd: string): string {
  const probe = new Date(`${ymd}T12:00:00Z`);
  const v = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", timeZoneName: "longOffset" }).formatToParts(probe).find((p) => p.type === "timeZoneName")?.value ?? "UTC+01:00";
  const m = /([+-])(\d{2}):?(\d{2})?/.exec(v);
  return m ? `${m[1]}${m[2]}:${m[3] ?? "00"}` : "+01:00";
}

/** Aujourd'hui (ou à N jours) à HH:MM heure de Paris, en ISO avec le bon décalage. */
export function at(hhmm: string, offsetDays = 0): string {
  const d = day(offsetDays);
  return `${d}T${hhmm}:00${offsetParis(d)}`;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}
