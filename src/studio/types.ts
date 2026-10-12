import type { Proposal } from "@/domain/types";
import type { Rencontre } from "@/data/rencontres";

/** Ce que l'accueil reçoit : l'agenda du jour et la patientèle, pour la palette. */
export interface AgendaSlot { patientId: string; heure: string; nom: string; motif: string; libre?: boolean; apresMidi: boolean; prochain?: boolean }
export interface PatientRef { id: string; nom: string; prenom: string; nomUsage: string; initials: string; hue: number; age: number; naissance: string; profession?: string; ins: string; famille?: string; rdv?: string }
export interface HomeData { praticien: { initials: string; nom: string }; agenda: AgendaSlot[]; patients: PatientRef[]; courriersNonLus: number; bioNonLues: number }

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
