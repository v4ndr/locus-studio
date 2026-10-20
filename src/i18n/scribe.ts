import type { Dict } from "./config";

/** Zone scribe + aide à la décision (`/[lang]/scribe`). Rempli par la PR « Scribe ». */
const fr = {
  meta: { title: "Scribe + aide à la décision", description: "La consultation dictée devient synthèse, puis recommandations." },
};

const en: typeof fr = {
  meta: { title: "Scribe to decision support", description: "A dictated visit becomes a summary, then recommendations." },
};

export const scribe: Dict<typeof fr> = { fr, en };
export type ScribeDict = typeof fr;
