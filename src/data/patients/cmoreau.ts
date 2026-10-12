import type { Dossier, Patient } from "@/domain/types";
import { rec, P, journal, LOCUS, SYS } from "../build";
import { at, day } from "../clock";

/**
 * Claire Moreau, 46 ans — aide-soignante, épicondylite droite en arrêt depuis
 * août, scanner du coude arrivé, arthralgies des mains en bilan (anti-CCP en
 * attente), hypothyroïdie. La patiente du parcours « rencontre » du design.
 */
const ID = "pat_cmoreau";

export const patientCMoreau = rec("patient", ID, P.systeme("insi"), {
  ins: { matricule: "2 80 03 69 266 118 42", oid: "1.2.250.1.213.1.4.8", nomNaissance: "MOREAU", prenoms: "CLAIRE ANNE", sexe: "F", dateNaissance: "1980-03-14", lieuNaissance: "69266", statut: "qualifiee", verifieeLe: day(-29) },
  nomUsage: "Moreau", prenomUsuel: "Claire", photoHue: 255,
  contact: { telephone: "06 31 22 40 18", email: "claire.moreau@exemple.fr", adresse: { ligne1: "5 rue Chevreul", codePostal: "69007", ville: "Lyon" }, canalPrefere: "messagerie" },
  couverture: { regime: "general", mutuelle: { nom: "MNH", numero: "MNH-7720411" }, medecinTraitant: { rpps: "10003456789", nom: "Dr Romain Vandepitterie", declareLe: "2017-05-02" }, droitsVerifiesLe: day(-29) },
  vie: { profession: "Aide-soignante, EHPAD, temps plein", situation: "En couple · 2 enfants (12 et 16 ans) · droitière" },
  consentement: { monEspaceSante: true, dmpAlimentation: true, messagerieAgent: "clinique-valide" },
}, { id: ID, at: "2017-05-02T10:00:00+02:00" });

const pb = {
  epi: rec("problem", ID, P.medecin("2026-08-12"), { libelle: "Épicondylite latérale droite", categorie: "medical", cim10: "M77.1", cisp2: "L93", depuis: "2026-08-12", evolution: "chronique", enAvant: true, note: "Arrêt de travail depuis le 12/08/2026 (J+61). Kiné 10 séances faites." }, { at: "2026-08-12T10:00:00+02:00" }),
  mains: rec("problem", ID, P.medecin(day(-13)), { libelle: "Arthralgies des mains", categorie: "medical", cim10: "M25.5", cisp2: "L20", depuis: day(-13), evolution: "chronique", enAvant: true, note: "Raideur matinale ~20 min. CRP 4, VS 18, FR négatif, anti-CCP en attente." }, { at: at("10:00", -13) }),
  thyro: rec("problem", ID, P.medecin("2018-04-10"), { libelle: "Hypothyroïdie", categorie: "medical", cim10: "E03.9", cisp2: "T86", depuis: "2018-04-10", evolution: "chronique", enAvant: true }, { at: "2018-04-10T10:00:00+02:00" }),
  appendic: rec("problem", ID, P.medecin("2017-05-02"), { libelle: "Appendicectomie", categorie: "chirurgical", depuis: "1996-06-01", evolution: "antecedent", enAvant: true }, { at: "2017-05-02T10:00:00+02:00" }),
  grossesses: rec("problem", ID, P.medecin("2017-05-02"), { libelle: "2 grossesses, 2 accouchements voie basse (2010, 2014)", categorie: "gyneco-obstetrical", evolution: "antecedent", enAvant: true }, { at: "2017-05-02T10:00:00+02:00" }),
  mere: rec("problem", ID, P.medecin("2017-05-02"), { libelle: "Polyarthrite rhumatoïde", categorie: "familial", apparente: "mère", evolution: "antecedent", enAvant: true }, { at: "2017-05-02T10:00:00+02:00" }),
  pere: rec("problem", ID, P.medecin("2017-05-02"), { libelle: "Infarctus du myocarde à 62 ans", categorie: "familial", apparente: "père", evolution: "antecedent", enAvant: true }, { at: "2017-05-02T10:00:00+02:00" }),
  tabac: rec("problem", ID, P.medecin("2017-05-02"), { libelle: "Ancienne fumeuse · 8 PA, sevrée 2015", categorie: "mode-de-vie", evolution: "antecedent", enAvant: true }, { at: "2017-05-02T10:00:00+02:00" }),
  alcool: rec("problem", ID, P.medecin("2017-05-02"), { libelle: "Alcool occasionnel · marche 2×/sem", categorie: "mode-de-vie", evolution: "antecedent", enAvant: true }, { at: "2017-05-02T10:00:00+02:00" }),
};

