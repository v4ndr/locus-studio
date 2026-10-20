import { dossier, type AnchorId } from "./fournier";

/**
 * Le catalogue des briques Locus de MédiCab 7 (ancrages, outils, affichages)
 * et leurs sorties en scénario rejoué pour M. Fournier. Les libellés d'UI
 * sont dans `src/i18n/lgc.ts` ; ici, seulement les identifiants, les noms
 * de l'API Briques (aperçu) et le contenu clinique, en français.
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
export const DISPLAY_API: Record<DisplayId, string> = { inline: "inline-card", banner: "banner", panel: "side-panel", modal: "modal", widget: "widget" };

/** Les gestes proposés par une sortie ; le navigateur les exécute dans MédiCab (jamais sans clic). */
export type OutAction = "ignore" | "replace" | "openLetter" | "wfAction" | "cancel";

/** Une sortie de brique, telle que MédiCab l'affiche dans une carte Locus. */
export interface LocusOut {
  title: string;
  lines: string[];
  alts?: { name: string; note: string }[];
  source?: string;
  /** Un champ de question à Locus, avec des questions suggérées. */
  question?: boolean;
  sugg?: string[];
  actions?: OutAction[];
  /** Libellé du geste d'un workflow (« Ajouter HbA1c à la prochaine biologie »). */
  actionLabel?: string;
  /** Le brouillon d'un courrier, ouvert par « Ouvrir le brouillon ». */
  letter?: string[];
  /** La réponse demande un accès (question libre en scénario rejoué). */
  locked?: boolean;
}

export const SOURCES = {
  angine: "HAS · angine à streptocoque A",
  diabete: "HAS · diabète de type 2",
  hta: "HAS · HTA de l'adulte",
  dossier: "Dossier MédiCab 7",
};

/** Les questions suggérées sous le champ « Question à Locus ». */
export const SUGGESTIONS = ["Quel antibiotique si le TDR est positif ?", "Quand revoir le patient ?"];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Réponse rejouée à une question posée à Locus sur ce dossier, ou `locked` si elle n'est pas prévue. */
export function replayAnswer(question: string, court = true): LocusOut {
  const q = norm(question);
  if (/antibio|tdr|angine|antibiotic/.test(q)) {
    const lines = ["Allergie à la pénicilline sans signe de gravité : céfuroxime-axétil 250 mg matin et soir, 4 jours.", "Si contre-indication à toutes les bêta-lactamines : azithromycine 500 mg/j, 3 jours."];
    if (!court) lines.push("TDR négatif : pas d'antibiotique, traitement symptomatique.");
    return { title: question, lines, source: SOURCES.angine };
  }
  if (/revoir|reconsult|suivi|follow|see .*again|when/.test(q)) {
    const lines = ["Pas de contrôle systématique si l'évolution est favorable.", "À revoir si la fièvre persiste après 3 jours de traitement, ou en cas d'aggravation."];
    if (!court) lines.push("HbA1c au-dessus de la cible en mai 2026 : prévoir le prochain dosage.");
    return { title: question, lines, source: SOURCES.angine };
  }
  if (/hba1c|glyc|diab/.test(q)) {
    return { title: question, lines: ["Dernière HbA1c 7,6 % (12/05/2026), au-dessus de la cible ≤ 7 %.", "En hausse depuis 7,1 % (10/12/2025). Dernier dosage il y a 5 mois."], source: SOURCES.diabete };
  }
  return { title: question, lines: [], locked: true };
}

/**
 * La sortie d'un outil en scénario rejoué, pour M. Fournier. Le contenu
 * suit les réglages, comme le ferait l'appel en direct.
 */
