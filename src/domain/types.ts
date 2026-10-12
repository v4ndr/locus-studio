/**
 * Le dossier patient de Locus Studio — le modèle de données du LGC agentique.
 *
 * Trois partis pris structurants :
 *
 * 1. TOUT est un enregistrement (`Record`) porté par la même enveloppe :
 *    un identifiant, un type, un patient, une PROVENANCE, un STATUT, un
 *    numéro de schéma. Une allergie, un courrier, une proposition de l'agent,
 *    un message du patient : même enveloppe. C'est ce qui rend le dossier
 *    résilient — on peut ajouter un type sans casser les autres, migrer un
 *    schéma enregistrement par enregistrement, et toujours répondre à « qui a
 *    écrit ça, quand, et qui l'a validé ».
 *
 * 2. La PROVENANCE est de première classe. Demain, la moitié du dossier sera
 *    écrite par des agents ; un dossier qui ne distingue pas « le médecin a
 *    dit » de « l'agent a lu dans le courrier » de « le patient a déclaré »
 *    est un dossier qu'on ne peut plus lire. Chaque enregistrement dit d'où
 *    il vient, et s'il a été validé par un humain.
 *
 * 3. Le dossier est un FIL (append-only) plus des VUES. Les enregistrements
 *    ne sont jamais écrasés : une modification crée une version et l'ancienne
 *    reste lisible. Le « résumé vivant » (synthèse), la liste des problèmes,
 *    les traitements courants sont des projections de ce fil, maintenues par
 *    l'agent et validées par le praticien.
 *
 * Les codes sont ceux en usage en médecine générale française : CIM-10 et
 * CISP-2 pour les problèmes, DRC (SFMG) pour les résultats de consultation,
 * CIS (ANSM) pour les spécialités, LOINC pour la biologie, NGAP/CCAM pour les
 * actes. Les téléservices (INS, DMP, MSSanté, ordonnance numérique, SESAM-
 * Vitale, amelipro) sont modélisés par leurs objets d'échange, et MOCKÉS.
 */

export type ISODate = string; // "2026-10-15" ou "2026-10-15T09:30:00+02:00"

/* ------------------------------------------------------------------ */
/* Provenance et enveloppe                                             */
/* ------------------------------------------------------------------ */

export type Origin =
  | "praticien" // saisi ou dicté par le médecin
  | "agent" // produit par un agent (Locus ou autre)
  | "patient" // déclaré par le patient (Mon Espace Santé, messagerie, formulaire)
  | "import" // reçu d'un tiers : labo (HPRIM), hôpital (CDA), confrère (MSSanté), DMP
  | "systeme"; // calculé (IMC, échéances), téléservice (INSi, FSE)

export interface Provenance {
  origin: Origin;
  /** Nom de l'agent ou du téléservice, ex. "locus.scribe", "insi", "hprim". */
  actor?: string;
  /** Enregistrement d'où dérive celui-ci (ex. un problème extrait d'un courrier). */
  derivedFrom?: string[];
  /** Confiance de l'agent, 0..1 — absente si humain. */
  confidence?: number;
  /** Validation humaine : qui et quand. Absente = non validé. */
  validatedBy?: string;
  validatedAt?: ISODate;
}

export type RecordStatus =
  | "actif"
  | "resolu"
  | "archive"
  | "brouillon" // en cours d'écriture par un humain
  | "propose" // écrit par un agent, en attente de validation
  | "rejete";

export interface BaseRecord {
  id: string;
  patientId: string;
  /** Version du schéma de CE type d'enregistrement. */
  schema: 1;
  createdAt: ISODate;
  updatedAt: ISODate;
  /** Version précédente de cet enregistrement, si modifié (le fil ne s'écrase pas). */
  supersedes?: string;
  provenance: Provenance;
  status: RecordStatus;
  tags?: string[];
}

/* ------------------------------------------------------------------ */
/* Identité, couverture, administratif                                 */
/* ------------------------------------------------------------------ */

