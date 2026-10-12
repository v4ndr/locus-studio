import type { Dossier, Patient } from "@/domain/types";
import { rec, P, journal, SOL, SYS } from "../build";
import { at, day } from "../clock";

/** Sophie Marchand, 54 ans — cystite simple par messagerie (l'agent peut presque tout faire), mammographie en retard. Pas de rendez-vous aujourd'hui. */
const ID = "pat_marchand";

export const patientMarchand = rec("patient", ID, P.systeme("insi"), {
  ins: { matricule: "2 72 09 99 139 044 27", oid: "1.2.250.1.213.1.4.8", nomNaissance: "MARCHAND", prenoms: "SOPHIE MARIE", sexe: "F", dateNaissance: "1972-09-03", lieuNaissance: "69123", statut: "qualifiee", verifieeLe: day(-300) },
  nomUsage: "Marchand", prenomUsuel: "Sophie", photoHue: 10,
  contact: { telephone: "06 55 44 33 22", email: "sophie.marchand@exemple.fr", canalPrefere: "messagerie" },
  couverture: { regime: "general", mutuelle: { nom: "Malakoff Humanis", numero: "MH-8812003" }, medecinTraitant: { rpps: "10003456789", nom: "Dr Claire Laurent", declareLe: "2019-11-12" }, droitsVerifiesLe: day(-300) },
  vie: { profession: "Responsable de magasin", situation: "Divorcée, 1 fille étudiante" },
  consentement: { monEspaceSante: true, dmpAlimentation: true, messagerieAgent: "clinique-valide" },
}, { id: ID, at: "2019-11-12T10:00:00+02:00" });

const pb = {
  cystites: rec("problem", ID, P.medecin("2022-03-01"), { libelle: "Cystites simples récidivantes (3-4/an)", categorie: "medical", cim10: "N30.0", cisp2: "U71", evolution: "chronique", enAvant: true }, { at: "2022-03-01T10:00:00+02:00" }),
  menopause: rec("problem", ID, P.medecin(day(-300)), { libelle: "Ménopause (depuis 2024), bouffées de chaleur modérées, pas de THM", categorie: "gyneco-obstetrical", cim10: "N95.1", evolution: "chronique", enAvant: true }, { at: at("10:00", -300) }),
  hypothyroidie: rec("problem", ID, P.medecin("2020-01-15"), { libelle: "Hypothyroïdie (Hashimoto)", categorie: "medical", cim10: "E03.9", cisp2: "T86", depuis: "2020-01-15", evolution: "chronique", enAvant: true }, { at: "2020-01-15T10:00:00+02:00" }),
  mere: rec("problem", ID, P.medecin("2019-11-12"), { libelle: "Cancer du sein à 61 ans", categorie: "familial", apparente: "mère", evolution: "antecedent", enAvant: true }, { at: "2019-11-12T10:00:00+02:00" }),
};

const meds = [rec("medication", ID, P.medecin("2020-01-15"), { dci: "lévothyroxine", dosage: "75 µg", forme: "comprimé", posologie: "1 cp le matin à jeun", voie: "orale", type: "chronique", dernierRenouvellement: day(-30), dureeRenouvellementJours: 90, observance: "bonne" }, { at: "2020-01-15T10:00:00+02:00" })];

const labs = [rec("lab", ID, P.import("hprim"), { laboratoire: "Cerballiance Lyon", prelevementLe: day(-35), recuLe: at("11:00", -34), resultats: [{ loinc: "3016-3", libelle: "TSH", valeur: 2.4, unite: "mUI/L", refMin: 0.4, refMax: 4, flag: "normal", precedent: { valeur: 3.1, date: day(-400) } }], vuLe: at("10:00", -30), lecture: { resume: "TSH dans la cible sous 75 µg.", faitsExtraits: [], pointsAttention: [], urgence: "aucune", confidence: 0.98 } }, { at: at("11:00", -34) })];

const screenings = [
  rec("screening", ID, P.systeme("depistage"), { programme: "sein", libelle: "Mammographie de dépistage (risque familial : mère à 61 ans → dépistage organisé, tous les 2 ans)", dernierLe: day(-900), prochainLe: day(-170), etat: "en-retard" }),
  rec("screening", ID, P.systeme("depistage"), { programme: "col-uterus", libelle: "Test HPV", dernierLe: day(-700), prochainLe: day(1125), etat: "a-jour" }),
  rec("screening", ID, P.systeme("depistage"), { programme: "colorectal", libelle: "Test immunologique", dernierLe: day(-400), prochainLe: day(330), etat: "a-jour" }),
];

