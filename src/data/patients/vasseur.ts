import type { Dossier, Patient } from "@/domain/types";
import { rec, P, journal, LOCUS, SYS } from "../build";
import { at, day } from "../clock";

/** Jean-Pierre Vasseur, 67 ans — BPCO, ex-fumeur, épisode dépressif ; CR pneumo reçu ; dépistage colorectal en retard. */
const ID = "pat_vasseur";

export const patientVasseur = rec("patient", ID, P.systeme("insi"), {
  ins: { matricule: "1 59 02 59 350 112 65", oid: "1.2.250.1.213.1.4.8", nomNaissance: "VASSEUR", prenoms: "JEAN-PIERRE MARCEL", sexe: "M", dateNaissance: "1959-02-27", lieuNaissance: "59350", statut: "qualifiee", verifieeLe: day(-60) },
  nomUsage: "Vasseur", prenomUsuel: "Jean-Pierre", photoHue: 90,
  contact: { telephone: "06 70 80 90 10", adresse: { ligne1: "44 avenue Berthelot", codePostal: "69007", ville: "Lyon" }, canalPrefere: "telephone" },
  couverture: { regime: "general", ald: [{ code: "J44", libelle: "BPCO (insuffisance respiratoire chronique grave)", depuis: "2022-09-01" }], c2s: false, mutuelle: { nom: "MACIF Santé", numero: "MC-2201145" }, medecinTraitant: { rpps: "10003456789", nom: "Dr Romain Vandepitterie", declareLe: "2018-03-05" }, droitsVerifiesLe: day(-60) },
  vie: { profession: "Retraité (ouvrier chaudronnier)", situation: "Marié, 3 enfants adultes" },
  personneConfiance: { nom: "Martine Vasseur", lien: "épouse", telephone: "06 70 80 90 11" },
  consentement: { monEspaceSante: true, dmpAlimentation: true, messagerieAgent: "logistique" },
}, { id: ID, at: "2018-03-05T10:00:00+02:00" });

const pb = {
  bpco: rec("problem", ID, P.medecin("2022-09-01"), { libelle: "BPCO stade GOLD 2 (VEMS 62 %), groupe B", categorie: "medical", cim10: "J44.9", cisp2: "R95", depuis: "2022-09-01", evolution: "chronique", enAvant: true }, { at: "2022-09-01T10:00:00+02:00" }),
  dep: rec("problem", ID, P.medecin(day(-130)), { libelle: "Épisode dépressif caractérisé d'intensité modérée", categorie: "psycho-social", cim10: "F32.1", cisp2: "P76", depuis: day(-130), evolution: "chronique", enAvant: true, note: "PHQ-9 à 16 au diagnostic. Contexte : retraite, dyspnée, deuil d'un frère." }, { at: at("10:00", -130) }),
  tabac: rec("problem", ID, P.medecin("2022-09-01"), { libelle: "Tabac sevré depuis 2022 (45 PA)", categorie: "mode-de-vie", evolution: "antecedent", enAvant: true }, { at: "2022-09-01T10:00:00+02:00" }),
  hernie: rec("problem", ID, P.medecin("2018-03-05"), { libelle: "Cure de hernie inguinale droite (2015)", categorie: "chirurgical", depuis: "2015-06-01", evolution: "antecedent", enAvant: false }, { at: "2018-03-05T10:00:00+02:00" }),
  frere: rec("problem", ID, P.medecin(day(-130)), { libelle: "Cancer colorectal à 64 ans (décédé)", categorie: "familial", apparente: "frère", evolution: "antecedent", enAvant: true }, { at: at("10:00", -130) }),
  amiante: rec("problem", ID, P.medecin("2018-03-05"), { libelle: "Exposition professionnelle à l'amiante (chaudronnerie, 1978-1995)", categorie: "mode-de-vie", evolution: "antecedent", enAvant: true }, { at: "2018-03-05T10:00:00+02:00" }),
};

