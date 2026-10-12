import type { Dossier, Patient } from "@/domain/types";
import { rec, P, journal, SOL, SYS } from "../build";
import { at, day } from "../clock";

/** Julien Garnier, 42 ans — lombalgie aiguë, demande d'arrêt par la messagerie ; tabac ; FINDRISC. */
const ID = "pat_garnier";

export const patientGarnier = rec("patient", ID, P.systeme("insi"), {
  ins: { matricule: "1 84 03 13 055 221 44", oid: "1.2.250.1.213.1.4.8", nomNaissance: "GARNIER", prenoms: "JULIEN", sexe: "M", dateNaissance: "1984-03-09", lieuNaissance: "13055", statut: "qualifiee", verifieeLe: day(-40) },
  nomUsage: "Garnier", prenomUsuel: "Julien", photoHue: 210,
  contact: { telephone: "06 44 55 66 77", email: "julien.garnier@exemple.fr", adresse: { ligne1: "27 cours Gambetta", codePostal: "69007", ville: "Lyon" }, canalPrefere: "messagerie" },
  couverture: { regime: "general", mutuelle: { nom: "Alan", numero: "AL-9920031" }, medecinTraitant: { rpps: "10003456789", nom: "Dr Claire Laurent", declareLe: "2021-09-01" }, droitsVerifiesLe: day(-40) },
  vie: { profession: "Chauffeur-livreur (CDI)", situation: "En couple, 2 enfants (6 et 9 ans)" },
  consentement: { monEspaceSante: true, dmpAlimentation: true, messagerieAgent: "clinique-valide" },
}, { id: ID, at: "2021-09-01T10:00:00+02:00" });

const pb = {
  tabac: rec("problem", ID, P.medecin("2021-09-01"), { libelle: "Tabagisme actif, 12 cig/j (15 PA)", categorie: "mode-de-vie", cisp2: "P17", evolution: "chronique", enAvant: true }, { at: "2021-09-01T10:00:00+02:00" }),
  surpoids: rec("problem", ID, P.medecin(day(-40)), { libelle: "Surpoids (IMC 28,4)", categorie: "medical", cim10: "E66.0", cisp2: "T83", evolution: "chronique", enAvant: true }, { at: at("10:00", -40) }),
  pere: rec("problem", ID, P.medecin("2021-09-01"), { libelle: "Diabète de type 2, infarctus à 58 ans", categorie: "familial", apparente: "père", evolution: "antecedent", enAvant: true }, { at: "2021-09-01T10:00:00+02:00" }),
  lombalgie: rec("problem", ID, P.agent(0.9, [`${ID}.message.1`]), { libelle: "Lombalgie aiguë commune", categorie: "medical", cim10: "M54.5", cisp2: "L03", depuis: day(-2), evolution: "aigu", enAvant: true }, { status: "propose", at: at("06:55") }),
  lombalgie2023: rec("problem", ID, P.medecin("2023-05-10"), { libelle: "Lombalgie aiguë (épisode 2023, résolu en 3 semaines)", categorie: "medical", cim10: "M54.5", depuis: "2023-05-10", finLe: "2023-06-01", evolution: "aigu", enAvant: false }, { status: "resolu", at: "2023-05-10T10:00:00+02:00" }),
};

const meds = [
  rec("medication", ID, P.medecin("2023-05-10"), { dci: "ibuprofène", dosage: "400 mg", forme: "comprimé", posologie: "1 cp jusqu'à 3/j au repas, 5 jours max", type: "si-besoin" }, { at: "2023-05-10T10:00:00+02:00" }),
];

const mesures = [
  rec("measure", ID, P.medecin(day(-40)), { type: "poids", valeur: 89, unite: "kg", date: day(-40), contexte: "cabinet" }, { at: at("10:00", -40) }),
  rec("measure", ID, P.medecin(day(-40)), { type: "taille", valeur: 177, unite: "cm", date: day(-40), contexte: "cabinet" }, { at: at("10:00", -40) }),
  rec("measure", ID, P.systeme("calcul"), { type: "imc", valeur: 28.4, unite: "kg/m²", date: day(-40) }, { at: at("10:00", -40) }),
  rec("measure", ID, P.medecin(day(-40)), { type: "ta", valeur: 134, valeur2: 82, unite: "mmHg", date: day(-40), contexte: "cabinet" }, { at: at("10:00", -40) }),
];

const vaccins = [
  rec("vaccination", ID, P.medecin("2022-02-14"), { valences: ["dTP", "Coqueluche"], nomCommercial: "Boostrix Tetra", date: "2022-02-14", rappelPrevu: "2042-02-14" }, { at: "2022-02-14T10:00:00+02:00" }),
];

