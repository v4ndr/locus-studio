import type { Dict } from "./config";

/**
 * Zone LGC natif IA (`/[lang]/lgc-natif`) : le Studio historique. Seuls les
 * libellés de coque passent ici ; le contenu clinique reste en français.
 */
const fr = {
  meta: { title: "LGC natif IA", description: "Un dossier patient pensé dès le départ avec Locus." },
  back: "Retour",
  backHome: "Retour à l'accueil du LGC",
  replay: "scénario rejoué",
  noRealData: "Patients fictifs uniquement : n'utilisez pas de données réelles (nom, numéro de sécurité sociale, date de naissance).",
};

const en: typeof fr = {
  meta: { title: "AI-native EHR", description: "A patient record designed with Locus from the start." },
  back: "Back",
  backHome: "Back to the EHR home",
  replay: "replayed scenario",
  noRealData: "Fictional patients only: do not enter real data (name, social security number, date of birth).",
};

export const studio: Dict<typeof fr> = { fr, en };
export type StudioDict = typeof fr;
