import type { Story } from "./story";

/*
 * Quatre motions de plus, tirés des scripts v2 du 16/10/2026
 * (`scripts-motions-studio-v2.md` dans les fichiers du projet) : l'aide à la
 * décision dans la note, une question sur un dossier, une question sur toute
 * la patientèle, et la ROSP. Retours du 16/10 après-midi : alerte sans solution
 * contre aide à la décision, défilement des documents, cohorte sans LGC,
 * vrais indicateurs ROSP. Patients et chiffres
 * fictifs ; le contenu médical et réglementaire est à relire avant diffusion.
 */

const MEDECIN = { nom: "Dr Romain Vandepitterie", prenomNom: "", initiales: "RV" };

/** Aide à la décision : le LAP bloque l'amoxicilline sans proposer d'alternative ; Locus la propose au moment de décider. */
export const ANGINE: Story = {
  id: "angine-allergie",
  quand: "Mercredi, 11 h 15",
  patient: { nom: "Mme Léa Garnier", prenomNom: "GARNIER Léa", initiales: "LG", meta: "34 ans · professeure des écoles", contexte: "allergie aux pénicillines" },
  citation: "J'ai très mal à la gorge depuis deux jours, avec de la fièvre.",
  plan: ["Score de McIsaac à 3, TDR positif", "Angine à streptocoque", "Amoxicilline pendant 6 jours"],
  constat: ["La décision est prise en quelques secondes.", "Le logiciel la bloque, sans proposer d'alternative."],
  avant: [
    {
      menu: "Prescription",
      sousMenu: "Ordonnance",
      titre: "Ordonnance · médicaments",
      champs: [
        { label: "Médicament", saisies: ["amox"], options: ["AMOXICILLINE 500 mg gél", "AMOXICILLINE 1 g cp", "AMOXICILLINE/AC CLAV 1 g"], valeur: "AMOXICILLINE 1 g cp" },
        { label: "Posologie", saisies: ["1 cp matin et soir"], valeur: "1 cp matin et soir" },
        { label: "Durée", saisies: ["6"], options: ["6 jours", "6 semaines", "6 mois"], valeur: "6 jours" },
      ],
      alerte: { titre: "Allergie", texte: "Allergie déclarée : pénicillines (urticaire, 2015). Prescription contre-indiquée.", bouton: "Retirer", grave: true },
      boutons: [],
    },
  ],
  pendant: ["« Alors, qu'est-ce que vous me donnez ? »"],
  transition: "Même patiente. Même angine.",
  motif: "Angine",
  note: "Angine, McIsaac 3, TDR +.\nAmox 6 j.",
  etapes: [
    "Lecture de la note…",
    "Dossier : allergie aux pénicillines (urticaire, 2015)",
    "Locus · angine à streptocoque et allergie aux pénicillines",
    "Une alternative proposée",
  ],
  synthese: "",
  aide: {
    titre: "Alternative à l'amoxicilline",
    texte: "Allergie aux pénicillines sans signe de gravité : céphalosporine orale. Cefpodoxime 100 mg matin et soir, 5 jours.",
    sources: ["Allergie au dossier · 2015", "HAS · angine, antibiothérapie"],
    alertes: ["Allergie au dossier · 2015"],
  },
  zoom: true,
  lecture: 80,
  actions: [
    {
      code: "Rx",
      titre: "Ordonnance · Cefpodoxime 100 mg, paracétamol",
      ligne: "1 cp matin et soir · 5 jours",
      destination: "patiente · e-prescription",
      doc: { entete: "Ordonnance", lignes: ["CEFPODOXIME 100 mg, comprimé", "1 comprimé matin et soir pendant 5 jours", "PARACÉTAMOL 1 g : 1 comprimé jusqu'à 3 fois par jour si douleur ou fièvre"] },
    },
  ],
  secondes: 7,
  compare: { avant: "Une alerte", apres: "Une alternative" },
  message: ["Une alerte bloque la prescription.", "L'aide à la décision propose la suite."],
};

/** Les documents d'un dossier de 7 ans, du plus récent au plus ancien ; le frottis est le 32e. */
const TYPES = ["Compte rendu de laboratoire", "Courrier de correspondant", "Ordonnance", "Compte rendu d'imagerie", "Certificat"];
const DOCUMENTS = Array.from({ length: 38 }, (_, i) => {
  const mois = 9 - Math.round(i * 2.2);
  const an = 2026 + Math.floor((mois - 1) / 12);
  const m = ((((mois - 1) % 12) + 12) % 12) + 1;
  return i === 31 ? "06/2019 · Compte rendu de laboratoire · CR_labo_0619.pdf" : `${String(m).padStart(2, "0")}/${an} · ${TYPES[(i * 3) % TYPES.length]}`;
});

