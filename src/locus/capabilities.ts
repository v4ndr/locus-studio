/**
 * Le registre des capacités de l'agent du cabinet (Locus), et ce que locus-core en
 * porte aujourd'hui.
 *
 * Le studio est un bac à sable pour locus-core : on y construit les usages
 * AVANT que core les permette. Chaque capacité dit donc honnêtement d'où
 * elle vient : `live` (core la sert), `compose` (le studio la compose à
 * partir de capacités live) ou `projetee` (simulée dans le studio, à
 * porter dans core — la spec est dans docs/integration-locus.md).
 */
export type CapabilityStatus = "live" | "compose" | "projetee";

export interface Capability {
  id: string;
  nom: string;
  statut: CapabilityStatus;
  /** Ce que la capacité fait, en une phrase. */
  quoi: string;
  /** Comment le studio l'obtient aujourd'hui. */
  comment: string;
  /** La route core qui la porte ou la portera. */
  route: string;
}

export const CAPABILITIES: Capability[] = [
  { id: "retrieve", nom: "Répondre avec les sources", statut: "live", quoi: "Une question clinique, contextualisée par le dossier, répondue avec renvois aux recommandations (HAS, ANSM, SPF…) et aux RCP.", comment: "POST /v2/retrieve/stream avec `patient_ehr` projeté depuis le dossier.", route: "POST /v2/retrieve/stream" },
  { id: "ehr-additions", nom: "Apprendre du dialogue", statut: "live", quoi: "Un fait patient énoncé dans la conversation (« elle est enceinte ») revient en `ehr_additions` et devient une proposition d'inscription au dossier.", comment: "Champ `ehr_additions` de la réponse → Proposal `creer-enregistrement`.", route: "POST /v2/retrieve" },
  { id: "rcp", nom: "Lire le RCP d'une spécialité", statut: "live", quoi: "Les rubriques du RCP (indications, posologie, contre-indications, interactions…) d'un médicament, par code CIS.", comment: "GET /v2/drugs/specialites/{cis} et /v2/drugs/rubrics/{id}.", route: "GET /v2/drugs/*" },
  { id: "logic", nom: "Calculer un score ou dérouler un arbre", statut: "live", quoi: "CHA₂DS₂-VASc, HAS-BLED, FINDRISC, un arbre de décision HAS… calculés sans modèle, de manière déterministe.", comment: "POST /v2/logic/compute avec les réponses tirées du dossier.", route: "POST /v2/logic/compute" },
  { id: "briefing", nom: "Préparer la consultation", statut: "compose", quoi: "Avant chaque rendez-vous : ce qui a changé, ce qui est dû, les questions à poser, les propositions pré-remplies.", comment: "Règles locales (échéances, plans de soins) + un retrieve ciblé sur les problèmes actifs.", route: "retrieve + règles studio" },
  { id: "lap", nom: "Vérifier une ordonnance", statut: "compose", quoi: "Interactions, contre-indications, allergies, adaptation rénale, posologie — posées ligne par ligne avec la rubrique RCP qui les justifie.", comment: "Croise le dossier (allergies, DFG, traitements) avec les rubriques 4.3 / 4.5 des RCP via /v2/drugs.", route: "drugs + règles studio" },
  { id: "scribe", nom: "Écrire la note de consultation", statut: "projetee", quoi: "Depuis l'écoute ambiante (consentie) : motif, histoire, examen, conclusion, conduite à tenir — structurés et codés (DRC / CISP-2).", comment: "Simulé : les transcriptions du jeu de données sont déjà structurées. Spec : `POST /v2/scribe`.", route: "POST /v2/scribe (à venir)" },
  { id: "document", nom: "Lire un document reçu", statut: "projetee", quoi: "Un compte rendu, un courrier, une biologie : résumé, faits extraits (problème, traitement, mesure), points d'attention, urgence.", comment: "Simulé : les lectures sont dans le jeu de données. Spec : `POST /v2/documents/analyze`.", route: "POST /v2/documents/analyze (à venir)" },
  { id: "prescription", nom: "Rédiger une ordonnance", statut: "projetee", quoi: "Depuis la conclusion de consultation ou un renouvellement dû : les lignes, posologies, durées, mentions ALD — vérifiées par le LAP.", comment: "Simulé : brouillons dans le jeu de données + vérification LAP composée. Spec : `POST /v2/prescriptions/draft`.", route: "POST /v2/prescriptions/draft (à venir)" },
  { id: "letter", nom: "Rédiger un courrier", statut: "projetee", quoi: "Adressage, certificat, réponse à un confrère — avec les éléments du dossier pertinents, prêt à signer.", comment: "Simulé. Spec : `POST /v2/letters/draft`.", route: "POST /v2/letters/draft (à venir)" },
  { id: "triage", nom: "Trier la boîte de réception", statut: "projetee", quoi: "Messages patients, MSSanté, résultats : intention, urgence, réponse proposée, et ce que l'agent peut répondre seul.", comment: "Simulé. Spec : `POST /v2/inbox/triage`.", route: "POST /v2/inbox/triage (à venir)" },
  { id: "actions", nom: "Agir dans le dossier", statut: "projetee", quoi: "Inscrire un problème, un traitement, une mesure ; alimenter le DMP ; facturer ; prendre un rendez-vous — sous politique d'autonomie.", comment: "Le studio exécute les propositions validées ; la politique d'autonomie est locale. Spec : `POST /v2/actions`.", route: "POST /v2/actions (à venir)" },
  { id: "summary", nom: "Tenir le résumé vivant", statut: "projetee", quoi: "La synthèse d'une page du patient, maintenue à chaque événement, et signalant ce qui a changé depuis la dernière validation.", comment: "Simulé. Spec : `POST /v2/summary`.", route: "POST /v2/summary (à venir)" },
];
