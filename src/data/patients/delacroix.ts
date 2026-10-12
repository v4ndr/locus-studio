import type { Dossier, Patient } from "@/domain/types";
import { rec, P, journal, LOCUS, LAURENT, SYS } from "../build";
import { at, day } from "../clock";

/**
 * Marguerite Delacroix, 74 ans — diabète de type 2, HTA, fibrillation atriale
 * sous apixaban. Le « patient héros » du jeu de données : une biologie reçue
 * ce matin (HbA1c qui monte, DFG qui baisse), un compte rendu de cardiologie
 * arrivé hier, une fille aidante qui écrit, et une consultation à 9h30.
 */
const ID = "pat_delacroix";

export const patientDelacroix = rec("patient", ID, P.systeme("insi"), {
  ins: { matricule: "2 52 08 69 123 456 78", oid: "1.2.250.1.213.1.4.8", nomNaissance: "DELACROIX", prenoms: "MARGUERITE JEANNE", sexe: "F", dateNaissance: "1952-08-22", lieuNaissance: "69123", statut: "qualifiee", verifieeLe: day(-120) },
  nomUsage: "Delacroix",
  prenomUsuel: "Marguerite",
  photoHue: 24,
  contact: { telephone: "06 12 34 56 78", adresse: { ligne1: "8 rue Pasteur", codePostal: "69007", ville: "Lyon" }, canalPrefere: "telephone", langue: "fr" },
  couverture: {
    regime: "general",
    ald: [{ code: "E11", libelle: "Diabète de type 2", depuis: "2017-04-01" }, { code: "I48", libelle: "Fibrillation atriale", depuis: "2024-11-15" }],
    mutuelle: { nom: "Harmonie Mutuelle", numero: "HM-4471209" },
    medecinTraitant: { rpps: "10003456789", nom: "Dr Romain Vandepitterie", declareLe: "2016-02-10" },
    droitsVerifiesLe: day(-30),
  },
  vie: { profession: "Retraitée (institutrice)", situation: "Veuve, vit seule au 3e sans ascenseur", aidant: "Sa fille Anne (aidante principale)" },
  personneConfiance: { nom: "Anne Delacroix", lien: "fille", telephone: "06 98 76 54 32" },
  consentement: { monEspaceSante: true, dmpAlimentation: true, messagerieAgent: "logistique" },
}, { id: ID, at: "2016-02-10T10:00:00+02:00" });

const pb = {
  dt2: rec("problem", ID, P.medecin("2017-04-01"), { libelle: "Diabète de type 2", categorie: "medical", cim10: "E11", cisp2: "T90", depuis: "2017-04-01", evolution: "chronique", enAvant: true }, { at: "2017-04-01T10:00:00+02:00" }),
  hta: rec("problem", ID, P.medecin("2014-06-12"), { libelle: "Hypertension artérielle", categorie: "medical", cim10: "I10", cisp2: "K86", depuis: "2014-06-12", evolution: "chronique", enAvant: true }, { at: "2014-06-12T10:00:00+02:00" }),
  fa: rec("problem", ID, P.agentValide(0.96, "2024-11-20", ["pat_delacroix.document.1"]), { libelle: "Fibrillation atriale paroxystique", categorie: "medical", cim10: "I48.0", cisp2: "K78", depuis: "2024-11-15", evolution: "chronique", enAvant: true, note: "Diagnostiquée au CH Lyon-Sud sur palpitations. CHA₂DS₂-VASc 5." }, { at: "2024-11-20T10:00:00+02:00" }),
  mrc: rec("problem", ID, P.agent(0.88, ["pat_delacroix.lab.1"]), { libelle: "Maladie rénale chronique stade 3a", categorie: "medical", cim10: "N18.3", cisp2: "U99", depuis: day(-1), evolution: "chronique", enAvant: true, note: "DFG 48 mL/min sur deux dosages à 3 mois d'intervalle (54 en décembre)." }, { status: "propose", at: at("07:42") }),
  hanche: rec("problem", ID, P.medecin("2022-03-01"), { libelle: "Prothèse totale de hanche droite", categorie: "chirurgical", cim10: "Z96.6", depuis: "2022-03-01", evolution: "antecedent", enAvant: true }, { at: "2022-03-01T10:00:00+02:00" }),
  mere: rec("problem", ID, P.medecin("2016-02-10"), { libelle: "Diabète de type 2 et AVC", categorie: "familial", apparente: "mère", evolution: "antecedent", enAvant: true }, { at: "2016-02-10T10:00:00+02:00" }),
  tabac: rec("problem", ID, P.medecin("2016-02-10"), { libelle: "Tabac sevré depuis 1998 (20 PA)", categorie: "mode-de-vie", evolution: "antecedent", enAvant: true }, { at: "2016-02-10T10:00:00+02:00" }),
  chute: rec("problem", ID, P.agentValide(0.9, day(-200), ["pat_delacroix.encounter.2"]), { libelle: "Chute à domicile sans fracture", categorie: "medical", cim10: "W19", depuis: day(-203), finLe: day(-203), evolution: "aigu", enAvant: false }, { status: "resolu", at: at("10:00", -203) }),
};

const allergies = [
  rec("allergy", ID, P.medecin("2016-02-10"), { substance: "Pénicillines", type: "medicamenteuse", reaction: "Urticaire généralisée (1989)", severite: "moderee", certitude: "rapportee", atc: "J01C" }, { at: "2016-02-10T10:00:00+02:00" }),
];

