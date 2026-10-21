/**
 * Le contrat des routes live du scribe (`/api/scribe/*`), partagé serveur /
 * navigateur. Ni nom de modèle, ni fournisseur, ni identifiant de règle.
 */
import type { CarteAide, RubriqueCr } from "./consultations";

export type ModeleNote = "mg" | "ped" | "gyn";

export interface LiveProbe { live: boolean; dictee: boolean }

export interface NoteReponse { cr: RubriqueCr[] }

export interface DecisionReponse { aide: CarteAide[]; actions: string[] }
