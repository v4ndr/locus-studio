/**
 * Une user story = un cas de consultation raconté en « A versus B » :
 * le LGC d'aujourd'hui (clics et saisie), puis Locus Studio (une note, des
 * actions à valider). Le motion est une mise en scène de ces données : pour un
 * nouveau post, on écrit une nouvelle story, pas un nouveau composant.
 *
 * Patients fictifs uniquement. Le contenu médical est à relire avant diffusion.
 */

export type Action = {
  /** Le code affiché dans la carte, comme dans Studio (`materialize.ts`). */
  code: "Rx" | "BIO" | "IMG" | "K" | "DM" | "RV" | "CR" | "AT" | "MSG" | "ATCD";
  titre: string;
  ligne: string;
  destination: string;
  /** Le document tel qu'il part : son intitulé et ses lignes, pour le carrousel de relecture. */
  doc: { entete: string; lignes: string[]; /** La ligne « pour qui », si ce n'est pas le patient de la story (une cohorte). */ pour?: string };
};

/** Une source affichée sous une réponse : un document du dossier, une recommandation. */
export type Encart = { titre?: string; texte: string; sources: string[]; /** Les sources affichées en rouge d'alerte. */ alertes?: string[] };

/** Une jauge du tableau de bord : un libellé, une valeur, un remplissage de 0 à 1, une note. */
export type Jauge = { label: string; valeur: string; pct: number; note?: string; /** La cible, de 0 à 1, marquée sur la jauge. */ cible?: number };

/**
 * Un champ d'un formulaire du LGC. Un clic pour y entrer ; puis, s'il y a
 * des `saisies`, on tape (plusieurs saisies = la première ne donne rien, on
 * efface et on retape) ; puis, s'il y a des `options`, une liste s'ouvre et
 * un clic choisit `valeur` (qui doit figurer dans `options`). Sans saisie ni
 * option, la valeur s'affiche au clic.
 */
export type Champ = { label: string; valeur: string; saisies?: string[]; options?: string[] };

/** Un écran du LGC d'aujourd'hui, ouvert depuis ses menus. */
export type EcranAvant = {
  /**
   * Le menu de la barre, puis l'entrée du menu déroulant : deux clics. Sans
   * menu, la fenêtre passe au premier plan directement (un autre onglet,
   * un autre logiciel).
   */
  menu?: string;
  sousMenu?: string;
  /** La fenêtre : le LGC (par défaut), un navigateur, un tableur. */
  fenetre?: "lgc" | "web" | "tableur";
  /** L'adresse du navigateur, ou le nom du fichier du tableur. */
  url?: string;
  titre: string;
  champs: Champ[];
  /** Une fenêtre d'alerte (le LAP, par exemple), fermée d'un clic. `grave` : l'alerte bloque. */
  alerte?: { titre: string; texte: string; bouton: string; grave?: boolean };
  /**
   * Une liste qu'on fait défiler (les documents du dossier) : on descend
   * jusqu'à chaque ligne de `ouvre`, on l'ouvre d'un clic, on lit son aperçu.
   * La dernière ouverte est celle qu'on cherchait.
   */
  defile?: { lignes: string[]; ouvre: { i: number; apercu: string }[] };
  /** Un portail web : un fil d'Ariane au-dessus du titre. */
  ariane?: string;
  /** Des cartes de paiement, lues, puis `choix` ouverte d'un clic. */
  cartes?: { liste: { titre: string; montant: string; date: string }[]; choix: number };
  /** Un tableau d'indicateurs avec leur taux, lu, puis `choix` ouvert d'un clic. */
  indicateurs?: { lignes: { label: string; taux: string; pct: number; cible?: number }[]; maj: string; choix: number };
  /** Les boutons de fin, un clic chacun. */
  boutons: string[];
};

