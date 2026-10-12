import type { Dossier, Patient } from "@/domain/types";
import { rec, P, journal, LOCUS, SYS } from "../build";
import { at, day } from "../clock";

/** Léa Moreau, 29 ans — asthme, grossesse découverte (test positif), demande de renouvellement par messagerie. */
const ID = "pat_moreau";

export const patientMoreau = rec("patient", ID, P.systeme("insi"), {
  ins: { matricule: "2 97 06 75 112 089 31", oid: "1.2.250.1.213.1.4.8", nomNaissance: "MOREAU", prenoms: "LEA CAMILLE", sexe: "F", dateNaissance: "1997-06-18", lieuNaissance: "75112", statut: "qualifiee", verifieeLe: day(-200) },
  nomUsage: "Moreau", prenomUsuel: "Léa", photoHue: 320,
  contact: { telephone: "07 61 20 30 40", email: "lea.moreau@exemple.fr", adresse: { ligne1: "3 rue de Marseille", codePostal: "69007", ville: "Lyon" }, canalPrefere: "messagerie" },
  couverture: { regime: "general", mutuelle: { nom: "MGEN", numero: "MG-7731002" }, medecinTraitant: { rpps: "10003456789", nom: "Dr Romain Vandepitterie", declareLe: "2023-01-20" }, droitsVerifiesLe: day(-200) },
  vie: { profession: "Professeure des écoles", situation: "En couple" },
  consentement: { monEspaceSante: true, dmpAlimentation: true, messagerieAgent: "clinique-valide" },
}, { id: ID, at: "2023-01-20T10:00:00+02:00" });

const pb = {
  asthme: rec("problem", ID, P.medecin("2023-01-20"), { libelle: "Asthme persistant léger", categorie: "medical", cim10: "J45.0", cisp2: "R96", depuis: "2008-01-01", evolution: "chronique", enAvant: true }, { at: "2023-01-20T10:00:00+02:00" }),
  grossesse: rec("problem", ID, P.agent(0.93, [`${ID}.message.1`]), { libelle: "Grossesse (test urinaire positif, DDR " + day(-49) + ", ≈ 7 SA)", categorie: "gyneco-obstetrical", cim10: "Z34", cisp2: "W78", depuis: day(-49), evolution: "chronique", enAvant: true }, { status: "propose", at: at("07:20") }),
  g0: rec("problem", ID, P.medecin("2023-01-20"), { libelle: "G0P0, cycles réguliers, DIU cuivre retiré en " + day(-120).slice(0, 7), categorie: "gyneco-obstetrical", evolution: "antecedent", enAvant: false }, { at: "2023-01-20T10:00:00+02:00" }),
  rhinite: rec("problem", ID, P.medecin("2023-01-20"), { libelle: "Rhinite allergique (graminées)", categorie: "medical", cim10: "J30.1", evolution: "chronique", enAvant: true }, { at: "2023-01-20T10:00:00+02:00" }),
};

const allergies = [rec("allergy", ID, P.medecin("2023-01-20"), { substance: "Pollens de graminées", type: "environnementale", reaction: "Rhinoconjonctivite", severite: "legere", certitude: "confirmee" }, { at: "2023-01-20T10:00:00+02:00" })];

const meds = [
  rec("medication", ID, P.medecin(day(-95)), { dci: "budésonide/formotérol", specialite: "SYMBICORT 200/6", dosage: "200/6 µg", forme: "inhalateur", posologie: "1 inhalation matin et soir, + 1 si besoin", voie: "inhalée", type: "chronique", dernierRenouvellement: day(-95), dureeRenouvellementJours: 90, observance: "partielle" }, { at: at("10:00", -95) }),
  rec("medication", ID, P.medecin(day(-95)), { dci: "salbutamol", specialite: "VENTOLINE 100 µg", dosage: "100 µg", forme: "inhalateur", posologie: "1 à 2 bouffées si besoin", voie: "inhalée", type: "si-besoin" }, { at: at("10:00", -95) }),
  rec("medication", ID, P.medecin(day(-95)), { dci: "cétirizine", dosage: "10 mg", forme: "comprimé", posologie: "1 cp le soir en saison", voie: "orale", type: "si-besoin" }, { at: at("10:00", -95) }),
];

