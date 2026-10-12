import type { Proposal } from "@/domain/types";
import type { Rencontre } from "@/data/rencontres";

/** Ce que l'accueil reçoit : l'agenda du jour et la patientèle, pour la palette. */
export interface AgendaSlot { patientId: string; heure: string; nom: string; motif: string; libre?: boolean; apresMidi: boolean; prochain?: boolean }
export interface PatientRef { id: string; nom: string; prenom: string; nomUsage: string; initials: string; hue: number; age: number; naissance: string; profession?: string; ins: string; famille?: string; rdv?: string }
export interface HomeData { praticien: { initials: string; nom: string }; agenda: AgendaSlot[]; patients: PatientRef[]; courriersNonLus: number; bioNonLues: number; messagesNonLus: number }

export interface Note { dot: "accent" | "warn" | "gray"; texte: string; tag: string }
export interface Fiche { k: string; v?: string; muted?: boolean }
export interface PatientView {
  ref: PatientRef;
  meta: string; // "46 a · F"
  rdv?: { heure: string; motif: string };
  prose: string; // avec **gras** et ==surligné==
  aNoter: Note[];
  counts: { documents: number; ordonnances: number; biologie: number; imagerie: number };
  dossier: { antecedents: Fiche[]; familiaux?: string; allergies: Fiche[]; modeDeVie: Fiche[]; traitements: Fiche[]; suivis: Fiche[]; depistages: Fiche[] };
  chips: Chip[];
  rencontre: Rencontre;
  documents: DocRow[];
  suivant?: { id: string; nom: string };
  ehr: string;
}
export interface Chip { id: string; label: string; tool: string; title: string; body: string; cta: string; proposal?: Proposal }
export interface DocRow { date: string; type: "Ordonnance" | "Courrier" | "Biologie" | "Imagerie" | "Arrêt · certif" | "Consultation"; titre: string; de: string; id: string }

/** Un document ouvert : son contenu, sa lecture par Locus, ses métadonnées. */
export interface DocLine { k: string; v?: string; flag?: "normal" | "bas" | "haut" | "critique"; ref?: string; precedent?: string; alerte?: string }
export interface DocView {
  id: string;
  patientId: string;
  type: DocRow["type"];
  titre: string;
  date: string;
  de: string;
  meta: { k: string; v: string }[];
  lecture?: { resume: string; points: string[]; urgence: "aucune" | "semaine" | "jour" | "immediate"; confidence: number };
  /** Texte libre ou markdown (courriers, CR, synthèse de consultation). */
  corps?: string;
  /** Lignes structurées : résultats de biologie, lignes d'ordonnance. */
  lignes?: DocLine[];
  lignesTitre?: string;
  /** Note de consultation structurée. */
  note?: { k: string; v: string }[];
  prev?: { id: string; titre: string };
  next?: { id: string; titre: string };
}

/** La boîte de réception : trois boîtes, triées par Locus. */
export type InboxKind = "courriers" | "bio" | "messages";
export type Urgence = "immediate" | "jour" | "semaine" | "aucune";
export interface InboxRow {
  id: string;
  href?: string;
  patient: PatientRef;
  de: string;
  deType?: "patient" | "confrere" | "secretariat" | "pharmacie" | "labo" | "autre";
  titre: string;
  resume?: string;
  corps?: string;
  reponse?: string;
  urgence: Urgence;
  intention?: string;
  quand: string;
  at: string;
  nonLu: boolean;
}
export interface InboxView { kind: InboxKind; rows: InboxRow[]; counts: Record<InboxKind, number> }
