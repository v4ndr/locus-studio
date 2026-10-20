import type { Dict } from "./config";

/** Zone accès (`/[lang]/acces`) : demande d'accès et connexion. Rempli par la PR « Accès ». */
const fr = {
  meta: { title: "Demander un accès", description: "Accès live au sandbox Locus, sur invitation." },
  title: "Demander un accès",
};

const en: typeof fr = {
  meta: { title: "Request access", description: "Live access to the Locus sandbox, by invitation." },
  title: "Request access",
};

export const acces: Dict<typeof fr> = { fr, en };
export type AccesDict = typeof fr;
