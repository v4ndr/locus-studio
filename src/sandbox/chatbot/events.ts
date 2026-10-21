/** Les lignes NDJSON que les routes `/api/chatbot/*` envoient au navigateur. */

export interface ChatSource { n: number; label: string; url?: string }

export interface FormQuestion {
  i: number;
  question: string;
  options: { v: string; label: string }[];
  multiple: boolean;
  skip: string;
  /** La question n'a de sens que si la question `i` a reçu l'une de ces options. */
  dependsOn?: { i: number; values: string[] };
}

export type ChatEvent =
  /** Le serveur ne fait pas de live ici : le navigateur rejoue le scénario s'il en a un. */
  | { t: "replay" }
  | { t: "step"; text: string }
  | { t: "delta"; text: string }
  | { t: "form"; token: string; questions: FormQuestion[] }
  | { t: "answer"; markdown: string; sources: ChatSource[] }
  | { t: "error"; detail: string; code?: string };

export interface FormAnswer { i: number; values: string[]; skipped?: boolean }
