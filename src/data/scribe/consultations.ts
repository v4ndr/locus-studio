import roux from "./transcripts/roux.json";
import fournier from "./transcripts/fournier.json";
import diallo from "./transcripts/diallo.json";

/**
 * Les consultations scriptées du scribe (maquette Scribe.dc.html). Patients
 * fictifs. Le contenu clinique reste en français, quelle que soit la langue
 * de l'interface : il doit être relu par un médecin avant mise en ligne.
 *
 * La transcription horodatée vit en JSON (`transcripts/*.json`, `t` en
 * secondes depuis le début) ; le compte rendu, l'aide à la décision et les
 * actions sont précalculés ici.
 */

export type Locuteur = "medecin" | "patient" | "patiente";

export interface LigneTranscript { t: number; qui: Locuteur; texte: string }

export interface Transcript { id: string; duree_s: number; lignes: LigneTranscript[] }

/** Une rubrique du compte rendu. `titre` : ligne d'en-tête sans valeur ; `sous` : sous-rubrique (indentée). */
export interface RubriqueCr { label: string; valeur: string; titre?: boolean; sous?: boolean }

/** Une carte d'aide à la décision. `action` : l'index de l'action liée, que « Retenir » fait remonter. */
export interface CarteAide {
  titre: string;
  detail: string;
  alerte?: string;
  sources: string[];
  pourquoi: string[];
  action?: number;
}