const meds = [
  rec("medication", ID, P.medecin("2022-09-01"), { dci: "tiotropium", specialite: "SPIRIVA RESPIMAT 2,5 µg", forme: "inhalateur", posologie: "2 bouffées le matin", voie: "inhalée", type: "chronique", ald: true, dernierRenouvellement: day(-40), dureeRenouvellementJours: 90, observance: "bonne" }, { at: "2022-09-01T10:00:00+02:00" }),
  rec("medication", ID, P.medecin(day(-130)), { dci: "sertraline", dosage: "50 mg", forme: "comprimé", posologie: "1 cp le matin", voie: "orale", debut: day(-130), type: "chronique", dernierRenouvellement: day(-40), dureeRenouvellementJours: 90, observance: "bonne" }, { at: at("10:00", -130) }),
  rec("medication", ID, P.medecin("2022-09-01"), { dci: "salbutamol", specialite: "VENTOLINE 100 µg", forme: "inhalateur", posologie: "2 bouffées si besoin", voie: "inhalée", type: "si-besoin", ald: true }, { at: "2022-09-01T10:00:00+02:00" }),
];

const mesures = [
  rec("measure", ID, P.medecin(day(-40)), { type: "poids", valeur: 78, unite: "kg", date: day(-40), contexte: "cabinet" }, { at: at("10:00", -40) }),
  rec("measure", ID, P.medecin(day(-40)), { type: "spo2", valeur: 94, unite: "%", date: day(-40), contexte: "cabinet" }, { at: at("10:00", -40) }),
  rec("measure", ID, P.medecin(day(-40)), { type: "ta", valeur: 128, valeur2: 78, unite: "mmHg", date: day(-40), contexte: "cabinet" }, { at: at("10:00", -40) }),
];

const vaccins = [
  rec("vaccination", ID, P.medecin(day(-380)), { valences: ["Grippe saisonnière"], date: day(-380), rappelPrevu: day(-15) }, { at: at("10:00", -380) }),
  rec("vaccination", ID, P.medecin("2023-11-10"), { valences: ["Pneumocoque"], nomCommercial: "Prevenar 20", date: "2023-11-10" }, { at: "2023-11-10T10:00:00+02:00" }),
  rec("vaccination", ID, P.medecin("2019-02-27"), { valences: ["dTP"], nomCommercial: "Revaxis", date: "2019-02-27", rappelPrevu: "2029-02-27" }, { at: "2019-02-27T10:00:00+02:00" }),
];

const documents = [
  rec("document", ID, P.import("mssante"), {
    type: "cr-specialiste", titre: "Compte rendu de pneumologie — EFR annuelles", auteur: "Dr Samir Ould-Kaci, pneumologue, Hôpital Louis-Pradel", dateDocument: day(-4), recuLe: at("16:40", -2), canal: "mssante", format: "cda", pages: 2,
    texte: `PNEUMOLOGIE — CONSULTATION DE SUIVI — ${day(-4)}

BPCO post-tabagique, sevré depuis 2022. Exposition amiante.
Dyspnée mMRC 2 (stable). 1 exacerbation modérée cet hiver (antibiothérapie en ville), pas d'hospitalisation.
EFR : VEMS 1,78 L (58 %, vs 62 % l'an dernier), VEMS/CVF 0,61, pas de réversibilité. DLCO 64 %.
SpO2 95 % au repos, 91 % au test de marche de 6 min (420 m).
Scanner thoracique low-dose (${day(-20)}) : emphysème centro-lobulaire modéré, plaques pleurales calcifiées bilatérales (amiante), pas de nodule suspect. Contrôle à un an.

Conclusion : BPCO GOLD 2, groupe B, lente dégradation fonctionnelle. Je propose un passage en bithérapie LAMA/LABA (tiotropium/olodatérol, Spiolto Respimat) et une réhabilitation respiratoire ambulatoire (prescription jointe, programme Louis-Pradel). Vaccination grippe à faire cette saison. Plaques pleurales : déclaration en maladie professionnelle (tableau 30B) si non faite — je vous laisse initier.

Dr S. Ould-Kaci`,
    lecture: {
      resume: "BPCO en lente dégradation (VEMS 62 → 58 %). Le pneumologue propose de passer en bithérapie LAMA/LABA (Spiolto), une réhabilitation respiratoire, la vaccination grippe, et de déclarer les plaques pleurales en maladie professionnelle (tableau 30B).",
      faitsExtraits: [{ type: "medication", dci: "tiotropium/olodatérol", posologie: "2 bouffées le matin", action: "debute" }, { type: "medication", dci: "tiotropium", action: "arrete" }, { type: "rdv", libelle: "Réhabilitation respiratoire — programme Louis-Pradel" }, { type: "problem", libelle: "Plaques pleurales calcifiées (amiante)", cim10: "J92.0", statut: "nouveau" }],
      pointsAttention: ["Passage en bithérapie : ordonnance à faire (ALD).", "Déclaration de maladie professionnelle (tableau 30B) : certificat médical initial à rédiger — c'est au médecin traitant.", "Grippe : en retard de 15 jours sur la saison."],
      urgence: "semaine", confidence: 0.93,
    },
  }, { at: at("16:40", -2) }),
];