/** Dossier unique : une question, une date, et ce qu'elle implique. */
export const FROTTIS: Story = {
  id: "dernier-frottis",
  quand: "Jeudi, 16 h 30",
  patient: { nom: "Mme Sandrine Morel", prenomNom: "MOREL Sandrine", initiales: "SM", meta: "42 ans · aide-soignante", contexte: "contraception orale" },
  citation: "Je viens pour renouveler ma pilule.",
  planTitre: "Ce que le médecin veut savoir",
  plan: ["Renouveler la pilule pour un an", "Retrouver la date du dernier frottis", "Prescrire le dépistage s'il est en retard"],
  constat: ["La question est simple.", "La réponse est quelque part dans 38 documents."],
  temps: 95,
  avant: [
    {
      menu: "Patient",
      sousMenu: "Documents",
      titre: "Documents · du plus récent au plus ancien",
      champs: [],
      defile: {
        lignes: DOCUMENTS,
        ouvre: [
          { i: 5, apercu: "Bilan lipidique, glycémie à jeun. Pas de frottis." },
          { i: 12, apercu: "Courrier du gynécologue : contraception. Pas de résultat de frottis." },
          { i: 20, apercu: "NFS, ferritine. Pas de frottis." },
          { i: 27, apercu: "Courrier de l'ORL : sinusite. Sans rapport." },
          { i: 31, apercu: "Cytologie cervico-utérine du 12/06/2019 : absence de lésion." },
        ],
      },
      boutons: [],
    },
  ],
  pendant: ["« C'est encore utile à mon âge ? »"],
  transition: "Même patiente. Même question.",
  mode: "question",
  apresTitre: "Une question, une validation",
  note: "De quand date le dernier frottis ?",
  etapes: [
    "Lecture du dossier · 38 documents…",
    "CR_labo_0619.pdf · cytologie cervico-utérine",
    "Locus · dépistage du col après 30 ans",
    "2 actions proposées",
  ],
  synthese: "",
  reponse: { texte: "Cytologie du 12/06/2019, normale.", sources: ["CR_labo_0619.pdf · page 1"] },
  aide: {
    titre: "Dépistage du col",
    texte: "Depuis 2020, à partir de 30 ans, le dépistage repose sur le test HPV, 3 ans après une cytologie normale. Il est à faire depuis juin 2022.",
    sources: ["HAS · dépistage du cancer du col de l'utérus"],
  },
  actions: [
    {
      code: "BIO",
      titre: "Demande · recherche de HPV à haut risque",
      ligne: "Dépistage du col · dernière cytologie normale en 2019",
      destination: "patiente · e-prescription",
      doc: { entete: "Demande d'examen", lignes: ["Recherche de papillomavirus humains à haut risque (HPV-HR)", "Prélèvement cervico-utérin de dépistage", "Dernière cytologie normale le 12/06/2019"] },
    },
    {
      code: "Rx",
      titre: "Ordonnance · lévonorgestrel / éthinylestradiol",
      ligne: "Renouvellement · 12 mois",
      destination: "patiente · e-prescription",
      doc: { entete: "Ordonnance", lignes: ["LÉVONORGESTREL 0,10 mg / ÉTHINYLESTRADIOL 0,02 mg", "1 comprimé par jour, selon le schéma habituel", "Durée : 12 mois"] },
    },
  ],
  secondes: 7,
  compare: { avant: "38 documents", apres: "1 question", bascule: "7 secondes" },
  message: ["Une question, une date.", "Et ce qu'elle implique."],
};

