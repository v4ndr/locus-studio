import type { Story } from "./story";

/*
 * Quatre motions de plus, tirés des scripts v2 du 16/10/2026
 * (`scripts-motions-studio-v2.md` dans les fichiers du projet) : l'aide à la
 * décision dans la note, une question sur un dossier, une question sur toute
 * la patientèle, et les indicateurs (ROSP et Donum). Patients et chiffres
 * fictifs ; le contenu médical et réglementaire est à relire avant diffusion.
 */

const MEDECIN = { nom: "Dr Romain Vandepitterie", prenomNom: "", initiales: "RV" };

/** Aide à la décision : l'allergie notée en texte libre que le LAP ne voit pas. */
export const ANGINE: Story = {
  id: "angine-allergie",
  quand: "Mercredi, 11 h 15",
  patient: { nom: "Mme Léa Garnier", prenomNom: "GARNIER Léa", initiales: "LG", meta: "34 ans · professeure des écoles", contexte: "sans traitement au long cours" },
  citation: "J'ai très mal à la gorge depuis deux jours, avec de la fièvre.",
  plan: ["Score de McIsaac à 3, TDR positif", "Angine à streptocoque", "Amoxicilline pendant 6 jours"],
  constat: ["La décision est prise en quelques secondes.", "L'information qui la change est trois onglets plus loin."],
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
      alerte: { titre: "Analyse de l'ordonnance", texte: "Aucune interaction détectée · posologie conforme", bouton: "OK" },
      boutons: ["Enregistrer"],
    },
    {
      menu: "Patient",
      sousMenu: "Antécédents",
      titre: "Antécédents et allergies",
      champs: [
        { label: "Rechercher", saisies: ["allergie", "augm"], options: ["2015 · urticaire sous Augmentin (texte libre)"], valeur: "2015 · urticaire sous Augmentin (texte libre)" },
      ],
      boutons: ["Fermer"],
    },
    {
      fenetre: "web",
      url: "has-sante.fr › angine › choix de l'antibiothérapie",
      titre: "Angine : choix et durée de l'antibiothérapie",
      champs: [
        { label: "Rechercher", saisies: ["allergie"], options: ["Allergie aux pénicillines sans gravité : céphalosporine", "Contre-indication aux bêtalactamines : macrolide"], valeur: "Allergie aux pénicillines sans gravité : céphalosporine" },
      ],
      boutons: [],
    },
    {
      menu: "Prescription",
      sousMenu: "Ordonnance",
      titre: "Ordonnance · modifier",
      champs: [
        { label: "Ligne 1", options: ["Modifier", "Supprimer la ligne", "Dupliquer"], valeur: "Supprimer la ligne" },
        { label: "Médicament", saisies: ["cefpodox"], options: ["CEFPODOXIME 100 mg cp", "CEFPODOXIME 40 mg/5 ml susp"], valeur: "CEFPODOXIME 100 mg cp" },
        { label: "Posologie", saisies: ["1 cp matin et soir"], valeur: "1 cp matin et soir" },
        { label: "Durée", saisies: ["5"], options: ["5 jours", "5 semaines"], valeur: "5 jours" },
      ],
      alerte: { titre: "Analyse de l'ordonnance", texte: "Aucune interaction détectée · posologie conforme", bouton: "OK" },
      boutons: ["Signer et imprimer"],
    },
  ],
  pendant: [
    "« Ça passe en combien de temps ? »",
    "« Je peux retourner en classe ? »",
    "« C'est contagieux ? »",
    "« Je prends du paracétamol en attendant ? »",
  ],
  transition: "Même patiente. Même angine.",
  motif: "Angine",
  note: "Angine, McIsaac 3, TDR +.\nAmox 6 j.",
  etapes: [
    "Lecture de la note…",
    "Dossier : urticaire sous amoxicilline-acide clavulanique (2015)",
    "Locus · angine à streptocoque et allergie aux pénicillines",
    "2 actions composées",
  ],
  synthese: "",
  aide: {
    titre: "Allergie aux pénicillines au dossier",
    texte: "Sans signe de gravité : céphalosporine orale à la place de l'amoxicilline. Cefpodoxime 100 mg matin et soir, 5 jours.",
    sources: ["Urticaire sous Augmentin · 2015", "HAS · angine, antibiothérapie"],
  },
  actions: [
    {
      code: "Rx",
      titre: "Ordonnance · Cefpodoxime 100 mg, paracétamol",
      ligne: "1 cp matin et soir · 5 jours",
      destination: "patiente · e-prescription",
      doc: { entete: "Ordonnance", lignes: ["CEFPODOXIME 100 mg, comprimé", "1 comprimé matin et soir pendant 5 jours", "PARACÉTAMOL 1 g : 1 comprimé jusqu'à 3 fois par jour si douleur ou fièvre"] },
    },
    {
      code: "ATCD",
      titre: "Dossier · allergie aux pénicillines",
      ligne: "Urticaire, 2015 · enregistrée en champ structuré",
      destination: "dossier patient · lue par le LAP",
      doc: { entete: "Allergies", lignes: ["Allergie : pénicillines (amoxicilline-acide clavulanique)", "Réaction : urticaire, 2015", "Champ structuré : lu par l'analyse d'ordonnance"] },
    },
  ],
  secondes: 7,
  message: ["L'allergie était dans le dossier.", "Elle est maintenant dans la décision."],
};