export function replayOutput(tool: ToolId, s: Settings): LocusOut {
  const d = dossier();
  switch (tool) {
    case "controle": {
      if (!s.allergies) return { title: "Rien à signaler", lines: s.interactions ? ["Aucune interaction avec le traitement de fond."] : ["Contrôle des allergies désactivé."] };
      const lines = ["Urticaire en 2019. Amoxicilline contre-indiquée."];
      if (s.interactions) lines.push("Alternatives sans interaction avec le traitement de fond.");
      if (s.niveau === "bloquant") lines.push("Validation bloquée tant que l'alerte est ouverte.");
      return {
        title: "Allergie à la pénicilline notée au dossier",
        lines,
        alts: [
          { name: "Céfuroxime-axétil 250 mg ×2/j, 4 jours", note: "Allergie sans signe de gravité" },
          { name: "Azithromycine 500 mg/j, 3 jours", note: "Si contre-indication à toutes les bêta-lactamines" },
        ],
        source: SOURCES.angine,
        actions: ["ignore", "replace"],
      };
    }
    case "question":
      return { title: "Question à Locus", lines: [], question: true, sugg: s.suggest ? SUGGESTIONS : [] };
    case "synthese": {
      const l = ["Homme de 58 ans, HTA (amlodipine 5 mg, ramipril 5 mg) et diabète de type 2 sous metformine.", "Allergie à la pénicilline (urticaire, 2019)."];
      if (s.longueur === "detail") { l.push("Aujourd'hui : mal de gorge fébrile à 38,6 °C, TDR à faire."); l.push("Dernier renouvellement HTA le 12/03/2026."); }
      if (s.bio) l.push("HbA1c 7,6 % (12/05/2026). Créatinine 98 µmol/L, DFG 72 (18/06/2025).");
      return { title: "Synthèse du dossier", lines: l, source: SOURCES.dossier, question: true, sugg: SUGGESTIONS };
    }
    case "courrier": {
      const orl = s.dest !== "cardio";
      const lc = [`Destinataire : ${orl ? "ORL" : "cardiologue"}. Une page, à relire avant envoi.`];
      if (s.joindre) lc.push("Biologie du 18/06/2025 jointe.");
      const letter = [
        "Cher confrère,",
        orl
          ? "Je vous adresse M. Gilles Fournier, 58 ans, pour avis : angine fébrile (38,6 °C) avec exsudat amygdalien et adénopathies cervicales, TDR en cours."
          : "Je vous adresse M. Gilles Fournier, 58 ans, pour avis : HTA traitée depuis 2016 (TA 138/86 ce jour) chez un patient diabétique de type 2.",
        `Antécédents : ${d.antecedents.map((a) => `${a.libelle === "HTA" ? "HTA" : a.libelle.toLowerCase()} (${a.annee})`).join(", ")}.`,
        "Allergie : pénicilline (urticaire, 2019).",
        "Traitement : amlodipine 5 mg/j, ramipril 5 mg/j, metformine 1000 mg matin et soir.",
        ...(s.joindre ? ["Biologie du 18/06/2025 : créatinine 98 µmol/L, DFG 72, kaliémie 4,3 mmol/L."] : []),
        "Je vous remercie de votre avis. Bien confraternellement,",
        "Dr A. Leclerc",
      ];
      return { title: "Courrier d'adressage prêt", lines: lc, letter, actions: ["openLetter"] };
    }
    case "bio": {
      const lb = ["Créatinine 98 µmol/L, DFG 72."];
      if (s.histo) lb.push("95 µmol/L en septembre 2024 : stable.");
      if (s.hors) lb.push("Aucune valeur hors normes.");
      lb.push("Sous IEC : créatinine et kaliémie au moins une fois par an.");
      return { title: "Fonction rénale stable", lines: lb, source: SOURCES.hta };
    }
  }
}

/** La question envoyée à core pour chaque outil (gabarit), complétée par le dossier transmis. */
export function questionFor(tool: ToolId, s: Settings): string {
  switch (tool) {
    case "controle": {
      const quoi = [s.allergies && "les allergies", s.interactions && "les interactions avec le traitement de fond"].filter(Boolean).join(" et ") || "la posologie";
      return `Cette prescription est-elle sûre pour ce patient ? Vérifie ${quoi}, et propose une alternative si besoin.`;
    }
    case "synthese":
      return s.longueur === "detail" ? "Résume ce dossier en un paragraphe pour le médecin traitant." : "Résume ce dossier en trois lignes pour le médecin traitant.";
    case "courrier":
      return `Rédige un courrier d'adressage court vers ${s.dest === "cardio" ? "un cardiologue" : "un ORL"} pour ce patient.`;
    case "bio":
      return "Interprète la dernière biologie de ce patient au regard de son traitement et de ses antécédents.";
    case "question":
      return "";
  }
}
