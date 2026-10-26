/**
 * Le contrat des routes live du scribe (`/api/scribe/*`), partagé serveur /
 * navigateur. Ni nom de modèle, ni fournisseur, ni identifiant de règle.
 */
import type { CarteAide, RubriqueCr } from "./consultations";

export type ModeleNote = "mg" | "ped" | "gyn";

/** `dictee` : la transcription au micro est configurée sur ce déploiement. */
export interface LiveProbe { dictee: boolean }

export interface NoteReponse { cr: RubriqueCr[] }

export interface DecisionReponse { aide: CarteAide[]; actions: string[] }

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