export type InsStatus = "qualifiee" | "recuperee" | "provisoire" | "absente";

/** Identité Nationale de Santé — les cinq traits stricts + l'OID. */
export interface Ins {
  matricule: string; // NIR ou NIA
  oid: string; // 1.2.250.1.213.1.4.8 (NIR) / 1.2.250.1.213.1.4.9 (NIA)
  nomNaissance: string;
  prenoms: string; // liste des prénoms de naissance, séparés par des espaces
  sexe: "M" | "F";
  dateNaissance: ISODate;
  lieuNaissance: string; // code INSEE de la commune (ou 99xxx pays)
  statut: InsStatus;
  verifieeLe?: ISODate; // dernier appel INSi
}

export interface Coverage {
  regime: "general" | "msa" | "autre";
  /** Affection de longue durée exonérante — liste des codes CIM-10 reconnus. */
  ald?: { code: string; libelle: string; depuis: ISODate; jusqua?: ISODate }[];
  /** Complémentaire santé solidaire. */
  c2s?: boolean;
  /** Organisme complémentaire (AMC). */
  mutuelle?: { nom: string; numero: string };
  /** Médecin traitant déclaré. */
  medecinTraitant?: { rpps: string; nom: string; declareLe: ISODate };
  /** Droits lus en carte Vitale ou ADRi. */
  droitsVerifiesLe?: ISODate;
}

export interface Patient extends BaseRecord {
  kind: "patient";
  ins: Ins;
  /** Nom d'usage, prénom usuel — ce qu'on affiche. */
  nomUsage: string;
  prenomUsuel: string;
  /** Identité de genre et pronoms, s'ils diffèrent du sexe administratif. */
  pronoms?: string;
  photoHue?: number; // teinte de l'avatar généré (pas de photo)
  contact: {
    telephone?: string;
    email?: string;
    adresse?: { ligne1: string; codePostal: string; ville: string };
    canalPrefere: "messagerie" | "sms" | "telephone" | "email";
    langue?: string;
  };
  couverture: Coverage;
  /** Profession, situation — le contexte de vie. */
  vie?: {
    profession?: string;
    situation?: string; // "vit seule", "en couple, 2 enfants"…
    aidant?: string;
  };
  personneConfiance?: { nom: string; lien: string; telephone?: string };
  /** Autonomie accordée aux agents côté patient (ce qu'ils peuvent lui dire directement). */
  consentement: {
    monEspaceSante: boolean;
    dmpAlimentation: boolean;
    messagerieAgent: "aucune" | "logistique" | "clinique-valide" | "clinique";
  };
  /** Décès, si le dossier est clos. */
  deces?: ISODate;
}

/* ------------------------------------------------------------------ */
/* Le clinique                                                          */
/* ------------------------------------------------------------------ */

export type ProblemCategory =
  | "medical"
  | "chirurgical"
  | "familial"
  | "gyneco-obstetrical"
  | "mode-de-vie"
  | "psycho-social";

export interface Problem extends BaseRecord {
  kind: "problem";
  libelle: string;
  categorie: ProblemCategory;
  /** CIM-10 (ex. "E11") et CISP-2 (ex. "T90"). */
  cim10?: string;
  cisp2?: string;
  depuis?: ISODate;
  finLe?: ISODate;
  /** Chronique = suit un plan de soins ; aigu = disparaît du résumé une fois résolu. */
  evolution: "chronique" | "aigu" | "antecedent";
  /** Pour les antécédents familiaux : qui. */
  apparente?: string;
  note?: string;
  /** Alimente le résumé vivant ? Les problèmes « mineurs résolus » n'y sont pas. */
  enAvant: boolean;
}

export interface Allergy extends BaseRecord {
  kind: "allergy";
  substance: string;
  type: "medicamenteuse" | "alimentaire" | "environnementale" | "autre";
  reaction?: string;
  severite: "legere" | "moderee" | "severe" | "inconnue";
  certitude: "confirmee" | "suspectee" | "rapportee";
  /** Code ATC ou DCI, pour que le LAP puisse bloquer. */
  atc?: string;
}