const encounters = [
  rec("encounter", ID, P.medecin(day(-40)), {
    type: "cabinet", date: at("10:00", -40), dureeMin: 25, praticien: "pr_laurent",
    note: { motifs: ["Suivi dépression (sertraline M3)", "BPCO : renouvellement"], histoire: "Mieux depuis 6 semaines : dort, a repris le jardin, « des journées sans ». PHQ-9 à 8. Pas d'idées noires. Marche 20 min/j. Dyspnée stable.", examen: "SpO2 94 %, TA 128/78, poids 78 kg (+1). Auscultation : quelques sibilants bilatéraux.", conclusion: "Dépression en amélioration sous sertraline 50. BPCO stable.", conduite: "Poursuivre sertraline 50 au moins 6 mois après rémission. Renouvellement 3 mois. EFR annuelles avec le pneumologue le mois prochain. Dépistage colorectal : kit à faire (en retard)." },
    codes: [{ systeme: "drc", code: "DEPRESSION", libelle: "Dépression" }, { systeme: "drc", code: "BPCO", libelle: "Bronchopneumopathie chronique obstructive" }],
    problemesIds: [pb.dep.id, pb.bpco.id],
    actes: [{ code: "G", libelle: "Consultation", montant: 30 }],
    facturation: { mode: "fse", tiersPayant: "amo", transmiseLe: at("10:30", -40) },
  }, { at: at("10:00", -40) }),
];

const carePlans = [
  rec("care-plan", ID, P.agentValide(0.93, "2022-09-01"), {
    problemId: pb.bpco.id, libelle: "Suivi BPCO",
    objectifs: [{ libelle: "Exacerbations", cible: "0-1 par an", actuel: "1 cet hiver", atteint: true }, { libelle: "Dyspnée mMRC", cible: "≤ 2", actuel: "2", atteint: true }],
    items: [
      { libelle: "EFR", periodiciteMois: 12, dernierLe: day(-4), echeance: day(361), satisfaitPar: documents[0].id },
      { libelle: "Vaccination grippe", periodiciteMois: 12, dernierLe: day(-380), echeance: day(-15) },
      { libelle: "Réhabilitation respiratoire", periodiciteMois: 24 },
      { libelle: "Scanner thoracique (amiante)", periodiciteMois: 12, dernierLe: day(-20), echeance: day(345) },
    ],
  }, { at: "2022-09-01T10:00:00+02:00" }),
];

const screenings = [
  rec("screening", ID, P.systeme("depistage"), { programme: "colorectal", libelle: "Dépistage du cancer colorectal", dernierLe: day(-1100), prochainLe: day(-370), etat: "en-retard" }),
];

const appointment = rec("appointment", ID, P.systeme("agenda"), { debut: at("14:30"), dureeMin: 30, type: "cabinet", motif: "Suivi BPCO — compte rendu pneumologue", praticien: "pr_laurent", etat: "prevu", prisPar: "secretariat", preparationId: `${ID}.briefing.1` }, { at: at("10:30", -40) });