/** Dossier unique : une question, une date, et ce qu'elle implique. */
export const FROTTIS: Story = {
  id: "dernier-frottis",
  quand: "Jeudi, 16 h 30",
  patient: { nom: "Mme Aïcha Diallo", prenomNom: "DIALLO Aïcha", initiales: "AD", meta: "42 ans · aide-soignante", contexte: "contraception orale" },
  citation: "Je viens pour renouveler ma pilule.",
  planTitre: "Ce que le médecin veut savoir",
  plan: ["Renouveler la pilule pour un an", "Retrouver la date du dernier frottis", "Prescrire le dépistage s'il est en retard"],
  constat: ["La question est simple.", "La réponse est quelque part dans 38 documents."],
  avant: [
    {
      menu: "Patient",
      sousMenu: "Documents",
      titre: "Documents · 38 fichiers",
      champs: [
        { label: "Rechercher", saisies: ["frottis", "cyto", "labo"], options: ["CR_labo_0621.pdf", "CR_labo_0320.pdf", "CR_labo_0619.pdf"], valeur: "CR_labo_0619.pdf" },
        { label: "Dans le document", saisies: ["cervico"], options: ["Cytologie cervico-utérine : absence de lésion"], valeur: "Cytologie cervico-utérine : absence de lésion" },
      ],
      boutons: ["Fermer"],
    },
    {
      fenetre: "web",
      url: "has-sante.fr › dépistage du cancer du col de l'utérus",
      titre: "Dépistage du cancer du col de l'utérus",
      champs: [
        { label: "Rechercher", saisies: ["30 ans"], options: ["De 30 à 65 ans : test HPV, 3 ans après une cytologie normale", "De 25 à 29 ans : examen cytologique"], valeur: "De 30 à 65 ans : test HPV, 3 ans après une cytologie normale" },
      ],
      boutons: [],
    },
    {
      menu: "Examens",
      sousMenu: "Demande d'examen",
      titre: "Demande d'examen complémentaire",
      champs: [
        { label: "Examen", saisies: ["frottis", "HPV"], options: ["Recherche de HPV à haut risque", "Examen cytologique cervico-utérin", "Sérologie HPV"], valeur: "Recherche de HPV à haut risque" },
        { label: "Renseignements cliniques", saisies: ["Dernière cytologie normale 06/2019"], valeur: "Dernière cytologie normale 06/2019" },
      ],
      boutons: ["Imprimer"],
    },
    {
      menu: "Prescription",
      sousMenu: "Ordonnance",
      titre: "Ordonnance · renouveler",
      champs: [
        { label: "Ordonnance", options: ["14/10/2025 · LÉVONORGESTREL/ÉTHINYLESTRADIOL", "02/04/2025 · Certificat"], valeur: "14/10/2025 · LÉVONORGESTREL/ÉTHINYLESTRADIOL" },
        { label: "Durée", saisies: ["12"], options: ["12 mois", "12 semaines"], valeur: "12 mois" },
      ],
      alerte: { titre: "Analyse de l'ordonnance", texte: "Aucune interaction détectée · posologie conforme", bouton: "OK" },
      boutons: ["Signer et imprimer"],
    },
  ],
  pendant: [
    "« C'est encore utile à mon âge ? »",
    "« Je peux le faire ici ? »",
    "« Ça se passe comment ? »",
    "« Et la pilule, c'est pour un an ? »",
  ],
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
  message: ["Une question, une date.", "Et ce qu'elle implique."],
};