const mesures = [
  rec("measure", ID, P.medecin(day(-95)), { type: "poids", valeur: 61, unite: "kg", date: day(-95), contexte: "cabinet" }, { at: at("10:00", -95) }),
  rec("measure", ID, P.medecin(day(-95)), { type: "taille", valeur: 168, unite: "cm", date: day(-95), contexte: "cabinet" }, { at: at("10:00", -95) }),
  rec("measure", ID, P.medecin(day(-95)), { type: "ta", valeur: 112, valeur2: 70, unite: "mmHg", date: day(-95), contexte: "cabinet" }, { at: at("10:00", -95) }),
];

const vaccins = [
  rec("vaccination", ID, P.medecin("2022-10-03"), { valences: ["dTP", "Coqueluche"], nomCommercial: "Repevax", date: "2022-10-03" }, { at: "2022-10-03T10:00:00+02:00" }),
  rec("vaccination", ID, P.medecin("2013-09-01"), { valences: ["HPV"], nomCommercial: "Gardasil (3 doses)", date: "2013-09-01" }, { at: "2013-09-01T10:00:00+02:00" }),
];

const encounters = [
  rec("encounter", ID, P.medecin(day(-95)), {
    type: "cabinet", date: at("10:00", -95), dureeMin: 15, praticien: "pr_laurent",
    note: { motifs: ["Renouvellement asthme", "Retrait DIU — projet de grossesse"], histoire: "Asthme contrôlé (ACT 22). Utilise la Ventoline 1-2 fois par semaine. Souhaite une grossesse ; DIU retiré par sa gynéco le mois dernier. Pas de tabac.", examen: "TA 112/70, auscultation normale, DEP 420 L/min.", conclusion: "Asthme contrôlé. Pré-conception.", conduite: "Renouvellement 3 mois. Acide folique 0,4 mg/j dès maintenant. Vérifier sérologies rubéole/toxoplasmose. Rappeler que le Symbicort se poursuit pendant la grossesse." },
    codes: [{ systeme: "drc", code: "ASTHME", libelle: "Asthme" }, { systeme: "cisp2", code: "W15", libelle: "Désir de grossesse" }],
    actes: [{ code: "G", libelle: "Consultation", montant: 30 }],
    facturation: { mode: "fse", tiersPayant: "aucun", transmiseLe: at("10:15", -95) },
  }, { at: at("10:00", -95) }),
];

const prescriptions = [
  rec("prescription", ID, P.medecin(day(-95)), { type: "medicament", date: day(-95), encounterId: encounters[0].id, lignes: [{ libelle: "SYMBICORT 200/6", dci: "budésonide/formotérol", posologie: "1 inh matin et soir", duree: "3 mois" }, { libelle: "VENTOLINE 100 µg", dci: "salbutamol", posologie: "1-2 bouffées si besoin", duree: "3 mois" }, { libelle: "ACIDE FOLIQUE 0,4 mg", dci: "acide folique", posologie: "1 cp/j", duree: "3 mois" }], signature: { par: "pr_laurent", le: at("10:14", -95) }, ordonnanceNumerique: { id: "ON-9A2C-7TLD-K3M8-QX1R", transmiseLe: at("10:14", -95), dispenseeLe: at("18:00", -95) } }, { at: at("10:14", -95) }),
];

const messages = [
  rec("message", ID, P.patient(), {
    canal: "patient", threadId: "th_moreau_ventoline",
    de: { type: "patient", nom: "Léa Moreau" }, a: [{ type: "praticien", nom: "Dr Vandepitterie" }],
    date: at("22:15", -1),
    objet: "Ventoline + une nouvelle 🙂",
    corps: "Bonsoir Dr Vandepitterie, j'aurais besoin d'une nouvelle ordonnance de Ventoline (il m'en reste très peu, j'ai eu une rhinite avec un peu de sifflements la semaine dernière). Et… test de grossesse positif hier ! Mes dernières règles datent du " + day(-49) + ". Est-ce que je continue le Symbicort ? Qu'est-ce que je dois faire maintenant ? Merci !",
    triage: { intention: "renouvellement", urgence: "semaine", resume: "Grossesse débutante (≈ 7 SA) chez une asthmatique sous Symbicort ; demande Ventoline ; légère perte de contrôle la semaine dernière. Questions sur la conduite à tenir.", autonomePossible: false, reponseProposeeId: `${ID}.message.2` },
  }, { at: at("22:15", -1) }),
  rec("message", ID, P.agent(0.9), {
    canal: "patient", threadId: "th_moreau_ventoline",
    de: { type: "agent", nom: "Locus, pour le Dr Vandepitterie" }, a: [{ type: "patient", nom: "Léa Moreau" }],
    date: at("07:25"),
    objet: "Re: Ventoline + une nouvelle 🙂",
    corps: "Bonjour Léa, et félicitations !\n\nOui : le Symbicort se poursuit tel quel pendant la grossesse — un asthme bien contrôlé est ce qui protège le mieux le bébé. La Ventoline aussi, si besoin.\n\nLe Dr Vandepitterie vous propose un rendez-vous ce matin à 11h00 pour faire le point (asthme + début de grossesse). Elle préparera la déclaration de grossesse, le bilan de début de grossesse et l'ordonnance de Ventoline. Si vous ne pouvez pas, répondez ici et on trouve un autre créneau cette semaine.\n\nSol, pour le Dr Vandepitterie",
  }, { status: "propose", at: at("07:25") }),
];