const meds = [
  rec("medication", ID, P.medecin("2017-04-01"), { dci: "metformine", specialite: "METFORMINE 1000 mg", cis: "66185592", dosage: "1000 mg", forme: "comprimé", posologie: "1 cp matin et soir", voie: "orale", debut: "2017-04-01", type: "chronique", ald: true, dernierRenouvellement: day(-85), dureeRenouvellementJours: 90, observance: "bonne" }, { at: "2017-04-01T10:00:00+02:00" }),
  rec("medication", ID, P.medecin("2019-09-15"), { dci: "ramipril", specialite: "RAMIPRIL 5 mg", dosage: "5 mg", forme: "comprimé", posologie: "1 cp le matin", voie: "orale", debut: "2019-09-15", type: "chronique", ald: true, dernierRenouvellement: day(-85), dureeRenouvellementJours: 90, observance: "bonne" }, { at: "2019-09-15T10:00:00+02:00" }),
  rec("medication", ID, P.medecin("2019-09-15"), { dci: "amlodipine", specialite: "AMLODIPINE 5 mg", dosage: "5 mg", forme: "gélule", posologie: "1 gélule le matin", voie: "orale", debut: "2019-09-15", type: "chronique", ald: true, dernierRenouvellement: day(-85), dureeRenouvellementJours: 90 }, { at: "2019-09-15T10:00:00+02:00" }),
  rec("medication", ID, P.agentValide(0.97, "2024-11-20", ["pat_delacroix.document.1"]), { dci: "apixaban", specialite: "ELIQUIS 5 mg", cis: "62045256", dosage: "5 mg", forme: "comprimé", posologie: "1 cp matin et soir", voie: "orale", debut: "2024-11-15", type: "chronique", ald: true, prescripteur: "Dr Rabier, cardiologue", dernierRenouvellement: day(-85), dureeRenouvellementJours: 90, observance: "bonne" }, { at: "2024-11-20T10:00:00+02:00" }),
  rec("medication", ID, P.medecin("2020-01-10"), { dci: "atorvastatine", specialite: "ATORVASTATINE 20 mg", dosage: "20 mg", forme: "comprimé", posologie: "1 cp le soir", voie: "orale", debut: "2020-01-10", type: "chronique", ald: true, dernierRenouvellement: day(-85), dureeRenouvellementJours: 90, observance: "partielle" }, { at: "2020-01-10T10:00:00+02:00" }),
  rec("medication", ID, P.medecin(day(-85)), { dci: "paracétamol", dosage: "1 g", forme: "comprimé", posologie: "1 cp jusqu'à 3 fois par jour si douleur", voie: "orale", type: "si-besoin" }, { at: at("10:00", -85) }),
];

const vaccins = [
  rec("vaccination", ID, P.medecin(day(-150)), { valences: ["Grippe saisonnière"], nomCommercial: "Efluelda", date: day(-150), rappelPrevu: day(215) }, { at: at("10:00", -150) }),
  rec("vaccination", ID, P.medecin(day(-150)), { valences: ["COVID-19"], nomCommercial: "Comirnaty 2025-2026", date: day(-150) }, { at: at("10:00", -150) }),
  rec("vaccination", ID, P.medecin("2025-05-12"), { valences: ["dTP"], nomCommercial: "Revaxis", date: "2025-05-12", rappelPrevu: "2035-05-12" }, { at: "2025-05-12T10:00:00+02:00" }),
  rec("vaccination", ID, P.medecin("2025-01-14"), { valences: ["Zona"], nomCommercial: "Shingrix (2/2)", date: "2025-01-14" }, { at: "2025-01-14T10:00:00+02:00" }),
  rec("vaccination", ID, P.medecin("2020-11-02"), { valences: ["Pneumocoque"], nomCommercial: "Prevenar 20", date: "2020-11-02" }, { at: "2020-11-02T10:00:00+02:00" }),
];

const mesures = [
  rec("measure", ID, P.medecin(day(-85)), { type: "poids", valeur: 71, unite: "kg", date: day(-85), contexte: "cabinet" }, { at: at("10:00", -85) }),
  rec("measure", ID, P.medecin(day(-85)), { type: "taille", valeur: 160, unite: "cm", date: day(-85), contexte: "cabinet" }, { at: at("10:00", -85) }),
  rec("measure", ID, P.systeme("calcul"), { type: "imc", valeur: 27.7, unite: "kg/m²", date: day(-85) }, { at: at("10:00", -85) }),
  rec("measure", ID, P.medecin(day(-85)), { type: "ta", valeur: 148, valeur2: 86, unite: "mmHg", date: day(-85), contexte: "cabinet" }, { at: at("10:00", -85) }),
  rec("measure", ID, P.medecin(day(-176)), { type: "ta", valeur: 142, valeur2: 84, unite: "mmHg", date: day(-176), contexte: "cabinet" }, { at: at("10:00", -176) }),
  rec("measure", ID, P.patient(), { type: "ta", valeur: 151, valeur2: 88, unite: "mmHg", date: day(-6), contexte: "automesure" }, { at: at("08:00", -6) }),
  rec("measure", ID, P.patient(), { type: "ta", valeur: 147, valeur2: 85, unite: "mmHg", date: day(-5), contexte: "automesure" }, { at: at("08:00", -5) }),
  rec("measure", ID, P.patient(), { type: "ta", valeur: 153, valeur2: 90, unite: "mmHg", date: day(-4), contexte: "automesure" }, { at: at("08:00", -4) }),
  rec("measure", ID, P.systeme("hprim"), { type: "dfg", valeur: 48, unite: "mL/min/1,73m²", date: day(-2) }, { at: at("07:30") }),
];