const allergies = [rec("allergy", ID, P.medecin(day(-29)), { substance: "AINS (intolérance digestive)", type: "medicamenteuse", reaction: "Gastralgies sous ibuprofène, 09/2026", severite: "legere", certitude: "confirmee", atc: "M01A" }, { at: at("10:00", -29) })];

const meds = [
  rec("medication", ID, P.medecin("2018-04-10"), { dci: "lévothyroxine", dosage: "75 µg", forme: "comprimé", posologie: "1 cp le matin à jeun", voie: "orale", debut: "2018-04-10", type: "chronique", dernierRenouvellement: day(-117), dureeRenouvellementJours: 90, observance: "bonne" }, { at: "2018-04-10T10:00:00+02:00" }),
  rec("medication", ID, P.medecin(day(-29)), { dci: "paracétamol", dosage: "1 g", forme: "comprimé", posologie: "1 cp si douleur, max 3 g/j", voie: "orale", type: "si-besoin", dernierRenouvellement: day(-29), dureeRenouvellementJours: 21 }, { at: at("10:00", -29) }),
];

const vaccins = [
  rec("vaccination", ID, P.medecin("2021-02-03"), { valences: ["dTP"], nomCommercial: "Revaxis", date: "2021-02-03", rappelPrevu: "2025-03-14" }, { at: "2021-02-03T10:00:00+02:00" }),
];

const mesures = [
  rec("measure", ID, P.medecin(day(-29)), { type: "poids", valeur: 63, unite: "kg", date: day(-29), contexte: "cabinet" }, { at: at("10:00", -29) }),
  rec("measure", ID, P.medecin(day(-29)), { type: "taille", valeur: 166, unite: "cm", date: day(-29), contexte: "cabinet" }, { at: at("10:00", -29) }),
  rec("measure", ID, P.medecin(day(-29)), { type: "ta", valeur: 118, valeur2: 74, unite: "mmHg", date: day(-29), contexte: "cabinet" }, { at: at("10:00", -29) }),
  rec("measure", ID, P.medecin(day(-29)), { type: "douleur-eva", valeur: 6, unite: "/10", date: day(-29), contexte: "cabinet" }, { at: at("10:00", -29) }),
];

const labs = [
  rec("lab", ID, P.import("hprim"), { laboratoire: "Laboratoire Cerballiance", prelevementLe: day(-13), recuLe: at("11:00", -12), vuLe: at("10:00", -11),
    resultats: [
      { loinc: "1988-5", libelle: "CRP", valeur: 4, unite: "mg/L", refMax: 5, flag: "normal" },
      { loinc: "30341-2", libelle: "VS", valeur: 18, unite: "mm", refMax: 20, flag: "normal" },
      { loinc: "11572-5", libelle: "Facteur rhumatoïde", valeur: "négatif", flag: "normal" },
      { loinc: "33935-8", libelle: "Anti-CCP", valeur: "en attente", flag: "normal" },
    ],
    lecture: { resume: "Bilan inflammatoire normal, FR négatif. Les anti-CCP ne sont pas rendus : à surveiller (mère polyarthritique).", faitsExtraits: [], pointsAttention: ["Anti-CCP en attente depuis 12 jours : relancer le laboratoire."], urgence: "aucune", confidence: 0.95 } }, { at: at("11:00", -12) }),
  rec("lab", ID, P.import("hprim"), { laboratoire: "Laboratoire Cerballiance", prelevementLe: "2026-06-20", recuLe: "2026-06-21T09:00:00+02:00", vuLe: "2026-06-22T10:00:00+02:00",
    resultats: [{ loinc: "3016-3", libelle: "TSH", valeur: 1.9, unite: "mUI/L", refMin: 0.4, refMax: 4, flag: "normal", precedent: { valeur: 2.3, date: "2025-06-18" } }],
    lecture: { resume: "TSH dans la cible sous 75 µg.", faitsExtraits: [], pointsAttention: [], urgence: "aucune", confidence: 0.98 } }, { at: "2026-06-21T09:00:00+02:00" }),
];

