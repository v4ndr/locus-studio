import { day } from "./clock";

/**
 * La rencontre : ce que le médecin dicte, les actions que Locus y détecte,
 * les documents qu'il en génère, et la question qu'il pose avant de signer.
 * Pour Claire Moreau c'est écrit à la main ; pour les autres patients, c'est
 * dérivé des propositions du dossier (voir `rencontreGenerique`).
 */
export interface Mark { texte: string; actionId: string }
export interface Paragraphe { texte: string; marks?: Mark[]; muted?: boolean }
export interface ActionDoc {
  id: string;
  code: string; // AT, MP, K, Rx, VAC, CR, RV…
  titre: string;
  ligne: string;
  /** prêt · à relire · 1 question · en attente */
  statut: "pret" | "relire" | "question" | "attente";
  fields: { k: string; v: string }[];
  /** Pour la signature : destination. */
  destination: string;
  /** Ce qui attend un déclencheur (pas à signer aujourd'hui). */
  attente?: string;
  /** Pour l'aperçu papier à la signature. */
  apercu?: { titre: string; corps: string[]; pied?: string };
}
export interface Question { id: string; texte: string; options: { id: string; label: string }[]; appliqueA: string; champ: string }
export interface Rencontre {
  patientId: string;
  motif: string;
  paragraphes: Paragraphe[];
  actions: ActionDoc[];
  question?: Question;
  synthese: string;
  codes: string[];
  acte: { code: string; montant: number; tiersPayant: boolean };
}

const d = (n: number) => { const [y, m, dd] = day(n).split("-"); return `${dd}/${m}`; };

