import type { Dossier, Patient } from "@/domain/types";
import { rec, P, journal, LOCUS, SYS } from "../build";
import { at, day } from "../clock";

/** Inès Perrin, 8 ans — angine fébrile, parent inquiet par messagerie ; vaccins à jour. */
const ID = "pat_perrin";

export const patientPerrin = rec("patient", ID, P.systeme("insi"), {
  ins: { matricule: "2 18 04 69 388 240 19", oid: "1.2.250.1.213.1.4.8", nomNaissance: "PERRIN", prenoms: "INES NOA", sexe: "F", dateNaissance: "2018-04-12", lieuNaissance: "69388", statut: "qualifiee", verifieeLe: day(-90) },
  nomUsage: "Perrin", prenomUsuel: "Inès", photoHue: 150,
  contact: { telephone: "06 23 45 67 89 (mère, Camille)", canalPrefere: "messagerie" },
  couverture: { regime: "general", mutuelle: { nom: "Harmonie Mutuelle (ayant droit)", numero: "HM-5520987" }, medecinTraitant: { rpps: "10003456789", nom: "Dr Claire Laurent", declareLe: "2018-05-02" }, droitsVerifiesLe: day(-90) },
  vie: { situation: "CE2, école Jean-Macé ; 1 frère (4 ans)" },
  personneConfiance: { nom: "Camille Perrin", lien: "mère", telephone: "06 23 45 67 89" },
  consentement: { monEspaceSante: true, dmpAlimentation: true, messagerieAgent: "clinique-valide" },
}, { id: ID, at: "2018-05-02T10:00:00+02:00" });

const pb = {
  otites: rec("problem", ID, P.medecin("2021-02-01"), { libelle: "Otites moyennes aiguës à répétition (2020-2021), aérateurs 2021", categorie: "medical", cim10: "H66", evolution: "antecedent", enAvant: true }, { at: "2021-02-01T10:00:00+02:00" }),
  eczema: rec("problem", ID, P.medecin("2019-06-01"), { libelle: "Dermatite atopique légère", categorie: "medical", cim10: "L20", cisp2: "S87", evolution: "chronique", enAvant: true }, { at: "2019-06-01T10:00:00+02:00" }),
  angine: rec("problem", ID, P.agent(0.85, [`${ID}.message.1`]), { libelle: "Angine fébrile (TROD à faire)", categorie: "medical", cim10: "J02", cisp2: "R72", depuis: day(-1), evolution: "aigu", enAvant: true }, { status: "propose", at: at("07:40") }),
};

const allergies = [rec("allergy", ID, P.medecin("2019-06-01"), { substance: "Arachide", type: "alimentaire", reaction: "Urticaire (2019), bilan allergo : IgE +", severite: "moderee", certitude: "confirmee" }, { at: "2019-06-01T10:00:00+02:00" })];

const meds = [
  rec("medication", ID, P.medecin("2019-06-01"), { dci: "émollient", posologie: "Application quotidienne", voie: "cutanée", type: "chronique" }, { at: "2019-06-01T10:00:00+02:00" }),
  rec("medication", ID, P.medecin("2019-06-01"), { dci: "adrénaline auto-injectable", specialite: "EPIPEN 0,15 mg", dosage: "0,15 mg", posologie: "1 injection si réaction sévère", voie: "IM", type: "si-besoin" }, { at: "2019-06-01T10:00:00+02:00" }),
];

const mesures = [
  rec("measure", ID, P.medecin(day(-90)), { type: "poids", valeur: 26.5, unite: "kg", date: day(-90), contexte: "cabinet" }, { at: at("10:00", -90) }),
  rec("measure", ID, P.medecin(day(-90)), { type: "taille", valeur: 129, unite: "cm", date: day(-90), contexte: "cabinet" }, { at: at("10:00", -90) }),
];