const documents = [
  rec("document", ID, P.import("mssante"), {
    type: "cr-imagerie", titre: "Scanner du coude droit · compte rendu", auteur: "Cabinet de radiologie Lyon-Part-Dieu", dateDocument: day(-4), recuLe: at("18:20", -4), canal: "mssante", format: "pdf", pages: 1,
    texte: `SCANNER DU COUDE DROIT — ${day(-4)}\n\nIndication : épicondylite latérale droite résistante, recherche d'atteinte osseuse.\n\nRésultat : épaississement et hypodensité de l'enthèse des épicondyliens latéraux, compatible avec une enthésopathie. Pas de fracture, pas de lésion osseuse, pas de corps étranger intra-articulaire, pas d'épanchement.\n\nConclusion : enthésopathie des épicondyliens latéraux. Pas d'anomalie osseuse.`,
    lecture: { resume: "Enthésopathie des épicondyliens, rien d'osseux : le diagnostic d'épicondylite est confirmé, pas de cause chirurgicale.", faitsExtraits: [{ type: "problem", libelle: "Épicondylite latérale droite (enthésopathie confirmée au scanner)", statut: "confirme" }], pointsAttention: ["Manutention répétée en EHPAD : maladie professionnelle, tableau 57 RG, à déclarer."], urgence: "semaine", confidence: 0.95 },
  }, { at: at("18:20", -4) }),
  rec("document", ID, P.import("mssante"), { type: "cr-specialiste", titre: "Bilan kiné mi-parcours", auteur: "Kinésithérapeute — M. Terrier", dateDocument: day(-21), recuLe: at("12:00", -21), canal: "mssante", format: "pdf", texte: "10 séances. Douleur à la préhension persistante (EVA 6). Renforcement excentrique débuté. Propose de poursuivre 15 séances.", vuLe: at("10:00", -20), lecture: { resume: "Kiné à poursuivre : 15 séances proposées.", faitsExtraits: [], pointsAttention: [], urgence: "aucune", confidence: 0.96 } }, { at: at("12:00", -21) }),
  rec("document", ID, P.import("mssante"), { type: "cr-imagerie", titre: "Mammographie de dépistage", auteur: "Centre de dépistage", dateDocument: "2025-11-05", recuLe: "2025-11-07T10:00:00+01:00", canal: "dmp", format: "pdf", texte: "Mammographie bilatérale : ACR 1. Prochain dépistage dans 2 ans.", vuLe: "2025-11-08T10:00:00+01:00" }, { at: "2025-11-07T10:00:00+01:00" }),
];