const labs = [
  rec("lab", ID, P.import("hprim"), {
    laboratoire: "Laboratoire Biogroup — Lyon Jean-Macé",
    prelevementLe: day(-2),
    recuLe: at("07:30"),
    prescriptionId: `${ID}.prescription.2`,
    resultats: [
      { loinc: "4548-4", libelle: "HbA1c", valeur: 8.1, unite: "%", refMin: 4, refMax: 6, flag: "haut", precedent: { valeur: 7.4, date: day(-95) } },
      { loinc: "2339-0", libelle: "Glycémie à jeun", valeur: 1.52, unite: "g/L", refMin: 0.7, refMax: 1.1, flag: "haut", precedent: { valeur: 1.31, date: day(-95) } },
      { loinc: "2160-0", libelle: "Créatinine", valeur: 102, unite: "µmol/L", refMin: 45, refMax: 84, flag: "haut", precedent: { valeur: 91, date: day(-95) } },
      { loinc: "62238-1", libelle: "DFG (CKD-EPI)", valeur: 48, unite: "mL/min/1,73m²", refMin: 60, flag: "bas", precedent: { valeur: 54, date: day(-95) } },
      { loinc: "2823-3", libelle: "Potassium", valeur: 4.6, unite: "mmol/L", refMin: 3.5, refMax: 5, flag: "normal" },
      { loinc: "2951-2", libelle: "Sodium", valeur: 139, unite: "mmol/L", refMin: 135, refMax: 145, flag: "normal" },
      { loinc: "13457-7", libelle: "LDL-cholestérol", valeur: 1.12, unite: "g/L", refMax: 0.7, flag: "haut", precedent: { valeur: 0.98, date: day(-95) } },
      { loinc: "14959-1", libelle: "Microalbuminurie (RAC)", valeur: 42, unite: "mg/g", refMax: 30, flag: "haut", precedent: { valeur: 18, date: day(-370) } },
      { loinc: "718-7", libelle: "Hémoglobine", valeur: 12.6, unite: "g/dL", refMin: 12, refMax: 16, flag: "normal" },
      { loinc: "3016-3", libelle: "TSH", valeur: 2.1, unite: "mUI/L", refMin: 0.4, refMax: 4, flag: "normal" },
    ],
    lecture: {
      resume: "Le diabète se dégrade (HbA1c 8,1 % contre 7,4 % il y a 3 mois) et la fonction rénale baisse (DFG 48, microalbuminurie qui apparaît). Le LDL n'est pas à la cible sous atorvastatine 20, avec une observance déclarée partielle.",
      faitsExtraits: [
        { type: "problem", libelle: "Maladie rénale chronique stade 3a", cim10: "N18.3", statut: "nouveau" },
        { type: "measure", mesure: "dfg", valeur: 48, unite: "mL/min/1,73m²", date: day(-2) },
      ],
      pointsAttention: [
        "Metformine 2000 mg/j : à DFG 45-59, la dose maximale est 2000 mg/j (RCP 4.2) — on est au plafond ; un nouveau recul impose de réduire.",
        "HbA1c > 8 % avec MRC et microalbuminurie : un iSGLT2 a une indication rénale et cardiovasculaire indépendante de la glycémie (HAS 2024).",
        "Apixaban 5 mg ×2 : critères de réduction non réunis (74 ans, 71 kg, créatinine 102 < 133) — pas de changement.",
        "Ramipril + MRC + microalbuminurie : poursuivre, surveiller le potassium (4,6, limite haute).",
      ],
      urgence: "semaine",
      references: [
        { docId: "has-dt2-2024", titre: "Stratégie médicamenteuse du contrôle glycémique du diabète de type 2", editeur: "HAS", date: "2024" },
        { docId: "rcp-metformine-4.2", titre: "RCP Metformine — 4.2 Posologie", editeur: "ANSM" },
      ],
      confidence: 0.91,
    },
  }, { at: at("07:30") }),
  rec("lab", ID, P.import("hprim"), {
    laboratoire: "Laboratoire Biogroup — Lyon Jean-Macé",
    prelevementLe: day(-95),
    recuLe: at("09:00", -94),
    resultats: [
      { loinc: "4548-4", libelle: "HbA1c", valeur: 7.4, unite: "%", refMin: 4, refMax: 6, flag: "haut", precedent: { valeur: 7.1, date: day(-190) } },
      { loinc: "2339-0", libelle: "Glycémie à jeun", valeur: 1.31, unite: "g/L", refMin: 0.7, refMax: 1.1, flag: "haut" },
      { loinc: "2160-0", libelle: "Créatinine", valeur: 91, unite: "µmol/L", refMin: 45, refMax: 84, flag: "haut" },
      { loinc: "62238-1", libelle: "DFG (CKD-EPI)", valeur: 54, unite: "mL/min/1,73m²", refMin: 60, flag: "bas" },
      { loinc: "13457-7", libelle: "LDL-cholestérol", valeur: 0.98, unite: "g/L", refMax: 0.7, flag: "haut" },
    ],
    vuLe: at("10:00", -85),
  }, { at: at("09:00", -94) }),
];

