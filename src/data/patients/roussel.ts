import type { Dossier, Patient } from "@/domain/types";
import { rec, P, journal, LOCUS, SYS } from "../build";
import { at, day } from "../clock";

/** Alain Roussel, 58 ans — HTA non contrôlée, automesures via Mon Espace Santé (tensiomètre connecté), courrier d'un confrère MSSanté ; RDV 16h00. */
const ID = "pat_roussel";

export const patientRoussel = rec("patient", ID, P.systeme("insi"), {
  ins: { matricule: "1 68 09 38 185 017 82", oid: "1.2.250.1.213.1.4.8", nomNaissance: "ROUSSEL", prenoms: "ALAIN", sexe: "M", dateNaissance: "1968-09-05", lieuNaissance: "38185", statut: "qualifiee", verifieeLe: day(-20) },
  nomUsage: "Roussel", prenomUsuel: "Alain", photoHue: 265,
  contact: { telephone: "06 11 22 33 44", email: "alain.roussel@exemple.fr", canalPrefere: "sms" },
  couverture: { regime: "general", mutuelle: { nom: "AG2R", numero: "AG-6610442" }, medecinTraitant: { rpps: "10003456789", nom: "Dr Romain Vandepitterie", declareLe: "2020-06-01" }, droitsVerifiesLe: day(-20) },
  vie: { profession: "Artisan plombier", situation: "Marié, 3 enfants" },
  consentement: { monEspaceSante: true, dmpAlimentation: true, messagerieAgent: "logistique" },
}, { id: ID, at: "2020-06-01T10:00:00+02:00" });

const pb = {
  hta: rec("problem", ID, P.medecin("2020-06-01"), { libelle: "Hypertension artérielle essentielle", categorie: "medical", cim10: "I10", cisp2: "K86", depuis: "2020-06-01", evolution: "chronique", enAvant: true }, { at: "2020-06-01T10:00:00+02:00" }),
  dyslipidemie: rec("problem", ID, P.medecin("2020-06-01"), { libelle: "Hypercholestérolémie", categorie: "medical", cim10: "E78.0", cisp2: "T93", evolution: "chronique", enAvant: true }, { at: "2020-06-01T10:00:00+02:00" }),
  sahos: rec("problem", ID, P.agent(0.82, [`${ID}.document.1`]), { libelle: "Suspicion de syndrome d'apnées du sommeil (ronflements, somnolence, Epworth 12)", categorie: "medical", cim10: "G47.3", evolution: "chronique", enAvant: true }, { status: "propose", at: at("09:20", -1) }),
  obesite: rec("problem", ID, P.medecin(day(-20)), { libelle: "Obésité (IMC 31,2)", categorie: "medical", cim10: "E66.0", cisp2: "T82", evolution: "chronique", enAvant: true }, { at: at("10:00", -20) }),
};

const meds = [
  rec("medication", ID, P.medecin(day(-20)), { dci: "périndopril/amlodipine", specialite: "COVERAM 5/5", dosage: "5 mg/5 mg", forme: "comprimé", posologie: "1 cp le matin", voie: "orale", debut: day(-20), type: "chronique", dernierRenouvellement: day(-20), dureeRenouvellementJours: 30, observance: "inconnue" }, { at: at("10:00", -20) }),
  rec("medication", ID, P.medecin("2021-01-10"), { dci: "rosuvastatine", dosage: "10 mg", forme: "comprimé", posologie: "1 cp le soir", voie: "orale", type: "chronique", dernierRenouvellement: day(-20), dureeRenouvellementJours: 90, observance: "partielle" }, { at: "2021-01-10T10:00:00+02:00" }),
];

const auto = [-6, -5, -4, -3, -2, -1].flatMap((d, i) => [
  rec("measure", ID, P.patient(), { type: "ta", valeur: [158, 161, 155, 163, 159, 157][i], valeur2: [96, 98, 94, 99, 97, 95][i], unite: "mmHg", date: day(d), contexte: "connecte" }, { at: at("07:30", d) }),
  rec("measure", ID, P.patient(), { type: "ta", valeur: [152, 156, 150, 158, 154, 151][i], valeur2: [92, 94, 90, 96, 93, 91][i], unite: "mmHg", date: day(d), contexte: "connecte" }, { at: at("20:30", d) }),
]);