const vaccins = [
  rec("vaccination", ID, P.medecin("2024-05-15"), { valences: ["dTP", "Coqueluche"], nomCommercial: "Tetravac (rappel 6 ans)", date: "2024-05-15", rappelPrevu: "2029-05-15" }, { at: "2024-05-15T10:00:00+02:00" }),
  rec("vaccination", ID, P.medecin("2019-10-20"), { valences: ["ROR"], nomCommercial: "M-M-RVaxPro (2/2)", date: "2019-10-20" }, { at: "2019-10-20T10:00:00+02:00" }),
  rec("vaccination", ID, P.medecin("2018-10-12"), { valences: ["Méningocoque C"], date: "2018-10-12" }, { at: "2018-10-12T10:00:00+02:00" }),
];

const messages = [
  rec("message", ID, P.patient(), {
    canal: "patient", threadId: "th_perrin_angine",
    de: { type: "patient", nom: "Camille Perrin (mère d'Inès)" }, a: [{ type: "praticien", nom: "Dr Laurent" }],
    date: at("07:12"),
    objet: "Inès — fièvre et gorge",
    corps: "Bonjour, Inès a 39,2 ce matin, elle a mal à la gorge depuis hier soir et n'a pas voulu déjeuner. Pas de toux, pas de nez qui coule. Elle a eu du Doliprane à 6h30. Est-ce que je peux l'amener ce matin ? Je ne l'envoie pas à l'école.",
    triage: { intention: "symptome", urgence: "jour", resume: "Enfant de 8 ans, fièvre 39,2 + odynophagie sans toux ni rhinorrhée depuis 12 h : angine, TROD indiqué (≥ 3 ans). Paracétamol pris. Demande de consultation ce matin.", autonomePossible: false, reponseProposeeId: `${ID}.message.2` },
  }, { at: at("07:12") }),
  rec("message", ID, P.agent(0.93), {
    canal: "patient", threadId: "th_perrin_angine",
    de: { type: "agent", nom: "Locus, pour le Dr Laurent" }, a: [{ type: "patient", nom: "Camille Perrin" }],
    date: at("07:42"),
    objet: "Re: Inès — fièvre et gorge",
    corps: "Bonjour Madame,\n\nOui, venez ce matin : rendez-vous à 15h00 avec le Dr Laurent (le premier créneau enfant). Elle fera un test rapide de la gorge pour savoir si un antibiotique est nécessaire — dans la plupart des angines chez l'enfant, ce n'est pas le cas.\n\nD'ici là : paracétamol 15 mg/kg soit 400 mg (une dose de 26 kg sur la pipette) toutes les 6 h si besoin, à boire régulièrement, pas d'ibuprofène. Si elle a du mal à respirer, à avaler sa salive, ou si elle est très abattue, appelez le 15.\n\nSol, pour le Dr Laurent",
  }, { status: "propose", at: at("07:42") }),
];

const appointment = rec("appointment", ID, P.agent(0.95, [messages[0].id]), { debut: at("15:00"), dureeMin: 15, type: "cabinet", motif: "Angine fébrile — TROD", praticien: "pr_laurent", etat: "prevu", prisPar: "agent", preparationId: `${ID}.briefing.1` }, { at: at("07:41") });

