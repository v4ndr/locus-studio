import type { Proposal, Briefing, Appointment, Message, LabReport, ClinicalDocument, EncounterNote, TranscriptTurn } from "@/domain/types";
import type { Routine } from "@/data/routines";
import type { Script } from "@/data/consultations";

/**
 * Le monde du fil : la projection sérialisable du jeu de données que
 * l'écran unique reçoit du serveur. Tout ce que le composer peut nommer et
 * tout ce que la scène peut rendre est là.
 */
export interface WorldPatient {
  id: string;
  nom: string; // « Marguerite Delacroix »
  prenom: string;
  nomUsage: string;
  hue: number;
  age: number;
  sexe: "M" | "F";
  ligne: string;
  synthese?: string;
  enCeMoment: string[];
  problems: { libelle: string; cim10?: string; chronique: boolean }[];
  meds: { dci: string; dosage?: string; posologie: string; type: string; ald?: boolean }[];
  allergies: string[];
  series: Record<string, { date: string; valeur: number; valeur2?: number }[]>;
  /** Décisions qui ont jalonné les courbes (traitement débuté…). */
  jalons: { date: string; libelle: string }[];
  proposals: Proposal[];
  briefing?: Briefing;
  appointment?: Appointment;
  messages: Message[];
  labs: LabReport[];
  docs: ClinicalDocument[];
  consentementAgent: string;
  ehr: string;
}

export interface World {
  praticien: { nom: string; agent: string };
  patients: WorldPatient[];
  routines: Routine[];
  scripts: Record<string, Script>;
  seed: FilEntry[];
}

/* ------------------------------------------------------------------ */
/* Le fil                                                               */
/* ------------------------------------------------------------------ */

export type SessionEtat = "en-cours" | "attente" | "fait" | "echec";

export interface FilEntry {
  id: string;
  at: string;
  who: "sol" | "moi" | "patient" | "systeme" | "session" | "consigne" | "consult";
  patientId?: string;
  /** Nom affiché pour `patient` (la mère d'Inès, la fille…). */
  nom?: string;
  titre?: string;
  corps?: string;
  /** Pour `session` : l'état d'un travail de Locus. */
  session?: { etat: SessionEtat; declencheur?: string };
  /** La scène qu'un clic rouvre. */
  scene?: Scene;
  /** Pour `consult` : le segment à trois voix. */
  tours?: TranscriptTurn[];
  /** Marque « à valider » (Locus a préparé quelque chose). */
  aValider?: boolean;
}

/* ------------------------------------------------------------------ */
/* La scène                                                             */
/* ------------------------------------------------------------------ */

export type Mesure = "dfg" | "ta" | "hba1c" | "poids" | "ldl";

export type Scene =
  | { type: "vide" }
  | { type: "matinee" }
  | { type: "patient"; patientId: string }
  | { type: "courbe"; patientId: string; mesure: Mesure }
  | { type: "table"; routineId: string }
  | { type: "objet"; patientId: string; proposal: Proposal; origineId?: string }
  | { type: "locus"; patientId?: string; question: string; nonce: number }
  | { type: "consultation"; patientId: string }
  | { type: "recu"; patientId: string; lignes: string[] }
  | { type: "sessions" }
  | { type: "consignes" }
  | { type: "aide" };

/* ------------------------------------------------------------------ */
/* L'intention                                                          */
/* ------------------------------------------------------------------ */

export type Intent =
  | { kind: "matinee" }
  | { kind: "patient"; patientId: string }
  | { kind: "courbe"; patientId: string; mesure: Mesure }
  | { kind: "table"; routineId: string }
  | { kind: "objet"; patientId: string; action: "ordonnance" | "courrier" | "arret-travail" | "message-patient" | "message-confrere" | "quelconque" }
  | { kind: "signer"; patientId?: string; tout: boolean; action?: "ordonnance" | "courrier" | "arret-travail" | "message-patient" }
  | { kind: "rejeter" }
  | { kind: "corriger"; texte: string }
  | { kind: "consultation"; patientId: string }
  | { kind: "cloture"; patientId: string }
  | { kind: "sessions" }
  | { kind: "consigne"; texte: string }
  | { kind: "consignes" }
  | { kind: "tache"; patientId?: string; texte: string }
  | { kind: "stop" }
  | { kind: "reprends" }
  | { kind: "aide" }
  | { kind: "locus"; patientId?: string; question: string }
  | { kind: "besoin-patient"; pour: string };

export interface Consigne {
  id: string;
  at: string;
  texte: string;
  /** Ce que Locus en a compris : la règle, et qui est concerné. */
  lecture: string;
}
