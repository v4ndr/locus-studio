/**
 * Le contrat du composer : ce que le navigateur envoie quand on parle à ⌘K,
 * et ce qu'il reçoit — non pas une réponse rédigée, mais un PLAN D'ACTIONS,
 * déjà typé sur les objets du LGC, à valider d'un geste.
 *
 * Partagé serveur / navigateur : pas d'import serveur ici.
 */

export type Ecran = "home" | "dossier" | "documents" | "document" | "inbox" | "actions" | "note";

/** Un patient créé dans le navigateur (sans carte Vitale) : le serveur n'a pas de base, il le reçoit avec la demande. */
export interface PatientLocalPayload {
  id: string;
  nomUsage: string;
  prenomUsuel: string;
  naissance: string;
  sexe: "F" | "M";
  profession?: string;
  antecedents: string[];
  allergies: string[];
  traitements: string[];
  notes: { date: string; motif?: string; synthese: string }[];
}

export interface ComposeInput {
  texte: string;
  patientId?: string;
  ecran: Ecran;
  docId?: string;
  boite?: "courriers" | "bio" | "messages";
  /** Le patient local, quand `patientId` commence par `loc_`. */
  patient?: PatientLocalPayload;
  /** En écran « note » : la note de consultation à décliner en actions. */
  note?: string;
  /** En écran « note » : le motif (agenda ou saisi), à part de la note pour ne pas être lu comme une prescription. */
  motif?: string;
  /**
   * « patientele » : la demande porte sur toute la patientèle (la palette ⌘K
   * globale l'envoie ainsi). Le serveur calcule alors la requête de population
   * avant le modèle, et n'ouvre aucun dossier.
   */
  portee?: "patientele";
}

export type ComposeKind = "ordonnance" | "rdv" | "message" | "courrier" | "arret" | "transport" | "dossier" | "naviguer";

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
  /** Signé et envoyé le… ; renvoyé si le document a été modifié après un premier envoi. */
  envoyeLe?: string;
  renvoye?: boolean;
  /** Une ligne de l'ordonnance croise une allergie du dossier : à relire, jamais masqué. */
  alerte?: string;
  /** Le patient de CETTE action quand il diffère de celui du plan (une requête sur la patientèle prépare pour plusieurs patients). */
  patient?: PatientPlan;
}

/** Le patient tel que la carte le rend (en-tête du document) : porté par le plan pour que chaque écran l'ait. */
export interface PatientPlan { nom: string; id?: string; naissance?: string; sexe?: "F" | "M"; age?: number; allergies?: string[]; /** Fictif, pour les formulaires qui le demandent (bon de transport). */ matricule?: string; adresse?: string }

/**
 * Un tableau calculé par le logiciel (une requête sur la patientèle), montré
 * tel quel à côté de la synthèse : le modèle le commente, il ne l'écrit pas.
 */
export interface TableauLigne { patientId: string; nom: string; cellules: string[]; statut: "retard" | "bientot" | "ok" | "info" }
export interface Tableau { id: string; titre: string; colonnes: string[]; lignes: TableauLigne[]; /** La dernière colonne (un texte long : ce qu'il y a à proposer) se lit sous la ligne plutôt qu'en colonne étroite. */ derniereSousLigne?: boolean; /** Ce qui n'est pas listé (à jour, hors programme) et les règles appliquées. */ pied?: string[] }

export interface ComposePlan {
  /** Une à trois phrases, avec renvois [n] vers `references` quand Locus a été consulté. */
  synthese: string;
  actions: ComposeAction[];
  references: ComposeRef[];
  /** Nombre d'appels à locus-core pendant la composition. */
  locus: number;
  /** Locus a été appelé et n'a pas répondu : le plan est fait sans sources, la carte le dit. */
  locusEnPanne?: boolean;
  /** Le patient de la composition, pour le rendu des documents. */
  patient?: PatientPlan;
  /** Les requêtes sur la patientèle faites pendant la composition, calculées sur les dossiers. */
  tableaux?: Tableau[];
}

export type ComposeEvent =
  | { step: "reflexion"; titre: string }
  | { step: "outil"; nom: string; detail: string }
  | { step: "action"; action: ComposeAction }
  | { step: "tableau"; tableau: Tableau }
  | { step: "texte"; texte: string }
  | { step: "done"; plan: ComposePlan }
  | { step: "error"; detail: string };