const proposals = [
  rec("proposal", ID, P.agent(0.95, [messages[0].id]), { action: "rdv", titre: "Rendez-vous ajouté à 15h00 (premier créneau enfant)", justification: "Angine fébrile chez une enfant de 8 ans sans signe de gravité : consultation le jour même pour TROD [1].", references: [{ docId: "has-angine-2021", titre: "Choix et durées d'antibiothérapie — Angine", editeur: "HAS", date: "2021" }], declencheur: { type: "message", recordId: messages[0].id, libelle: "Message de la mère à 7h12" }, autonomie: 2, etat: "executee", decision: { par: "locus", le: at("07:41") }, agent: "locus", resultatsIds: [appointment.id] }, { status: "actif", at: at("07:41") }),
  rec("proposal", ID, P.agent(0.93, [messages[0].id]), { action: "message-patient", titre: "Répondre à la mère (rendez-vous, paracétamol 400 mg, signes d'alerte)", justification: "Posologie calculée sur le dernier poids connu (26,5 kg → 15 mg/kg ≈ 400 mg) ; pas d'AINS dans l'angine [1]. Allergie arachide sans rapport.", references: [{ docId: "has-angine-2021", titre: "Angine — HAS 2021", editeur: "HAS" }], charge: { recordId: messages[1].id, patch: { status: "actif" } }, declencheur: { type: "message", recordId: messages[0].id, libelle: "Message de la mère à 7h12" }, autonomie: 1, etat: "a-valider", agent: "locus" }, { status: "propose", at: at("07:42") }),
  rec("proposal", ID, P.agent(0.9), { action: "ordonnance", titre: "Si TROD positif : amoxicilline 50 mg/kg/j en 2 prises, 6 jours (pré-rempli, non signé)", justification: "Angine à SGA de l'enfant : amoxicilline 6 jours [1]. 26,5 kg → 1 300 mg/j soit 650 mg ×2, suspension 500 mg/5 mL : 6,5 mL matin et soir. Pas d'allergie aux bêta-lactamines connue. Ne s'active que si le TROD est positif.", references: [{ docId: "has-angine-2021", titre: "Angine — HAS 2021", editeur: "HAS" }, { docId: "rcp-amoxicilline", titre: "RCP Amoxicilline — 4.2 Posologie", editeur: "ANSM" }], charge: { type: "medicament", date: day(0), lignes: [{ libelle: "AMOXICILLINE 500 mg/5 mL susp. buvable", dci: "amoxicilline", cis: "63296986", posologie: "6,5 mL matin et soir (50 mg/kg/j)", duree: "6 jours" }, { libelle: "PARACÉTAMOL 2,4 % sirop", dci: "paracétamol", posologie: "15 mg/kg (26 kg sur la pipette) toutes les 6 h si fièvre", duree: "5 jours" }] }, declencheur: { type: "agenda", recordId: appointment.id, libelle: "Consultation de 15h00" }, autonomie: 1, etat: "a-valider", agent: "locus" }, { status: "propose", at: at("07:44") }),
];

const briefing = rec("briefing", ID, P.agent(0.92, [messages[0].id]), {
  appointmentId: appointment.id,
  synthese: "Inès, 8 ans, 26,5 kg, allergie arachide (Epipen), eczéma léger, antécédent d'otites. Angine fébrile depuis hier soir (39,2, pas de toux). TROD à faire ; ordonnance amoxicilline prête si positif.",
  depuisDerniereFois: ["Message de la mère à 7h12 ; paracétamol donné à 6h30.", "Rendez-vous pris à 15h00."],
  echeances: [{ libelle: "Vaccins : à jour (rappel 6 ans fait). Prochain : 11-13 ans (dTcaP + HPV)." }, { libelle: "Bilan de santé 8-9 ans (examen obligatoire) : dû dans 6 mois" }],
  questions: ["TROD. Si négatif : symptomatique seul, école quand apyrétique.", "Peser (dernière pesée il y a 3 mois) pour ajuster les doses.", "Certificat d'absence scolaire si la mère le demande."],
  propositionsIds: [proposals[2].id],
}, { id: `${ID}.briefing.1`, status: "propose", at: at("07:45") });

const summary = rec("summary", ID, P.agentValide(0.9, day(-90)), {
  enUneLigne: "8 ans, allergie arachide (Epipen), dermatite atopique légère, otites dans la petite enfance.",
  synthese: "Enfant en bonne santé, suivie depuis la naissance. Allergie à l'arachide confirmée (PAI à l'école, Epipen). Eczéma léger sous émollients. Aérateurs transtympaniques en 2021. Croissance régulière (P50). Vaccins à jour.",
  enCeMoment: ["Angine fébrile (TROD à faire).", "Bilan 8-9 ans dans 6 mois."],
  derniereValidation: day(-90), changementsDepuis: [messages[0].id],
}, { at: at("07:45") });

export const dossierPerrin: Dossier = {
  patient: patientPerrin,
  records: [...Object.values(pb), ...allergies, ...meds, ...mesures, ...vaccins, ...messages, appointment, ...proposals, briefing, summary],
  journal: [
    journal(ID, at("07:12"), SYS("Messagerie"), "message.receive", "Message de Camille Perrin", messages[0].id),
    journal(ID, at("07:41"), LOCUS, "appointment.create", "RDV 15h00 pris (autonomie 2)", appointment.id),
    journal(ID, at("07:44"), LOCUS, "proposal.create", "Ordonnance conditionnelle (TROD +)", proposals[2].id),
  ],
};