const encounters = [
  rec("encounter", ID, P.medecin(day(-29)), {
    type: "cabinet", date: at("10:00", -29), dureeMin: 18, praticien: "pr_laurent",
    note: { motifs: ["Épicondylite : prolongation d'arrêt", "Douleurs des mains"], histoire: "Douleur épicondyle D persistante, EVA 6, malgré kiné. Gastralgies sous ibuprofène. Raideur matinale des mains ~20 min.", examen: "Cozen +, pas de synovite des mains.", conclusion: "Épicondylite résistante. Arthralgies des mains : bilan.", conduite: "Prolongation 4 semaines. Arrêt des AINS, paracétamol. Scanner du coude. CRP, VS, FR, anti-CCP." },
    codes: [{ systeme: "drc", code: "EPICONDYLITE", libelle: "Épicondylite" }, { systeme: "drc", code: "ARTHRALGIE", libelle: "Arthralgie" }],
    actes: [{ code: "G", libelle: "Consultation", montant: 30 }], facturation: { mode: "fse", tiersPayant: "aucun", transmiseLe: at("10:20", -29) },
  }, { at: at("10:00", -29) }),
  rec("encounter", ID, P.medecin("2026-08-12"), { type: "cabinet", date: "2026-08-12T10:00:00+02:00", dureeMin: 15, praticien: "pr_laurent", note: { motifs: ["Douleur coude droit"], conclusion: "Épicondylite latérale droite.", conduite: "Arrêt 3 semaines, ibuprofène 7 j, kiné 10 séances." }, codes: [{ systeme: "drc", code: "EPICONDYLITE", libelle: "Épicondylite" }], actes: [{ code: "G", libelle: "Consultation", montant: 30 }], facturation: { mode: "fse", tiersPayant: "aucun" } }, { at: "2026-08-12T10:00:00+02:00" }),
];

const prescriptions = [
  rec("prescription", ID, P.medecin("2026-06-20"), { type: "medicament", date: "2026-06-20", lignes: [{ libelle: "LÉVOTHYROXINE 75 µg", dci: "lévothyroxine", posologie: "1 cp le matin à jeun", duree: "3 mois" }], signature: { par: "pr_laurent", le: "2026-06-20T10:10:00+02:00" }, ordonnanceNumerique: { id: "ON-2K7P-9QAL-MW31-XB8D", transmiseLe: "2026-06-20T10:10:00+02:00", dispenseeLe: "2026-06-20T17:00:00+02:00" } }, { at: "2026-06-20T10:10:00+02:00" }),
  rec("prescription", ID, P.medecin("2026-03-14"), { type: "medicament", date: "2026-03-14", lignes: [{ libelle: "LÉVOTHYROXINE 75 µg", dci: "lévothyroxine", posologie: "1 cp le matin à jeun", duree: "3 mois" }], signature: { par: "pr_laurent", le: "2026-03-14T10:10:00+01:00" } }, { at: "2026-03-14T10:10:00+01:00" }),
  rec("prescription", ID, P.medecin("2026-08-18"), { type: "paramedical", date: "2026-08-18", lignes: [{ libelle: "Kinésithérapie · 10 séances coude droit", posologie: "Rééducation épicondylite latérale" }], signature: { par: "pr_laurent", le: "2026-08-18T10:10:00+02:00" } }, { at: "2026-08-18T10:10:00+02:00" }),
  rec("prescription", ID, P.medecin("2026-08-12"), { type: "medicament", date: "2026-08-12", lignes: [{ libelle: "IBUPROFÈNE 400 mg", dci: "ibuprofène", posologie: "1 cp ×3/j au repas", duree: "7 jours" }], signature: { par: "pr_laurent", le: "2026-08-12T10:10:00+02:00" } }, { at: "2026-08-12T10:10:00+02:00" }),
  rec("prescription", ID, P.medecin(day(-29)), { type: "medicament", date: day(-29), lignes: [{ libelle: "PARACÉTAMOL 1 g", dci: "paracétamol", posologie: "1 cp si douleur, max 3 g/j", duree: "3 semaines" }], signature: { par: "pr_laurent", le: at("10:15", -29) } }, { at: at("10:15", -29) }),
];