const proposals = [
  rec("proposal", ID, P.agent(0.93, [documents[0].id]), {
    action: "ordonnance", titre: "Passer en bithérapie : tiotropium/olodatérol (Spiolto Respimat), arrêt du Spiriva",
    justification: "Proposition du pneumologue [1], conforme à GOLD 2025 pour un groupe B symptomatique sous monothérapie [2]. Même dispositif Respimat (pas de ré-apprentissage). Pas d'interaction avec la sertraline.",
    references: [{ titre: "CR pneumologie Dr Ould-Kaci", editeur: "HCL", date: day(-4) }, { titre: "GOLD Report 2025", editeur: "GOLD" }],
    charge: { type: "medicament", date: day(0), lignes: [{ libelle: "SPIOLTO RESPIMAT 2,5/2,5 µg", dci: "tiotropium/olodatérol", posologie: "2 bouffées le matin", duree: "3 mois", ald: true }, { libelle: "VENTOLINE 100 µg", dci: "salbutamol", posologie: "2 bouffées si besoin", duree: "3 mois", ald: true }], mention: "Remplace Spiriva Respimat." },
    declencheur: { type: "document", recordId: documents[0].id, libelle: "CR pneumologie reçu avant-hier" },
    autonomie: 1, etat: "a-valider", agent: "locus",
  }, { status: "propose", at: at("17:02", -2) }),
  rec("proposal", ID, P.agent(0.9, [documents[0].id]), {
    action: "courrier", titre: "Certificat médical initial — maladie professionnelle (plaques pleurales, tableau 30B)",
    justification: "Plaques pleurales calcifiées bilatérales chez un chaudronnier exposé 17 ans : tableau 30B du régime général [1]. Le CMI est à rédiger par le médecin traitant ; le patient fait ensuite la déclaration à la CPAM. Pré-rempli avec l'exposition du dossier et le scanner.",
    references: [{ titre: "Tableau 30B — Affections professionnelles consécutives à l'inhalation de poussières d'amiante", editeur: "INRS" }],
    charge: { type: "certificat", titre: "Certificat médical initial — maladie professionnelle", destinataire: { nom: "CPAM du Rhône" }, date: day(0), corps: "Je soussignée, Dr Romain Vandepitterie, certifie avoir examiné M. Jean-Pierre Vasseur, né le 27/02/1959, et constaté : plaques pleurales calcifiées bilatérales objectivées au scanner thoracique du " + day(-20) + " (Hôpital Louis-Pradel), chez un patient exposé professionnellement à l'amiante (chaudronnerie, 1978-1995).\n\nDate de première constatation : " + day(-20) + ".\nAffection susceptible de relever du tableau n° 30 B des maladies professionnelles.\n\nFait à Lyon, le " + day(0) + "." },
    declencheur: { type: "document", recordId: documents[0].id, libelle: "CR pneumologie reçu avant-hier" },
    autonomie: 1, etat: "a-valider", agent: "locus",
  }, { status: "propose", at: at("17:05", -2) }),
  rec("proposal", ID, P.agent(0.95, [carePlans[0].id]), {
    action: "rappel", titre: "Grippe à faire cet après-midi (vaccin disponible au cabinet)", justification: "BPCO + 67 ans : vaccination annuelle recommandée, en retard de 15 jours sur la saison [1]. Le pneumologue l'a rappelé.",
    references: [{ titre: "Calendrier des vaccinations 2026", editeur: "Ministère de la Santé" }],
    declencheur: { type: "echeance", recordId: carePlans[0].id, libelle: "Vaccination grippe due" },
    autonomie: 2, etat: "executee", decision: { par: "locus", le: at("17:06", -2) }, agent: "locus",
  }, { status: "actif", at: at("17:06", -2) }),
  rec("proposal", ID, P.agent(0.9, [screenings[0].id]), {
    action: "signaler", titre: "Dépistage colorectal en retard d'un an, frère décédé d'un cancer colorectal à 64 ans",
    justification: "Un antécédent familial au 1er degré avant 65 ans sort du dépistage organisé : la HAS recommande une coloscopie, pas un test immunologique [1]. Le kit mentionné à la dernière consultation n'est donc pas la bonne réponse.",
    references: [{ titre: "Dépistage du cancer colorectal chez les personnes à risque élevé", editeur: "HAS" }],
    declencheur: { type: "echeance", recordId: screenings[0].id, libelle: "Dépistage colorectal en retard" },
    autonomie: 0, etat: "a-valider", agent: "locus",
  }, { status: "propose", at: at("17:08", -2) }),
];