export type Story = {
  id: string;
  quand: string;
  /** Le patient, ou celui qui parle quand il n'y a pas de patient (une question sur la patientèle). */
  patient: { nom: string; prenomNom: string; initiales: string; meta: string; contexte: string };
  /** Le titre de la fenêtre du LGC, s'il n'y a pas de dossier ouvert. */
  lgcTitre?: string;
  /** Les initiales de qui parle pendant la saisie, si ce n'est pas le patient (le secrétariat). */
  pendantQui?: string;
  /** Le libellé au-dessus du plan (« La décision du médecin » par défaut). */
  planTitre?: string;
  /** Ce que dit le patient en entrant. */
  citation: string;
  /** Ce que le médecin a déjà décidé, avant toute saisie. */
  plan: string[];
  /** La phrase sous le plan. */
  constat: [string, string];
  avant: EcranAvant[];
  /** Le compteur du logiciel actuel : les clics (par défaut), ou la durée réelle estimée, en secondes. */
  temps?: number;
  /** Ce que demande le patient pendant la saisie : la consultation continue. */
  pendant: string[];
  /** La phrase de la transition, pendant que le compteur se rembobine. */
  transition: string;
  /** La note, telle que le médecin l'écrit ; en mode « question », la question posée à ⌘K. */
  note: string;
  /** « note » (par défaut) : l'écran de consultation. « question » : le composer ⌘K. */
  mode?: "note" | "question";
  /** Le motif affiché dans la barre de la consultation. */
  motif?: string;
  /** Le titre de la scène « Demain ». */
  apresTitre?: string;
  /** La réponse à la question, avec ses sources. */
  reponse?: Encart;
  /** L'aide à la décision, insérée avant les actions, avec ses sources. */
  aide?: Encart;
  /** Une liste de patients (une cohorte). */
  tableau?: { colonnes: string[]; lignes: string[][]; plus?: string; marques?: number };
  /** Un tableau de bord en colonnes de jauges. Avec un `tableau`, le tableau de bord vient d'abord, puis laisse la place à la liste. */
  jauges?: { titre: string; total?: string; lignes: Jauge[] }[];
  /** Ce que l'agent affiche pendant qu'il compose. */
  etapes: string[];
  synthese: string;
  actions: Action[];
  /** Le chrono affiché côté Studio, en secondes. */
  secondes: number;
  /** Le rythme des étapes de l'agent (1 par défaut ; plus grand = plus lent). */
  tempo?: number;
  /** Le temps laissé pour lire ce que l'agent a rendu, avant la relecture, en frames. */
  lecture?: number;
  /** Un zoom sur l'aide à la décision pendant la lecture. */
  zoom?: boolean;
  /** La comparaison finale, si ce ne sont pas les clics : aujourd'hui, demain, puis (facultatif) ce que devient demain. */
  compare?: { avant: string; apres: string; bascule?: string };
  message: [string, string];
};

const CABINET = "Dr Romain Vandepitterie · Médecine générale";

/**
 * La rencontre de référence (réunion Romain × Guelno du 14/10/2026) :
 * un artisan hypertendu vient pour son renouvellement et signale des
 * paresthésies nocturnes des deux mains. Le patient réel a été remplacé par
 * une identité fictive ; le traitement est un exemple.
 */