const encounters = [
  rec("encounter", ID, P.medecin(day(-40)), {
    type: "cabinet", date: at("10:00", -40), dureeMin: 18, praticien: "pr_laurent",
    note: { motifs: ["Certificat sport (football loisir)", "Point tabac"], histoire: "Va bien. Reprend le foot avec des collègues. Fume 12/j, a « envie d'arrêter avant 45 ans ». Père diabétique.", examen: "TA 134/82. Poids 89 kg, IMC 28,4. Auscultation cardio-pulmonaire normale. Pas de souffle.", conclusion: "Apte au sport loisir. Surpoids, tabac, hérédité diabétique.", conduite: "Certificat remis. Proposition de substituts nicotiniques : « pas tout de suite ». FINDRISC à faire : glycémie à jeun si ≥ 12. Bilan lipidique et glycémie à prévoir." },
    codes: [{ systeme: "drc", code: "EXAMEN SYSTEMATIQUE", libelle: "Examen systématique et prévention" }],
    actes: [{ code: "G", libelle: "Consultation", montant: 30 }],
    facturation: { mode: "fse", tiersPayant: "aucun", transmiseLe: at("10:20", -40) },
  }, { at: at("10:00", -40) }),
];

const messages = [
  rec("message", ID, P.patient(), {
    canal: "patient", threadId: "th_garnier_dos",
    de: { type: "patient", nom: "Julien Garnier" }, a: [{ type: "praticien", nom: "Dr Laurent" }],
    date: at("06:40"),
    objet: "Mal au dos — arrêt ?",
    corps: "Bonjour docteur, depuis avant-hier j'ai le bas du dos bloqué, ça a commencé en soulevant un colis. Je marche mais je ne peux pas rester assis longtemps, donc conduire c'est impossible. Pas de fièvre, pas de fourmillements dans les jambes, j'urine normalement. J'ai pris de l'ibuprofène qu'il me restait, ça soulage un peu. Est-ce qu'il faudrait un arrêt ? Je peux passer ce matin si besoin. Merci",
    triage: { intention: "symptome", urgence: "jour", resume: "Lombalgie aiguë mécanique depuis 2 jours après port de charge, sans drapeau rouge déclaré (pas de fièvre, pas de déficit, pas de trouble sphinctérien). Demande d'arrêt de travail ; chauffeur-livreur.", autonomePossible: false, reponseProposeeId: `${ID}.message.2` },
  }, { at: at("06:40") }),
  rec("message", ID, P.agent(0.92), {
    canal: "patient", threadId: "th_garnier_dos",
    de: { type: "agent", nom: "Sol, pour le Dr Laurent" }, a: [{ type: "patient", nom: "Julien Garnier" }],
    date: at("07:05"),
    objet: "Re: Mal au dos — arrêt ?",
    corps: "Bonjour Julien,\n\nMerci pour les précisions, elles sont rassurantes. Le Dr Laurent vous voit ce matin à 10h00 (rendez-vous ajouté — répondez « non » si l'horaire ne va pas). Un arrêt de travail nécessite de vous examiner.\n\nD'ici là : continuez à bouger autant que la douleur le permet, évitez de rester allongé, chaleur locale. L'ibuprofène 400 mg à 3 par jour au repas au maximum, pas plus de 5 jours, et pas si vous avez des brûlures d'estomac.\n\nAppelez le 15 si vous perdez la force d'une jambe, si vous n'arrivez plus à uriner, ou si la douleur devient insupportable.\n\nSol, pour le Dr Laurent",
  }, { status: "propose", at: at("07:05") }),
];

const appointment = rec("appointment", ID, P.agent(0.95, [messages[0].id]), {
  debut: at("10:00"), dureeMin: 15, type: "cabinet", motif: "Lombalgie aiguë — arrêt de travail", praticien: "pr_laurent", etat: "prevu", prisPar: "agent", preparationId: `${ID}.briefing.1`,
}, { at: at("07:04") });