/** Cohorte : aucun dossier ouvert, une question sur toute la patientèle. */
export const COHORTE: Story = {
  id: "cohorte-hba1c",
  quand: "Lundi, 8 h 05",
  patient: { ...MEDECIN, meta: "Médecine générale", contexte: "aucun dossier ouvert" },
  lgcTitre: "Patientèle · 1 312 dossiers",
  pendantQui: "S",
  citation: "Qui, parmi mes diabétiques, n'a pas eu d'HbA1c depuis six mois ?",
  planTitre: "La question",
  plan: ["Les patients diabétiques, codés ou non", "Sans HbA1c depuis plus de 6 mois", "Les plus déséquilibrés en premier"],
  constat: ["La question tient en une ligne.", "Le logiciel n'a pas de case pour elle."],
  avant: [
    {
      menu: "Outils",
      sousMenu: "Requêtes",
      titre: "Requête multicritère",
      champs: [
        { label: "Critère 1 · Diagnostic", saisies: ["diab"], options: ["Diabète de type 1", "Diabète de type 2", "Diabète gestationnel"], valeur: "Diabète de type 2" },
        { label: "OU · Médicament", saisies: ["A10"], options: ["A10 · Antidiabétiques", "A10A · Insulines", "A10B · Hypoglycémiants oraux"], valeur: "A10 · Antidiabétiques" },
        { label: "ET · Biologie", saisies: ["hba1c"], options: ["HbA1c · dernière valeur", "HbA1c · absente depuis 6 mois", "HbA1c · date"], valeur: "HbA1c · absente depuis 6 mois" },
      ],
      alerte: { titre: "Requête", texte: "Critère non disponible : absence de résultat sur une période.", bouton: "OK" },
      boutons: ["Exporter en CSV"],
    },
    {
      menu: "Outils",
      sousMenu: "Requêtes",
      titre: "Requête · résultats de biologie",
      champs: [
        { label: "Examen", saisies: ["hba1c"], options: ["HbA1c · tous les résultats", "HbA1c · dernier résultat"], valeur: "HbA1c · tous les résultats" },
        { label: "Période", options: ["12 derniers mois", "24 derniers mois"], valeur: "24 derniers mois" },
      ],
      boutons: ["Exporter en CSV"],
    },
    {
      fenetre: "tableur",
      url: "patients_diabete.csv",
      titre: "Croiser les deux exports",
      champs: [
        { label: "Colonne D", saisies: ["=RECHERCHEV(A2;hba1c!A:C;3;FAUX)"], valeur: "=RECHERCHEV(A2;hba1c!A:C;3;FAUX)" },
        { label: "Trier", options: ["Date croissante", "Date décroissante"], valeur: "Date croissante" },
        { label: "Filtrer", saisies: ["< 16/04/2026"], valeur: "< 16/04/2026" },
      ],
      boutons: ["Enregistrer"],
    },
  ],
  pendant: [
    "« Votre patient de 8 h 15 est arrivé. »",
    "« Le laboratoire en ligne 2. »",
    "« La salle d'attente se remplit. »",
  ],
  transition: "Même question. Posée au logiciel.",
  mode: "question",
  apresTitre: "Une question, toute la patientèle",
  note: "Mes diabétiques sans HbA1c depuis plus de 6 mois ?",
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
      ["M. Karim Haddad", "61", "01/2026 · 8,6 %"],
      ["M. Jean-Pierre Roux", "70", "09/2025 · 8,4 %"],
      ["Mme Fatoumata Keïta", "57", "02/2026 · 8,2 %"],
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
  secondes: 9,
  message: ["Une question sur un patient.", "La même, sur toute la patientèle."],
};