const briefing = rec("briefing", ID, P.agent(0.92, [documents[0].id]), {
  appointmentId: appointment.id,
  synthese: "Jean-Pierre Vasseur, 67 ans, BPCO GOLD 2 en lente dégradation, dépression en amélioration sous sertraline (M4). Le pneumologue propose bithérapie + réhabilitation + déclaration MP amiante. Frère décédé d'un cancer colorectal : coloscopie, pas de kit.",
  depuisDerniereFois: ["CR pneumo (" + day(-4) + ") : VEMS 58 %, emphysème, plaques pleurales, proposition Spiolto + réhabilitation.", "Pas de message du patient."],
  echeances: [{ libelle: "Grippe : en retard de 15 jours — vaccin au cabinet", carePlanId: carePlans[0].id }, { libelle: "Coloscopie (risque élevé) : jamais faite" }, { libelle: "Renouvellement sertraline/BPCO dû dans 50 jours" }],
  questions: ["Humeur : PHQ-9 de contrôle ; sertraline bien tolérée ?", "Réhabilitation respiratoire : prêt à s'engager 2-3 séances/semaine pendant 8 semaines ?", "Maladie professionnelle : lui expliquer le CMI et la démarche CPAM.", "Coloscopie : annoncer que l'antécédent du frère change la règle."],
  propositionsIds: proposals.map((p) => p.id),
}, { id: `${ID}.briefing.1`, status: "propose", at: at("07:35") });

const summary = rec("summary", ID, P.agentValide(0.92, day(-40)), {
  enUneLigne: "67 ans, retraité chaudronnier, BPCO GOLD 2 (ex-fumeur 45 PA, amiante), épisode dépressif sous sertraline.",
  synthese: "BPCO diagnostiquée en 2022 lors du sevrage tabagique, suivie à Louis-Pradel ; une exacerbation par an. Exposition professionnelle à l'amiante avec plaques pleurales. Épisode dépressif depuis 4 mois (retraite, dyspnée, deuil), bonne réponse à la sertraline. Marié, entouré. Frère décédé d'un cancer colorectal.",
  enCeMoment: ["Dégradation fonctionnelle : bithérapie et réhabilitation proposées.", "Maladie professionnelle amiante à déclarer.", "Coloscopie de dépistage (risque familial) jamais faite.", "Vaccination grippe en retard."],
  derniereValidation: day(-40), changementsDepuis: [documents[0].id],
}, { at: at("07:35") });

export const dossierVasseur: Dossier = {
  patient: patientVasseur,
  records: [...Object.values(pb), ...meds, ...mesures, ...vaccins, ...documents, ...encounters, ...carePlans, ...screenings, appointment, ...proposals, briefing, summary],
  journal: [
    journal(ID, at("16:40", -2), SYS("MSSanté"), "document.receive", "CR pneumologie Dr Ould-Kaci", documents[0].id),
    journal(ID, at("16:58", -2), LOCUS, "document.read", "CR lu : bithérapie, réhabilitation, MP amiante", documents[0].id),
    journal(ID, at("17:02", -2), LOCUS, "proposal.create", "Ordonnance Spiolto", proposals[0].id),
    journal(ID, at("17:05", -2), LOCUS, "proposal.create", "CMI maladie professionnelle", proposals[1].id),
    journal(ID, at("17:08", -2), LOCUS, "proposal.create", "Signaler : coloscopie plutôt que kit", proposals[3].id),
  ],
};