const appointment = rec("appointment", ID, P.agent(0.9, [messages[0].id]), { debut: at("11:00"), dureeMin: 30, type: "cabinet", motif: "Début de grossesse — asthme", praticien: "pr_laurent", etat: "prevu", prisPar: "agent", preparationId: `${ID}.briefing.1` }, { at: at("07:22") });

const proposals = [
  rec("proposal", ID, P.agent(0.93, [messages[0].id]), {
    action: "creer-enregistrement", titre: "Inscrire la grossesse (DDR " + day(-49) + ", ≈ 7 SA) aux problèmes actifs",
    justification: "Déclarée par la patiente (test positif). L'inscrire avant la consultation rend la grossesse visible au LAP : toute prescription sera vérifiée contre elle.",
    charge: { recordId: pb.grossesse.id, patch: { status: "actif" } },
    declencheur: { type: "message", recordId: messages[0].id, libelle: "Message de Léa Moreau hier soir" },
    autonomie: 1, etat: "a-valider", agent: "locus",
  }, { status: "propose", at: at("07:20") }),
  rec("proposal", ID, P.agent(0.9, [messages[0].id]), {
    action: "rdv", titre: "Rendez-vous proposé à 11h00", justification: "Grossesse débutante + asthme un peu moins contrôlé : à voir cette semaine, pas en urgence. Créneau de 30 min libre à 11h00.",
    declencheur: { type: "message", recordId: messages[0].id, libelle: "Message de Léa Moreau hier soir" },
    autonomie: 2, etat: "executee", decision: { par: "locus", le: at("07:22") }, agent: "locus", resultatsIds: [appointment.id],
  }, { status: "actif", at: at("07:22") }),
  rec("proposal", ID, P.agent(0.9, [messages[0].id]), {
    action: "message-patient", titre: "Répondre à Léa Moreau (poursuite du Symbicort, rendez-vous)",
    justification: "Le maintien des corticoïdes inhalés pendant la grossesse est la recommandation constante (GINA, CRAT) [1]. Réponse à valider (consentement « clinique-validé »).",
    references: [{ titre: "Asthme et grossesse", editeur: "CRAT", url: "https://www.lecrat.fr" }],
    charge: { recordId: messages[1].id, patch: { status: "actif" } },
    declencheur: { type: "message", recordId: messages[0].id, libelle: "Message de Léa Moreau hier soir" },
    autonomie: 1, etat: "a-valider", agent: "locus",
  }, { status: "propose", at: at("07:25") }),
  rec("proposal", ID, P.agent(0.92, [messages[0].id]), {
    action: "ordonnance", titre: "Bilan de début de grossesse + Ventoline",
    justification: "Examens obligatoires du 1er trimestre (groupe/RAI, sérologies toxoplasmose, rubéole, syphilis, VIH proposé, glycémie à jeun, NFS, albuminurie/glycosurie) [1], échographie de datation entre 11 et 13 SA + 6 j, et renouvellement du salbutamol. Vérifié grossesse : aucune ligne contre-indiquée.",
    references: [{ docId: "has-grossesse-2016", titre: "Suivi et orientation des femmes enceintes en fonction des situations à risque identifiées", editeur: "HAS", date: "2016" }],
    charge: { type: "biologie", date: day(0), lignes: [{ libelle: "Groupe sanguin ABO-Rh, RAI" }, { libelle: "Sérologie toxoplasmose" }, { libelle: "Sérologie rubéole" }, { libelle: "Sérologie syphilis (TPHA-VDRL)" }, { libelle: "Sérologie VIH (proposée)" }, { libelle: "Glycémie à jeun" }, { libelle: "NFS" }, { libelle: "Albuminurie, glycosurie" }], mention: "Échographie de datation à programmer entre 11 et 13 SA + 6 j." },
    declencheur: { type: "message", recordId: messages[0].id, libelle: "Message de Léa Moreau hier soir" },
    autonomie: 1, etat: "a-valider", agent: "locus",
  }, { status: "propose", at: at("07:27") }),
  rec("proposal", ID, P.agent(0.88), {
    action: "rappel", titre: "Vaccination coqueluche (2e trimestre) et grippe (dès maintenant, saison en cours)",
    justification: "Calendrier vaccinal 2026 : coqueluche entre 20 et 36 SA à chaque grossesse ; grippe recommandée à tout terme pendant la saison [1]. Rappel posé à 20 SA ; la grippe peut se faire ce matin.",
    references: [{ titre: "Calendrier des vaccinations 2026", editeur: "Ministère de la Santé" }],
    declencheur: { type: "echeance", libelle: "Grossesse ≈ 7 SA" },
    autonomie: 2, etat: "executee", decision: { par: "locus", le: at("07:28") }, agent: "locus",
  }, { status: "actif", at: at("07:28") }),
];