const mesures = [
  rec("measure", ID, P.medecin(day(-20)), { type: "poids", valeur: 98, unite: "kg", date: day(-20), contexte: "cabinet" }, { at: at("10:00", -20) }),
  rec("measure", ID, P.medecin(day(-20)), { type: "taille", valeur: 177, unite: "cm", date: day(-20), contexte: "cabinet" }, { at: at("10:00", -20) }),
  rec("measure", ID, P.systeme("calcul"), { type: "imc", valeur: 31.2, unite: "kg/m²", date: day(-20) }, { at: at("10:00", -20) }),
  rec("measure", ID, P.medecin(day(-20)), { type: "ta", valeur: 166, valeur2: 98, unite: "mmHg", date: day(-20), contexte: "cabinet" }, { at: at("10:00", -20) }),
  ...auto,
];

const labs = [rec("lab", ID, P.import("hprim"), { laboratoire: "Eurofins Biolab Lyon", prelevementLe: day(-18), recuLe: at("12:00", -17), resultats: [
  { loinc: "2160-0", libelle: "Créatinine", valeur: 88, unite: "µmol/L", refMin: 60, refMax: 110, flag: "normal" }, { loinc: "62238-1", libelle: "DFG (CKD-EPI)", valeur: 86, unite: "mL/min/1,73m²", refMin: 60, flag: "normal" }, { loinc: "2823-3", libelle: "Potassium", valeur: 4.1, unite: "mmol/L", refMin: 3.5, refMax: 5, flag: "normal" }, { loinc: "2339-0", libelle: "Glycémie à jeun", valeur: 1.08, unite: "g/L", refMin: 0.7, refMax: 1.1, flag: "normal" }, { loinc: "13457-7", libelle: "LDL-cholestérol", valeur: 1.45, unite: "g/L", refMax: 1.0, flag: "haut" }, { loinc: "14959-1", libelle: "Microalbuminurie", valeur: 12, unite: "mg/g", refMax: 30, flag: "normal" },
], vuLe: at("09:00", -17), lecture: { resume: "Bilan d'HTA sans atteinte rénale ; LDL à 1,45 non à la cible sous rosuvastatine 10 (observance partielle).", faitsExtraits: [], pointsAttention: ["Glycémie à 1,08 : limite, à surveiller (obésité)."], urgence: "aucune", confidence: 0.95 } }, { at: at("12:00", -17) })];

const documents = [rec("document", ID, P.import("mssante"), {
  type: "cr-specialiste", titre: "Courrier du Dr Lefèvre (médecin du travail) — somnolence et HTA", auteur: "Dr Anne Lefèvre, médecin du travail, AST Grand Lyon", dateDocument: day(-2), recuLe: at("09:05", -1), canal: "mssante", format: "pdf", pages: 1,
  texte: `Chère consœur,\n\nJ'ai vu M. Roussel en visite périodique le ${day(-2)}. TA 164/100 à deux reprises. Il rapporte des ronflements importants, des réveils nocturnes et une somnolence diurne (Epworth 12), avec un endormissement au volant évité de justesse le mois dernier. IMC 31.\n\nJe vous l'adresse pour avis sur une éventuelle polygraphie ventilatoire, et vous signale que son métier implique la conduite quotidienne d'un utilitaire.\n\nBien confraternellement,\nDr A. Lefèvre`,
  lecture: { resume: "Le médecin du travail signale une HTA confirmée (164/100) et une suspicion forte de SAOS (Epworth 12, endormissement au volant). Demande d'avis pour polygraphie. Conduite professionnelle.", faitsExtraits: [{ type: "problem", libelle: "Suspicion de SAOS (Epworth 12)", cim10: "G47.3", statut: "nouveau" }, { type: "measure", mesure: "ta", valeur: 164, valeur2: 100, unite: "mmHg", date: day(-2) }], pointsAttention: ["SAOS suspecté + HTA résistante au traitement initial : la polygraphie est indiquée et le SAOS est une cause classique d'HTA mal contrôlée [HAS 2014].", "Somnolence au volant avec conduite professionnelle : à aborder explicitement."], urgence: "semaine", confidence: 0.92 },
}, { at: at("09:05", -1) })];