export const RENCONTRES: Record<string, Rencontre> = {
  pat_cmoreau: {
    patientId: "pat_cmoreau",
    motif: "Renouvellement arrêt · scanner reçu",
    paragraphes: [
      { texte: "Revue pour prolongation. Toujours douleur épicondyle D à la préhension, EVA 6/10, Cozen +, pas d'amélio franche malgré kiné." },
      { texte: "Scanner vu avec elle : enthésopathie, rien d'osseux. Aide-soignante, manutention répétée → on fait la déclaration MP.", marks: [{ texte: "on fait la déclaration MP", actionId: "mp" }] },
      { texte: "Prolonge arrêt 3 semaines, sorties libres. Kiné 15 séances, renfo excentrique. Renouvelle Lévothyrox et paracétamol.", marks: [{ texte: "Prolonge arrêt 3 semaines", actionId: "at" }, { texte: "Kiné 15 séances", actionId: "k" }, { texte: "Renouvelle Lévothyrox et paracétamol", actionId: "rx" }] },
      { texte: "Mains : raideur matinale ~20 min, pas de synovite aujourd'hui. On attend les anti-CCP, adresser rhumato si positif.", marks: [{ texte: "adresser rhumato si positif", actionId: "cr" }] },
      { texte: "On fait le rappel dTP la prochaine fois. Revoir dans 3 sem", marks: [{ texte: "rappel dTP", actionId: "vac" }, { texte: "Revoir dans 3 sem", actionId: "rv" }], muted: true },
    ],
    actions: [
      { id: "at", code: "AT", titre: "Prolongation d'arrêt", ligne: `${d(0)} → ${d(20)} · 21 j`, statut: "question", destination: "CPAM · télétransmis", fields: [{ k: "Motif", v: "Épicondylite latérale D, persistance algique malgré rééducation" }, { k: "Arrêt initial", v: "12/08/2026" }, { k: "Sorties", v: "à confirmer" }], apercu: { titre: "Avis d'arrêt de travail · prolongation", corps: [`Du ${d(0)} au ${d(20)} inclus (21 jours).`, "Motif (volet médical) : épicondylite latérale droite, persistance algique malgré rééducation.", "Sorties : [SORTIES]"], pied: "Téléservice AAT · amelipro" } },
      { id: "mp", code: "MP", titre: "Certificat médical initial MP", ligne: "Épicondylite D · tableau 57 RG", statut: "relire", destination: "patiente · imprimé", fields: [{ k: "Tableau", v: "57 RG · conditions à vérifier par Locus" }, { k: "Poste", v: "Aide-soignante, manutention répétée" }, { k: "Constat", v: `Enthésopathie au scanner du ${d(-4)}` }], apercu: { titre: "Certificat médical initial · maladie professionnelle", corps: ["Je soussigné certifie avoir examiné Mme Claire Moreau et constaté une épicondylite latérale droite, confirmée par scanner (enthésopathie des épicondyliens), chez une aide-soignante exposée à des mouvements répétés de préhension et de manutention.", "Affection susceptible de relever du tableau n° 57 du régime général.", "Date de première constatation : 12/08/2026."], pied: "CERFA 11138 · remis à la patiente" } },
      { id: "k", code: "K", titre: "Ordonnance kiné", ligne: "15 séances · coude droit", statut: "pret", destination: "patiente · e-ordo", fields: [{ k: "Acte", v: "Rééducation épicondylite latérale, renforcement excentrique" }, { k: "Domicile", v: "Non" }], apercu: { titre: "Kinésithérapie", corps: ["15 séances de rééducation du coude droit pour épicondylite latérale. Renforcement excentrique des épicondyliens, physiothérapie antalgique.", "À domicile : non."], pied: "Ordonnance numérique" } },
      { id: "rx", code: "Rx", titre: "Ordonnance médicaments", ligne: "Lévothyroxine 75 µg · paracétamol 1 g si besoin", statut: "pret", destination: "patiente · e-ordo", fields: [{ k: "Lévothyroxine", v: "75 µg, 1 cp le matin à jeun · 3 mois" }, { k: "Paracétamol", v: "1 g si douleur, max 3 g/j · 3 sem" }, { k: "Vérifié", v: "Pas d'interaction · AINS évités (gastralgies 09/2026)" }], apercu: { titre: "Ordonnance", corps: ["LÉVOTHYROXINE 75 µg · 1 comprimé le matin à jeun · 3 mois", "PARACÉTAMOL 1 g · 1 comprimé si douleur, maximum 3 g par jour · 3 semaines"], pied: "Ordonnance numérique · vérifiée LAP" } },
      { id: "vac", code: "VAC", titre: "Vaccin dTcaPolio", ligne: "Rappel des 45 ans · non fait", statut: "pret", destination: "patiente · e-ordo", fields: [{ k: "Calendrier", v: "Rappel 45 ans, dernier dTP 2021 · Locus · calendrier vaccinal" }, { k: "Délivrance", v: "Ordonnance + injection à la prochaine visite" }], apercu: { titre: "Vaccin", corps: ["dTcaPolio (Boostrix Tetra ou Repevax), 1 dose. Rappel des 45 ans.", "Injection à la prochaine consultation."], pied: "Ordonnance numérique" } },
      { id: "rv", code: "RV", titre: "Rappel de suivi", ligne: `${d(18)} · avant fin d'arrêt`, statut: "pret", destination: "agenda", fields: [{ k: "Objet", v: "Réévaluation épicondylite et arrêt" }] },
      { id: "cr", code: "CR", titre: "Courrier rhumato", ligne: "Si anti-CCP positifs", statut: "attente", destination: "MSSanté", attente: "se prépare à réception anti-CCP", fields: [{ k: "Déclencheur", v: "Réception résultat anti-CCP" }] },
    ],
    question: { id: "sorties", texte: "Arrêt : vous avez dit « sorties libres ». Sans restriction horaire ?", options: [{ id: "libres", label: "Oui, libres" }, { id: "horaires", label: "9-11 h et 14-16 h" }, { id: "non", label: "Non autorisées" }], appliqueA: "at", champ: "Sorties" },
    synthese: "Prolongation d'arrêt 3 semaines pour épicondylite D résistante (scanner : enthésopathie). Déclaration MP tableau 57. Kiné 15 séances. Renouvellement lévothyroxine et paracétamol. Mains : anti-CCP attendus, rhumato si positifs. Rappel dTcaPolio à la prochaine visite. Revoir à 3 semaines.",
    codes: ["Épicondylite", "Arthralgie"],
    acte: { code: "G", montant: 30, tiersPayant: false },
  },
};

export const SORTIES_LABEL: Record<string, string> = { libres: "libres", horaires: "9-11 h et 14-16 h", non: "non autorisées", "1": "1 mois", "3": "3 mois / 3 cycles", "6": "6 cycles" };

/* ------------------------------------------------------------------ */
/* Les rencontres des autres patients écrits à la main                  */
/* ------------------------------------------------------------------ */

