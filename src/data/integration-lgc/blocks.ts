import { dossier, type AnchorId, type FieldKey } from "./fournier";

/**
 * Le catalogue des briques Locus de MédiCab 7 (ancrages, outils, affichages)
 * et ce que chaque outil demande. Les libellés d'UI sont dans
 * `src/i18n/lgc.ts` ; ici, seulement les identifiants, les noms de l'API
 * Briques (aperçu) et les gabarits de question, en français.
 *
 * Trois outils, retenus parce qu'ils répondent juste à chaque fois sur le
 * dossier fictif ; chacun a son chemin :
 * - `controle` et `question` interrogent core (`/v2/retrieve`) : une
 *   question clinique, une réponse appuyée sur les recommandations, et
 *   seulement les sources que la réponse cite ;
 * - `synthese` n'interroge pas core : c'est le dossier transmis remis en
 *   lignes, sans recommandation, donc sans source.
 * Chaque outil n'est proposé qu'aux ancrages et affichages où il a un sens.
 */

/** Les ancrages, nommés comme des CDS Hooks (le dernier n'est pas standard). */
export const HOOKS: Record<AnchorId, string> = {
  pv: "patient-view",
  ordo: "order-select",
  note: "note-edit",
  tb: "toolbar-button",
};

export const TOOL_IDS = ["controle", "question", "synthese"] as const;
export type ToolId = (typeof TOOL_IDS)[number];

export type SettingDef = { k: string; kind: "toggle"; def: boolean } | { k: string; kind: "enum"; options: string[]; def: string };
export type Settings = Record<string, boolean | string>;

export const DISPLAY_IDS = ["inline", "banner", "panel", "modal", "widget"] as const;
export type DisplayId = (typeof DISPLAY_IDS)[number];
export const DISPLAY_API: Record<DisplayId, string> = { inline: "inline-card", banner: "banner", panel: "side-panel", modal: "modal", widget: "widget" };

export interface ToolDef {
  api: string;
  settings: SettingDef[];
  /** Où l'outil peut se poser, et sous quelle forme. */
  anchors: AnchorId[];
  displays: DisplayId[];
  /** Les données sans lesquelles l'outil n'a rien à dire : toujours transmises. */
  required: FieldKey[];
  /** `core` : une question à core ; `dossier` : le dossier transmis, sans appel. */
  path: "core" | "dossier";
}

export const TOOLS: Record<ToolId, ToolDef> = {
  controle: { api: "prescription-check", settings: [{ k: "niveau", kind: "enum", options: ["info", "bloquant"], def: "info" }], anchors: ["ordo"], displays: ["inline", "banner", "modal"], required: ["ligne"], path: "core" },
  question: { api: "clinical-question", settings: [{ k: "suggest", kind: "toggle", def: true }, { k: "court", kind: "toggle", def: true }], anchors: ["note", "pv", "tb"], displays: ["inline", "panel", "widget"], required: [], path: "core" },
  synthese: { api: "record-summary", settings: [], anchors: ["pv", "tb"], displays: ["widget", "panel", "inline"], required: [], path: "dossier" },
};

export const isToolId = (v: unknown): v is ToolId => typeof v === "string" && (TOOL_IDS as readonly string[]).includes(v);
export const toolByApi = (api: string): ToolId | undefined => TOOL_IDS.find((t) => TOOLS[t].api === api);

export function defaultSettings(t: ToolId): Settings {
  const o: Settings = {};
  for (const s of TOOLS[t].settings) o[s.k] = s.def;
  return o;
}

/** Garde les réglages connus de l'outil, avec leur type ; le reste prend la valeur par défaut. */
export function cleanSettings(t: ToolId, raw: unknown): Settings {
  const o = defaultSettings(t);
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  for (const s of TOOLS[t].settings) {
    const v = r[s.k];
    if (s.kind === "toggle" && typeof v === "boolean") o[s.k] = v;
    if (s.kind === "enum" && typeof v === "string" && s.options.includes(v)) o[s.k] = v;
  }
  return o;
}

/** Les gestes proposés par une sortie ; le navigateur les exécute dans MédiCab (jamais sans clic). */
export type OutAction = "ignore";

/** Une sortie de brique, telle que MédiCab l'affiche dans une carte Locus. */
export interface LocusOut {
  title: string;
  lines: string[];
  /** Les documents que la réponse cite, et eux seuls. Jamais pour une synthèse. */
  sources?: string[];
  /** La sortie vient du dossier transmis, sans appel à core (synthèse). */
  fromRecord?: boolean;
  /** Contrôle d'ordonnance : vrai quand la réponse signale un problème. */
  alert?: boolean;
  /** Un champ de question à Locus, avec des questions suggérées. */
  question?: boolean;
  sugg?: string[];
  actions?: OutAction[];
}

/** Les questions suggérées sous le champ « Question à Locus » : elles collent à la consultation du jour (angine, allergie à la pénicilline). */
export const SUGGESTIONS = ["Quel antibiotique si le TDR est positif ?", "Quand revoir le patient ?"];

/**
 * La question du contrôle d'ordonnance. Les lignes prescrites sont dans la
 * question elle-même (core cherche les recommandations à partir d'elle), et
 * de nouveau dans `patient_ehr` avec le reste du dossier transmis.
 */
export function questionControle(): string {
  const lignes = dossier().ordonnance.map((o) => `${o.med.toLowerCase()} (${o.posologie}, ${o.duree})`).join(" et ");
  return `Ordonnance envisagée : ${lignes}. Est-elle sûre pour ce patient, au vu de ses allergies, de son traitement en cours et de sa fonction rénale ? Si une ligne pose problème, dis laquelle et propose une alternative.`;
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Le verdict d'un contrôle d'ordonnance, lu dans la réponse courte de core.
 * Rassurant seulement quand la réponse le dit sans réserve ; dans le doute,
 * c'est une alerte : une alerte de trop s'écarte d'un clic (ou d'un motif),
 * une alerte manquée ne se rattrape pas.
 */
export function controleAlerte(short: string, answer: string): boolean {
  const s = norm(short || answer.split("\n")[0] || "");
  const alerte = /contre-indiqu|a eviter|ne pas (prescrire|utiliser|associer)|remplacer|allergi|interaction (majeure|a risque|deconseillee)|deconseill|risque|adapter|reduire|precaution/;
  const rassure = /^(oui\b|aucun(e)? (contre-indication|interaction|probleme|alerte)|pas de (contre-indication|probleme|interaction)|prescription (sure|adaptee|conforme))/;
  if (rassure.test(s) && !alerte.test(s.replace(/^(aucun(e)?|pas de) (contre-indication|interaction|probleme|alerte)/, ""))) return false;
  return true;
}
