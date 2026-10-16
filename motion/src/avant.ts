import type { EcranAvant, Story } from "./story";

/*
 * Le scénario du LGC d'aujourd'hui, réduit à une suite d'événements datés
 * (clics et saisies), à partir des écrans de la story. Le compteur, le
 * curseur et l'état de chaque champ se lisent dans ce scénario : rien n'est
 * calé à la main.
 */

/** La saisie est montrée accélérée (×2 environ) : un bon dactylo tape 8 à 10 caractères par seconde. */
export const CPS = 20;
/** Un clic : le curseur voyage, puis clique. */
export const CLIC = 11;
/** Effacer une saisie qui n'a rien donné : ⌘A puis ⌫. */
const EFFACE = 8;
/** La liste de résultats s'ouvre, on la lit. */
const LECTURE = 6;
/** Un aperçu de document ouvert, puis celui qu'on cherchait. */
const APERCU = 16;
const APERCU_FIN = 40;
/** Une alerte qui bloque se lit. */
export const LECTURE_ALERTE = 40;
/** Une page de portail se lit avant d'y cliquer. */
const LECTURE_PAGE = 30;
/** Le temps de lecture d'une alerte : longue si elle bloque ou si elle explique un indicateur. */
export const lectureAlerte = (e: EcranAvant) => (e.alerte?.grave || e.indicateurs ? LECTURE_ALERTE : 8);
/** Entre deux écrans. */
const ENTRE = 10;

export type Cible =
  | { k: "menu" }
  | { k: "sousMenu" }
  | { k: "champ"; j: number }
  | { k: "option"; j: number }
  | { k: "alerte" }
  | { k: "ligne"; i: number }
  | { k: "carte"; i: number }
  | { k: "indicateur"; i: number }
  | { k: "bouton"; b: number };

export type Evt =
  | { t: "clic"; at: number; cible: Cible }
  | { t: "saisie"; j: number; texte: string; from: number; to: number; efface?: number }
  | { t: "defile"; i: number; from: number; to: number };

export type Scenario = { evts: Evt[]; debut: number; fin: number };

const dureeSaisie = (s: string) => Math.ceil((s.length / CPS) * 30) + 3;

/** Les événements d'un écran à partir de `t0`. */
export function scenarioEcran(e: EcranAvant, t0: number): Scenario {
  const evts: Evt[] = [];
  let t = t0;
  const clic = (cible: Cible) => { t += CLIC; evts.push({ t: "clic", at: t, cible }); };
  if (e.menu) {
    clic({ k: "menu" });
    clic({ k: "sousMenu" });
  }
  t += 6;
  if (e.defile) {
    let avant = 0;
    e.defile.ouvre.forEach(({ i }, n) => {
      const from = t;
      t += Math.max(10, Math.abs(i - avant) * 2);
      evts.push({ t: "defile", i, from, to: t });
      clic({ k: "ligne", i });
      t += n === e.defile!.ouvre.length - 1 ? APERCU_FIN : APERCU;
      avant = i;
    });
  }
  if (e.cartes) { t += LECTURE_PAGE; clic({ k: "carte", i: e.cartes.choix }); }
  if (e.indicateurs) { t += LECTURE_PAGE; clic({ k: "indicateur", i: e.indicateurs.choix }); }
  e.champs.forEach((c, j) => {
    clic({ k: "champ", j });
    (c.saisies ?? []).forEach((s, i, all) => {
      const from = t + 2;
      t = from + dureeSaisie(s);
      const dernier = i === all.length - 1;
      evts.push({ t: "saisie", j, texte: s, from, to: t, efface: dernier ? undefined : t + LECTURE + EFFACE });
      if (!dernier) t += LECTURE + EFFACE;
    });
    if (c.options) { t += LECTURE; clic({ k: "option", j }); }
  });
  if (e.alerte) { t += lectureAlerte(e); clic({ k: "alerte" }); }
  e.boutons.forEach((_, b) => clic({ k: "bouton", b }));
  return { evts, debut: t0, fin: t + 6 };
}

/** Tous les écrans, à la suite. */
export function scenario(s: Story, t0: number): Scenario[] {
  const out: Scenario[] = [];
  let t = t0;
  for (const e of s.avant) { const sc = scenarioEcran(e, t); out.push(sc); t = sc.fin + ENTRE; }
  return out;
}

export const dureeAvant = (s: Story) => { if (!s.avant.length) return 0; const sc = scenario(s, 0); return sc[sc.length - 1].fin + 16; };

/** Les clics et les frappes à l'instant `f`. Une saisie effacée compte ⌘A et ⌫. */
export function compteurs(scs: Scenario[], f: number) {
  let clics = 0;
  let frappes = 0;
  for (const sc of scs) for (const ev of sc.evts) {
    if (ev.t === "clic") { if (f >= ev.at) clics++; continue; }
    if (ev.t !== "saisie") continue;
    if (f >= ev.from) frappes += Math.min(ev.texte.length, Math.floor(((f - ev.from) / 30) * CPS));
    if (ev.efface !== undefined && f >= ev.efface) frappes += 2;
  }
  return { clics, frappes };
}

export const totalClics = (s: Story) => compteurs(scenario(s, 0), Infinity).clics;
export const totalFrappes = (s: Story) => compteurs(scenario(s, 0), Infinity).frappes;

/** Une durée en secondes, écrite « 1 min 30 » ou « 45 s ». */
export const duree = (n: number) => { const m = Math.floor(n / 60); const r = Math.round(n % 60); return m ? `${m} min${r ? ` ${String(r).padStart(2, "0")}` : ""}` : `${r} s`; };
