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
  code: "Rx" | "BIO" | "IMG" | "K" | "DM" | "RV" | "CR" | "AT" | "MSG";
  titre: string;
  ligne: string;
  destination: string;
  /** Le document tel qu'il part : son intitulé et ses lignes, pour le carrousel de relecture. */
  doc: { entete: string; lignes: string[] };
};

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
  /** Le menu de la barre, puis l'entrée du menu déroulant : deux clics. */
  menu: string;
  sousMenu: string;
  titre: string;
  champs: Champ[];
  /** Une fenêtre d'alerte (le LAP, par exemple), fermée d'un clic. */
  alerte?: { titre: string; texte: string; bouton: string };
  /** Les boutons de fin, un clic chacun. */
  boutons: string[];
};

export type Story = {
  id: string;
  quand: string;
  patient: { nom: string; prenomNom: string; initiales: string; meta: string; contexte: string };
  /** Ce que dit le patient en entrant. */
  citation: string;
  /** Ce que le médecin a déjà décidé, avant toute saisie. */
  plan: string[];
  /** La phrase sous le plan. */
  constat: [string, string];
  avant: EcranAvant[];
  /** Ce que demande le patient pendant la saisie : la consultation continue. */
  pendant: string[];
  /** La note, telle que le médecin l'écrit. */
  note: string;
  /** Ce que l'agent affiche pendant qu'il compose. */
  etapes: string[];
  synthese: string;
  actions: Action[];
  /** Le chrono affiché côté Studio, en secondes. */
  secondes: number;
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
  message: ["Le médecin a déjà décidé.", "Au logiciel de rédiger, au médecin de valider."],
};

export const CABINET_ENTETE = CABINET;