labs.push(
  rec("lab", ID, P.import("hprim"), {
    laboratoire: "Laboratoire Biogroup — Lyon Jean-Macé", prelevementLe: day(-370), recuLe: at("09:00", -369), vuLe: at("10:00", -360),
    resultats: [
      { loinc: "4548-4", libelle: "HbA1c", valeur: 7.0, unite: "%", refMin: 4, refMax: 6, flag: "haut" },
      { loinc: "2160-0", libelle: "Créatinine", valeur: 84, unite: "µmol/L", refMin: 45, refMax: 84, flag: "normal" },
      { loinc: "62238-1", libelle: "DFG (CKD-EPI)", valeur: 61, unite: "mL/min/1,73m²", refMin: 60, flag: "normal" },
      { loinc: "13457-7", libelle: "LDL-cholestérol", valeur: 1.05, unite: "g/L", refMax: 0.7, flag: "haut" },
      { loinc: "14959-1", libelle: "Microalbuminurie (RAC)", valeur: 18, unite: "mg/g", refMax: 30, flag: "normal" },
    ],
  }, { at: at("09:00", -369) }),
  rec("lab", ID, P.import("hprim"), {
    laboratoire: "Laboratoire Biogroup — Lyon Jean-Macé", prelevementLe: day(-730), recuLe: at("09:00", -729), vuLe: at("10:00", -720),
    resultats: [
      { loinc: "4548-4", libelle: "HbA1c", valeur: 6.9, unite: "%", refMin: 4, refMax: 6, flag: "haut" },
      { loinc: "2160-0", libelle: "Créatinine", valeur: 79, unite: "µmol/L", refMin: 45, refMax: 84, flag: "normal" },
      { loinc: "62238-1", libelle: "DFG (CKD-EPI)", valeur: 66, unite: "mL/min/1,73m²", refMin: 60, flag: "normal" },
      { loinc: "13457-7", libelle: "LDL-cholestérol", valeur: 0.92, unite: "g/L", refMax: 0.7, flag: "haut" },
    ],
  }, { at: at("09:00", -729) }),
);

const documents = [
  rec("document", ID, P.import("mssante"), {
    type: "cr-specialiste",
    titre: "Compte rendu de consultation de cardiologie",
    auteur: "Dr Hélène Rabier, cardiologue, CH Lyon-Sud",
    dateDocument: day(-3),
    recuLe: at("17:12", -1),
    canal: "mssante",
    format: "cda",
    pages: 2,
    texte: `CONSULTATION DE CARDIOLOGIE — ${day(-3)}

Patiente de 74 ans suivie pour FA paroxystique diagnostiquée en novembre 2024, sous apixaban 5 mg x2, diabète de type 2, HTA.

Motif : suivi annuel. Palpitations occasionnelles, pas de dyspnée d'effort notable (NYHA I-II), pas de syncope.

Examen : TA 146/84, FC 72 régulière. Auscultation sans souffle. Pas d'œdème.

ECG : rythme sinusal, 70/min, PR 180 ms, pas de trouble de repolarisation.
Holter 24 h (${day(-10)}) : 3 épisodes de FA paroxystique de 2 à 40 min, charge en FA 1,8 %. Pas de pause.
Échocardiographie : FEVG 58 %, OG modérément dilatée (42 mL/m²), pas de valvulopathie significative, PAPs 28 mmHg.

Conclusion : FA paroxystique à faible charge, bien tolérée. CHA2DS2-VASc 5, HAS-BLED 2. Poursuite de l'anticoagulation par apixaban 5 mg x2 (critères de réduction de dose non réunis à ce jour, à réévaluer selon la fonction rénale). Pas d'indication à un contrôle du rythme.
Je propose d'introduire un bêtabloquant à faible dose (bisoprolol 2,5 mg) en cas de palpitations gênantes — à discuter avec vous selon la tolérance tensionnelle.
Contrôle dans un an, plus tôt si symptômes.

Dr H. Rabier`,
    lecture: {
      resume: "FA paroxystique à faible charge (1,8 %), bien tolérée, FEVG conservée. La cardiologue maintient l'apixaban 5 mg ×2 et vous laisse la main sur un bisoprolol 2,5 mg si les palpitations gênent.",
      faitsExtraits: [
        { type: "measure", mesure: "ta", valeur: 146, valeur2: 84, unite: "mmHg", date: day(-3) },
        { type: "rdv", libelle: "Contrôle cardiologique annuel", echeance: day(362) },
      ],
      pointsAttention: [
        "Elle conditionne la dose d'apixaban à la fonction rénale : la biologie de ce matin (DFG 48, créatinine 102) ne franchit pas le seuil de 133 µmol/L — pas de changement.",
        "Bisoprolol : TA cabinet et automesures autour de 150/88, pas d'obstacle tensionnel ; à décider avec la patiente selon la gêne.",
      ],
      urgence: "aucune",
      confidence: 0.94,
    },
  }, { at: at("17:12", -1) }),
  rec("document", ID, P.import("mssante"), {
    type: "cr-hospitalisation",
    titre: "Compte rendu d'hospitalisation — cardiologie",
    auteur: "Service de cardiologie, CH Lyon-Sud",
    dateDocument: "2024-11-18",
    recuLe: "2024-11-19T10:00:00+02:00",
    canal: "mssante",
    format: "cda",
    pages: 3,
    texte: "Hospitalisation du 15 au 18 novembre 2024 pour palpitations. Diagnostic : fibrillation atriale paroxystique. CHA2DS2-VASc 5. Introduction d'apixaban 5 mg x2/j. Sortie à domicile, suivi cardiologique à 3 mois.",
    vuLe: "2024-11-20T10:00:00+02:00",
    lecture: { resume: "Diagnostic de FA paroxystique, introduction de l'apixaban.", faitsExtraits: [{ type: "problem", libelle: "Fibrillation atriale paroxystique", cim10: "I48.0", statut: "nouveau" }, { type: "medication", dci: "apixaban", posologie: "5 mg x2/j", action: "debute" }], pointsAttention: [], urgence: "aucune", confidence: 0.97 },
  }, { at: "2024-11-19T10:00:00+02:00" }),
  rec("document", ID, P.import("mssante"), {
    type: "cr-specialiste",
    titre: "Compte rendu d'ophtalmologie — fond d'œil",
    auteur: "Dr Paul Kessler, ophtalmologue",
    dateDocument: day(-470),
    recuLe: at("10:00", -468),
    canal: "mssante",
    format: "pdf",
    texte: "Fond d'œil dilaté : pas de rétinopathie diabétique. Cataracte débutante bilatérale, non chirurgicale. Contrôle à un an.",
    vuLe: at("10:00", -460),
    lecture: { resume: "Pas de rétinopathie. Contrôle annuel demandé — non réalisé depuis.", faitsExtraits: [], pointsAttention: ["Fond d'œil en retard de 3 mois."], urgence: "aucune", confidence: 0.98 },
  }, { at: at("10:00", -468) }),
];