RENCONTRES.pat_delacroix = {
  patientId: "pat_delacroix", motif: "Suivi diabète / HTA — résultats de biologie",
  paragraphes: [
    { texte: "Suivi diabète avec sa fille. Marche tous les jours. Palpitations deux fois cette semaine le soir, 20 minutes, sans douleur ni malaise. Oublie la statine un soir sur trois." },
    { texte: "Bio : HbA1c 8,1, DFG 48, microalbuminurie nouvelle. On ajoute la dapagliflozine 10, metformine inchangée au plafond, renouvelle le reste 3 mois. Pilulier hebdomadaire par la pharmacie.", marks: [{ texte: "On ajoute la dapagliflozine 10", actionId: "rx" }, { texte: "renouvelle le reste 3 mois", actionId: "rx" }, { texte: "Pilulier hebdomadaire par la pharmacie", actionId: "pil" }] },
    { texte: "Tension 15,2/8,8, pouls régulier, pieds normaux, 70,5 kg. Pour les palpitations, bisoprolol 2,5 le matin comme le propose la cardio, à revoir à un mois.", marks: [{ texte: "bisoprolol 2,5 le matin", actionId: "rx" }] },
    { texte: "Fond d'œil en retard : courrier à Kessler. Contrôle créat et iono dans 15 jours. On se revoit dans un mois.", marks: [{ texte: "courrier à Kessler", actionId: "cr" }, { texte: "Contrôle créat et iono dans 15 jours", actionId: "bio" }, { texte: "On se revoit dans un mois", actionId: "rv" }], muted: true },
  ],
  actions: [
    { id: "rx", code: "Rx", titre: "Ordonnance médicaments (ALD)", ligne: "Dapagliflozine 10 ajoutée · bisoprolol 2,5 ajouté · 6 lignes · 3 mois", statut: "relire", destination: "patiente · e-ordo", fields: [{ k: "Dapagliflozine", v: "10 mg, 1 cp le matin · 3 mois (nouveau)" }, { k: "Bisoprolol", v: "2,5 mg, 1 cp le matin · 1 mois (nouveau)" }, { k: "Metformine", v: "1000 mg, 1 cp matin et soir · plafond pour DFG 48" }, { k: "Ramipril, amlodipine, apixaban, atorvastatine", v: "inchangés · 3 mois" }, { k: "Vérifié", v: "DFG 48 compatible avec l'iSGLT2 ; apixaban : critères de réduction non réunis ; amlodipine + bisoprolol : surveiller FC" }], apercu: { titre: "Ordonnance (ALD)", corps: ["DAPAGLIFLOZINE 10 mg · 1 comprimé le matin · 3 mois", "BISOPROLOL 2,5 mg · 1 comprimé le matin · 1 mois", "METFORMINE 1000 mg · 1 comprimé matin et soir · 3 mois", "RAMIPRIL 5 mg · 1 comprimé le matin · 3 mois", "AMLODIPINE 5 mg · 1 gélule le matin · 3 mois", "ELIQUIS 5 mg · 1 comprimé matin et soir · 3 mois", "ATORVASTATINE 20 mg · 1 comprimé le soir · 3 mois"], pied: "Ordonnance numérique · bizone ALD · vérifiée LAP" } },
    { id: "pil", code: "DM", titre: "Pilulier hebdomadaire", ligne: "Préparation des doses à administrer (PDA) en officine", statut: "pret", destination: "pharmacie · e-ordo", fields: [{ k: "Prescription", v: "Pilulier hebdomadaire préparé par la pharmacie, 6 mois" }, { k: "Rappels", v: "Mon Espace Santé, soir (accord de la patiente)" }] },
    { id: "cr", code: "CR", titre: "Courrier ophtalmologie", ligne: "Fond d'œil annuel en retard · Dr Kessler", statut: "pret", destination: "MSSanté", fields: [{ k: "Motif", v: "Fond d'œil annuel, DT2 avec microalbuminurie nouvelle" }], apercu: { titre: "Courrier d'adressage", corps: ["Cher confrère, je vous adresse Mme Marguerite Delacroix, 74 ans, diabétique de type 2 depuis 2017 (HbA1c 8,1 %), hypertendue, sous anticoagulant pour une FA paroxystique, pour le contrôle annuel du fond d'œil. Une microalbuminurie est apparue sur le bilan de ce mois.", "Bien confraternellement."], pied: "MSSanté" } },
    { id: "bio", code: "BIO", titre: "Ordonnance de biologie", ligne: "Créatinine, ionogramme à 15 jours", statut: "pret", destination: "patiente · e-ordo", fields: [{ k: "Analyses", v: "Créatinine, DFG, ionogramme" }, { k: "Quand", v: "Dans 15 jours (introduction de l'iSGLT2)" }], apercu: { titre: "Biologie", corps: ["Créatinine, DFG, ionogramme sanguin, dans 15 jours."], pied: "Ordonnance numérique" } },
    { id: "rv", code: "RV", titre: "Rappel de suivi", ligne: `${d(30)} · 1 mois`, statut: "pret", destination: "agenda", fields: [{ k: "Objet", v: "TA, tolérance bisoprolol et dapagliflozine" }] },
  ],
  question: { id: "biso", texte: "Bisoprolol : vous avez dit « à revoir à un mois ». Durée de l'ordonnance ?", options: [{ id: "1", label: "1 mois" }, { id: "3", label: "3 mois" }], appliqueA: "rx", champ: "Bisoprolol" },
  synthese: "DT2 déséquilibré avec MRC 3a : dapagliflozine ajoutée. Palpitations : bisoprolol 2,5. Pilulier. Adressage ophtalmo. Bio à 15 j. Revoir à 1 mois.",
  codes: ["Diabète de type 2", "Hypertension artérielle", "Palpitations"], acte: { code: "G", montant: 30, tiersPayant: true },
};