/** Cohorte : aucun dossier ouvert, une question sur toute la patientèle. */
export const COHORTE: Story = {
  id: "cohorte-hba1c",
  quand: "Lundi, 8 h 05",
  patient: { ...MEDECIN, meta: "Médecine générale", contexte: "aucun dossier ouvert" },
  lgcTitre: "Patientèle · 1 312 dossiers",
  citation: "Qui, parmi mes patients diabétiques, n'a pas eu d'HbA1c depuis six mois ?",
  planTitre: "La question",
  plan: ["Les patients diabétiques, codés ou non", "Sans HbA1c depuis plus de 6 mois", "Les plus déséquilibrés en premier"],
  constat: ["La question tient en une ligne.", "Locus la pose à toute la patientèle."],
  avant: [],
  pendant: [],
  transition: "",
  mode: "question",
  apresTitre: "Une question, toute la patientèle",
  note: "Parmi mes patients diabétiques, lesquels n'ont pas eu d'HbA1c depuis plus de 6 mois ?",
  etapes: [
    "Lecture de 1 312 dossiers…",
    "96 patients diabétiques (diagnostic ou traitement)",
    "23 sans HbA1c depuis plus de 6 mois",
    "5 dont la dernière dépassait 8 %",
  ],
  synthese: "",
  tableau: {
    colonnes: ["Patient", "Âge", "Dernière HbA1c"],
    lignes: [
      ["Mme Odette Marchal", "78", "11/2025 · 9,1 %"],
      ["M. Bernard Lefèvre", "61", "01/2026 · 8,6 %"],
      ["M. Jean-Pierre Roux", "70", "09/2025 · 8,4 %"],
      ["Mme Monique Girard", "57", "02/2026 · 8,2 %"],
      ["M. Thierry Laurent", "66", "12/2025 · 8,1 %"],
      ["Mme Hélène Dupuis", "73", "08/2025 · 7,4 %"],
    ],
    plus: "+ 17 autres patients",
    marques: 5,
  },
  actions: [
    {
      code: "BIO",
      titre: "Ordonnance d'HbA1c · 23 patients",
      ligne: "Envoyée par message, avec un mot",
      destination: "23 patients · messagerie",
      doc: { entete: "Ordonnance · biologie", pour: "23 patients diabétiques", lignes: ["Hémoglobine glyquée (HbA1c)", "« Votre dernier contrôle date de plus de 6 mois. »", "Envoyée à chaque patient, à son nom"] },
    },
    {
      code: "RV",
      titre: "Proposition de consultation · 5 patients",
      ligne: "Dernière HbA1c au-dessus de 8 %",
      destination: "5 patients · messagerie",
      doc: { entete: "Message", pour: "5 patients diabétiques", lignes: ["Votre dernière HbA1c était au-dessus de l'objectif.", "Je vous propose une consultation dans les prochaines semaines.", "Créneaux réservés en fin de matinée"] },
    },
  ],
  tempo: 1.8,
  lecture: 110,
  secondes: 12,
  message: ["Une question sur un patient.", "La même, sur toute la patientèle."],
};

/**
 * ROSP : aujourd'hui, le relevé de l'espace professionnel donne un taux par
 * indicateur, mis à jour au trimestre et sans aucun nom. Demain, Locus
 * recalcule les indicateurs depuis le dossier, dit combien de patients
 * manquent à la cible et lesquels, et prépare les relances. Libellés,
 * taux au 31/12/2025 et cible tirés d'un vrai relevé (anonymisé) ; les taux
 * « du jour » et les patients sont fictifs.
 */