const encounters = [rec("encounter", ID, P.medecin(day(-20)), {
  type: "cabinet", date: at("10:00", -20), dureeMin: 20, praticien: "pr_laurent",
  note: { motifs: ["HTA : contrôle"], histoire: "Fatigué, dort mal. Pas de céphalées. Prend l'amlodipine « quand j'y pense ». Sel +++ (repas de chantier).", examen: "TA 166/98 ×2. Poids 98 kg, IMC 31,2. Auscultation normale, pas de souffle carotidien.", conclusion: "HTA non contrôlée sous amlodipine 5 seule, observance douteuse.", conduite: "Passage en association fixe périndopril/amlodipine 5/5 (un comprimé). Tensiomètre connecté prêté → automesures sur Mon Espace Santé. Bilan rénal/iono/lipides. Revoir à 3 semaines." },
  codes: [{ systeme: "drc", code: "HTA", libelle: "Hypertension artérielle" }],
  problemesIds: [pb.hta.id],
  actes: [{ code: "G", libelle: "Consultation", montant: 30 }],
  facturation: { mode: "fse", tiersPayant: "aucun", transmiseLe: at("10:20", -20) },
}, { at: at("10:00", -20) })];

const appointment = rec("appointment", ID, P.systeme("agenda"), { debut: at("16:00"), dureeMin: 20, type: "cabinet", motif: "HTA : contrôle à 3 semaines, automesures", praticien: "pr_laurent", etat: "prevu", prisPar: "secretariat", preparationId: `${ID}.briefing.1` }, { at: at("10:20", -20) });

const proposals = [
  rec("proposal", ID, P.agent(0.9, [documents[0].id, ...auto.map((m) => m.id)]), {
    action: "courrier", titre: "Adressage pneumologie / sommeil pour polygraphie ventilatoire",
    justification: "Suspicion de SAOS (Epworth 12, ronflements, somnolence au volant) signalée par le médecin du travail [1], chez un hypertendu non contrôlé (automesure moyenne 157/95 sur 6 jours) : la polygraphie est indiquée [2].",
    references: [{ titre: "Courrier Dr Lefèvre", editeur: "Médecine du travail", date: day(-2) }, { titre: "Évaluation clinique et économique des dispositifs médicaux et prestations associées pour la prise en charge du SAHOS", editeur: "HAS", date: "2014" }],
    charge: { type: "adressage", titre: "Demande de polygraphie ventilatoire", destinataire: { nom: "Dr Samir Ould-Kaci", specialite: "Pneumologie — sommeil", mssante: "samir.ould-kaci@hcl.mssante.fr" }, date: day(0), corps: "Cher confrère,\n\nJe vous adresse M. Alain Roussel, 58 ans, artisan plombier, hypertendu non contrôlé sous périndopril/amlodipine 5/5 (automesure moyenne 157/95), IMC 31, pour suspicion de syndrome d'apnées du sommeil : ronflements, réveils nocturnes, somnolence diurne (Epworth 12) avec un endormissement au volant évité de justesse. Son activité implique une conduite quotidienne.\n\nMerci de votre avis et d'une polygraphie ventilatoire.\n\nBien confraternellement,\nDr Romain Vandepitterie" },
    declencheur: { type: "document", recordId: documents[0].id, libelle: "Courrier du médecin du travail" },
    autonomie: 1, etat: "a-valider", agent: "locus",
  }, { status: "propose", at: at("09:22", -1) }),
  rec("proposal", ID, P.agent(0.86, auto.map((m) => m.id)), {
    action: "signaler", titre: "Automesure 6 jours : 157/95 en moyenne — HTA non contrôlée sous bithérapie",
    justification: "Règle des 3 respectée (12 mesures). Moyenne 157/95, cible < 135/85 [1]. Avant d'intensifier (ajout d'un thiazidique → trithérapie), vérifier l'observance (il « oubliait » l'amlodipine) et le sel. Le SAOS suspecté est une cause d'HTA résistante.",
    references: [{ docId: "has-hta-2016", titre: "Prise en charge de l'hypertension artérielle de l'adulte", editeur: "HAS", date: "2016" }],
    declencheur: { type: "echeance", libelle: "Automesures reçues de Mon Espace Santé" },
    autonomie: 0, etat: "a-valider", agent: "locus",
  }, { status: "propose", at: at("07:55") }),
  rec("proposal", ID, P.agent(0.9, [documents[0].id]), { action: "message-confrere", titre: "Accuser réception au Dr Lefèvre (vu en consultation ce jour)", justification: "Réponse de courtoisie au médecin du travail, précisant que le patient est vu aujourd'hui et qu'une polygraphie est demandée. Partira après la consultation si vous validez l'adressage.", charge: { canal: "mssante", threadId: "th_roussel_lefevre", de: { type: "praticien", nom: "Dr Vandepitterie" }, a: [{ type: "confrere", nom: "Dr Anne Lefèvre" }], date: day(0), objet: "Re: M. Roussel — somnolence et HTA", corps: "Chère consœur,\n\nMerci pour votre courrier. Je vois M. Roussel ce jour ; je l'adresse pour polygraphie ventilatoire et je reprends le traitement de son HTA. Je vous tiendrai informée du résultat, avec son accord, pour la question de l'aptitude à la conduite.\n\nBien confraternellement,\nDr Romain Vandepitterie" }, declencheur: { type: "document", recordId: documents[0].id, libelle: "Courrier du médecin du travail" }, autonomie: 1, etat: "a-valider", agent: "locus" }, { status: "propose", at: at("09:25", -1) }),
];

