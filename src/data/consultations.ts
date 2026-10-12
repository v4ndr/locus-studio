import type { TranscriptTurn, EncounterNote, Proposal, Draft, Prescription } from "@/domain/types";
import { day } from "./clock";

/**
 * Les consultations scriptées : ce que l'écoute ambiante entendrait, et ce
 * que Sol en ferait, tour après tour. C'est la simulation de la capacité
 * « scribe » (projetée dans locus-core) : la transcription est jouée, la
 * note se structure, les propositions tombent.
 *
 * Chaque étape = un tour de parole + ce qu'il déclenche (une phrase dans une
 * section de la note, une proposition). La provenance est gardée : chaque
 * phrase de la note sait de quel tour elle vient (« linked evidence »).
 */
export interface ScriptStep {
  turn: TranscriptTurn;
  note?: { section: keyof EncounterNote; text: string }[];
  proposals?: ScriptProposal[];
}

export type ScriptProposal = Pick<Proposal, "action" | "titre" | "justification" | "autonomie"> & { references?: Proposal["references"]; charge?: Proposal["charge"] };

export interface Script {
  patientId: string;
  motif: string;
  steps: ScriptStep[];
  /** Ce qui se passe à la clôture. */
  cloture: { codes: { systeme: "drc" | "cisp2" | "cim10"; code: string; libelle: string }[]; acte: string; montant: number; tiersPayant: boolean; dmp: string[] };
}

const t = (qui: TranscriptTurn["qui"], t: number, texte: string): TranscriptTurn => ({ qui, t, texte });