export interface Medication extends BaseRecord {
  kind: "medication";
  dci: string;
  /** Spécialité et code CIS (ANSM) si connue. */
  specialite?: string;
  cis?: string;
  dosage?: string; // "1000 mg"
  forme?: string; // "comprimé"
  posologie: string; // "1 cp matin et soir"
  voie?: string;
  debut?: ISODate;
  fin?: ISODate;
  type: "chronique" | "ponctuel" | "si-besoin";
  /** Qui l'a prescrit, si ce n'est pas le cabinet. */
  prescripteur?: string;
  /** Lié à une ALD (prescription bizone). */
  ald?: boolean;
  /** Dernier renouvellement, pour calculer l'échéance. */
  dernierRenouvellement?: ISODate;
  dureeRenouvellementJours?: number;
  /** Observance déclarée / mesurée. */
  observance?: "bonne" | "partielle" | "mauvaise" | "inconnue";
}

export interface Vaccination extends BaseRecord {
  kind: "vaccination";
  valences: string[]; // ["dTP", "Coqueluche"]
  nomCommercial?: string;
  date: ISODate;
  lot?: string;
  /** Prochain rappel calculé selon le calendrier vaccinal. */
  rappelPrevu?: ISODate;
  administrePar?: string;
}

export type MeasureType =
  | "poids"
  | "taille"
  | "imc"
  | "ta"
  | "fc"
  | "spo2"
  | "temperature"
  | "glycemie-capillaire"
  | "perimetre-cranien"
  | "douleur-eva"
  | "dfg";

export interface Measure extends BaseRecord {
  kind: "measure";
  type: MeasureType;
  /** Pour la TA : systolique ; `valeur2` : diastolique. */
  valeur: number;
  valeur2?: number;
  unite: string;
  date: ISODate;
  /** Automesure (patient), cabinet, objet connecté… */
  contexte?: "cabinet" | "automesure" | "domicile" | "connecte";
}

export type LabFlag = "normal" | "bas" | "haut" | "critique";

export interface LabResult {
  loinc?: string;
  libelle: string;
  valeur: number | string;
  unite?: string;
  refMin?: number;
  refMax?: number;
  flag: LabFlag;
  /** Pour tracer la tendance : la valeur précédente connue. */
  precedent?: { valeur: number; date: ISODate };
}

export interface LabReport extends BaseRecord {
  kind: "lab";
  laboratoire: string;
  prelevementLe: ISODate;
  recuLe: ISODate;
  resultats: LabResult[];
  /** Prescrit par le cabinet (lié à une ordonnance) ou reçu spontanément. */
  prescriptionId?: string;
  /** Lecture de l'agent : résumé en une phrase + ce qui mérite l'œil du médecin. */
  lecture?: AgentReading;
  /** Vu par le praticien ? Le cœur de la boîte de réception. */
  vuLe?: ISODate;
}

export type DocumentType =
  | "cr-imagerie"
  | "cr-hospitalisation"
  | "cr-specialiste"
  | "cr-operatoire"
  | "anapath"
  | "ordonnance-externe"
  | "certificat-recu"
  | "formulaire"
  | "photo"
  | "autre";

export interface ClinicalDocument extends BaseRecord {
  kind: "document";
  type: DocumentType;
  titre: string;
  auteur?: string; // "Dr X, cardiologue, CH de…"
  dateDocument: ISODate;
  recuLe: ISODate;
  /** Canal d'arrivée. */
  canal: "mssante" | "dmp" | "scan" | "patient" | "papier" | "fax";
  /** Format source et texte extrait (OCR / CDA). */
  format: "pdf" | "cda" | "image" | "texte";
  texte: string;
  pages?: number;
  lecture?: AgentReading;
  vuLe?: ISODate;
}

