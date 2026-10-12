/**
 * Le contrat du composer : ce que le navigateur envoie quand on parle à ⌘K,
 * et ce qu'il reçoit — non pas une réponse rédigée, mais un PLAN D'ACTIONS,
 * déjà typé sur les objets du LGC, à valider d'un geste.
 *
 * Partagé serveur / navigateur : pas d'import serveur ici.
 */

export type Ecran = "home" | "dossier" | "documents" | "document" | "inbox" | "actions";

export interface ComposeInput {
  texte: string;
  patientId?: string;
  ecran: Ecran;
  docId?: string;
  boite?: "courriers" | "bio" | "messages";
}

export type ComposeKind = "ordonnance" | "rdv" | "message" | "courrier" | "arret" | "dossier" | "naviguer";

export interface ComposeRef { titre: string; editeur: string; annee?: number; url?: string }

/** Une action composée : la même forme que les documents générés après la dictée, pour le même écran de validation. */
export interface ComposeAction {
  id: string;
  kind: ComposeKind;
  /** Le code court de la liste : Rx, RV, MSG, CR, AT, DOS, → */
  code: string;
  titre: string;
  ligne: string;
  destination: string;
  statut: "pret" | "relire";
  fields: { k: string; v: string }[];
  justification?: string;
  references?: ComposeRef[];
  /** Pour `naviguer` : la cible. */
  href?: string;
  /** La charge brute, telle que l'outil l'a reçue — ce qui deviendrait la `Proposal`. */
  charge?: Record<string, unknown>;
}

export interface ComposePlan {
  /** Une à trois phrases, avec renvois [n] vers `references` quand Locus a été consulté. */
  synthese: string;
  actions: ComposeAction[];
  references: ComposeRef[];
  via: "claude" | "simulation";
  modele?: string;
  /** Nombre d'appels à locus-core pendant la composition. */
  locus: number;
}

export type ComposeEvent =
  | { step: "reflexion"; titre: string }
  | { step: "outil"; nom: string; detail: string }
  | { step: "action"; action: ComposeAction }
  | { step: "texte"; texte: string }
  | { step: "done"; plan: ComposePlan }
  | { step: "error"; detail: string };
