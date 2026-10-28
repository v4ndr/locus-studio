/**
 * Le contrat des routes live du scribe (`/api/scribe/*`), partagé serveur /
 * navigateur. Ni nom de modèle, ni fournisseur, ni identifiant de règle.
 */
import type { RubriqueCr } from "./consultations";
import type { ChatSource, Confiance } from "@/sandbox/chatbot/events";

export type ModeleNote = "mg" | "ped" | "gyn";

/** `dictee` : la transcription au micro est configurée sur ce déploiement. */
export interface LiveProbe { dictee: boolean }

export interface NoteReponse { cr: RubriqueCr[] }

/**
 * L'aide à la décision de Locus, rendue comme dans l'app B2Pro : la réponse
 * en Markdown, ses renvois renumérotés `[n]`, les seules sources qu'elle cite
 * (par nature, avec leur éditeur) et son degré de confiance. `alerte` : le
 * garde-fou d'allergie du composeur, s'il s'est déclenché.
 */
export interface AideDecision {
  markdown: string;
  sources: ChatSource[];
  confidence: Confiance;
  alerte?: string;
}

/** `liees` : les index des actions que la recommandation nomme (une molécule, un examen). */
export interface DecisionReponse { aide: AideDecision | null; actions: string[]; liees: number[] }

/**
 * Les codes d'erreur des routes de génération, que la page traduit :
 * - `indisponible` : le service de génération ou Locus n'est pas joignable
 *   (ou pas configuré sur ce déploiement) ;
 * - `sature` : le service refuse pour l'instant (trop de demandes) ;
 * - `echec` : la génération a commencé et n'a pas abouti ;
 * - `donnees_reelles` : la dictée contient un identifiant réel, refusée.
 * Les codes du garde (`quota_exceeded`, `rate_limited`, `auth_required`)
 * passent tels quels.
 */
export type CodeErreur = "indisponible" | "sature" | "echec" | "donnees_reelles";

export interface ErreurReponse { error: string; code?: CodeErreur | string }
