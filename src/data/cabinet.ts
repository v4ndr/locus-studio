import type { Cabinet, Practitioner, AutonomyPolicy } from "@/domain/types";

export const DR_LAURENT: Practitioner = {
  id: "pr_laurent",
  rpps: "10003456789",
  nom: "Laurent",
  prenom: "Claire",
  specialite: "Médecine générale",
  secteur: 1,
  mssante: "claire.laurent@medecin.mssante.fr",
  agentNom: "Locus",
};

export const DR_NDIAYE: Practitioner = {
  id: "pr_ndiaye",
  rpps: "10009876543",
  nom: "Ndiaye",
  prenom: "Moussa",
  specialite: "Médecine générale",
  secteur: 1,
  mssante: "moussa.ndiaye@medecin.mssante.fr",
  agentNom: "Locus",
};

export const CABINET: Cabinet = {
  nom: "Maison de santé des Tilleuls",
  adresse: "12 rue des Tilleuls, 69007 Lyon",
  finess: "690034567",
  praticiens: [DR_LAURENT, DR_NDIAYE],
  secretariat: [{ nom: "Nadia Ferreira" }],
  /* Convention médicale 2024-2029, valeurs 2026 : G à 30 € depuis le 22 déc. 2024. */
  tarifs: {
    G: { libelle: "Consultation médecin généraliste", montant: 30 },
    VG: { libelle: "Visite à domicile", montant: 30 },
    MD: { libelle: "Majoration déplacement", montant: 10 },
    TCG: { libelle: "Téléconsultation", montant: 30 },
    APC: { libelle: "Avis ponctuel de consultant", montant: 60 },
    COE: { libelle: "Examen obligatoire de l'enfant (< 2 ans)", montant: 50 },
    MEG: { libelle: "Majoration enfant 0-6 ans", montant: 5 },
    CSL: { libelle: "Consultation longue (≥ 80 ans, 1/an)", montant: 60 },
    CRP: { libelle: "Consultation de recours pédiatrique", montant: 60 },
  },
};

/** La politique d'autonomie du Dr Laurent — ce que Locus peut faire seul. */
export const AUTONOMY_LAURENT: AutonomyPolicy = {
  praticien: DR_LAURENT.id,
  parAction: {
    "creer-enregistrement": 1,
    "modifier-enregistrement": 1,
    ordonnance: 1,
    courrier: 1,
    "arret-travail": 1,
    codage: 2,
    facturation: 2,
    "message-patient": 1,
    "message-confrere": 1,
    rdv: 2,
    "alimenter-dmp": 2,
    rappel: 2,
    signaler: 0,
  },
  verrous: ["ordonnance", "arret-travail"],
};