RENCONTRES.pat_garnier = {
  patientId: "pat_garnier", motif: "Lombalgie aiguë — arrêt de travail",
  paragraphes: [
    { texte: "Dos bloqué depuis avant-hier en soulevant un colis. Marche, assis impossible. Pas de fièvre, rien dans les jambes, urines normales. Ibuprofène en automédication." },
    { texte: "Raideur lombaire, contracture bilatérale, Lasègue négatif, pas de déficit, réflexes symétriques. Lombalgie commune. Arrêt 4 jours sorties libres, paracétamol et ibuprofène 5 jours, kiné si ça dure plus de 2 semaines.", marks: [{ texte: "Arrêt 4 jours sorties libres", actionId: "at" }, { texte: "paracétamol et ibuprofène 5 jours", actionId: "rx" }] },
    { texte: "Et le bilan qu'on avait prévu : glycémie à jeun et lipides, il le fera quand le dos ira mieux.", marks: [{ texte: "glycémie à jeun et lipides", actionId: "bio" }], muted: true },
  ],
  actions: [
    { id: "at", code: "AT", titre: "Arrêt de travail", ligne: `${d(0)} → ${d(3)} · 4 j`, statut: "question", destination: "CPAM · télétransmis", fields: [{ k: "Motif", v: "Lombalgie aiguë commune" }, { k: "Sorties", v: "à confirmer" }], apercu: { titre: "Avis d'arrêt de travail", corps: [`Du ${d(0)} au ${d(3)} inclus (4 jours).`, "Motif (volet médical) : lombalgie aiguë commune.", "Sorties : [SORTIES]"], pied: "Téléservice AAT · amelipro" } },
    { id: "rx", code: "Rx", titre: "Ordonnance antalgiques", ligne: "Paracétamol 1 g · ibuprofène 400 · 5 jours", statut: "pret", destination: "patient · e-ordo", fields: [{ k: "Paracétamol", v: "1 g, jusqu'à 3/j · 7 jours" }, { k: "Ibuprofène", v: "400 mg ×3/j au repas · 5 jours" }, { k: "Vérifié", v: "Pas d'insuffisance rénale, pas d'ulcère" }], apercu: { titre: "Ordonnance", corps: ["PARACÉTAMOL 1 g · 1 comprimé jusqu'à 3 fois par jour · 7 jours", "IBUPROFÈNE 400 mg · 1 comprimé 3 fois par jour au repas · 5 jours maximum"], pied: "Ordonnance numérique · vérifiée LAP" } },
    { id: "bio", code: "BIO", titre: "Ordonnance de biologie", ligne: "Glycémie à jeun, bilan lipidique", statut: "pret", destination: "patient · e-ordo", fields: [{ k: "Analyses", v: "Glycémie à jeun, bilan lipidique" }, { k: "Pourquoi", v: "FINDRISC 13, père diabétique" }], apercu: { titre: "Biologie", corps: ["Glycémie à jeun, bilan lipidique (CT, HDL, LDL, TG), à jeun."], pied: "Ordonnance numérique" } },
  ],
  question: { id: "sorties", texte: "Arrêt : vous avez dit « sorties libres ». Sans restriction horaire ?", options: [{ id: "libres", label: "Oui, libres" }, { id: "horaires", label: "9-11 h et 14-16 h" }, { id: "non", label: "Non autorisées" }], appliqueA: "at", champ: "Sorties" },
  synthese: "Lombalgie aiguë commune sans drapeau rouge. Arrêt 4 jours, antalgiques, kiné si > 2 semaines. Bilan glycémie/lipides.",
  codes: ["Lombalgie"], acte: { code: "G", montant: 30, tiersPayant: false },
};