const sickLeaves = [
  rec("sick-leave", ID, P.medecin("2026-08-12"), { du: "2026-08-12", au: "2026-09-01", motif: "Épicondylite latérale droite", sortiesAutorisees: "libres", teletransmis: { le: "2026-08-12T10:12:00+02:00", numero: "AAT-26-081233" } }, { at: "2026-08-12T10:12:00+02:00" }),
  rec("sick-leave", ID, P.medecin(day(-29)), { du: day(-29), au: day(-1), motif: "Épicondylite latérale droite", sortiesAutorisees: "libres", prolongation: true, teletransmis: { le: at("10:14", -29), numero: "AAT-26-091644" } }, { at: at("10:14", -29) }),
];

const screenings = [
  rec("screening", ID, P.systeme("depistage"), { programme: "col-uterus", libelle: "Test HPV", dernierLe: "2024-04-02", prochainLe: "2029-04-02", etat: "a-jour" }),
  rec("screening", ID, P.systeme("depistage"), { programme: "sein", libelle: "Mammographie de dépistage", dernierLe: "2025-11-05", prochainLe: "2027-11-05", etat: "a-jour" }),
  rec("screening", ID, P.systeme("depistage"), { programme: "colorectal", libelle: "Dépistage colorectal · à partir de 50 ans", prochainLe: "2030-03-14", etat: "non-eligible" }),
];

const appointment = rec("appointment", ID, P.systeme("agenda"), { debut: at("10:30"), dureeMin: 20, type: "cabinet", motif: "Renouvellement arrêt · scanner reçu", praticien: "pr_laurent", etat: "prevu", prisPar: "patient", preparationId: `${ID}.briefing.1` }, { at: at("10:00", -29) });

const proposals = [
  rec("proposal", ID, P.agent(0.93, [documents[0].id]), { action: "signaler", titre: "Scanner coude D · enthésopathie, rien d'osseux", justification: "Le compte rendu du scanner est arrivé : enthésopathie des épicondyliens, pas d'anomalie osseuse. Le diagnostic est confirmé ; pas de cause chirurgicale.", declencheur: { type: "document", recordId: documents[0].id, libelle: "Scanner reçu" }, autonomie: 0, etat: "a-valider", agent: "locus" }, { status: "propose", at: at("18:31", -4) }),
  rec("proposal", ID, P.agent(0.9, [vaccins[0].id]), { action: "rappel", titre: "Rappel dTcaPolio des 45 ans", justification: "Dernier dTP en 2021 ; rappel des 45 ans dû depuis mars 2025 [calendrier vaccinal].", declencheur: { type: "echeance", libelle: "Rappel vaccinal dû" }, autonomie: 0, etat: "a-valider", agent: "locus" }, { status: "propose", at: at("07:40") }),
  rec("proposal", ID, P.agent(0.88, [labs[0].id]), { action: "message-patient", titre: "Mail : rappel prise de sang (anti-CCP)", justification: "Le dosage des anti-CCP n'est pas revenu 12 jours après le prélèvement : demander à la patiente de vérifier auprès du laboratoire.", charge: { canal: "patient", threadId: "th_cmoreau", de: { type: "agent", nom: "Locus, pour le Dr Vandepitterie" }, a: [{ type: "patient", nom: "Claire Moreau" }], date: day(0), objet: "Rappel bilan sanguin", corps: "Bonjour Madame Moreau, le dosage des anti-CCP n'est pas encore revenu. Pouvez-vous vérifier auprès du laboratoire que le prélèvement a bien été réalisé ? Bien cordialement, Dr Vandepitterie" }, declencheur: { type: "lab", recordId: labs[0].id, libelle: "Anti-CCP en attente" }, autonomie: 1, etat: "a-valider", agent: "locus" }, { status: "propose", at: at("07:41") }),
  rec("proposal", ID, P.agent(0.95, [meds[0].id]), { action: "ordonnance", titre: "Renouveler la Lévothyrox", justification: "Lévothyroxine 75 µg, 1 comprimé le matin à jeun, QSP 3 mois. Dernière TSH 06/2026 dans la cible. Prête à signer.", charge: { type: "medicament", date: day(0), lignes: [{ libelle: "LÉVOTHYROXINE 75 µg", dci: "lévothyroxine", posologie: "1 cp le matin à jeun", duree: "3 mois" }] }, declencheur: { type: "echeance", libelle: "Renouvellement dû" }, autonomie: 1, etat: "a-valider", agent: "locus" }, { status: "propose", at: at("07:42") }),
  rec("proposal", ID, P.agent(0.9, [appointment.id]), { action: "rdv", titre: "RDV dans 3 semaines", justification: "Réévaluation épicondylite avant fin d'arrêt. Créneau libre le plus proche de J+21. SMS de confirmation à la patiente.", charge: { debut: at("10:30", 18), dureeMin: 20, type: "cabinet", motif: "Réévaluation épicondylite avant fin d'arrêt", praticien: "pr_laurent", etat: "prevu", prisPar: "agent" }, declencheur: { type: "praticien", libelle: "Demande" }, autonomie: 1, etat: "a-valider", agent: "locus" }, { status: "propose", at: at("07:43") }),
];

