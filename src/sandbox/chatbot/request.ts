/**
 * Les réglages du chatbot traduits en paramètres de `POST /v2/retrieve/stream`.
 * Partagé : le serveur s'en sert pour appeler core, le panneau « Appel API »
 * pour afficher la requête équivalente. Rien ici n'est propre à Locus au-delà
 * de l'API publique.
 *
 * Le corps est celui de l'app B2Pro (locus-app, `api/chat/route.ts`) : la
 * question, le mode, la délibération, l'orchestration. Pas de `sources` : le
 * périmètre du compte, posé par core sur la clé, s'applique tel quel, avec
 * tous ses éditeurs. Une restriction nommant un éditeur hors de ce périmètre
 * était refusée par core (ligne `error` en plein flux).
 */

export interface LocusSettings {
  elic: boolean;
  desamb: boolean;
  deep: boolean;
}

/** Les réglages de l'écran : ceux de core, plus trois réglages d'affichage (raisonnement, renvois, format court). */
export interface Settings extends LocusSettings {
  reason: boolean;
  inline: boolean;
  court: boolean;
}

/** Tout au maximum : c'est ce qui montre ce que Locus fait de plus qu'un RAG. */
export const DEFAULT_SETTINGS: Settings = { elic: true, desamb: true, deep: true, reason: true, inline: true, court: false };

export const locusOf = (s: Settings): LocusSettings => ({ elic: s.elic, desamb: s.desamb, deep: s.deep });

export const APP_SURFACE = "studio-chatbot";
export const APP_VERSION = "0.1.0";

export function coreParams(s: LocusSettings): Record<string, unknown> {
  const orchestrate = s.elic || s.desamb;
  return {
    mode: s.deep ? "approfondi" : "rapide",
    deliberate: s.deep,
    // Comme B2Pro : la clé n'est envoyée que lorsqu'elle est vraie.
    ...(orchestrate ? { orchestrate: true } : {}),
    // Désambiguïsation sans élicitation : l'orchestration lève les ambiguïtés sans poser de formulaire. Le défaut de core (1) sinon.
    ...(orchestrate && !s.elic ? { max_elicitation_rounds: 0 } : {}),
  };
}