RENCONTRES.pat_moreau = {
  patientId: "pat_moreau", motif: "Début de grossesse — asthme",
  paragraphes: [
    { texte: "Test positif, dernières règles le " + d(-49) + ", donc 7 SA. Nausées légères, pas de saignement. Asthme : Ventoline 2 fois la semaine dernière sur rhinite, pas de réveil nocturne. Acide folique pris." },
    { texte: "On continue le Symbicort tel quel, Ventoline renouvelée. Bilan de début de grossesse, écho de datation entre 11 et 13 SA. Déclaration de grossesse ce jour.", marks: [{ texte: "Ventoline renouvelée", actionId: "rx" }, { texte: "Bilan de début de grossesse", actionId: "bio" }, { texte: "écho de datation", actionId: "img" }, { texte: "Déclaration de grossesse ce jour", actionId: "dsg" }] },
    { texte: "Grippe faite aujourd'hui, coqueluche au 2e trimestre. Suivi A, elle choisira sage-femme ou maternité. Revoir à 12 SA.", marks: [{ texte: "Grippe faite aujourd'hui", actionId: "vac" }, { texte: "Revoir à 12 SA", actionId: "rv" }], muted: true },
  ],
  actions: [
    { id: "dsg", code: "DSG", titre: "Déclaration de grossesse", ligne: "Téléservice DSG · 7 SA", statut: "pret", destination: "CPAM · télétransmis", fields: [{ k: "DDR", v: d(-49) }, { k: "Terme prévu", v: d(231) }] },
    { id: "bio", code: "BIO", titre: "Bilan du 1er trimestre", ligne: "Groupe, RAI, sérologies, glycémie, NFS", statut: "pret", destination: "patiente · e-ordo", fields: [{ k: "Obligatoire", v: "Groupe ABO-Rh, RAI, toxoplasmose, rubéole, syphilis, glycémie à jeun, albuminurie/glycosurie" }, { k: "Proposé", v: "VIH, NFS, ferritine" }], apercu: { titre: "Biologie · 1er trimestre", corps: ["Groupe sanguin ABO-Rh, RAI ; sérologies toxoplasmose, rubéole, syphilis ; VIH (proposé) ; glycémie à jeun ; NFS, ferritine ; albuminurie, glycosurie."], pied: "Ordonnance numérique" } },
    { id: "img", code: "IMG", titre: "Échographie de datation", ligne: "Entre 11 et 13 SA + 6 j", statut: "pret", destination: "patiente · e-ordo", fields: [{ k: "Fenêtre", v: `${d(28)} → ${d(48)}` }, { k: "Dépistage T21", v: "Clarté nucale + marqueurs sériques, à proposer" }], apercu: { titre: "Échographie", corps: ["Échographie obstétricale du 1er trimestre (datation, clarté nucale), entre 11 et 13 SA + 6 jours."], pied: "Ordonnance numérique" } },
    { id: "rx", code: "Rx", titre: "Ordonnance salbutamol", ligne: "Ventoline · poursuite Symbicort", statut: "pret", destination: "patiente · e-ordo", fields: [{ k: "Salbutamol", v: "100 µg, 1-2 bouffées si besoin · 3 mois" }, { k: "Vérifié", v: "Grossesse : corticoïdes inhalés et salbutamol compatibles (CRAT)" }], apercu: { titre: "Ordonnance", corps: ["VENTOLINE 100 µg · 1 à 2 bouffées si besoin · 3 mois", "Poursuite du SYMBICORT 200/6 tel que prescrit."], pied: "Ordonnance numérique · vérifiée grossesse" } },
    { id: "vac", code: "VAC", titre: "Vaccin grippe · fait", ligne: "Injection ce jour (grossesse, saison)", statut: "pret", destination: "dossier · DMP", fields: [{ k: "Vaccin", v: "Grippe saisonnière" }, { k: "À venir", v: "Coqueluche entre 20 et 36 SA (rappel posé)" }] },
    { id: "rv", code: "RV", titre: "Rappel de suivi", ligne: `${d(35)} · 12 SA`, statut: "pret", destination: "agenda", fields: [{ k: "Objet", v: "Résultats du bilan, orientation du suivi" }] },
  ],
  synthese: "Grossesse à 7 SA, asthme à maintenir sous Symbicort. Déclaration faite, bilan T1, écho de datation, grippe faite. Revoir à 12 SA.",
  codes: ["Grossesse", "Asthme"], acte: { code: "G", montant: 30, tiersPayant: true },
};

