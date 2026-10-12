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

export const SORTIES_LABEL: Record<string, string> = { libres: "libres", horaires: "9-11 h et 14-16 h", non: "non autorisées" };