/** Ce que l'agent a compris d'un document, d'un résultat ou d'un message. */
export interface AgentReading {
  resume: string;
  /** Faits structurés qu'il propose d'inscrire au dossier (problèmes, traitements, mesures…). */
  faitsExtraits: ExtractedFact[];
  /** Ce qui, selon lui, mérite une décision du médecin. */
  pointsAttention: string[];
  /** Niveau d'urgence proposé. */
  urgence: "aucune" | "semaine" | "jour" | "immediate";
  /** Références Locus (recommandations) mobilisées, s'il y en a. */
  references?: Citation[];
  confidence: number;
}

export type ExtractedFact =
  | { type: "problem"; libelle: string; cim10?: string; statut: "nouveau" | "confirme" | "resolu" }
  | { type: "medication"; dci: string; posologie?: string; action: "debute" | "modifie" | "arrete" }
  | { type: "measure"; mesure: MeasureType; valeur: number; valeur2?: number; unite: string; date: ISODate }
  | { type: "rdv"; libelle: string; echeance?: ISODate }
  | { type: "allergy"; substance: string; reaction?: string }
  | { type: "autre"; libelle: string };

export interface Citation {
  /** Identifiant du document dans locus-core. */
  docId?: string;
  titre: string;
  editeur: string; // HAS, ANSM, SPF, SFMG…
  date?: string;
  url?: string;
  extrait?: string;
}

/* ------------------------------------------------------------------ */
/* La consultation                                                      */
/* ------------------------------------------------------------------ */

export type EncounterType = "cabinet" | "teleconsultation" | "visite" | "telephone" | "messagerie";

/** La note de consultation — une structure, pas un champ texte. */
export interface EncounterNote {
  motifs: string[];
  histoire?: string; // anamnèse
  examen?: string;
  conclusion?: string; // le(s) résultat(s) de consultation
  conduite?: string; // conduite à tenir
  /** Ce que le patient a dit vouloir, en ses mots (l'agent le garde). */
  attentesPatient?: string;
}

export interface Encounter extends BaseRecord {
  kind: "encounter";
  type: EncounterType;
  date: ISODate;
  dureeMin?: number;
  praticien: string; // RPPS ou identifiant local
  note: EncounterNote;
  /** Résultats de consultation codés (DRC / CISP-2 / CIM-10). */
  codes: { systeme: "drc" | "cisp2" | "cim10"; code: string; libelle: string }[];
  /** Problèmes du dossier abordés. */
  problemesIds?: string[];
  /** Acte(s) facturé(s). */
  actes: { code: string; libelle: string; montant: number; majorations?: string[] }[];
  /** Mode de facturation. */
  facturation?: {
    mode: "fse" | "degrade" | "papier" | "tiers-payant";
    tiersPayant?: "amo" | "amo-amc" | "aucun";
    transmiseLe?: ISODate;
  };
  /** Transcription ambiante (si le patient a consenti) — stockée à part en prod, ici inline. */
  transcript?: TranscriptTurn[];
  /** Propositions générées pendant / après la consultation. */
  propositionsIds?: string[];
  /** Mesures prises pendant la consultation. */
  mesuresIds?: string[];
}

export interface TranscriptTurn {
  qui: "medecin" | "patient" | "tiers";
  t: number; // secondes depuis le début
  texte: string;
}

/* ------------------------------------------------------------------ */
/* Ordonnances, arrêts, courriers                                       */
/* ------------------------------------------------------------------ */

export type PrescriptionType = "medicament" | "biologie" | "imagerie" | "paramedical" | "transport" | "dispositif";

export interface PrescriptionLine {
  /** Médicament : DCI + CIS ; biologie : libellé + LOINC ; etc. */
  libelle: string;
  dci?: string;
  cis?: string;
  loinc?: string;
  posologie?: string;
  duree?: string;
  quantite?: string;
  renouvellement?: number; // nombre de renouvellements
  /** Prescription en zone ALD (ordonnance bizone). */
  ald?: boolean;
  /** Non substituable, et le motif (MTE, CIF, EFG). */
  nonSubstituable?: "MTE" | "CIF" | "EFG";
  /** Vérifications LAP posées par l'agent. */
  alertes?: LapAlert[];
}