export const SCRIPTS: Record<string, Script> = {
  pat_delacroix: {
    patientId: "pat_delacroix",
    motif: "Suivi diabète / HTA — résultats de biologie",
    steps: [
      { turn: t("medecin", 0, "Bonjour Madame Delacroix, bonjour Anne. Asseyez-vous. Alors, comment allez-vous depuis juillet ?"), note: [{ section: "motifs", text: "Suivi diabète / HTA, résultats de biologie. Accompagnée de sa fille." }] },
      { turn: t("patient", 9, "Ça va, ça va. Je marche tous les jours avec ma voisine, une demi-heure. Mais bon, Anne va vous dire que j'ai le cœur qui s'emballe le soir."), note: [{ section: "histoire", text: "Marche quotidienne 30 min. Palpitations vespérales rapportées." }] },
      { turn: t("tiers", 20, "Deux fois cette semaine, Docteur. Vingt minutes à peu près, elle est pâle, et après ça passe. Et elle oublie le comprimé du soir, celui du cholestérol."), note: [{ section: "histoire", text: "Selon sa fille : 2 épisodes de palpitations cette semaine, ≈ 20 min, résolutifs, sans malaise. Oublis fréquents de l'atorvastatine du soir." }] },
      { turn: t("medecin", 34, "D'accord. Pas de douleur dans la poitrine pendant ces épisodes ? Pas d'essoufflement, pas de malaise ?"), },
      { turn: t("patient", 40, "Non, non. Juste que ça tape. Je m'assois et j'attends."), note: [{ section: "histoire", text: "Pas de douleur thoracique, de dyspnée ni de malaise pendant les épisodes." }], proposals: [{ action: "signaler", titre: "Palpitations ×2/semaine, bien tolérées : le bisoprolol 2,5 mg proposé par la cardiologue devient pertinent", justification: "Le CR du Dr Rabier laissait le bisoprolol à votre appréciation « si gêne ». La gêne est là (2 épisodes/semaine, 20 min), la tolérance est bonne, la TA ne s'y oppose pas. Je peux préparer l'ordonnance si vous le décidez.", autonomie: 0 }] },
      { turn: t("medecin", 48, "Vos résultats de prise de sang sont arrivés. Le diabète s'est un peu dégradé : l'hémoglobine glyquée est à 8,1, on était à 7,4. Et vos reins fatiguent un peu, on va en parler."), note: [{ section: "conclusion", text: "DT2 déséquilibré : HbA1c 8,1 % (7,4 % il y a 3 mois)." }, { section: "conclusion", text: "MRC stade 3a (DFG 48, microalbuminurie 42 mg/g)." }] },
      { turn: t("patient", 62, "Ah. C'est à cause des gâteaux de Noël, ça. Non, je plaisante. Qu'est-ce qu'on fait ?"), },
      { turn: t("medecin", 68, "On garde la metformine, on ne peut pas monter plus avec vos reins. Et on ajoute un comprimé le matin, la dapagliflozine, qui fait baisser le sucre et qui protège les reins et le cœur. Il faut bien boire, et une bonne hygiène intime, parce que ça fait passer du sucre dans les urines."), note: [{ section: "conduite", text: "Ajout dapagliflozine 10 mg/j (protection rénale et cardiovasculaire). Metformine maintenue à 2000 mg/j (plafond pour DFG 45-59). Information donnée : hydratation, hygiène génitale, signes de cétose." }], proposals: [{ action: "ordonnance", titre: "Ordonnance : dapagliflozine 10 mg + renouvellement 3 mois (metformine plafonnée)", justification: "Confirmé en consultation. Vérifications LAP posées : DFG 48 compatible avec l'initiation (> 25) ; metformine à 2000 mg/j maximum ; apixaban inchangé (critères de réduction non réunis). Allergie aux pénicillines sans rapport.", autonomie: 1, references: [{ docId: "has-dt2-2024", titre: "Stratégie médicamenteuse du contrôle glycémique du DT2", editeur: "HAS", date: "2024" }, { titre: "RCP Forxiga — 4.2 / 4.4", editeur: "ANSM" }], charge: { type: "medicament", date: day(0), lignes: [{ libelle: "DAPAGLIFLOZINE 10 mg cp", dci: "dapagliflozine", posologie: "1 cp le matin", duree: "3 mois", ald: true, alertes: [{ type: "insuffisance-renale", niveau: "info", message: "DFG 48 : initiation possible (> 25). Effet glycémique réduit sous 45." }] }, { libelle: "METFORMINE 1000 mg cp", dci: "metformine", cis: "66185592", posologie: "1 cp matin et soir", duree: "3 mois", ald: true, alertes: [{ type: "insuffisance-renale", niveau: "precaution", message: "Dose maximale 2000 mg/j entre 45 et 59 mL/min. Contrôle créatinine à 15 j." }] }, { libelle: "RAMIPRIL 5 mg cp", dci: "ramipril", posologie: "1 cp le matin", duree: "3 mois", ald: true }, { libelle: "AMLODIPINE 5 mg gél", dci: "amlodipine", posologie: "1 gélule le matin", duree: "3 mois", ald: true }, { libelle: "ELIQUIS 5 mg cp", dci: "apixaban", cis: "62045256", posologie: "1 cp matin et soir", duree: "3 mois", ald: true }, { libelle: "ATORVASTATINE 20 mg cp", dci: "atorvastatine", posologie: "1 cp le soir", duree: "3 mois", ald: true }], mention: "Créatinine, ionogramme dans 15 jours. Ordonnance numérique." } satisfies Draft<Prescription> }] },
      { turn: t("tiers", 92, "Et pour les oublis ? Je pensais à un pilulier."), },
      { turn: t("medecin", 96, "Oui, je vous prescris un pilulier préparé par la pharmacie, chaque semaine. Et Anne, si votre mère est d'accord, on active les rappels sur Mon Espace Santé."), note: [{ section: "conduite", text: "Pilulier hebdomadaire préparé en officine. Rappels Mon Espace Santé (accord patiente)." }], proposals: [{ action: "rappel", titre: "Activer les rappels de prise sur Mon Espace Santé (soir : atorvastatine, apixaban)", justification: "Accord donné en consultation. Je l'active à la clôture.", autonomie: 2 }] },
      { turn: t("medecin", 108, "Je vous examine. Tension… 15,2 / 8,8. Un peu haute encore. Le pouls est régulier. Les pieds… bien. Poids 70 kilos 5."), note: [{ section: "examen", text: "TA 152/88 (assise, 2e mesure). Pouls régulier 72/min. Auscultation cardiopulmonaire normale. Pieds : pouls perçus, monofilament normal, pas de lésion. Poids 70,5 kg." }, { section: "conclusion", text: "HTA non contrôlée (cabinet 152/88, automesure ≈ 150/88)." }] },
      { turn: t("medecin", 130, "Pour la tension, on ne change rien aujourd'hui : la dapagliflozine va aider un peu, et on refait le point dans un mois avec vos automesures. Pour les palpitations, la cardiologue propose un petit bêtabloquant. Est-ce que ça vous gêne assez pour qu'on l'essaie ?"), },
      { turn: t("patient", 146, "Si ça peut éviter que ça tape le soir, oui. Mais pas trop de comprimés, hein."), note: [{ section: "attentesPatient", text: "« Pas trop de comprimés » — souhaite limiter le nombre de prises." }, { section: "conduite", text: "Bisoprolol 2,5 mg/j débuté pour palpitations symptomatiques (proposition cardiologue), tolérance à réévaluer à 1 mois. HTA : pas de changement, réévaluation à 1 mois sur automesures." }], proposals: [{ action: "ordonnance", titre: "Ajouter bisoprolol 2,5 mg le matin à l'ordonnance", justification: "Décision prise en consultation. Pas d'asthme ni de BAV connu ; FC 72. Interaction amlodipine/bisoprolol : surveiller bradycardie — information.", autonomie: 1, charge: { type: "medicament", date: day(0), lignes: [{ libelle: "BISOPROLOL 2,5 mg cp", dci: "bisoprolol", posologie: "1 cp le matin", duree: "1 mois", ald: true, alertes: [{ type: "interaction", niveau: "info", message: "Amlodipine + bisoprolol : surveiller FC et TA à 1 mois." }] }] } satisfies Draft<Prescription> }] },
      { turn: t("medecin", 158, "Dernière chose : le fond d'œil, ça fait plus d'un an. Je vous fais le courrier pour le Dr Kessler. Et on se revoit dans un mois."), note: [{ section: "conduite", text: "Adressage ophtalmologie (fond d'œil annuel en retard). Revoir à 1 mois : TA, tolérance bisoprolol et dapagliflozine, créatinine à 15 j." }], proposals: [{ action: "rdv", titre: "Rendez-vous de contrôle dans 1 mois, créneau 30 min proposé le " + day(30), justification: "« On se revoit dans un mois ». Créneau libre le matin ; sa fille l'accompagne souvent — après 9h.", autonomie: 2 }, { action: "codage", titre: "Codage : DIABÈTE TYPE 2 · HTA · PALPITATIONS (DRC) — acte G ALD, tiers payant AMO", justification: "Trois résultats de consultation ; consultation de suivi ALD → tiers payant sur la part obligatoire. FSE prête.", autonomie: 2 }] },
      { turn: t("patient", 170, "Merci Docteur. Allez, Anne, on y va."), },
    ],
    cloture: { codes: [{ systeme: "drc", code: "DIABETE TYPE 2", libelle: "Diabète de type 2" }, { systeme: "drc", code: "HTA", libelle: "Hypertension artérielle" }, { systeme: "drc", code: "PALPITATIONS", libelle: "Palpitations" }], acte: "G", montant: 30, tiersPayant: true, dmp: ["Note de consultation (VSM mis à jour)", "Ordonnance numérique (6 lignes + bisoprolol)", "Courrier d'adressage ophtalmologie"] },
  },
  pat_garnier: {
    patientId: "pat_garnier",
    motif: "Lombalgie aiguë — arrêt de travail",
    steps: [
      { turn: t("medecin", 0, "Bonjour Julien. Alors, ce dos ?"), note: [{ section: "motifs", text: "Lombalgie aiguë depuis 2 jours, demande d'arrêt de travail." }] },
      { turn: t("patient", 4, "Ça s'est bloqué avant-hier en soulevant un colis, en bas du dos. Je marche, mais assis c'est impossible. Pas de fièvre, rien dans les jambes."), note: [{ section: "histoire", text: "Début brutal il y a 2 j au port d'un colis. Douleur lombaire basse, mécanique, aggravée par la position assise. Pas de fièvre, pas d'irradiation, pas de déficit ni trouble sphinctérien rapporté. Ibuprofène en automédication, efficace partiellement." }] },
      { turn: t("medecin", 18, "Je vous examine. Penchez-vous… Levez la jambe… Pas de douleur qui descend ? Non. Les réflexes sont bons, la force aussi."), note: [{ section: "examen", text: "Raideur lombaire, contracture paravertébrale bilatérale. Lasègue négatif. Pas de déficit moteur ni sensitif, ROT symétriques. Pas de drapeau rouge." }, { section: "conclusion", text: "Lombalgie aiguë commune, 2e épisode (2023)." }] },
      { turn: t("medecin", 40, "C'est une lombalgie commune. Il faut continuer à bouger, pas d'alitement. Je vous mets un arrêt de 4 jours, avec sorties libres, et si ça dure plus de deux semaines on fera de la kiné."), note: [{ section: "conduite", text: "Maintien de l'activité, pas d'alitement. Paracétamol 1 g ×3/j, ibuprofène 400 mg ×3/j au repas max 5 j. Arrêt de travail 4 jours, sorties libres. Kiné si > 2 semaines. Information : signes d'alerte." }], proposals: [{ action: "arret-travail", titre: "Arrêt de travail 4 jours — AAT amelipro", justification: "Confirmé à l'examen. Durée dans la fourchette Assurance Maladie (3-5 j, port de charges).", autonomie: 1, charge: { du: day(0), au: day(3), motif: "Lombalgie aiguë commune", sortiesAutorisees: "libres" } }, { action: "ordonnance", titre: "Ordonnance : paracétamol + ibuprofène 5 jours", justification: "Antalgie de palier 1 et AINS courte durée, pas de contre-indication (pas d'IR, pas d'ulcère).", autonomie: 1, charge: { type: "medicament", date: day(0), lignes: [{ libelle: "PARACÉTAMOL 1 g cp", dci: "paracétamol", posologie: "1 cp jusqu'à 3/j", duree: "7 jours" }, { libelle: "IBUPROFÈNE 400 mg cp", dci: "ibuprofène", posologie: "1 cp ×3/j au repas", duree: "5 jours" }] } satisfies Draft<Prescription> }] },
      { turn: t("medecin", 60, "Et puisque vous êtes là : la prise de sang dont on avait parlé, pour le sucre et le cholestérol. Je vous fais l'ordonnance, vous la faites quand le dos va mieux."), note: [{ section: "conduite", text: "Bilan : glycémie à jeun, lipides (FINDRISC 13, hérédité)." }], proposals: [{ action: "ordonnance", titre: "Ordonnance de biologie : glycémie à jeun + bilan lipidique", justification: "Prévu à la dernière consultation, jamais prescrit. FINDRISC estimé 13.", autonomie: 1, charge: { type: "biologie", date: day(0), lignes: [{ libelle: "Glycémie à jeun" }, { libelle: "Bilan lipidique" }] } satisfies Draft<Prescription> }, { action: "codage", titre: "Codage : LOMBALGIE (DRC) — acte G", justification: "Un résultat de consultation. Pas de tiers payant.", autonomie: 2 }] },
    ],
    cloture: { codes: [{ systeme: "drc", code: "LOMBALGIE", libelle: "Lombalgie" }], acte: "G", montant: 30, tiersPayant: false, dmp: ["Note de consultation", "Arrêt de travail (volet patient, automatique)", "Ordonnances"] },
  },
};

/** Un script générique pour les patients sans scénario écrit. */
export function genericScript(patientId: string, motif: string, prenom: string): Script {
  return {
    patientId,
    motif,
    steps: [
      { turn: t("medecin", 0, `Bonjour ${prenom}. Qu'est-ce qui vous amène ?`), note: [{ section: "motifs", text: motif }] },
      { turn: t("patient", 5, "…"), note: [{ section: "histoire", text: "(transcription en cours — la consultation n'est pas scriptée dans le jeu de données ; Sol structurerait ici l'anamnèse)" }] },
      { turn: t("medecin", 30, "Je vous examine."), note: [{ section: "examen", text: "(examen)" }] },
    ],
    cloture: { codes: [], acte: "G", montant: 30, tiersPayant: false, dmp: ["Note de consultation"] },
  };
}
