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

/** Les éditeurs HAS de `GET /v2/sources` (corpus de référence des évals : HAS et ANSM, sans autre éditeur). */
export const HAS_SOURCES = ["HAS", "HAS (ALD)", "HAS (SP)", "HAS (VAC)"];

export const APP_SURFACE = "studio-chatbot";

export function coreParams(s: LocusSettings, hasSources: string[] = HAS_SOURCES): Record<string, unknown> {
  const orchestrate = s.elic || s.desamb;
  return {
    mode: s.deep ? "approfondi" : "rapide",
    deliberate: s.deep,
    orchestrate,
    ...(orchestrate ? { max_elicitation_rounds: s.elic ? 1 : 0 } : {}),
    // HAS : restreint le corpus documentaire aux éditeurs HAS. Sans HAS, les chemins documentaires sont coupés.
    ...(s.has ? { sources: hasSources } : { chunk_k: 0, mku_k: 0, table_k: 0 }),
    // ANSM : les passages de RCP versés au contexte. Sans ANSM, la lane médicament est coupée.
    ...(s.ansm ? {} : { drug_k: 0 }),
  };
}
