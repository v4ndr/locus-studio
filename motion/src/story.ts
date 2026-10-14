/**
 * Une user story = un cas de consultation raconté en « A versus B » :
 * le LGC d'aujourd'hui (des clics), puis Locus Studio (une note, des actions
 * à signer). Le motion est une mise en scène de ces données : pour un
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
};

/** Un écran du LGC d'aujourd'hui : un formulaire, et les clics pour le remplir. */
export type EcranAvant = {
  /** Le chemin dans les menus pour ouvrir l'écran : un clic. */
  menu: string;
  titre: string;
  /** Chaque champ coûte un clic (ou plus) ; la valeur apparaît après le clic. */
  champs: { label: string; valeur: string; clics?: number }[];
  /** Le bouton final (Valider, Imprimer…), un clic. */
  bouton: string;
};

export type Story = {
  id: string;
  quand: string;
  patient: { nom: string; initiales: string; meta: string; contexte: string };
  /** Ce que dit le patient en entrant. */
  citation: string;
  /** Ce que le médecin sait déjà devoir faire, avant tout clic. */
  plan: string[];
  avant: EcranAvant[];
  /** Ce que dit le patient pendant que le médecin clique : le deuxième cerveau. */
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

/**
 * La rencontre de référence (réunion Romain × Guelno du 14/10/2026) :
 * un artisan hypertendu vient pour son renouvellement et, au passage, parle
 * de fourmillements nocturnes dans les deux mains. Le patient réel a été
 * remplacé par une identité fictive.
 */
export const RENCONTRE: Story = {
  id: "rencontre-enmg",
  quand: "Lundi, 10 h 40",
  patient: { nom: "M. Gilles Fournier", initiales: "GF", meta: "56 ans · artisan", contexte: "Hypertension · traitement au long cours" },
  citation: "Je viens pour mon renouvellement. Et au fait, docteur : des fourmillements dans les deux mains. Surtout la nuit.",
  plan: [
    "Renouveler le traitement pour 3 mois",
    "Un ENMG pour éliminer un canal carpien",
    "Des orthèses la nuit, en attendant",
  ],
  avant: [
    {
      menu: "Prescription › Renouveler",
      titre: "Prescription · renouvellement",
      champs: [
        { label: "Patient", valeur: "FOURNIER Gilles" },
        { label: "Traitement en cours", valeur: "Amlodipine 5 mg", clics: 2 },
        { label: "Posologie", valeur: "1 cp le matin", clics: 2 },
        { label: "Durée", valeur: "3 mois", clics: 2 },
      ],
      bouton: "Valider l'ordonnance",
    },
    {
      menu: "Examens › Nouvelle demande",
      titre: "Demande d'examen complémentaire",
      champs: [
        { label: "Type", valeur: "Électrophysiologie" },
        { label: "Examen", valeur: "ENMG", clics: 2 },
        { label: "Localisation", valeur: "Membres supérieurs", clics: 2 },
        { label: "Renseignements cliniques", valeur: "Paresthésies nocturnes", clics: 2 },
      ],
      bouton: "Imprimer la demande",
    },
    {
      menu: "Prescription › Dispositif médical",
      titre: "Prescription · dispositif médical",
      champs: [
        { label: "Catégorie", valeur: "Orthèses" },
        { label: "Dispositif", valeur: "Orthèse de poignet", clics: 2 },
        { label: "Côté", valeur: "Bilatéral" },
        { label: "Port", valeur: "Nocturne" },
      ],
      bouton: "Valider",
    },
  ],
  pendant: [
    "« Ça fait mal, votre examen ? »",
    "« Mon grand-père avait ça, il ne s'en est jamais plaint. »",
    "« Il y a un neurologue dans le coin ? »",
  ],
  note: "RO TA.\nParesthésies nocturnes des deux mains, examen normal.\nENMG pour éliminer un canal carpien.\nOrthèses nocturnes en attendant le résultat.",
  etapes: [
    "Je lis la note…",
    "Traitement habituel retrouvé au dossier",
    "Locus · ENMG : quels membres explorer ?",
    "3 actions composées",
  ],
  synthese: "Renouvellement du traitement antihypertenseur pour 3 mois, ENMG des deux membres supérieurs pour éliminer un canal carpien, orthèses nocturnes en attendant le résultat.",
  actions: [
    { code: "Rx", titre: "Ordonnance · Amlodipine 5 mg", ligne: "Renouvellement · 1 cp le matin · 3 mois", destination: "patient · e-ordo" },
    { code: "IMG", titre: "Demande d'examen · ENMG des deux membres supérieurs", ligne: "Paresthésies nocturnes bilatérales · éliminer un canal carpien", destination: "patient · e-ordo" },
    { code: "DM", titre: "Orthèses de poignet nocturnes, bilatérales", ligne: "Renseignement clinique : suspicion de canal carpien", destination: "pharmacie · e-ordo" },
  ],
  secondes: 8,
  message: ["Le médecin sait déjà ce qu'il doit faire.", "Qu'on ne lui casse pas la tête pour le faire."],
};

/** Les clics d'un écran, dans l'ordre : le menu, chaque champ (un ou plusieurs), le bouton. */
export const clicsEcran = (e: EcranAvant) => 1 + e.champs.reduce((m, c) => m + (c.clics ?? 1), 0) + 1;
/** Le nombre de clics côté « avant ». */
export const clicsAvant = (s: Story) => s.avant.reduce((n, e) => n + clicsEcran(e), 0);