const encounters = [
  rec("encounter", ID, P.medecin(day(-85)), {
    type: "cabinet",
    date: at("10:00", -85),
    dureeMin: 22,
    praticien: "pr_laurent",
    note: {
      motifs: ["Suivi diabète / HTA", "Renouvellement"],
      histoire: "Va bien. Marche 30 min par jour avec sa voisine. Reconnaît oublier l'atorvastatine « un soir sur trois ». Pas d'hypoglycémie. Palpitations rares, brèves.",
      examen: "TA 148/86 (deux mesures). Poids 71 kg (stable). Pieds : pouls perçus, monofilament normal, pas de lésion. Auscultation normale.",
      conclusion: "DT2 avec HbA1c 7,4 %, en dérive lente. HTA non à la cible au cabinet, automesure à faire.",
      conduite: "Renouvellement 3 mois. Bilan dans 3 mois (HbA1c, créat, iono, lipides, microalbuminurie). Rappeler l'importance de la statine. Automesure tensionnelle 3 jours avant la prochaine consultation. Fond d'œil à reprogrammer.",
    },
    codes: [{ systeme: "drc", code: "DIABETE TYPE 2", libelle: "Diabète de type 2" }, { systeme: "drc", code: "HTA", libelle: "Hypertension artérielle" }],
    problemesIds: [pb.dt2.id, pb.hta.id],
    actes: [{ code: "G", libelle: "Consultation", montant: 30, majorations: [] }],
    facturation: { mode: "fse", tiersPayant: "amo", transmiseLe: at("10:25", -85) },
    mesuresIds: [mesures[0].id, mesures[3].id],
  }, { at: at("10:00", -85) }),
  rec("encounter", ID, P.medecin(day(-203)), {
    type: "visite",
    date: at("18:30", -203),
    dureeMin: 30,
    praticien: "pr_laurent",
    note: {
      motifs: ["Chute à domicile"],
      histoire: "Chute ce matin en se levant, sans malaise, sans perte de connaissance. Appelée par sa fille.",
      examen: "Hématome de la hanche gauche, mobilisation possible, pas de raccourcissement ni rotation. TA 138/82 debout sans hypotension orthostatique.",
      conclusion: "Chute mécanique sans fracture clinique.",
      conduite: "Antalgie paracétamol. Pas d'imagerie. Évaluer le risque de chute : kiné équilibre, revoir le domicile (tapis). Pas d'anticoagulation à modifier.",
    },
    codes: [{ systeme: "drc", code: "CHUTE", libelle: "Chute" }],
    actes: [{ code: "VG", libelle: "Visite", montant: 30, majorations: ["MD"] }],
    facturation: { mode: "fse", tiersPayant: "amo", transmiseLe: at("19:00", -203) },
  }, { at: at("18:30", -203) }),
];

const prescriptions = [
  rec("prescription", ID, P.medecin(day(-85)), {
    type: "medicament",
    date: day(-85),
    encounterId: encounters[0].id,
    lignes: [
      { libelle: "METFORMINE 1000 mg cp", dci: "metformine", cis: "66185592", posologie: "1 cp matin et soir", duree: "3 mois", ald: true },
      { libelle: "RAMIPRIL 5 mg cp", dci: "ramipril", posologie: "1 cp le matin", duree: "3 mois", ald: true },
      { libelle: "AMLODIPINE 5 mg gél", dci: "amlodipine", posologie: "1 gélule le matin", duree: "3 mois", ald: true },
      { libelle: "ELIQUIS 5 mg cp", dci: "apixaban", cis: "62045256", posologie: "1 cp matin et soir", duree: "3 mois", ald: true },
      { libelle: "ATORVASTATINE 20 mg cp", dci: "atorvastatine", posologie: "1 cp le soir", duree: "3 mois", ald: true },
    ],
    signature: { par: "pr_laurent", le: at("10:20", -85) },
    ordonnanceNumerique: { id: "ON-7K2M-9Q4D-XW1A-5HBP", transmiseLe: at("10:20", -85), dispenseeLe: at("16:00", -84) },
  }, { at: at("10:20", -85) }),
  rec("prescription", ID, P.medecin(day(-85)), {
    type: "biologie",
    date: day(-85),
    encounterId: encounters[0].id,
    lignes: [
      { libelle: "HbA1c", loinc: "4548-4" }, { libelle: "Glycémie à jeun" }, { libelle: "Créatinine, DFG" }, { libelle: "Ionogramme sanguin" }, { libelle: "Bilan lipidique" }, { libelle: "Microalbuminurie (rapport albumine/créatinine)" }, { libelle: "NFS" }, { libelle: "TSH" },
    ],
    mention: "À faire dans 3 mois, à jeun.",
    signature: { par: "pr_laurent", le: at("10:21", -85) },
    ordonnanceNumerique: { id: "ON-3F8R-2LQ7-PM9C-ZT6V", transmiseLe: at("10:21", -85), dispenseeLe: at("08:10", -2) },
  }, { at: at("10:21", -85) }),
];