export interface LapAlert {
  type: "interaction" | "contre-indication" | "allergie" | "posologie" | "redondance" | "grossesse" | "insuffisance-renale";
  niveau: "info" | "precaution" | "deconseille" | "contre-indique";
  message: string;
  /** Référence RCP (rubrique) via locus-core `/v2/drugs`. */
  reference?: Citation;
}

export interface Prescription extends BaseRecord {
  kind: "prescription";
  type: PrescriptionType;
  date: ISODate;
  lignes: PrescriptionLine[];
  /** Mention libre en pied d'ordonnance. */
  mention?: string;
  encounterId?: string;
  /** Statut de signature et de transmission. */
  signature?: { par: string; le: ISODate };
  /** Ordonnance numérique : identifiant à 20 caractères et QR. */
  ordonnanceNumerique?: { id: string; transmiseLe: ISODate; dispenseeLe?: ISODate };
  /** Envoyée au patient (Mon Espace Santé / messagerie). */
  partageeLe?: ISODate;
}

export interface SickLeave extends BaseRecord {
  kind: "sick-leave";
  du: ISODate;
  au: ISODate;
  motif: string; // reste confidentiel sur le volet employeur
  tempsPartiel?: boolean;
  sortiesAutorisees: "non" | "oui" | "libres";
  prolongation?: boolean;
  encounterId?: string;
  /** Téléservice AAT amelipro. */
  teletransmis?: { le: ISODate; numero: string };
}

export type LetterType = "adressage" | "certificat" | "attestation" | "reponse-confrere" | "courrier-patient" | "demande-prealable" | "protocole-ald";

export interface Letter extends BaseRecord {
  kind: "letter";
  type: LetterType;
  titre: string;
  destinataire: { nom: string; specialite?: string; mssante?: string };
  date: ISODate;
  /** Corps en markdown. Le pied (signature, RPPS) est ajouté à l'impression. */
  corps: string;
  encounterId?: string;
  /** Pièces jointes (identifiants d'enregistrements du dossier partagés). */
  piecesJointes?: string[];
  envoi?: { canal: "mssante" | "dmp" | "patient" | "papier"; le: ISODate; accuse?: boolean };
  signature?: { par: string; le: ISODate };
}

/* ------------------------------------------------------------------ */
/* Suivi, prévention, plans de soins                                    */
/* ------------------------------------------------------------------ */

export interface CareItem {
  libelle: string;
  /** Périodicité en mois. */
  periodiciteMois: number;
  dernierLe?: ISODate;
  /** Calculé : prochaine échéance. */
  echeance?: ISODate;
  /** Référence de la recommandation (HAS, ROSP). */
  reference?: Citation;
  /** Enregistrement qui satisfait l'item (un labo, une mesure, un document). */
  satisfaitPar?: string;
}

export interface CarePlan extends BaseRecord {
  kind: "care-plan";
  problemId: string;
  libelle: string; // "Suivi diabète de type 2"
  objectifs: { libelle: string; cible: string; actuel?: string; atteint?: boolean }[];
  items: CareItem[];
}

export interface Screening extends BaseRecord {
  kind: "screening";
  programme: "colorectal" | "sein" | "col-uterus" | "autre";
  libelle: string;
  eligibleDepuis?: ISODate;
  dernierLe?: ISODate;
  prochainLe?: ISODate;
  etat: "a-jour" | "a-proposer" | "en-retard" | "refuse" | "non-eligible";
}

/* ------------------------------------------------------------------ */
/* Communication                                                        */
/* ------------------------------------------------------------------ */

export type Channel = "patient" | "mssante" | "interne" | "mon-espace-sante" | "sms" | "telephone";