const proposals = [
  rec("proposal", ID, P.agent(0.95, [messages[0].id]), {
    action: "rdv", titre: "Rendez-vous ajouté à 10h00 (créneau libre, demande du matin)",
    justification: "Lombalgie aiguë sans drapeau rouge rapporté, chez un chauffeur-livreur qui demande un arrêt : un examen est nécessaire le jour même, pas une urgence. Créneau libre à 10h00 ; le patient a dit pouvoir passer ce matin.",
    declencheur: { type: "message", recordId: messages[0].id, libelle: "Message de Julien Garnier à 6h40" },
    autonomie: 2, etat: "executee", decision: { par: "sol", le: at("07:04") }, agent: "sol", resultatsIds: [appointment.id],
  }, { status: "actif", at: at("07:04") }),
  rec("proposal", ID, P.agent(0.92, [messages[0].id]), {
    action: "message-patient", titre: "Répondre à Julien Garnier (rendez-vous, conseils, signes d'alerte)",
    justification: "Consentement « clinique-validé » : je peux donner des conseils cliniques standards après validation. Le brouillon suit la recommandation HAS lombalgie (maintien de l'activité, pas d'alitement) [1] et nomme les signes d'alerte.",
    references: [{ docId: "has-lombalgie-2019", titre: "Prise en charge du patient présentant une lombalgie commune", editeur: "HAS", date: "2019" }],
    charge: { recordId: messages[1].id, patch: { status: "actif" } },
    declencheur: { type: "message", recordId: messages[0].id, libelle: "Message de Julien Garnier à 6h40" },
    autonomie: 1, etat: "a-valider", agent: "sol",
  }, { status: "propose", at: at("07:05") }),
  rec("proposal", ID, P.agent(0.85, [messages[0].id]), {
    action: "arret-travail", titre: "Préparer un arrêt de travail de 4 jours (à confirmer après examen)",
    justification: "Lombalgie aiguë commune chez un chauffeur-livreur : la durée indicative de l'Assurance Maladie est de 3 à 5 jours pour un travail avec port de charges [1]. Pré-rempli avec sorties libres (la marche est recommandée). Verrouillé : rien ne part sans votre signature.",
    references: [{ titre: "Fiches repères durées d'arrêt de travail — Lombalgie commune", editeur: "Assurance Maladie" }],
    charge: { du: day(0), au: day(3), motif: "Lombalgie aiguë commune", sortiesAutorisees: "libres" },
    declencheur: { type: "message", recordId: messages[0].id, libelle: "Message de Julien Garnier à 6h40" },
    autonomie: 1, etat: "a-valider", agent: "sol",
  }, { status: "propose", at: at("07:06") }),
  rec("proposal", ID, P.agent(0.8, [encounters[0].id]), {
    action: "ordonnance", titre: "Bilan : glycémie à jeun et lipides (prévu il y a 40 jours, jamais prescrit)",
    justification: "Lors de la dernière consultation vous aviez noté « bilan lipidique et glycémie à prévoir ». FINDRISC estimé à 13 (surpoids, père diabétique, pas d'activité régulière) : la HAS propose une glycémie à jeun à partir de 12 [1]. À glisser pendant la consultation de ce matin.",
    references: [{ titre: "Dépistage du diabète de type 2 — FINDRISC", editeur: "HAS" }],
    charge: { type: "biologie", date: day(0), lignes: [{ libelle: "Glycémie à jeun" }, { libelle: "Bilan lipidique (CT, HDL, LDL, TG)" }] },
    declencheur: { type: "encounter", recordId: encounters[0].id, libelle: "Conduite à tenir du " + day(-40) },
    autonomie: 1, etat: "a-valider", agent: "sol",
  }, { status: "propose", at: at("07:07") }),
];

const briefing = rec("briefing", ID, P.agent(0.9, [messages[0].id]), {
  appointmentId: appointment.id,
  synthese: "Julien Garnier, 42 ans, chauffeur-livreur, fumeur, en surpoids, père diabétique. Lombalgie aiguë depuis 2 jours après port de charge, sans drapeau rouge déclaré. Demande un arrêt. Deuxième épisode (2023, résolu en 3 semaines).",
  depuisDerniereFois: ["Message ce matin 6h40 : lombalgie, ibuprofène en automédication, demande d'arrêt.", "Rendez-vous pris par Sol à 10h00."],
  echeances: [{ libelle: "Glycémie à jeun + lipides : prévus il y a 40 jours, non prescrits" }, { libelle: "Dépistage colorectal : non éligible (< 50 ans)" }],
  questions: ["Drapeaux rouges à vérifier à l'examen : déficit moteur, Lasègue, troubles sphinctériens, fièvre, perte de poids.", "Durée d'arrêt : 4 jours proposés ; port de charges au travail — aménagement possible ?", "Tabac : « avant 45 ans » — relancer les substituts ?", "Kiné si persistance > 2 semaines."],
  propositionsIds: proposals.slice(1).map((p) => p.id),
}, { id: `${ID}.briefing.1`, status: "propose", at: at("07:08") });

const summary = rec("summary", ID, P.agentValide(0.9, day(-40)), {
  enUneLigne: "42 ans, chauffeur-livreur, fumeur, en surpoids, hérédité diabétique.",
  synthese: "Peu de passages au cabinet : certificats, un épisode de lombalgie en 2023. Fumeur à 12 cig/j, motivé « avant 45 ans ». Surpoids, père diabétique et coronarien à 58 ans. Pas de traitement de fond.",
  enCeMoment: ["Lombalgie aiguë, arrêt demandé.", "Dépistage du diabète à faire (FINDRISC ≈ 13).", "Sevrage tabagique à relancer."],
  derniereValidation: day(-40), changementsDepuis: [messages[0].id],
}, { at: at("07:08") });

export const dossierGarnier: Dossier = {
  patient: patientGarnier,
  records: [...Object.values(pb), ...meds, ...mesures, ...vaccins, ...encounters, ...messages, appointment, ...proposals, briefing, summary],
  journal: [
    journal(ID, at("06:40"), SYS("Messagerie"), "message.receive", "Message de Julien Garnier", messages[0].id),
    journal(ID, at("06:55"), SOL, "message.triage", "Lombalgie aiguë sans drapeau rouge — urgence « jour »", messages[0].id),
    journal(ID, at("07:04"), SOL, "appointment.create", "RDV 10h00 pris (autonomie 2)", appointment.id),
    journal(ID, at("07:05"), SOL, "message.draft", "Réponse rédigée, à valider", messages[1].id),
    journal(ID, at("07:06"), SOL, "proposal.create", "Arrêt de travail pré-rempli (verrouillé)", proposals[2].id),
  ],
};