const carePlans = [
  rec("care-plan", ID, P.agentValide(0.95, "2017-04-01"), {
    problemId: pb.dt2.id,
    libelle: "Suivi diabète de type 2",
    objectifs: [
      { libelle: "HbA1c", cible: "≤ 7 %", actuel: "8,1 %", atteint: false },
      { libelle: "LDL-cholestérol", cible: "< 0,7 g/L (haut risque)", actuel: "1,12 g/L", atteint: false },
      { libelle: "Pression artérielle", cible: "< 140/90", actuel: "148/86", atteint: false },
    ],
    items: [
      { libelle: "HbA1c", periodiciteMois: 3, dernierLe: day(-2), echeance: day(89), satisfaitPar: labs[0].id },
      { libelle: "Fond d'œil", periodiciteMois: 12, dernierLe: day(-470), echeance: day(-105), reference: { titre: "Guide parcours DT2", editeur: "HAS" } },
      { libelle: "Microalbuminurie", periodiciteMois: 12, dernierLe: day(-2), echeance: day(363), satisfaitPar: labs[0].id },
      { libelle: "Créatinine / DFG", periodiciteMois: 12, dernierLe: day(-2), echeance: day(363), satisfaitPar: labs[0].id },
      { libelle: "Examen des pieds", periodiciteMois: 12, dernierLe: day(-85), echeance: day(280) },
      { libelle: "ECG", periodiciteMois: 12, dernierLe: day(-3), echeance: day(362), satisfaitPar: documents[0].id },
      { libelle: "Bilan dentaire", periodiciteMois: 12, dernierLe: day(-400), echeance: day(-35) },
    ],
  }, { at: "2017-04-01T10:00:00+02:00" }),
];

const screenings = [
  rec("screening", ID, P.systeme("depistage"), { programme: "colorectal", libelle: "Dépistage du cancer colorectal (test immunologique)", dernierLe: day(-500), prochainLe: day(230), etat: "a-jour" }),
  rec("screening", ID, P.systeme("depistage"), { programme: "sein", libelle: "Mammographie de dépistage", dernierLe: day(-300), prochainLe: day(430), etat: "a-jour" }),
];

const messages = [
  rec("message", ID, P.patient(), {
    canal: "patient",
    threadId: "th_delacroix_anne",
    de: { type: "patient", nom: "Anne Delacroix (fille, aidante)" },
    a: [{ type: "praticien", nom: "Dr Vandepitterie" }],
    date: at("21:40", -1),
    objet: "Maman — avant le rendez-vous de demain",
    corps: "Bonsoir Docteur, je viendrai avec maman demain. Elle a eu deux fois des palpitations cette semaine, le soir, environ 20 minutes. Elle ne veut pas vous le dire pour « ne pas vous embêter ». Elle a aussi tendance à oublier le comprimé du soir (le cholestérol surtout). Est-ce qu'un pilulier connecté pourrait aider ? Merci, Anne",
    triage: {
      intention: "symptome",
      urgence: "jour",
      resume: "La fille signale des palpitations nocturnes ×2 cette semaine (≈20 min) et des oublis du traitement du soir. Demande un pilulier.",
      autonomePossible: false,
      reponseProposeeId: `${ID}.message.2`,
    },
  }, { at: at("21:40", -1) }),
  rec("message", ID, P.agent(0.9), {
    canal: "patient",
    threadId: "th_delacroix_anne",
    de: { type: "agent", nom: "Locus, pour le Dr Vandepitterie" },
    a: [{ type: "patient", nom: "Anne Delacroix" }],
    date: at("07:50"),
    objet: "Re: Maman — avant le rendez-vous de demain",
    corps: "Bonjour Anne,\n\nMerci de nous l'avoir écrit — c'est exactement le genre d'information qui compte. Le Dr Vandepitterie en parlera avec votre mère ce matin ; le compte rendu de la cardiologue reçu hier prévoit justement cette situation.\n\nPour le pilulier : oui, c'est une bonne idée. Le cabinet peut prescrire un pilulier hebdomadaire préparé par la pharmacie (sans surcoût), et nous pouvons activer des rappels sur Mon Espace Santé si votre mère est d'accord.\n\nÀ tout à l'heure,\nSol, pour le Dr Vandepitterie",
  }, { status: "propose", at: at("07:50") }),
];

const appointment = rec("appointment", ID, P.systeme("agenda"), {
  debut: at("09:30"),
  dureeMin: 30,
  type: "cabinet",
  motif: "Suivi diabète / HTA — résultats de biologie",
  praticien: "pr_laurent",
  etat: "prevu",
  prisPar: "secretariat",
  preparationId: `${ID}.briefing.1`,
}, { at: at("10:00", -85) });

