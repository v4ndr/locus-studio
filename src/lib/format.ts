import { now } from "@/data/clock";

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

/* Le cabinet est à Lyon ; le serveur de rendu, lui, est n'importe où (UTC
   sur Vercel). Toutes les dates sont donc lues en Europe/Paris, explicitement. */
const TZ = "Europe/Paris";
const PARTS = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", weekday: "short", hour12: false });

interface P { y: number; m: number; d: number; h: number; min: number; wd: number }
function parts(iso: string): P {
  const d = iso.length <= 10 ? new Date(iso + "T12:00:00+02:00") : new Date(iso);
  const map: Record<string, string> = {};
  for (const x of PARTS.formatToParts(d)) map[x.type] = x.value;
  const wd = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."].indexOf(map.weekday);
  return { y: Number(map.year), m: Number(map.month) - 1, d: Number(map.day), h: Number(map.hour) % 24, min: Number(map.minute), wd: wd < 0 ? 0 : wd };
}

export function fmtDate(iso: string): string {
  const p = parts(iso);
  return `${p.d} ${MOIS[p.m]} ${p.y}`;
}

export function fmtDateShort(iso: string): string {
  const p = parts(iso);
  return `${p.d} ${MOIS[p.m]}`;
}

export function fmtTime(iso: string): string {
  const p = parts(iso);
  return `${String(p.h).padStart(2, "0")}:${String(p.min).padStart(2, "0")}`;
}

export function fmtLong(iso: string): string {
  const p = parts(iso);
  return `${JOURS[p.wd]} ${p.d} ${MOIS[p.m]} ${p.y}`;
}

/** « il y a 3 j », « hier 21:40 », « 07:30 » — relatif à l'horloge du studio. */
export function fmtRelative(iso: string): string {
  const ref = now();
  const d = new Date(iso);
  const diffMs = ref.getTime() - d.getTime();
  const days = Math.floor((startOfDay(ref) - startOfDay(d)) / 86_400_000);
  if (days <= 0) return diffMs < 3_600_000 ? `il y a ${Math.max(1, Math.round(diffMs / 60_000))} min` : fmtTime(iso);
  if (days === 1) return `hier ${fmtTime(iso)}`;
  if (days < 7) return `il y a ${days} j`;
  if (days < 60) return `il y a ${Math.round(days / 7)} sem.`;
  if (days < 365) return `il y a ${Math.round(days / 30)} mois`;
  const y = Math.floor(days / 365);
  return `il y a ${y} an${y > 1 ? "s" : ""}`;
}

export function fmtDue(iso: string): string {
  const days = Math.round((startOfDay(new Date(iso)) - startOfDay(now())) / 86_400_000);
  if (days === 0) return "aujourd'hui";
  if (days < 0) return `en retard de ${-days} j`;
  if (days < 30) return `dans ${days} j`;
  return `dans ${Math.round(days / 30)} mois`;
}

function startOfDay(d: Date): number {
  const p = parts(d.toISOString());
  return Date.UTC(p.y, p.m, p.d);
}

export function fmtEuro(n: number): string {
  return `${n.toFixed(n % 1 ? 2 : 0).replace(".", ",")} €`;
}

export function initials(prenom: string, nom: string): string {
  return `${prenom[0] ?? ""}${nom[0] ?? ""}`.toUpperCase();
}
