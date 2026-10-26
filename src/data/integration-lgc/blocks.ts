import type { AnchorId } from "./fournier";

/**
 * Le catalogue des briques Locus de MédiCab 7 (ancrages, outils, affichages)
 * et la question que chaque outil pose à core. Les libellés d'UI sont dans
 * `src/i18n/lgc.ts` ; ici, seulement les identifiants, les noms des routes
 * Studio de chaque brique et les gabarits de question, en français. Aucune sortie
 * n'est écrite ici : elles viennent toutes de core, à chaque exécution.
 */

/** Les ancrages, nommés comme des CDS Hooks (les deux derniers ne sont pas standard). */
export const HOOKS: Record<AnchorId, string> = {
  pv: "patient-view",
  ordo: "order-select",
  sign: "order-sign",
  note: "note-edit",
  lab: "lab-result",
  tb: "toolbar-button",
};

export const TOOL_IDS = ["controle", "question", "synthese", "courrier", "bio"] as const;
export type ToolId = (typeof TOOL_IDS)[number];

export type SettingDef = { k: string; kind: "toggle"; def: boolean } | { k: string; kind: "enum"; options: string[]; def: string };
export type Settings = Record<string, boolean | string>;

export const TOOLS: Record<ToolId, { api: string; settings: SettingDef[] }> = {
  controle: { api: "prescription-check", settings: [{ k: "allergies", kind: "toggle", def: true }, { k: "interactions", kind: "toggle", def: true }, { k: "niveau", kind: "enum", options: ["info", "bloquant"], def: "info" }] },
  question: { api: "clinical-question", settings: [{ k: "suggest", kind: "toggle", def: true }, { k: "court", kind: "toggle", def: true }] },
  synthese: { api: "record-summary", settings: [{ k: "longueur", kind: "enum", options: ["court", "detail"], def: "court" }, { k: "bio", kind: "toggle", def: true }] },
  courrier: { api: "referral-letter", settings: [{ k: "dest", kind: "enum", options: ["orl", "cardio"], def: "orl" }, { k: "joindre", kind: "toggle", def: false }] },
  bio: { api: "lab-interpretation", settings: [{ k: "histo", kind: "toggle", def: true }, { k: "hors", kind: "toggle", def: true }] },
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

export const DISPLAY_IDS = ["inline", "banner", "panel", "modal", "widget"] as const;
export type DisplayId = (typeof DISPLAY_IDS)[number];

/** Les gestes proposés par une sortie ; le navigateur les exécute dans MédiCab (jamais sans clic). */
export type OutAction = "ignore" | "openLetter" | "wfAction" | "cancel";

/** Une sortie de brique, telle que MédiCab l'affiche dans une carte Locus. */
export interface LocusOut {
  title: string;
  lines: string[];
  source?: string;
  /** Un champ de question à Locus, avec des questions suggérées. */
  question?: boolean;
  sugg?: string[];
  actions?: OutAction[];
  /** Libellé du geste d'un workflow (« Ajouter HbA1c à la prochaine biologie »). */
  actionLabel?: string;
  /** Le brouillon d'un courrier, ouvert par « Ouvrir le brouillon ». */
  letter?: string[];
}

/** Les questions suggérées sous le champ « Question à Locus ». */
export const SUGGESTIONS = ["Quel antibiotique si le TDR est positif ?", "Quand revoir le patient ?"];

/** La question envoyée à core pour chaque outil (gabarit), complétée par le dossier transmis. */
export function questionFor(tool: ToolId, s: Settings): string {
  switch (tool) {
    case "controle": {
      const quoi = [s.allergies && "les allergies", s.interactions && "les interactions avec le traitement de fond"].filter(Boolean).join(" et ") || "la posologie";
      return `Cette prescription est-elle sûre pour ce patient ? Vérifie ${quoi}, et propose une alternative si besoin.`;
    }
    case "synthese":
      return `${s.longueur === "detail" ? "Résume ce dossier en un paragraphe pour le médecin traitant." : "Résume ce dossier en trois lignes pour le médecin traitant."} ${s.bio ? "Inclus la dernière biologie." : "Laisse la biologie de côté."}`;
    case "courrier":
      return `Rédige un courrier d'adressage court vers ${s.dest === "cardio" ? "un cardiologue" : "un ORL"} pour ce patient.${s.joindre ? " Cite la dernière biologie dans le courrier." : ""}`;
    case "bio": {
      const plus = [s.histo && "Compare aux dosages précédents.", s.hors && "Signale les valeurs hors normes."].filter(Boolean).join(" ");
      return `Interprète la dernière biologie de ce patient au regard de son traitement et de ses antécédents.${plus ? ` ${plus}` : ""}`;
    }
    case "question":
      return "";
  }
}