const briefing = rec("briefing", ID, P.agent(0.93, [documents[0].id, labs[0].id]), {
  appointmentId: appointment.id,
  synthese: "Arrêt pour épicondylite droite jusqu'au **" + fmtFr(day(-1)) + "**. Le ==scanner du coude est arrivé==. Douleurs des mains en bilan, anti-CCP en attente.",
  depuisDerniereFois: ["Scanner coude D (" + day(-4) + ") : enthésopathie, rien d'osseux.", "Bilan : CRP 4, VS 18, FR négatif ; anti-CCP en attente.", "Kiné : 10 séances faites, 15 proposées."],
  echeances: [{ libelle: "Rappel dTcaPolio des 45 ans — dû" }, { libelle: "Renouvellement lévothyroxine dû" }],
  questions: ["Douleur et préhension : EVA, Cozen ?", "Poste : manutention répétée → déclaration en maladie professionnelle (tableau 57) ?", "Mains : raideur matinale, synovite ?"],
  propositionsIds: proposals.map((p) => p.id),
}, { id: `${ID}.briefing.1`, status: "propose", at: at("07:45") });

const summary = rec("summary", ID, P.agentValide(0.95, day(-29)), {
  enUneLigne: "46 ans, aide-soignante, épicondylite droite en arrêt depuis août, arthralgies des mains en bilan, hypothyroïdie.",
  synthese: "Aide-soignante en EHPAD, manutention répétée. Épicondylite latérale droite depuis août 2026, en arrêt (J+61), kiné en cours, AINS arrêtés pour gastralgies. Douleurs des mains avec raideur matinale, bilan en cours (mère polyarthritique). Hypothyroïdie équilibrée sous lévothyroxine 75.",
  enCeMoment: ["Scanner du coude arrivé : enthésopathie, rien d'osseux.", "Anti-CCP en attente.", "Rappel dTcaPolio des 45 ans dû."],
  derniereValidation: day(-29), changementsDepuis: [documents[0].id, labs[0].id],
}, { at: at("07:45") });

function fmtFr(iso: string) { const [y, m, d] = iso.split("-"); return `${d}/${m}`; void y; }

export const dossierCMoreau: Dossier = {
  patient: patientCMoreau,
  records: [...Object.values(pb), ...allergies, ...meds, ...vaccins, ...mesures, ...labs, ...documents, ...encounters, ...prescriptions, ...sickLeaves, ...screenings, appointment, ...proposals, briefing, summary],
  journal: [
    journal(ID, at("18:20", -4), SYS("MSSanté"), "document.receive", "Scanner du coude droit · compte rendu", documents[0].id),
    journal(ID, at("18:31", -4), LOCUS, "document.read", "Scanner lu : enthésopathie, rien d'osseux", documents[0].id),
    journal(ID, at("07:45"), LOCUS, "briefing.create", "Briefing de la rencontre de 10h30", briefing.id),
  ],
};
