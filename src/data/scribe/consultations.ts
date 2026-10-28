import roux from "./transcripts/roux.json";
import fournier from "./transcripts/fournier.json";
import diallo from "./transcripts/diallo.json";

/**
 * Les consultations enregistrées du scribe : des dictées fictives, écrites
 * pour Studio (patients fictifs). C'est la seule chose figée de l'outil :
 * l'entrée. Compte rendu, aide à la décision et actions sont générés en
 * direct à chaque lancement, par les routes `/api/scribe/*`, comme pour une
 * dictée au micro.
 *
 * La transcription horodatée vit en JSON (`transcripts/*.json`, `t` en
 * secondes depuis le début). Elle reste en français, quelle que soit la
 * langue de l'interface.
 */

export type Locuteur = "medecin" | "patient" | "patiente";

export interface LigneTranscript { t: number; qui: Locuteur; texte: string }

export interface Transcript { id: string; duree_s: number; lignes: LigneTranscript[] }

/** Une rubrique du compte rendu. `titre` : ligne d'en-tête sans valeur ; `sous` : sous-rubrique (indentée). */
export interface RubriqueCr { label: string; valeur: string; titre?: boolean; sous?: boolean }

export interface Consultation {
  id: string;
  motif: string;
  patient: string;
  patientLong: string;
  /** Durée de l'enregistrement, « mm:ss ». */
  duree: string;
  transcript: Transcript;
}

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export const CONSULTATIONS: Consultation[] = [
  {
    id: "roux",
    motif: "Mal de gorge",
    patient: "Mme Camille Roux, 34 ans",
    patientLong: "Mme Camille Roux · 34 ans · consultation du jeudi 15 octobre",
    duree: mmss(roux.duree_s),
    transcript: roux as Transcript,
  },
  {
    id: "fournier",
    motif: "Renouvellement HTA, fourmillements",
    patient: "M. Gilles Fournier, 58 ans",
    patientLong: "M. Gilles Fournier · 58 ans · consultation du jeudi 15 octobre",
    duree: mmss(fournier.duree_s),
    transcript: fournier as Transcript,
  },
  {
    id: "diallo",
    motif: "Fatigue, bilan",
    patient: "Mme Aminata Diallo, 46 ans",
    patientLong: "Mme Aminata Diallo · 46 ans · consultation du jeudi 15 octobre",
    duree: mmss(diallo.duree_s),
    transcript: diallo as Transcript,
  },
];

export const consultation = (id: string | null | undefined) => CONSULTATIONS.find((c) => c.id === id);

const QUI: Record<Locuteur, string> = { medecin: "Médecin", patient: "Patient", patiente: "Patiente" };

/** La dictée enregistrée telle que l'envoie le scribe à la synthèse : une réplique par ligne, locuteur en tête. */
export const transcriptTexte = (c: Consultation) => c.transcript.lignes.map((l) => `${QUI[l.qui]} : ${l.texte}`).join("\n");