export interface Message extends BaseRecord {
  kind: "message";
  canal: Channel;
  threadId: string;
  de: { type: "patient" | "praticien" | "confrere" | "agent" | "secretariat" | "labo" | "pharmacie" | "systeme"; nom: string; adresse?: string };
  a: { type: "patient" | "praticien" | "confrere" | "agent" | "secretariat"; nom: string }[];
  date: ISODate;
  objet?: string;
  corps: string;
  piecesJointes?: { nom: string; recordId?: string }[];
  luLe?: ISODate;
  /** Triage par l'agent : intention et urgence, et sa proposition de réponse. */
  triage?: {
    intention: "renouvellement" | "resultat" | "symptome" | "administratif" | "rdv" | "question" | "autre";
    urgence: "aucune" | "semaine" | "jour" | "immediate";
    resume: string;
    reponseProposeeId?: string;
    /** Que l'agent peut répondre seul selon le consentement et la politique. */
    autonomePossible: boolean;
  };
}

/* ------------------------------------------------------------------ */
/* Agenda                                                               */
/* ------------------------------------------------------------------ */

export interface Appointment extends BaseRecord {
  kind: "appointment";
  debut: ISODate;
  dureeMin: number;
  type: EncounterType;
  motif: string;
  praticien: string;
  etat: "prevu" | "en-salle" | "en-cours" | "termine" | "absent" | "annule";
  /** Pris par : patient en ligne, secrétariat, agent (proposé après un résultat…). */
  prisPar: "patient" | "secretariat" | "praticien" | "agent";
  encounterId?: string;
  /** Le briefing préparé par l'agent avant la consultation. */
  preparationId?: string;
}

/* ------------------------------------------------------------------ */
/* L'agent : propositions, briefings, politique d'autonomie             */
/* ------------------------------------------------------------------ */

export type ProposalAction =
  | "creer-enregistrement" // inscrire un problème, un traitement, une mesure…
  | "modifier-enregistrement"
  | "ordonnance"
  | "courrier"
  | "arret-travail"
  | "codage"
  | "facturation"
  | "message-patient"
  | "message-confrere"
  | "rdv"
  | "alimenter-dmp"
  | "rappel" // une tâche pour plus tard
  | "signaler"; // rien à faire sauf regarder

/**
 * Une proposition de l'agent : ce qu'il veut faire, pourquoi, sur quelles
 * sources, et ce que ça changerait. C'est l'unité de travail du LGC agentique.
 * Le médecin ne « remplit » plus : il TRANCHE.
 */
export interface Proposal extends BaseRecord {
  kind: "proposal";
  action: ProposalAction;
  titre: string;
  /** La justification, en une à trois phrases, avec renvois [n] vers `references`. */
  justification: string;
  references?: Citation[];
  /** L'enregistrement complet que l'agent propose de créer (ou le patch). */
  charge?: AnyRecordDraft | { recordId: string; patch: Record<string, unknown> };
  /** Déclencheur : la consultation, le document, le message, l'échéance… */
  declencheur: { type: "encounter" | "document" | "lab" | "message" | "echeance" | "agenda" | "praticien"; recordId?: string; libelle: string };
  /** Niveau d'autonomie appliqué à CETTE proposition (voir `AutonomyPolicy`). */
  autonomie: AutonomyLevel;
  etat: "a-valider" | "validee" | "modifiee" | "rejetee" | "executee" | "expiree";
  decision?: { par: string; le: ISODate; commentaire?: string };
  /** Si exécutée : les enregistrements créés. */
  resultatsIds?: string[];
  /** Agent auteur et traçabilité (identifiant de trace Locus). */
  agent: string;
  traceId?: string;
}

/** Un brouillon d'enregistrement : le corps sans l'enveloppe. L'`action` de la proposition dit de quel type il s'agit. */
export type Draft<T extends BaseRecord> = Omit<T, keyof BaseRecord | "kind">;
export type AnyRecordDraft =
  | Draft<Problem>
  | Draft<Allergy>
  | Draft<Medication>
  | Draft<Measure>
  | Draft<Prescription>
  | Draft<Letter>
  | Draft<SickLeave>
  | Draft<Message>
  | Draft<Appointment>
  | Draft<Vaccination>;