const proposals = [
  rec("proposal", ID, P.agent(0.91, [labs[0].id]), {
    action: "ordonnance",
    titre: "Ajouter la dapagliflozine 10 mg et plafonner la metformine",
    justification: "HbA1c à 8,1 % malgré la metformine à dose maximale pour un DFG de 48 [1], avec une microalbuminurie nouvelle : un iSGLT2 est recommandé pour sa protection rénale et cardiovasculaire, indépendamment de la glycémie [2]. La metformine reste à 2000 mg/j, dose plafond entre 45 et 59 mL/min [1].",
    references: [
      { docId: "rcp-metformine-4.2", titre: "RCP Metformine — 4.2 Posologie et mode d'administration", editeur: "ANSM" },
      { docId: "has-dt2-2024", titre: "Stratégie médicamenteuse du contrôle glycémique du diabète de type 2", editeur: "HAS", date: "2024" },
    ],
    charge: {
      type: "medicament",
      date: day(0),
      lignes: [
        { libelle: "DAPAGLIFLOZINE 10 mg cp", dci: "dapagliflozine", posologie: "1 cp le matin", duree: "3 mois", ald: true, alertes: [{ type: "insuffisance-renale", niveau: "info", message: "Initiation possible jusqu'à DFG 25 mL/min ; l'effet glycémique diminue sous 45. Informer sur l'hygiène génitale et les signes de cétose.", reference: { titre: "RCP Forxiga — 4.4", editeur: "ANSM" } }] },
        { libelle: "METFORMINE 1000 mg cp", dci: "metformine", cis: "66185592", posologie: "1 cp matin et soir", duree: "3 mois", ald: true, alertes: [{ type: "insuffisance-renale", niveau: "precaution", message: "DFG 48 : dose maximale 2000 mg/j. Réévaluer la fonction rénale à 3 mois.", reference: { titre: "RCP Metformine — 4.2", editeur: "ANSM" } }] },
      ],
      mention: "Contrôle créatinine et ionogramme dans 15 jours.",
    },
    declencheur: { type: "lab", recordId: labs[0].id, libelle: "Biologie reçue ce matin" },
    autonomie: 1,
    etat: "a-valider",
    agent: "locus",
    traceId: "tr_sim_8f2a",
  }, { status: "propose", at: at("07:44") }),
  rec("proposal", ID, P.agent(0.88, [labs[0].id]), {
    action: "creer-enregistrement",
    titre: "Inscrire « Maladie rénale chronique stade 3a » aux problèmes",
    justification: "Deux DFG < 60 à plus de 3 mois d'intervalle (54 puis 48) avec microalbuminurie : la définition de la MRC est remplie [1]. L'inscrire rend la contrainte visible à chaque prescription (LAP) et déclenche le plan de suivi rénal.",
    references: [{ docId: "has-mrc-2021", titre: "Guide du parcours de soins — Maladie rénale chronique de l'adulte", editeur: "HAS", date: "2021" }],
    charge: { recordId: pb.mrc.id, patch: { status: "actif" } },
    declencheur: { type: "lab", recordId: labs[0].id, libelle: "Biologie reçue ce matin" },
    autonomie: 1,
    etat: "a-valider",
    agent: "locus",
  }, { status: "propose", at: at("07:42") }),
  rec("proposal", ID, P.agent(0.86, [documents[0].id, messages[0].id]), {
    action: "signaler",
    titre: "Palpitations : la cardiologue propose bisoprolol 2,5 mg si gêne",
    justification: "Le compte rendu d'hier [1] laisse la décision au cabinet ; la fille rapporte deux épisodes cette semaine [2]. À aborder en consultation ; la TA (≈150/88) ne s'y oppose pas. Je n'ai rien préparé : c'est une décision clinique.",
    references: [{ titre: "CR cardiologie Dr Rabier", editeur: "CH Lyon-Sud", date: day(-3) }, { titre: "Message d'Anne Delacroix", editeur: "Messagerie patient", date: day(-1) }],
    declencheur: { type: "document", recordId: documents[0].id, libelle: "CR cardiologie reçu hier" },
    autonomie: 0,
    etat: "a-valider",
    agent: "locus",
  }, { status: "propose", at: at("07:46") }),
  rec("proposal", ID, P.agent(0.93, [carePlans[0].id]), {
    action: "courrier",
    titre: "Adressage ophtalmologie — fond d'œil annuel en retard de 3 mois",
    justification: "Le plan de suivi DT2 prévoit un fond d'œil annuel [1] ; le dernier date de 15 mois. La microalbuminurie nouvelle est un argument de plus pour ne pas attendre.",
    references: [{ titre: "Guide parcours de soins — Diabète de type 2", editeur: "HAS" }],
    charge: {
      type: "adressage",
      titre: "Demande de fond d'œil — suivi diabète",
      destinataire: { nom: "Dr Paul Kessler", specialite: "Ophtalmologie", mssante: "paul.kessler@medecin.mssante.fr" },
      date: day(0),
      corps: "Cher confrère,\n\nJe vous adresse Mme Marguerite Delacroix, 74 ans, diabétique de type 2 depuis 2017 (HbA1c 8,1 % ce mois-ci), hypertendue, sous anticoagulant pour une FA paroxystique, pour le contrôle annuel du fond d'œil. Votre dernier examen (il y a 15 mois) ne retrouvait pas de rétinopathie ; une cataracte débutante était notée.\n\nUne microalbuminurie est apparue sur le bilan de ce mois.\n\nAvec mes remerciements, bien confraternellement,\n\nDr Romain Vandepitterie",
    },
    declencheur: { type: "echeance", recordId: carePlans[0].id, libelle: "Fond d'œil dû depuis 3 mois" },
    autonomie: 1,
    etat: "a-valider",
    agent: "locus",
  }, { status: "propose", at: at("07:47") }),
  rec("proposal", ID, P.agent(0.9, [messages[0].id]), {
    action: "message-patient",
    titre: "Répondre à Anne Delacroix (pilulier, palpitations)",
    justification: "Demande logistique (pilulier) + signalement clinique. La partie logistique est dans mon périmètre (consentement « logistique ») ; la partie clinique renvoie à la consultation de ce matin. Brouillon prêt.",
    charge: { recordId: messages[1].id, patch: { status: "actif" } },
    declencheur: { type: "message", recordId: messages[0].id, libelle: "Message d'Anne Delacroix hier soir" },
    autonomie: 1,
    etat: "a-valider",
    agent: "locus",
  }, { status: "propose", at: at("07:50") }),
  rec("proposal", ID, P.agent(0.97, [labs[0].id]), {
    action: "alimenter-dmp",
    titre: "Déposer la biologie du jour dans Mon Espace Santé",
    justification: "Consentement DMP actif. Les résultats structurés ont été déposés avec le résumé en langage patient.",
    declencheur: { type: "lab", recordId: labs[0].id, libelle: "Biologie reçue ce matin" },
    autonomie: 2,
    etat: "executee",
    decision: { par: "locus", le: at("07:31") },
    agent: "locus",
  }, { status: "actif", at: at("07:31") }),
];

