import { dossier, frDate, moisDepuis, type Bio, type Variante } from "./fournier";
import type { LocusOut } from "./blocks";

/**
 * Les briques en workflow : une consigne en langage naturel, structurée en
 * une chaîne d'étapes liées, puis exécutée sur le dossier fictif.
 *
 * - Condition et Extraire : déterministes sur le dossier ;
 * - Question Locus : core, à chaque exécution (aucune réponse écrite d'avance) ;
 * - Calcul : déterministe local (aucune unité logique de core ne couvre
 *   l'écart d'HbA1c à la cible) ;
 * - Action dans le LGC : un brouillon, jamais exécuté sans clic ;
 * - Sortie : la phrase affichée dans MédiCab, avec son geste.
 *
 * Une condition fausse arrête la chaîne : les étapes suivantes ne tournent pas.
 */

export const STEP_TYPES = ["condition", "extract", "locus_question", "compute", "ehr_action", "output"] as const;
export type StepType = (typeof STEP_TYPES)[number];
/** Les types qu'on peut insérer avec « + » (la sortie est toujours la dernière étape). */
export const INSERTABLE: StepType[] = ["condition", "extract", "locus_question", "compute", "ehr_action"];

export interface WfStep {
  type: StepType;
  /** La consigne de l'étape, éditable. */
  config: string;
  /** Pour une sortie : le geste proposé dans le LGC. */
  action?: string;
}

export interface StepResult {
  status: "done" | "stopped" | "skipped";
  value: string;
  source?: string;
  action?: string;
}

export interface RunResult {
  steps: StepResult[];
  halted: boolean;
  output: LocusOut | null;
}

export const MAX_STEPS = 8;

/** Le workflow de la maquette : la dernière HbA1c si le patient est diabétique, comparée à la cible. */
export const WF_EXAMPLE = {
  fr: "Donne-moi la dernière HbA1c si le patient est diabétique, et dis-moi si elle est à la cible.",
  en: "Give me the latest HbA1c if the patient is diabetic, and tell me whether it is on target.",
};

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Valide et borne un plan reçu du navigateur. */
export function cleanSteps(raw: unknown): WfStep[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_STEPS) return null;
  const out: WfStep[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") return null;
    const { type, config, action } = r as Record<string, unknown>;
    if (typeof type !== "string" || !(STEP_TYPES as readonly string[]).includes(type)) return null;
    if (typeof config !== "string") return null;
    out.push({ type: type as StepType, config: config.slice(0, 200), ...(typeof action === "string" && action ? { action: action.slice(0, 120) } : {}) });
  }
  return out;
}