RENCONTRES.pat_vasseur = {
  patientId: "pat_vasseur", motif: "Suivi BPCO — compte rendu pneumologue",
  paragraphes: [
    { texte: "Vu le compte rendu du pneumo avec lui : VEMS 58, emphysème, plaques pleurales. Dyspnée stable, une exacerbation cet hiver. Moral bien meilleur sous sertraline, PHQ-9 à 6." },
    { texte: "On passe au Spiolto comme proposé, Ventoline gardée, sertraline poursuivie 3 mois. Réhabilitation respiratoire à Louis-Pradel, il est d'accord. Grippe faite ce jour.", marks: [{ texte: "On passe au Spiolto", actionId: "rx" }, { texte: "sertraline poursuivie 3 mois", actionId: "rx" }, { texte: "Réhabilitation respiratoire à Louis-Pradel", actionId: "rehab" }, { texte: "Grippe faite ce jour", actionId: "vac" }] },
    { texte: "Plaques pleurales : certificat initial de maladie professionnelle, tableau 30B, je lui explique la démarche CPAM. Et pour le colon, avec son frère, c'est une coloscopie : courrier au gastro.", marks: [{ texte: "certificat initial de maladie professionnelle", actionId: "mp" }, { texte: "courrier au gastro", actionId: "cr" }] },
  ],
  actions: [
    { id: "rx", code: "Rx", titre: "Ordonnance médicaments (ALD)", ligne: "Spiolto remplace Spiriva · Ventoline · sertraline · 3 mois", statut: "pret", destination: "patient · e-ordo", fields: [{ k: "Tiotropium/olodatérol", v: "Spiolto Respimat 2,5/2,5 µg, 2 bouffées le matin · 3 mois" }, { k: "Salbutamol", v: "100 µg, 2 bouffées si besoin" }, { k: "Sertraline", v: "50 mg, 1 cp le matin · 3 mois" }, { k: "Vérifié", v: "Pas d'interaction ; Spiriva arrêté" }], apercu: { titre: "Ordonnance (ALD)", corps: ["SPIOLTO RESPIMAT 2,5/2,5 µg · 2 bouffées le matin · 3 mois (remplace Spiriva)", "VENTOLINE 100 µg · 2 bouffées si besoin · 3 mois", "SERTRALINE 50 mg · 1 comprimé le matin · 3 mois"], pied: "Ordonnance numérique · bizone ALD" } },
    { id: "rehab", code: "K", titre: "Réhabilitation respiratoire", ligne: "Programme ambulatoire Louis-Pradel · 8 semaines", statut: "pret", destination: "MSSanté", fields: [{ k: "Demande", v: "Inscription au programme de réhabilitation respiratoire ambulatoire" }, { k: "Pièces", v: "EFR, CR pneumologue" }] },
    { id: "mp", code: "MP", titre: "Certificat médical initial MP", ligne: "Plaques pleurales · tableau 30B RG", statut: "relire", destination: "patient · imprimé", fields: [{ k: "Tableau", v: "30B · affections consécutives à l'inhalation de poussières d'amiante" }, { k: "Exposition", v: "Chaudronnerie, 1978-1995" }, { k: "Constat", v: `Plaques pleurales calcifiées bilatérales, scanner du ${d(-20)}` }], apercu: { titre: "Certificat médical initial · maladie professionnelle", corps: ["Je soussigné certifie avoir examiné M. Jean-Pierre Vasseur, né le 27/02/1959, et constaté des plaques pleurales calcifiées bilatérales objectivées au scanner thoracique, chez un patient exposé professionnellement à l'amiante (chaudronnerie, 1978-1995).", "Affection susceptible de relever du tableau n° 30 B des maladies professionnelles."], pied: "CERFA 11138 · remis au patient" } },
    { id: "cr", code: "CR", titre: "Courrier gastro-entérologie", ligne: "Coloscopie de dépistage · risque familial", statut: "pret", destination: "MSSanté", fields: [{ k: "Motif", v: "Frère décédé d'un cancer colorectal à 64 ans : coloscopie plutôt que test immunologique" }], apercu: { titre: "Courrier d'adressage", corps: ["Cher confrère, je vous adresse M. Jean-Pierre Vasseur, 67 ans, pour une coloscopie de dépistage : antécédent au premier degré (frère, cancer colorectal à 64 ans), jamais exploré. BPCO GOLD 2 sous bithérapie ; pas d'anticoagulant.", "Bien confraternellement."], pied: "MSSanté" } },
    { id: "vac", code: "VAC", titre: "Vaccin grippe · fait", ligne: "Injection ce jour", statut: "pret", destination: "dossier · DMP", fields: [{ k: "Vaccin", v: "Grippe saisonnière" }] },
  ],
  synthese: "BPCO : passage en bithérapie, réhabilitation. Dépression en amélioration. CMI maladie professionnelle (amiante). Coloscopie (risque familial). Grippe faite.",
  codes: ["BPCO", "Dépression"], acte: { code: "G", montant: 30, tiersPayant: true },
};

