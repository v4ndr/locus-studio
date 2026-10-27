/** Les lignes NDJSON que les routes `/api/chatbot/*` envoient au navigateur. */

/** La nature d'une source : recommandation, tableau, extrait, rubrique de RCP, médicament, score ou arbre. */
export type SourceKind = "doc" | "table" | "chunk" | "rcp" | "drug" | "score" | "tree";

export interface ChatSource {
  n: number;
  label: string;
  url?: string;
  kind?: SourceKind;
  /** L'éditeur (HAS, ANSM, RecoMédicales…), tel que core le nomme. */
  publisher?: string;
  /** Une ligne de plus : l'année, le document d'un tableau, les rubriques d'un RCP, la conclusion d'un arbre. */
  detail?: string;
  /** Cité dans le texte (renvoi `[n]`) ; sinon retenu par ce qui est cité. */
  cited?: boolean;
}

/** Le degré de confiance : le cran (1 à 5) et les quatre marches de l'escalier, franchies ou non. Libellés dans l'i18n. */
export interface Confiance { level: number; ok: boolean[] }

export interface FormQuestion {
  i: number;
  question: string;
  options: { v: string; label: string }[];
  multiple: boolean;
  skip: string;
  /** La question n'a de sens que si l'une de ces branches est prise : la question `i` a reçu l'une des `values`. */
  dependsOn?: { i: number; values: string[] }[];
}

export type ChatEvent =
  | { t: "step"; text: string }
  | { t: "delta"; text: string }
  | { t: "form"; token: string; questions: FormQuestion[] }
  | { t: "answer"; markdown: string; sources: ChatSource[]; confidence?: Confiance; conditional?: string[] }
  | { t: "error"; detail: string; code?: string };

export interface FormAnswer { i: number; values: string[]; skipped?: boolean }