/**
 * 0 — observe : l'agent signale, n'écrit rien.
 * 1 — prépare : l'agent rédige, le praticien valide avant tout effet.
 * 2 — agit : l'agent exécute et rend compte ; révocable.
 */
export type AutonomyLevel = 0 | 1 | 2;

export interface AutonomyPolicy {
  praticien: string;
  /** Par type d'action. Ce qui n'est pas listé est à 1. */
  parAction: Partial<Record<ProposalAction, AutonomyLevel>>;
  /** Jamais au-delà de 1, quoi qu'il arrive. */
  verrous: ProposalAction[];
}

/** Le briefing de l'agent avant une consultation : « voilà où on en est ». */
export interface Briefing extends BaseRecord {
  kind: "briefing";
  appointmentId: string;
  /** Trois à six lignes. */
  synthese: string;
  /** Ce qui s'est passé depuis la dernière fois. */
  depuisDerniereFois: string[];
  /** Ce qui est dû (échéances, dépistages, renouvellements). */
  echeances: { libelle: string; depuis?: ISODate; carePlanId?: string }[];
  /** Questions que l'agent suggère de poser. */
  questions: string[];
  /** Propositions pré-remplies (renouvellement, bilan…). */
  propositionsIds: string[];
  references?: Citation[];
}

/** Le résumé vivant : la projection du dossier en une page, maintenue par l'agent. */
export interface LivingSummary extends BaseRecord {
  kind: "summary";
  /** Une phrase : qui est ce patient. */
  enUneLigne: string;
  /** Le paragraphe de synthèse. */
  synthese: string;
  /** Ce qui compte en ce moment (3 à 5 points). */
  enCeMoment: string[];
  /** Dernière validation par le praticien. */
  derniereValidation?: ISODate;
  /** Enregistrements qui ont changé depuis cette validation. */
  changementsDepuis?: string[];
}

/* ------------------------------------------------------------------ */
/* Journal                                                              */
/* ------------------------------------------------------------------ */

/** Le fil d'audit : qui a fait quoi. Append-only, jamais modifié. */
export interface JournalEntry {
  id: string;
  patientId?: string;
  at: ISODate;
  acteur: { type: Origin; nom: string };
  action: string; // "proposal.validate", "record.create", "fse.send"…
  recordId?: string;
  detail?: string;
}

/* ------------------------------------------------------------------ */
/* Union et dossier                                                     */
/* ------------------------------------------------------------------ */

export type DossierRecord =
  | Patient
  | Problem
  | Allergy
  | Medication
  | Vaccination
  | Measure
  | LabReport
  | ClinicalDocument
  | Encounter
  | Prescription
  | SickLeave
  | Letter
  | CarePlan
  | Screening
  | Message
  | Appointment
  | Proposal
  | Briefing
  | LivingSummary;

export type RecordKind = DossierRecord["kind"];

/** Le dossier d'un patient = son fil d'enregistrements + le journal. */
export interface Dossier {
  patient: Patient;
  records: Exclude<DossierRecord, Patient>[];
  journal: JournalEntry[];
}

/* ------------------------------------------------------------------ */
/* Le cabinet                                                           */
/* ------------------------------------------------------------------ */

export interface Practitioner {
  id: string;
  rpps: string;
  nom: string;
  prenom: string;
  specialite: string;
  /** Secteur conventionnel. */
  secteur: 1 | 2;
  mssante: string;
  /** Prénom de l'agent du cabinet, tel que le praticien l'a nommé. */
  agentNom: string;
}

export interface Cabinet {
  nom: string;
  adresse: string;
  finess?: string;
  praticiens: Practitioner[];
  secretariat?: { nom: string }[];
  /** Tarifs conventionnels en vigueur (NGAP), pour la facturation. */
  tarifs: Record<string, { libelle: string; montant: number }>;
}