const briefing = rec("briefing", ID, P.agent(0.9, [messages[0].id]), {
  appointmentId: appointment.id,
  synthese: "Léa Moreau, 29 ans, asthmatique sous Symbicort, enceinte (≈ 7 SA, test urinaire positif hier). Petite perte de contrôle de l'asthme la semaine dernière sur rhinite. Pré-conception préparée en " + day(-95).slice(0, 7) + " (acide folique en cours).",
  depuisDerniereFois: ["Message hier 22h15 : test positif, DDR " + day(-49) + ", demande Ventoline, sifflements la semaine dernière."],
  echeances: [{ libelle: "Déclaration de grossesse (DSG amelipro) avant 14 SA" }, { libelle: "Échographie T1 : 11-13 SA + 6 j, soit entre " + day(28) + " et " + day(48) }, { libelle: "Vaccination grippe (saison) : à proposer ce matin" }],
  questions: ["ACT / contrôle de l'asthme : fréquence de la Ventoline, réveils nocturnes ?", "Nausées, saignements, douleurs ?", "Acide folique poursuivi ?", "Tabac, alcool : non connus — confirmer.", "Souhaite-t-elle un suivi par vous, une sage-femme, une maternité ? (orientation HAS : grossesse à bas risque, suivi A)"],
  propositionsIds: [proposals[0].id, proposals[3].id],
}, { id: `${ID}.briefing.1`, status: "propose", at: at("07:30") });

const summary = rec("summary", ID, P.agentValide(0.9, day(-95)), {
  enUneLigne: "29 ans, enseignante, asthme persistant léger contrôlé, grossesse débutante.",
  synthese: "Asthme depuis l'enfance, contrôlé sous budésonide/formotérol, rhinite allergique aux graminées. Projet de grossesse préparé cet été (DIU retiré, acide folique). Test de grossesse positif hier.",
  enCeMoment: ["Début de grossesse : déclaration, bilan T1, orientation.", "Asthme : maintenir le traitement, vérifier le contrôle.", "Vaccins : grippe maintenant, coqueluche au T2."],
  derniereValidation: day(-95), changementsDepuis: [messages[0].id],
}, { at: at("07:30") });

export const dossierMoreau: Dossier = {
  patient: patientMoreau,
  records: [...Object.values(pb), ...allergies, ...meds, ...mesures, ...vaccins, ...encounters, ...prescriptions, ...messages, appointment, ...proposals, briefing, summary],
  journal: [
    journal(ID, at("22:15", -1), SYS("Messagerie"), "message.receive", "Message de Léa Moreau", messages[0].id),
    journal(ID, at("07:20"), LOCUS, "proposal.create", "Inscrire la grossesse", proposals[0].id),
    journal(ID, at("07:22"), LOCUS, "appointment.create", "RDV 11h00 proposé (autonomie 2)", appointment.id),
    journal(ID, at("07:28"), LOCUS, "reminder.create", "Rappel coqueluche à 20 SA", proposals[4].id),
  ],
};