export const RENCONTRE: Story = {
  id: "rencontre-enmg",
  quand: "Lundi, 10 h 40",
  patient: { nom: "M. Gilles Fournier", prenomNom: "FOURNIER Gilles", initiales: "GF", meta: "56 ans · artisan", contexte: "hypertension artérielle traitée" },
  citation: "Je viens pour mon renouvellement. Et j'ai des fourmillements dans les deux mains, surtout la nuit.",
  plan: [
    "Renouveler le traitement pour 3 mois",
    "Demander un ENMG pour éliminer un canal carpien",
    "Prescrire des orthèses nocturnes en attendant",
  ],
  constat: ["La décision est prise en quelques secondes.", "Sa saisie dans le logiciel prend bien plus longtemps."],
  avant: [
    {
      menu: "Prescription",
      sousMenu: "Ordonnance",
      titre: "Ordonnance · médicaments",
      champs: [
        { label: "Médicament", saisies: ["amlo"], options: ["AMLODIPINE 10 mg cp", "AMLODIPINE 5 mg cp", "AMLOR 5 mg gél"], valeur: "AMLODIPINE 5 mg cp" },
        { label: "Posologie", saisies: ["1 cp le matin"], valeur: "1 cp le matin" },
        { label: "Durée", saisies: ["3"], options: ["3 jours", "3 mois", "3 semaines"], valeur: "3 mois" },
      ],
      alerte: { titre: "Analyse de l'ordonnance", texte: "Aucune interaction détectée · posologie conforme", bouton: "OK" },
      boutons: ["Signer et imprimer"],
    },
    {
      menu: "Examens",
      sousMenu: "Demande d'examen",
      titre: "Demande d'examen complémentaire",
      champs: [
        { label: "Examen", saisies: ["ENMG", "électromyo"], options: ["Électromyogramme de surface", "Électroneuromyogramme", "Électroencéphalogramme"], valeur: "Électroneuromyogramme" },
        { label: "Territoire", options: ["Membre supérieur droit", "Membres supérieurs", "Membre supérieur gauche"], valeur: "Membres supérieurs" },
        { label: "Renseignements cliniques", saisies: ["Paresthésies nocturnes des 2 mains. Canal carpien ?"], valeur: "Paresthésies nocturnes des 2 mains. Canal carpien ?" },
      ],
      boutons: ["Imprimer"],
    },
    {
      menu: "Prescription",
      sousMenu: "Dispositif médical",
      titre: "Ordonnance · orthèse",
      champs: [
        { label: "Dispositif", saisies: ["orthese poignet"], options: ["Attelle de poignet rigide", "Orthèse poignet-main thermoformée", "Orthèse du pouce"], valeur: "Orthèse poignet-main thermoformée" },
        { label: "Côté", options: ["Droit", "Bilatéral", "Gauche"], valeur: "Bilatéral" },
        { label: "Indication", saisies: ["Port nocturne"], valeur: "Port nocturne" },
      ],
      boutons: ["Valider"],
    },
  ],
  pendant: [
    "« En quoi consiste cet examen ? »",
    "« Est-ce que c'est douloureux ? »",
    "« Où est-ce que je peux le faire ? »",
  ],
  transition: "Même patient. Même décision.",
  note: "RO TA.\nParesthésies nocturnes des deux mains, examen normal.\nENMG pour éliminer un canal carpien.\nOrthèses nocturnes en attendant le résultat.",
  etapes: [
    "Lecture de la note…",
    "Traitement habituel retrouvé au dossier",
    "Locus · ENMG : quels territoires explorer ?",
    "3 actions composées",
  ],
  synthese: "Renouvellement du traitement antihypertenseur pour 3 mois, ENMG des deux membres supérieurs pour éliminer un canal carpien, orthèses nocturnes en attendant le résultat.",
  actions: [
    {
      code: "Rx",
      titre: "Ordonnance · Amlodipine 5 mg",
      ligne: "Renouvellement · 1 cp le matin · 3 mois",
      destination: "patient · e-prescription",
      doc: { entete: "Ordonnance", lignes: ["AMLODIPINE 5 mg, comprimé", "1 comprimé le matin", "Durée : 3 mois"] },
    },
    {
      code: "IMG",
      titre: "Demande d'examen · ENMG des deux membres supérieurs",
      ligne: "Paresthésies nocturnes bilatérales · éliminer un canal carpien",
      destination: "patient · e-prescription",
      doc: { entete: "Demande d'examen", lignes: ["Électroneuromyogramme des deux membres supérieurs", "Paresthésies nocturnes bilatérales des mains, examen clinique normal", "Recherche d'un syndrome du canal carpien"] },
    },
    {
      code: "DM",
      titre: "Ordonnance · orthèses de poignet thermoformées",
      ligne: "Bilatérales · port nocturne · suspicion de canal carpien",
      destination: "pharmacie · e-prescription",
      doc: { entete: "Ordonnance", lignes: ["Orthèses de repos poignet-main thermoformées, bilatérales", "Port nocturne", "Indication : suspicion de syndrome du canal carpien bilatéral"] },
    },
  ],
  secondes: 8,
  message: ["Le médecin décide une fois.", "Le logiciel s'occupe du reste."],
};

export const CABINET_ENTETE = CABINET;