export const INDICATEURS: Story = {
  id: "rosp",
  quand: "Vendredi, 19 h 10",
  patient: { ...MEDECIN, meta: "Médecine générale", contexte: "fin de journée" },
  lgcTitre: "Patientèle · 1 312 dossiers",
  citation: "Où en est ma ROSP, et qui me manque-t-il ?",
  planTitre: "La question",
  plan: ["Où en est ma ROSP clinique ?", "Quels patients manquent à la cible ?", "Que faire dès cette semaine ?"],
  constat: ["Le relevé donne un taux, au 31 décembre.", "Il ne dit pas quels patients relancer."],
  avant: [
    {
      fenetre: "web",
      url: "espace professionnel › connexion",
      titre: "Connexion",
      champs: [
        { label: "Se connecter", options: ["Carte CPS ou CPE", "Identifiant et mot de passe"], valeur: "Carte CPS ou CPE" },
        { label: "Code porteur", saisies: ["••••"], valeur: "••••" },
      ],
      boutons: ["Valider"],
    },
    {
      fenetre: "web",
      url: "espace professionnel › services paiements",
      ariane: "Accueil › Services paiements",
      titre: "Mes derniers paiements",
      champs: [],
      cartes: {
        liste: [
          { titre: "Missions spécifiques", montant: "0 €", date: "Paiement du 20/07/2026" },
          { titre: "IPP & OAM", montant: "0 €", date: "Paiement du 19/07/2026" },
          { titre: "Forfait structure", montant: "4 690 €", date: "Paiement du 01/05/2026" },
          { titre: "ROSP clinique", montant: "9 975,78 €", date: "Paiement du 20/04/2026" },
          { titre: "ROSP MT enfants", montant: "704,25 €", date: "Paiement du 10/04/2026" },
          { titre: "FPMT solde 2025", montant: "33 151 €", date: "Paiement du 22/03/2026" },
        ],
        choix: 3,
      },
      boutons: [],
    },
    {
      fenetre: "web",
      url: "espace professionnel › convention › ROSP clinique",
      ariane: "Ma convention › ROSP clinique › Suivi des pathologies chroniques",
      titre: "Médecin traitant · adultes",
      champs: [],
      indicateurs: {
        maj: "Dernière mise à jour : 31/12/2025",
        lignes: [
          { label: "Dosages de l'HbA1c (diabète)", taux: "70,2 %", pct: 0.702 },
          { label: "Fond d'œil (diabète)", taux: "73,8 %", pct: 0.738 },
          { label: "Dépistage MRC (diabète)", taux: "54,8 %", pct: 0.548, cible: 0.586 },
          { label: "Dépistage MRC (hypertension)", taux: "21,5 %", pct: 0.215 },
          { label: "Prévention secondaire CV", taux: "37,0 %", pct: 0.37 },
          { label: "Surveillance des AVK", taux: "66,7 %", pct: 0.667 },
        ],
        choix: 2,
      },
      alerte: { titre: "Dépistage de la maladie rénale chronique", texte: "Diabétiques de moins de 81 ans avec créatinine, DFG et microalbuminurie dans l'année. Taux : 54,8 %. Cible : 58,6 %.", bouton: "Fermer" },
      boutons: [],
    },
  ],
  pendant: ["« La carte, puis le code. »", "« 9 975,78 € de ROSP clinique. Sur quels indicateurs ? »", "« Il m'en manque combien, et lesquels ? »"],
  transition: "Même ROSP. Avec les noms.",
  mode: "question",
  apresTitre: "Une question, des noms",
  note: "Où en est ma ROSP, et qui manque ?",
  etapes: [
    "Lecture de 1 312 dossiers…",
    "ROSP clinique 2025 : 9 975,78 € · 6 indicateurs recalculés",
    "Dépistage MRC : 55,1 %, cible 58,6 %",
    "38 diabétiques sans RAC ou créatinine cette année",
  ],
  synthese: "",
  tempo: 1.3,
  lecture: 150,
  jauges: [
    {
      titre: "Diabète · MT adultes",
      total: "Recalculé le 16/10/2026",
      lignes: [
        { label: "Dosages HbA1c", valeur: "71,4 %", pct: 0.714 },
        { label: "Fond d'œil", valeur: "74,6 %", pct: 0.746 },
        { label: "Dépistage MRC", valeur: "55,1 %", pct: 0.551, cible: 0.586, note: "4 patients pour atteindre la cible" },
      ],
    },
    {
      titre: "Autres indicateurs",
      lignes: [
        { label: "Dépistage MRC · hypertendus", valeur: "22,3 %", pct: 0.223 },
        { label: "Prévention secondaire CV", valeur: "38,0 %", pct: 0.38 },
        { label: "Surveillance AVK", valeur: "66,7 %", pct: 0.667 },
      ],
    },
  ],
  tableau: {
    colonnes: ["Dépistage MRC · à faire", "Âge", "Manque", "RDV"],
    lignes: [
      ["M. Gérard Blanchard", "76", "RAC", "21/10"],
      ["Mme Josiane Perrin", "68", "RAC, créatinine", "23/10"],
      ["M. Alain Mercier", "71", "RAC", "28/10"],
      ["Mme Colette Brunet", "79", "créatinine", "—"],
      ["M. Patrick Fabre", "63", "RAC", "—"],
      ["Mme Nicole Gauthier", "74", "RAC, créatinine", "—"],
    ],
    plus: "+ 32 autres patients",
  },
  actions: [
    {
      code: "BIO",
      titre: "Ordonnance · créatinine, DFG, RAC · 38 patients",
      ligne: "Envoyée par message, avec un mot",
      destination: "38 patients · messagerie",
      doc: { entete: "Ordonnance · biologie", pour: "38 patients diabétiques", lignes: ["Créatininémie avec estimation du DFG", "Rapport albuminurie / créatininurie sur échantillon d'urines", "« Ce bilan annuel n'a pas encore été fait cette année. »"] },
    },
    {
      code: "RV",
      titre: "Rappel au prochain rendez-vous · 9 patients",
      ligne: "Ajouté à la fiche du rendez-vous",
      destination: "agenda · 9 rendez-vous",
      doc: { entete: "Rappel", pour: "9 patients avec un rendez-vous d'ici fin octobre", lignes: ["Dépistage MRC à faire : RAC et créatinine", "Ordonnance prête à remettre", "Indicateur : dépistage de la maladie rénale chronique"] },
    },
  ],
  secondes: 12,
  compare: { avant: "Un taux", apres: "38 noms" },
  message: ["La ROSP donne un taux.", "Locus donne les noms."],
};