const briefing = rec("briefing", ID, P.agent(0.9, [documents[0].id]), {
  appointmentId: appointment.id,
  synthese: "Plombier, ==HTA non contrôlée (automesure 157/95)== sous Coveram 5/5 depuis 3 semaines, obèse. ==Le médecin du travail suspecte un SAOS== avec somnolence au volant. Conduite professionnelle.",
  depuisDerniereFois: ["12 automesures reçues de Mon Espace Santé (tensiomètre connecté) : moyenne 157/95.", "Courrier du médecin du travail (" + day(-2) + ") : TA 164/100, Epworth 12, demande de polygraphie.", "Biologie du " + day(-18) + " : rein et K normaux, LDL 1,45, glycémie 1,08."],
  echeances: [{ libelle: "Renouvellement Coveram (1 mois) dû dans 10 jours" }, { libelle: "Dépistage colorectal : jamais fait (58 ans) — kit à remettre" }],
  questions: ["Observance réelle du Coveram ? Le comprimé unique a-t-il aidé ?", "Somnolence au volant : en parler franchement ; aptitude à la conduite en attendant la polygraphie.", "Intensifier maintenant (ajout indapamide → trithérapie) ou attendre l'observance et le SAOS ?", "Sel, alcool, activité physique."],
  propositionsIds: proposals.map((p) => p.id),
}, { id: `${ID}.briefing.1`, status: "propose", at: at("07:56") });

const summary = rec("summary", ID, P.agentValide(0.9, day(-20)), {
  enUneLigne: "58 ans, artisan plombier, HTA non contrôlée, obésité, dyslipidémie, SAOS suspecté.",
  synthese: "Hypertendu depuis 2020, longtemps sous amlodipine seule avec une observance irrégulière ; passé en association fixe il y a 3 semaines. Obésité (IMC 31), repas de chantier salés. Hypercholestérolémie sous rosuvastatine, mal observée. Somnolence et ronflements : SAOS suspecté par le médecin du travail.",
  enCeMoment: ["HTA 157/95 en automesure : observance puis intensification.", "Polygraphie du sommeil à demander ; conduite professionnelle.", "LDL 1,45 ; dépistage colorectal jamais fait."],
  derniereValidation: day(-20), changementsDepuis: [documents[0].id],
}, { at: at("07:56") });

export const dossierRoussel: Dossier = {
  patient: patientRoussel,
  records: [...Object.values(pb), ...meds, ...mesures, ...labs, ...documents, ...encounters, appointment, ...proposals, briefing, summary],
  journal: [
    journal(ID, at("09:05", -1), SYS("MSSanté"), "document.receive", "Courrier Dr Lefèvre (médecine du travail)", documents[0].id),
    journal(ID, at("09:22", -1), LOCUS, "proposal.create", "Adressage polygraphie", proposals[0].id),
    journal(ID, at("07:55"), LOCUS, "proposal.create", "Signaler : automesure 157/95", proposals[1].id),
    journal(ID, at("20:35", -1), SYS("Mon Espace Santé"), "measure.receive", "Automesure tensionnelle reçue (tensiomètre connecté)", auto[auto.length - 1].id),
  ],
};