export interface Consultation {
  id: string;
  motif: string;
  patient: string;
  patientLong: string;
  /** Durée de l'enregistrement, « mm:ss ». */
  duree: string;
  transcript: Transcript;
  cr: RubriqueCr[];
  aide: CarteAide[];
  actions: string[];
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
    cr: [
      { label: "Interrogatoire", valeur: "Odynophagie et dysphagie depuis 2 jours. Fièvre à 38,6 °C. Pas de toux, pas de rhinorrhée." },
      { label: "Antécédents", valeur: "Aucun antécédent notable." },
      { label: "Allergie", valeur: "Amoxicilline : urticaire il y a environ 10 ans, sans angio-œdème ni gêne respiratoire." },
      { label: "Traitement actuel", valeur: "Aucun." },
      { label: "Examen clinique", valeur: "", titre: true },
      { label: "Examen ORL", valeur: "Amygdales érythémateuses, augmentées de volume, exsudat.", sous: true },
      { label: "Ganglions", valeur: "Adénopathies sous-angulo-mandibulaires sensibles.", sous: true },
      { label: "Diagnostic", valeur: "Angine probable. Score de McIsaac à 4. TDR en cours." },
    ],
    aide: [
      {
        action: 0,
        titre: "Score de McIsaac : 4. TDR indiqué.",
        detail: "Fièvre > 38 °C, absence de toux, adénopathies cervicales sensibles, exsudat amygdalien. Âge 15-44 ans : 0 point.",
        sources: ["HAS · angine"],
        pourquoi: ["Chez l'adulte, le TDR est indiqué à partir d'un score de 2.", "Les quatre critères sont relevés dans la transcription."],
      },
      {
        action: 1,
        titre: "TDR positif, allergie non grave à la pénicilline : céfuroxime-axétil 250 mg ×2/j, 4 jours.",
        detail: "Urticaire ancienne sans angio-œdème ni atteinte respiratoire : les céphalosporines restent possibles.",
        alerte: "Allergie déclarée à l'amoxicilline (urticaire). Amoxicilline exclue.",
        sources: ["HAS · angine", "SPILF 2021", "ANSM · RCP"],
        pourquoi: ["Allergie déclarée : amoxicilline, réaction cutanée isolée.", "Aucun signe de gravité rapporté (« seulement des plaques »)."],
      },
      {
        titre: "Contre-indication à toutes les bêta-lactamines : azithromycine 500 mg/j, 3 jours.",
        detail: "Alternative à garder si l'allergie est requalifiée en réaction grave.",
        sources: ["SPILF 2021", "ANSM · RCP"],
        pourquoi: ["Option de second recours, à réserver à la contre-indication des bêta-lactamines."],
      },
      {
        titre: "TDR négatif : pas d'antibiotique.",
        detail: "Traitement symptomatique, réévaluation si aggravation ou persistance au-delà de 3 jours.",
        sources: ["HAS · angine"],
        pourquoi: ["Un TDR négatif chez l'adulte ne justifie pas de culture de contrôle."],
      },
    ],
    actions: [
      "TDR angine : réalisé au cabinet, résultat à saisir",
      "Ordonnance : céfuroxime-axétil 250 mg, 1 cp matin et soir, 4 jours (si TDR +)",
      "Ajouter au dossier : allergie à la pénicilline (urticaire)",
      "Arrêt de travail : 2 jours",
    ],
  },
  {
    id: "fournier",
    motif: "Renouvellement HTA, fourmillements",
    patient: "M. Gilles Fournier, 58 ans",
    patientLong: "M. Gilles Fournier · 58 ans · consultation du jeudi 15 octobre",
    duree: mmss(fournier.duree_s),
    transcript: fournier as Transcript,
    cr: [
      { label: "Motif", valeur: "Renouvellement du traitement antihypertenseur. Paresthésies de la main droite." },
      { label: "Interrogatoire", valeur: "Paresthésies nocturnes des trois premiers doigts depuis 2 mois, soulagées en secouant la main." },
      { label: "Traitement actuel", valeur: "Amlodipine 5 mg, 1 cp/j." },
      { label: "Examen clinique", valeur: "", titre: true },
      { label: "Constantes", valeur: "PA 138/84 mmHg.", sous: true },
      { label: "Membre supérieur droit", valeur: "Signe de Tinel positif au poignet.", sous: true },
      { label: "Diagnostic", valeur: "HTA contrôlée. Syndrome du canal carpien droit probable." },
    ],
    aide: [
      {
        action: 2,
        titre: "Syndrome du canal carpien probable.",
        detail: "Paresthésies nocturnes du territoire médian et signe de Tinel positif. Orthèse de repos nocturne en première intention.",
        sources: ["HAS · canal carpien"],
        pourquoi: ["Topographie : pouce, index, majeur.", "Réveils nocturnes soulagés par le secouement de la main."],
      },
      {
        action: 1,
        titre: "ENMG avant tout geste chirurgical.",
        detail: "À demander si les symptômes persistent ou si une chirurgie est envisagée.",
        sources: ["HAS · canal carpien"],
        pourquoi: ["L'ENMG confirme le diagnostic et évalue la sévérité."],
      },
      {
        action: 0,
        titre: "PA à 138/84 : traitement à poursuivre.",
        detail: "Pas de modification nécessaire.",
        sources: ["HAS · HTA"],
        pourquoi: ["Mesure au cabinet sous l'objectif de 140/90."],
      },
    ],
    actions: [
      "Ordonnance : amlodipine 5 mg, 1 cp/j, 3 mois",
      "Demande : ENMG des membres supérieurs",
      "Ordonnance : orthèse de repos nocturne, poignet droit",
    ],
  },
  {
    id: "diallo",
    motif: "Fatigue, bilan",
    patient: "Mme Aminata Diallo, 46 ans",
    patientLong: "Mme Aminata Diallo · 46 ans · consultation du jeudi 15 octobre",
    duree: mmss(diallo.duree_s),
    transcript: diallo as Transcript,
    cr: [
      { label: "Interrogatoire", valeur: "Asthénie depuis 3 mois, dyspnée d'effort. Ménorragies croissantes. Ni amaigrissement, ni fièvre, ni sueurs nocturnes." },
      { label: "Traitement actuel", valeur: "Aucun." },
      { label: "Examen clinique", valeur: "", titre: true },
      { label: "Général", valeur: "Pâleur conjonctivale.", sous: true },
      { label: "Diagnostic", valeur: "Asthénie avec ménorragies. Carence martiale suspectée." },
    ],
    aide: [
      {
        action: 0,
        titre: "Carence martiale suspectée : ferritine seule en première intention.",
        detail: "Associer une NFS avec plaquettes pour rechercher une anémie.",
        sources: ["HAS · bilan martial"],
        pourquoi: ["Ménorragies et pâleur orientent vers une carence en fer.", "Le fer sérique n'est pas utile en première intention."],
      },
      {
        action: 2,
        titre: "Ménorragies persistantes : explorer la cause.",
        detail: "Échographie pelvienne ou avis gynécologique selon l'examen.",
        sources: ["CNGOF"],
        pourquoi: ["Les ménorragies sont la cause probable de la carence."],
      },
    ],
    actions: [
      "Ordonnance de biologie : NFS, plaquettes, ferritine",
      "Rendez-vous de contrôle avec les résultats",
      "Courrier : avis gynécologique",
    ],
  },
];

export const consultation = (id: string | null | undefined) => CONSULTATIONS.find((c) => c.id === id);