/** Indicateurs : la ROSP et la Donum sur un seul écran, avec les noms et les euros. */
export const INDICATEURS: Story = {
  id: "rosp-donum",
  quand: "Vendredi, 19 h 10",
  patient: { ...MEDECIN, meta: "Médecine générale", contexte: "fin de journée" },
  lgcTitre: "Patientèle · 1 312 dossiers",
  citation: "Où j'en suis cette année, ROSP et Donum ?",
  planTitre: "La question",
  plan: ["Les indicateurs ROSP de l'année", "Ce qui reste à aller chercher sur la Donum", "Les patients à relancer"],
  constat: ["Deux dispositifs, deux espaces, deux calendriers.", "Et aucun nom derrière les chiffres."],
  avant: [
    {
      fenetre: "web",
      url: "espace professionnel Assurance maladie › activité",
      titre: "Mon activité · indicateurs",
      champs: [
        { label: "Connexion", options: ["Carte CPS", "e-CPS"], valeur: "Carte CPS" },
        { label: "Code", saisies: ["••••"], valeur: "••••" },
        { label: "Rubrique", options: ["ROSP · relevé 2025", "Donum · 2026", "Activité"], valeur: "ROSP · relevé 2025" },
        { label: "Indicateur", options: ["Fond d'œil des diabétiques · 58 %", "Grippe, 65 ans et plus · 54 %", "Dépistage du col · 63 %"], valeur: "Fond d'œil des diabétiques · 58 %" },
      ],
      boutons: [],
    },
    {
      fenetre: "web",
      url: "espace professionnel Assurance maladie › Donum",
      titre: "Donum 2026 · critères",
      champs: [
        { label: "Rubrique", options: ["ROSP · relevé 2025", "Donum · 2026", "Activité"], valeur: "Donum · 2026" },
        { label: "Critère", options: ["Socle", "DMP et ordonnance numérique", "ApCV et messagerie"], valeur: "DMP et ordonnance numérique" },
      ],
      boutons: [],
    },
    {
      fenetre: "tableur",
      url: "indicateurs_2026.xlsx",
      titre: "Additionner",
      champs: [
        { label: "Cellule B7", saisies: ["=B2+B3+B4"], valeur: "=B2+B3+B4" },
        { label: "Patients", saisies: ["?"], valeur: "?" },
      ],
      boutons: ["Enregistrer"],
    },
  ],
  pendant: [
    "« Des pourcentages, mais lesquels de mes patients ? »",
    "« Le relevé date de l'an dernier. »",
    "« Il est 19 h 52. »",
  ],
  transition: "Mêmes chiffres. Avec ce qu'il y a derrière.",
  mode: "question",
  apresTitre: "Une question, des noms",
  note: "Où j'en suis, ROSP et Donum ?",
  etapes: [
    "Lecture de 1 312 dossiers et de l'activité 2026…",
    "Donum : socle et options",
    "ROSP : indicateurs du médecin traitant",
    "71 patients à relancer · 600 € à aller chercher",
  ],
  synthese: "",
  jauges: [
    {
      titre: "Donum 2026",
      total: "2 340 € sur 2 940 €",
      lignes: [
        { label: "Socle", valeur: "1 960 €", pct: 1 },
        { label: "DMP et e-prescription", valeur: "380 / 420 €", pct: 0.9, note: "11 % d'e-prescriptions en moins" },
        { label: "ApCV et messagerie", valeur: "0 / 140 €", pct: 0, note: "ApCV jamais utilisée" },
      ],
    },
    {
      titre: "ROSP",
      total: "71 patients à relancer",
      lignes: [
        { label: "Fond d'œil · diabétiques", valeur: "58 %", pct: 0.58, note: "12 patients" },
        { label: "Grippe · 65 ans et plus", valeur: "54 %", pct: 0.54, note: "41 patients" },
        { label: "Dépistage du col", valeur: "63 %", pct: 0.63, note: "18 patientes" },
      ],
    },
  ],
  actions: [
    {
      code: "MSG",
      titre: "Rétinographie · 12 patients diabétiques",
      ligne: "Message avec la prescription jointe",
      destination: "12 patients · messagerie",
      doc: { entete: "Message", pour: "12 patients diabétiques", lignes: ["Votre dernier fond d'œil date de plus de 2 ans.", "Vous trouverez ci-joint la prescription d'une rétinographie.", "Le résultat arrivera directement dans votre dossier."] },
    },
  ],
  secondes: 8,
  message: ["Un indicateur, ce sont des patients.", "Et des euros qu'on peut encore aller chercher."],
};