const pct = (n: number) => `${n.toFixed(1).replace(".", ",")} %`;
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const moisAnnee = (iso: string) => `${MOIS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

interface Ctx {
  hba1c?: Bio;
  cible?: number;
  ecart?: number;
  mois?: number;
  values: string[];
  source?: string;
  draft?: string;
}

/** Une question Locus, relayée vers core. Lève une erreur quand core ne répond pas : la chaîne s'arrête là. */
export type LocusAsk = (question: string) => Promise<{ value: string; source?: string }>;

function condition(cfg: string, v: Variante, ctx: Ctx): { ok: boolean; value: string } {
  const d = dossier(v);
  const q = norm(cfg);
  const num = Number((/(\d+(?:[.,]\d+)?)/.exec(q)?.[1] ?? "").replace(",", "."));
  const moins = /<|inf|moins|below|under|less/.test(q);
  if (/hba1c|glyc/.test(q) && ctx.hba1c) {
    const seuil = Number.isFinite(num) && num > 0 ? num : ctx.cible;
    if (seuil === undefined) return { ok: true, value: "Seuil d'HbA1c non précisé : condition considérée comme remplie" };
    const ok = moins ? ctx.hba1c.valeur < seuil : ctx.hba1c.valeur > seuil;
    return { ok, value: `${ok ? "Oui" : "Non"} : HbA1c ${ctx.hba1c.affichage} (seuil ${pct(seuil)})` };
  }
  if (/diab/.test(q)) {
    const a = d.antecedents.find((x) => /diab/i.test(x.libelle));
    return a ? { ok: true, value: `Oui : diabète de type 2 depuis ${a.annee}` } : { ok: false, value: "Non : aucun diabète dans les antécédents" };
  }
  if (/hta|hypertens/.test(q)) {
    const a = d.antecedents.find((x) => x.libelle === "HTA");
    return a ? { ok: true, value: `Oui : HTA depuis ${a.annee}` } : { ok: false, value: "Non : pas d'HTA au dossier" };
  }
  if (/allerg/.test(q)) {
    const a = d.allergies[0];
    return a ? { ok: true, value: `Oui : ${a.substance.toLowerCase()} (${a.reaction}, ${a.annee})` } : { ok: false, value: "Non : aucune allergie connue" };
  }
  if (/dfg|egfr|clairance|renal|rein|kidney/.test(q)) {
    const seuil = Number.isFinite(num) && num > 0 ? num : 60;
    const dfg = d.biologie.find((b) => b.libelle.startsWith("DFG"))!;
    const ok = moins ? dfg.valeur < seuil : dfg.valeur >= seuil;
    return { ok, value: `${ok ? "Oui" : "Non"} : DFG ${dfg.affichage} mL/min/1,73 m² (${frDate(dfg.date)})` };
  }
  if (/(\d+)\s*(ans|years)/.test(q)) {
    const ok = moins ? d.age < num : d.age > num;
    return { ok, value: `${ok ? "Oui" : "Non"} : ${d.age} ans` };
  }
  return { ok: true, value: "Condition non reconnue sur ce dossier : considérée comme remplie" };
}

function extract(cfg: string, v: Variante, ctx: Ctx): string {
  const d = dossier(v);
  const q = norm(cfg);
  if (/hba1c|glyc/.test(q)) {
    const all = d.biologie.filter((b) => b.libelle === "HbA1c").sort((a, b) => b.date.localeCompare(a.date));
    if (!all.length) return "Aucune HbA1c au dossier";
    ctx.hba1c = all[0];
    ctx.mois = moisDepuis(all[0].date);
    if (/deux|2 dern|histor|toutes|evolution|trend|all|both/.test(q)) return all.map((b) => `${b.affichage} le ${frDate(b.date)}`).join(", ");
    return `${all[0].affichage} le ${frDate(all[0].date)} (il y a ${ctx.mois} mois)`;
  }
  const bio = (re: RegExp) => d.biologie.find((b) => re.test(norm(b.libelle)));
  if (/creat/.test(q)) { const b = bio(/creat/)!; return `${b.affichage} le ${frDate(b.date)}`; }
  if (/dfg|egfr|clairance/.test(q)) { const b = bio(/dfg/)!; return `${b.affichage} mL/min/1,73 m² le ${frDate(b.date)}`; }
  if (/kali|potass/.test(q)) { const b = bio(/kali/)!; return `${b.affichage} le ${frDate(b.date)}`; }
  if (/ordonnance|prescri|ligne/.test(q)) return d.ordonnance.map((o) => `${o.med}, ${o.posologie}, ${o.duree}`).join(" ; ");
  if (/traitement|medic|treatment|drug/.test(q)) return d.traitement.join(" ; ");
  if (/allerg/.test(q)) return d.allergies.map((a) => `${a.substance} (${a.reaction}, ${a.annee})`).join(", ");
  if (/antecedent|atcd|histor/.test(q)) return d.antecedents.map((a) => `${a.libelle} (${a.annee})`).join(", ");
  if (/poids|weight/.test(q)) return "84 kg le 20/10/2026";
  if (/tension|\bta\b|pression|blood pressure/.test(q)) return "138/86 mmHg le 20/10/2026";
  if (/\bage\b|âge/.test(q)) return `${d.age} ans`;
  if (/donnees|data|dossier|record/.test(q)) return `${d.sexe}, ${d.age} ans ; ${d.antecedents.map((a) => a.libelle).join(", ")} ; allergie à la pénicilline`;
  return "Donnée introuvable dans le dossier";
}

/** La cible d'HbA1c lue dans la réponse de core (« ≤ 7 % »), quand la question la demandait. */
function cibleLue(cfg: string, value: string): number | undefined {
  if (!/cible|target|objectif|goal/.test(norm(cfg))) return undefined;
  const m = /(\d+(?:[.,]\d+)?)\s*%/.exec(value);
  const n = m ? Number(m[1].replace(",", ".")) : NaN;
  return n > 4 && n < 12 ? n : undefined;
}

function compute(cfg: string, v: Variante, ctx: Ctx): string {
  const q = norm(cfg);
  const parts: string[] = [];
  if (/ecart|gap|diff|distance/.test(q) && ctx.hba1c && ctx.cible === undefined) parts.push("cible inconnue : écart non calculé");
  else if (/ecart|gap|diff|distance/.test(q) && ctx.hba1c && ctx.cible !== undefined) {
    const cible = ctx.cible;
    ctx.ecart = Math.round((ctx.hba1c.valeur - cible) * 10) / 10;
    parts.push(`${ctx.ecart > 0 ? "+" : ""}${ctx.ecart.toFixed(1).replace(".", ",")} point`);
  }
  if (/delai|depuis|since|mois|month|interval|time/.test(q) && ctx.hba1c) {
    ctx.mois = moisDepuis(ctx.hba1c.date);
    parts.push(`dernier dosage il y a ${ctx.mois} mois`);
  }
  if (!parts.length && /dfg|clairance|ckd|cockcroft/.test(q)) {
    const dfg = dossier(v).biologie.find((b) => b.libelle.startsWith("DFG"));
    parts.push(dfg ? `DFG ${dfg.affichage} mL/min/1,73 m² (CKD-EPI, ${frDate(dfg.date)})` : "DFG absent du dossier");
  }
  if (!parts.length && /imc|bmi/.test(q)) parts.push("Taille absente du dossier : IMC non calculable");
  if (!parts.length) return ctx.hba1c ? "Calcul non reconnu : précisez l'écart ou le délai" : "Calcul non reconnu sur ce dossier";
  return parts.join(" ; ");
}

function output(step: WfStep, ctx: Ctx, conditionned: boolean): { text: string; out: LocusOut } {
  let title = "Réponse Locus";
  let text: string;
  let action = step.action || ctx.draft;
  if (ctx.hba1c && ctx.cible !== undefined) {
    const above = ctx.hba1c.valeur > ctx.cible;
    title = above ? "HbA1c au-dessus de la cible" : "HbA1c à la cible";
    text = `HbA1c ${ctx.hba1c.affichage} (${moisAnnee(ctx.hba1c.date)}), ${above ? "au-dessus de la" : "dans la"} cible ≤ ${ctx.cible} %.${ctx.mois !== undefined ? ` Dernier dosage il y a ${ctx.mois} mois.` : ""}`;
    if (!above && !step.action) action = ctx.draft;
  } else {
    text = ctx.values.filter(Boolean).slice(-2).join(". ") || "Rien à afficher.";
  }
  const lines = [text];
  if (!conditionned) lines.push("Sans condition : s'affiche pour tous les patients.");
  return { text, out: { title, lines, source: ctx.source, ...(action ? { actions: ["wfAction"], actionLabel: action } : {}) } };
}

/**
 * Exécute la chaîne pas à pas sur le dossier fictif. `ask` relaie chaque
 * Question Locus vers core ; s'il lève une erreur, elle remonte telle
 * quelle : pas de réponse de remplacement.
 */
export async function runSteps(steps: WfStep[], v: Variante, ask: LocusAsk): Promise<RunResult> {
  const ctx: Ctx = { values: [] };
  const res: StepResult[] = [];
  let halted = false;
  let out: LocusOut | null = null;
  const conditionned = steps[0]?.type === "condition";
  for (const step of steps) {
    if (halted) { res.push({ status: "skipped", value: "Non exécutée" }); continue; }
    switch (step.type) {
      case "condition": {
        const c = condition(step.config, v, ctx);
        if (!c.ok) { halted = true; res.push({ status: "stopped", value: `${c.value}. Arrêt : condition non remplie` }); }
        else res.push({ status: "done", value: c.value });
        break;
      }
      case "extract": {
        const value = extract(step.config, v, ctx);
        ctx.values.push(value);
        res.push({ status: "done", value });
        break;
      }
      case "locus_question": {
        const r = await ask(step.config);
        if (r.source) ctx.source = r.source;
        const cible = cibleLue(step.config, r.value);
        if (cible !== undefined) ctx.cible = cible;
        ctx.values.push(r.value);
        res.push({ status: "done", value: r.value, source: r.source });
        break;
      }
      case "compute": {
        const value = compute(step.config, v, ctx);
        ctx.values.push(value);
        res.push({ status: "done", value });
        break;
      }
      case "ehr_action": {
        ctx.draft = step.config;
        res.push({ status: "done", value: `Brouillon dans MédiCab, à valider : ${step.config}`, action: step.config });
        break;
      }
      case "output": {
        const o = output(step, ctx, conditionned);
        out = o.out;
        res.push({ status: "done", value: o.text, action: o.out.actionLabel });
        break;
      }
    }
  }
  if (!halted && !out) out = output({ type: "output", config: "" }, ctx, conditionned).out;
  return { steps: res, halted, output: halted ? null : out };
}