const briefing = rec("briefing", ID, P.agent(0.92, [labs[0].id, documents[0].id, messages[0].id]), {
  appointmentId: appointment.id,
  synthese: "Marguerite Delacroix, 74 ans, DT2 + HTA + FA sous apixaban. Le diabète dérive (HbA1c 8,1 %), le rein baisse (DFG 48, microalbuminurie nouvelle), la TA n'est pas à la cible. La cardio d'hier est rassurante. Sa fille vient avec elle et signale des palpitations et des oublis.",
  depuisDerniereFois: [
    "Biologie du " + day(-2) + " : HbA1c 7,4 → 8,1 %, DFG 54 → 48, microalbuminurie 42 mg/g (nouvelle), LDL 1,12.",
    "CR cardiologie (Dr Rabier) : FA à faible charge, FEVG 58 %, apixaban inchangé, bisoprolol 2,5 mg laissé à votre appréciation.",
    "Automesure tensionnelle 3 jours : 151/88, 147/85, 153/90.",
    "Message de sa fille hier soir : palpitations ×2 cette semaine, oublis du soir, demande de pilulier.",
  ],
  echeances: [
    { libelle: "Fond d'œil annuel — en retard de 3 mois", depuis: day(-105), carePlanId: carePlans[0].id },
    { libelle: "Bilan dentaire annuel — en retard", depuis: day(-35), carePlanId: carePlans[0].id },
    { libelle: "Renouvellement 3 mois dû dans 5 jours" },
  ],
  questions: [
    "Les palpitations : fréquence, durée, gêne réelle ? (bisoprolol 2,5 mg proposé par la cardiologue)",
    "Observance de l'atorvastatine : pilulier, horaire du soir ?",
    "Dapagliflozine : expliquer l'effet rénal, l'hygiène intime, les signes à surveiller.",
    "Le domicile : 3e sans ascenseur, chute il y a 7 mois — kiné équilibre faite ?",
  ],
  propositionsIds: proposals.slice(0, 4).map((p) => p.id),
  references: [{ docId: "has-dt2-2024", titre: "Stratégie médicamenteuse DT2", editeur: "HAS", date: "2024" }],
}, { id: `${ID}.briefing.1`, status: "propose", at: at("07:52") });

const summary = rec("summary", ID, P.agentValide(0.95, day(-85)), {
  enUneLigne: "74 ans, diabétique de type 2 depuis 2017, hypertendue, FA paroxystique anticoagulée ; vit seule, fille aidante.",
  synthese: "Retraitée de l'enseignement, active (marche quotidienne), veuve, au 3e sans ascenseur. Diabète de type 2 traité par metformine, en dérive lente depuis un an. HTA sous ramipril + amlodipine, non à la cible. FA paroxystique découverte en novembre 2024 sous apixaban, suivie au CH Lyon-Sud. Allergie rapportée aux pénicillines. Chute sans gravité il y a 7 mois. Sa fille Anne est la personne de confiance et l'aidante.",
  enCeMoment: [
    "HbA1c 8,1 % et DFG 48 : intensifier le diabète en protégeant le rein.",
    "TA ≈ 150/88 en automesure : non contrôlée.",
    "Observance partielle de la statine ; LDL 1,12 pour une cible < 0,7.",
    "Palpitations signalées par la fille ; bisoprolol en option.",
  ],
  derniereValidation: day(-85),
  changementsDepuis: [labs[0].id, documents[0].id, messages[0].id],
}, { at: at("07:52") });

export const dossierDelacroix: Dossier = {
  patient: patientDelacroix,
  records: [
    ...Object.values(pb), ...allergies, ...meds, ...vaccins, ...mesures, ...labs, ...documents, ...encounters, ...prescriptions, ...carePlans, ...screenings, ...messages, appointment, ...proposals, briefing, summary,
  ],
  journal: [
    journal(ID, at("07:30"), SYS("HPRIM"), "lab.receive", "Biologie Biogroup reçue (10 résultats)", labs[0].id),
    journal(ID, at("07:31"), LOCUS, "dmp.feed", "Biologie déposée dans Mon Espace Santé avec résumé patient", labs[0].id),
    journal(ID, at("07:42"), LOCUS, "proposal.create", "Inscrire MRC stade 3a", proposals[1].id),
    journal(ID, at("07:44"), LOCUS, "proposal.create", "Ordonnance : dapagliflozine + metformine plafonnée", proposals[0].id),
    journal(ID, at("07:46"), LOCUS, "proposal.create", "Signaler : bisoprolol à discuter", proposals[2].id),
    journal(ID, at("07:47"), LOCUS, "proposal.create", "Courrier : adressage ophtalmologie", proposals[3].id),
    journal(ID, at("07:50"), LOCUS, "message.draft", "Réponse à Anne Delacroix rédigée", messages[1].id),
    journal(ID, at("07:52"), LOCUS, "briefing.create", "Briefing de la consultation de 9h30", briefing.id),
    journal(ID, at("17:12", -1), SYS("MSSanté"), "document.receive", "CR cardiologie Dr Rabier", documents[0].id),
    journal(ID, at("17:15", -1), LOCUS, "document.read", "CR cardiologie lu : FA faible charge, apixaban inchangé", documents[0].id),
    journal(ID, at("10:25", -85), LAURENT, "fse.send", "FSE G 30 € télétransmise", encounters[0].id),
    journal(ID, at("10:21", -85), LAURENT, "prescription.sign", "Ordonnance numérique biologie signée", prescriptions[1].id),
    journal(ID, at("10:20", -85), LAURENT, "prescription.sign", "Ordonnance numérique médicaments signée (5 lignes)", prescriptions[0].id),
  ],
};
