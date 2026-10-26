/**
 * Les réglages du chatbot traduits en paramètres de `POST /v2/retrieve/stream`.
 * Partagé : le serveur s'en sert pour appeler core, le panneau « Appel API »
 * pour afficher la requête équivalente. Rien ici n'est propre à Locus au-delà
 * de l'API publique.
 */

export interface LocusSettings {
  elic: boolean;
  desamb: boolean;
  deep: boolean;
  has: boolean;
  ansm: boolean;
}

/** Les réglages de l'écran : ceux de core, plus trois réglages d'affichage (raisonnement, renvois, format court). */
export interface Settings extends LocusSettings {
  reason: boolean;
  inline: boolean;
  court: boolean;
}

export const DEFAULT_SETTINGS: Settings = { elic: false, desamb: false, deep: false, reason: true, inline: false, has: true, ansm: true, court: true };

export const locusOf = (s: Settings): LocusSettings => ({ elic: s.elic, desamb: s.desamb, deep: s.deep, has: s.has, ansm: s.ansm });

/** Les éditeurs HAS de `GET /v2/sources` (corpus de référence des évals : HAS et ANSM, sans autre éditeur). */
export const HAS_SOURCES = ["HAS", "HAS (ALD)", "HAS (SP)", "HAS (VAC)"];
/** L'éditeur ANSM de `GET /v2/sources` (documents de l'agence, distincts des RCP de la lane médicament). */
export const ANSM_SOURCES = ["ANSM"];

export const APP_SURFACE = "studio-chatbot";
export const APP_VERSION = "0.1.0";

export function coreParams(s: LocusSettings, known: { has: string[]; ansm: string[] } = { has: HAS_SOURCES, ansm: ANSM_SOURCES }): Record<string, unknown> {
  const orchestrate = s.elic || s.desamb;
  return {
    mode: s.deep ? "approfondi" : "rapide",
    deliberate: s.deep,
    orchestrate,
    ...(orchestrate ? { max_elicitation_rounds: s.elic ? 1 : 0 } : {}),
    // Le corpus documentaire restreint aux éditeurs cochés (jamais une liste vide : core la refuse ;
    // la route garantit au moins une source). Ni Antibioclic ni EBMFrance : corpus de référence des évals.
    sources: [...(s.has ? known.has : []), ...(s.ansm ? known.ansm : [])],
    // ANSM décochée : la lane médicament (passages de RCP versés au contexte) est coupée aussi.
    ...(s.ansm ? {} : { drug_k: 0 }),
  };
}