RENCONTRES.pat_perrin = {
  patientId: "pat_perrin", motif: "Angine fébrile — TROD",
  paragraphes: [
    { texte: "Inès, 39 ce matin, gorge douloureuse depuis hier soir, pas de toux, pas de rhinite. Doliprane à 6h30. 26,5 kg. Amygdales rouges avec exsudat, adénopathies cervicales, pas de rash." },
    { texte: "TROD positif. Amoxicilline 50 mg par kilo en deux prises, 6 jours, paracétamol. École quand elle n'aura plus de fièvre, certificat d'absence 2 jours.", marks: [{ texte: "TROD positif", actionId: "trod" }, { texte: "Amoxicilline 50 mg par kilo en deux prises, 6 jours", actionId: "rx" }, { texte: "certificat d'absence 2 jours", actionId: "cert" }] },
    { texte: "Pas d'AINS. Revenir si ça ne va pas mieux dans 48 h.", muted: true },
  ],
  actions: [
    { id: "trod", code: "TROD", titre: "Test rapide streptocoque · positif", ligne: "Fait au cabinet, facturé", statut: "pret", destination: "dossier · FSE", fields: [{ k: "Résultat", v: "Positif (SGA)" }] },
    { id: "rx", code: "Rx", titre: "Ordonnance antibiotique", ligne: "Amoxicilline 50 mg/kg/j · 6 jours · paracétamol", statut: "pret", destination: "parents · e-ordo", fields: [{ k: "Amoxicilline", v: "500 mg/5 mL, 6,5 mL matin et soir (50 mg/kg/j) · 6 jours" }, { k: "Paracétamol", v: "2,4 %, 26 kg sur la pipette, toutes les 6 h si fièvre" }, { k: "Vérifié", v: "Pas d'allergie aux bêta-lactamines (allergie arachide sans rapport)" }], apercu: { titre: "Ordonnance", corps: ["AMOXICILLINE 500 mg/5 mL suspension buvable · 6,5 mL matin et soir · 6 jours", "PARACÉTAMOL 2,4 % sirop · dose-poids 26 kg toutes les 6 heures si fièvre · 5 jours"], pied: "Ordonnance numérique · vérifiée LAP" } },
    { id: "cert", code: "CERT", titre: "Certificat d'absence scolaire", ligne: "2 jours", statut: "pret", destination: "parents · imprimé", fields: [{ k: "Durée", v: `${d(0)} et ${d(1)}` }], apercu: { titre: "Certificat médical", corps: [`Je soussigné certifie que l'état de santé d'Inès Perrin nécessite une absence scolaire les ${d(0)} et ${d(1)}.`], pied: "Remis aux parents" } },
  ],
  synthese: "Angine à streptocoque A (TROD +). Amoxicilline 6 jours, paracétamol. Certificat 2 jours.",
  codes: ["Angine"], acte: { code: "G", montant: 30, tiersPayant: false },
};

RENCONTRES.pat_marchand = {
  patientId: "pat_marchand", motif: "Cystites récidivantes · consultation de prévention",
  paragraphes: [
    { texte: "Vient faire le point sur ses cystites, 4 cette année, toujours typiques, dernière il y a 15 jours traitée par fosfomycine. Pas de fièvre, pas de douleur lombaire jamais. Ménopausée, sécheresse vaginale." },
    { texte: "ECBU à distance pour documenter. Œstrogènes locaux, ça réduit les récidives après la ménopause. Boissons, mictions, règles d'hygiène vues ensemble.", marks: [{ texte: "ECBU à distance", actionId: "bio" }, { texte: "Œstrogènes locaux", actionId: "rx" }] },
    { texte: "Mammographie en retard : elle prend rendez-vous avec l'invitation. Revoir dans 3 mois.", marks: [{ texte: "Revoir dans 3 mois", actionId: "rv" }], muted: true },
  ],
  actions: [
    { id: "bio", code: "BIO", titre: "ECBU", ligne: "À distance de l'épisode, avant tout traitement", statut: "pret", destination: "patiente · e-ordo", fields: [{ k: "Analyse", v: "ECBU avec antibiogramme" }], apercu: { titre: "Biologie", corps: ["ECBU avec antibiogramme, à distance de tout traitement."], pied: "Ordonnance numérique" } },
    { id: "rx", code: "Rx", titre: "Ordonnance œstrogènes locaux", ligne: "Estriol vaginal · prévention des récidives", statut: "pret", destination: "patiente · e-ordo", fields: [{ k: "Estriol", v: "Ovule 0,5 mg, 1/j 2 semaines puis 2/semaine · 6 mois" }, { k: "Vérifié", v: "Mère cancer du sein à 61 ans : œstrogènes locaux à faible absorption, autorisés" }], apercu: { titre: "Ordonnance", corps: ["ESTRIOL 0,5 mg ovule · 1 ovule par jour pendant 2 semaines, puis 2 par semaine · 6 mois"], pied: "Ordonnance numérique" } },
    { id: "rv", code: "RV", titre: "Rappel de suivi", ligne: `${d(90)} · 3 mois`, statut: "pret", destination: "agenda", fields: [{ k: "Objet", v: "Cystites : bilan à 3 mois" }] },
  ],
  synthese: "Cystites récidivantes post-ménopausiques : ECBU à distance, œstrogènes locaux, mesures d'hygiène. Mammographie à faire.",
  codes: ["Cystite"], acte: { code: "G", montant: 30, tiersPayant: false },
};