const messages = [
  rec("message", ID, P.patient(), {
    canal: "patient", threadId: "th_marchand_cystite",
    de: { type: "patient", nom: "Sophie Marchand" }, a: [{ type: "praticien", nom: "Dr Laurent" }],
    date: at("06:58"),
    objet: "Encore une cystite",
    corps: "Bonjour Docteur, ça recommence : brûlures en urinant depuis hier soir, envies très fréquentes, pas de fièvre, pas de douleur dans le dos. Comme d'habitude. Est-ce que vous pouvez m'envoyer le sachet (Monuril) ? Je suis au magasin toute la journée. Merci beaucoup",
    triage: { intention: "renouvellement", urgence: "jour", resume: "Cystite simple typique (4e épisode en 12 mois) sans signe de pyélonéphrite ; demande de fosfomycine. Pas de grossesse possible (ménopause). Ordonnance numérique possible sans consultation si vous validez.", autonomePossible: false, reponseProposeeId: `${ID}.message.2` },
  }, { at: at("06:58") }),
  rec("message", ID, P.agent(0.94), {
    canal: "patient", threadId: "th_marchand_cystite",
    de: { type: "agent", nom: "Sol, pour le Dr Laurent" }, a: [{ type: "patient", nom: "Sophie Marchand" }],
    date: at("07:15"),
    objet: "Re: Encore une cystite",
    corps: "Bonjour Sophie,\n\nLe Dr Laurent a validé une ordonnance de fosfomycine (Monuril 3 g, un sachet unique, le soir au coucher, vessie vide). Elle est déjà dans Mon Espace Santé et à votre pharmacie habituelle (ordonnance numérique) — rien à imprimer.\n\nBuvez bien. Si la fièvre monte, si vous avez mal dans le dos ou si ça ne va pas mieux dans 3 jours, écrivez-nous ou consultez.\n\nC'est le 4e épisode en un an : le Dr Laurent vous propose un rendez-vous dans les prochaines semaines pour en parler (un ECBU à distance, et des options de prévention). Voulez-vous que je vous propose des créneaux ?\n\nSol, pour le Dr Laurent",
  }, { status: "propose", at: at("07:15") }),
];

const proposals = [
  rec("proposal", ID, P.agent(0.94, [messages[0].id]), {
    action: "ordonnance", titre: "Fosfomycine-trométamol 3 g, dose unique — ordonnance numérique sans consultation",
    justification: "Cystite simple typique chez une femme de 54 ans, 4e épisode en 12 mois, sans signe de gravité : fosfomycine 3 g dose unique en première intention, sans ECBU [1]. Ménopausée : pas de risque de grossesse. Cystites récidivantes (≥ 4/an) : ECBU à distance et consultation de prévention recommandés [1]. Verrouillé : vous signez, j'envoie.",
    references: [{ docId: "has-cystite-2021", titre: "Cystite aiguë simple, à risque de complication ou récidivante, de la femme", editeur: "HAS", date: "2021" }],
    charge: { type: "medicament", date: day(0), lignes: [{ libelle: "FOSFOMYCINE TROMÉTAMOL 3 g sachet", dci: "fosfomycine trométamol", cis: "67317742", posologie: "1 sachet en prise unique, le soir au coucher, vessie vide", duree: "1 jour", alertes: [{ type: "redondance", niveau: "info", message: "4e cure de fosfomycine en 12 mois : ECBU à distance et consultation « cystites récidivantes » recommandés (HAS 2021)." }] }] },
    declencheur: { type: "message", recordId: messages[0].id, libelle: "Message de Sophie Marchand à 6h58" },
    autonomie: 1, etat: "a-valider", agent: "sol",
  }, { status: "propose", at: at("07:14") }),
  rec("proposal", ID, P.agent(0.94, [messages[0].id]), { action: "message-patient", titre: "Répondre à Sophie Marchand (ordonnance envoyée, signes d'alerte, proposer un rendez-vous)", justification: "Part avec l'ordonnance dès votre signature.", charge: { recordId: messages[1].id, patch: { status: "actif" } }, declencheur: { type: "message", recordId: messages[0].id, libelle: "Message de Sophie Marchand à 6h58" }, autonomie: 1, etat: "a-valider", agent: "sol" }, { status: "propose", at: at("07:15") }),
  rec("proposal", ID, P.agent(0.92, [screenings[0].id]), { action: "message-patient", titre: "Mammographie en retard de 6 mois : relance avec l'invitation du CRCDC", justification: "Dépistage organisé 50-74 ans, mère atteinte à 61 ans (pas de surrisque justifiant un suivi spécifique [1]). Dernière mammographie il y a 2 ans et demi. Relance logistique — dans mon périmètre d'autonomie, envoyée.", references: [{ titre: "Dépistage du cancer du sein — femmes à risque", editeur: "HAS / INCa" }], declencheur: { type: "echeance", recordId: screenings[0].id, libelle: "Mammographie en retard" }, autonomie: 2, etat: "executee", decision: { par: "sol", le: at("07:16") }, agent: "sol" }, { status: "actif", at: at("07:16") }),
];

const summary = rec("summary", ID, P.agentValide(0.9, day(-30)), {
  enUneLigne: "54 ans, hypothyroïdie substituée, cystites récidivantes, ménopausée ; mère avec cancer du sein à 61 ans.",
  synthese: "Responsable de magasin, peu disponible en journée, préfère la messagerie. Hashimoto bien équilibrée sous lévothyroxine 75. Cystites simples 3-4 fois par an, toujours typiques. Ménopause sans THM. Dépistage du col et colorectal à jour, mammographie en retard.",
  enCeMoment: ["Cystite simple (4e épisode/12 mois) : fosfomycine + consultation de prévention à prévoir.", "Mammographie en retard de 6 mois."],
  derniereValidation: day(-30), changementsDepuis: [messages[0].id],
}, { at: at("07:16") });

export const dossierMarchand: Dossier = {
  patient: patientMarchand,
  records: [...Object.values(pb), ...meds, ...labs, ...screenings, ...messages, ...proposals, summary],
  journal: [
    journal(ID, at("06:58"), SYS("Messagerie"), "message.receive", "Message de Sophie Marchand", messages[0].id),
    journal(ID, at("07:14"), SOL, "proposal.create", "Ordonnance fosfomycine (verrouillée)", proposals[0].id),
    journal(ID, at("07:16"), SOL, "message.send", "Relance mammographie envoyée (autonomie 2)", proposals[2].id),
  ],
};