RENCONTRES.pat_roussel = {
  patientId: "pat_roussel", motif: "HTA : contrôle à 3 semaines, automesures",
  paragraphes: [
    { texte: "Automesures 157/95 en moyenne sur 6 jours. Prend le Coveram tous les matins maintenant, un seul comprimé ça aide. Sel : repas de chantier. Ronfle, s'endort l'après-midi, le médecin du travail a écrit." },
    { texte: "Tension 16/9,6 au cabinet. On ajoute l'indapamide, trithérapie en un comprimé si possible. Polygraphie du sommeil : courrier au pneumo. Et je réponds au médecin du travail.", marks: [{ texte: "On ajoute l'indapamide", actionId: "rx" }, { texte: "courrier au pneumo", actionId: "cr" }, { texte: "je réponds au médecin du travail", actionId: "mt" }] },
    { texte: "Conduite : pas de longs trajets en attendant la polygraphie, on en a parlé franchement. Bio dans 3 semaines, revoir dans un mois.", marks: [{ texte: "Bio dans 3 semaines", actionId: "bio" }, { texte: "revoir dans un mois", actionId: "rv" }], muted: true },
  ],
  actions: [
    { id: "rx", code: "Rx", titre: "Ordonnance antihypertenseurs", ligne: "Périndopril/indapamide/amlodipine 5/1,25/5 · 1 mois", statut: "pret", destination: "patient · e-ordo", fields: [{ k: "Trithérapie fixe", v: "Triplixam 5/1,25/5 mg, 1 cp le matin · 1 mois (remplace Coveram)" }, { k: "Rosuvastatine", v: "10 mg, 1 cp le soir · 3 mois" }, { k: "Vérifié", v: "DFG 86, K 4,1 ; contrôle iono à 3 semaines" }], apercu: { titre: "Ordonnance", corps: ["TRIPLIXAM 5 mg/1,25 mg/5 mg · 1 comprimé le matin · 1 mois (remplace Coveram)", "ROSUVASTATINE 10 mg · 1 comprimé le soir · 3 mois"], pied: "Ordonnance numérique · vérifiée LAP" } },
    { id: "cr", code: "CR", titre: "Courrier pneumologie · polygraphie", ligne: "Suspicion de SAOS · Dr Ould-Kaci", statut: "pret", destination: "MSSanté", fields: [{ k: "Motif", v: "Epworth 12, ronflements, somnolence au volant, HTA résistante" }], apercu: { titre: "Courrier d'adressage", corps: ["Cher confrère, je vous adresse M. Alain Roussel, 58 ans, artisan plombier, hypertendu non contrôlé sous trithérapie, IMC 31, pour suspicion de syndrome d'apnées du sommeil : ronflements, somnolence diurne (Epworth 12) avec un endormissement au volant évité de justesse. Son activité implique une conduite quotidienne.", "Bien confraternellement."], pied: "MSSanté" } },
    { id: "mt", code: "MSG", titre: "Réponse au médecin du travail", ligne: "Dr Lefèvre · AST Grand Lyon", statut: "pret", destination: "MSSanté", fields: [{ k: "Contenu", v: "Vu ce jour, polygraphie demandée, traitement intensifié ; information sur la conduite donnée" }], apercu: { titre: "Message MSSanté", corps: ["Chère consœur, merci pour votre courrier. Je vois M. Roussel ce jour ; je l'adresse pour polygraphie ventilatoire et j'intensifie le traitement de son HTA. Je vous tiendrai informée du résultat, avec son accord, pour la question de l'aptitude à la conduite."], pied: "MSSanté" } },
    { id: "bio", code: "BIO", titre: "Ordonnance de biologie", ligne: "Créatinine, ionogramme à 3 semaines", statut: "pret", destination: "patient · e-ordo", fields: [{ k: "Analyses", v: "Créatinine, DFG, ionogramme (introduction du thiazidique)" }], apercu: { titre: "Biologie", corps: ["Créatinine, DFG, ionogramme sanguin, dans 3 semaines."], pied: "Ordonnance numérique" } },
    { id: "rv", code: "RV", titre: "Rappel de suivi", ligne: `${d(30)} · 1 mois`, statut: "pret", destination: "agenda", fields: [{ k: "Objet", v: "TA sous trithérapie, résultat polygraphie" }] },
  ],
  synthese: "HTA non contrôlée : trithérapie fixe. SAOS suspecté : polygraphie demandée. Réponse au médecin du travail. Bio à 3 semaines, revoir à 1 mois.",
  codes: ["Hypertension artérielle"], acte: { code: "G", montant: 30, tiersPayant: false },
};
