import type { LogicComputeRequest, LogicComputeResponse, RetrieveRequest, RetrieveSpecialite, StudioStreamEvent, PublicRetrieve } from "./contract";

/**
 * Le mode simulation : ce que l'agent répond quand aucun locus-core n'est
 * configuré. Une petite base locale, par thème, qui imite la FORME des
 * réponses de core (markdown, renvois [n], RCP) — pas son fond. Le but est
 * que le produit soit entier à sec ; dès que `LOCUS_CORE_URL` est posé,
 * tout ceci est ignoré.
 */

interface Canned {
  match: RegExp;
  titre: string;
  answer: string;
  docs: PublicRetrieve["docs"];
  rcp?: PublicRetrieve["rcp"];
  drugs?: PublicRetrieve["drugs"];
}

const HAS = (id: string, title: string, year: number, url: string) => ({ id, title, year, url, source_id: "HAS", source_name: "Haute Autorité de Santé" });

const CANNED: Canned[] = [
  {
    match: /diab[eè]te|hba1c|metformin|glyc[eé]mie/i,
    titre: "Diabète de type 2 : objectifs et intensification",
    answer: `# Intensifier si l'HbA1c reste au-dessus de la cible après 3 à 6 mois de metformine bien conduite

**Cible** : HbA1c ≤ 7 % pour la plupart des patients ; ≤ 8 % si âgé, comorbide, ou espérance de vie limitée [1].

**Si la cible n'est pas atteinte sous metformine seule** :
- en cas de maladie cardiovasculaire avérée, d'insuffisance cardiaque ou de maladie rénale chronique : ajouter un **iSGLT2** (ou un aGLP-1) indépendamment de l'HbA1c [1][2] ;
- sinon, bithérapie : iSGLT2, aGLP-1, iDPP-4 selon le profil (poids, hypoglycémies, coût) [1].

**Avant de modifier** : vérifier l'observance, le DFG (metformine : réduire la dose si DFG < 45, arrêter si < 30 [3]), et le contexte (infection, corticoïdes).

**Et le reste du suivi** : fond d'œil annuel, microalbuminurie annuelle, pieds à chaque consultation, LDL selon le risque [1].`,
    docs: [
      HAS("has-dt2-2024", "Stratégie médicamenteuse du contrôle glycémique du diabète de type 2", 2024, "https://www.has-sante.fr/jcms/p_3191229"),
      HAS("has-dt2-parcours", "Guide parcours de soins — Diabète de type 2 de l'adulte", 2014, "https://www.has-sante.fr/jcms/c_1735060"),
      { id: "rcp-metformine", title: "RCP Metformine 1000 mg — Rubrique 4.2 Posologie", year: 2025, source_id: "ANSM", source_name: "ANSM — Base de données publique des médicaments" },
    ],
    rcp: [{ id: "rcp-metformine-4.2", dci: "metformine", cis: "66185592", specialite: "METFORMINE 1000 mg, comprimé", code: "4.2", label: "Posologie et mode d'administration", text: "Le DFG doit être évalué avant l'instauration puis au moins une fois par an. Chez les patients présentant un DFG entre 45 et 59 mL/min, la dose maximale est de 2000 mg/jour ; entre 30 et 44, 1000 mg/jour ; la metformine est contre-indiquée en dessous de 30 mL/min.", source_name: "ANSM" }],
    drugs: [{ dci: "metformine", atc: ["A10BA02"], reference: { cis: "66185592", label: "METFORMINE 1000 mg, comprimé" } }],
  },
  {
    match: /hypertension|hta|tension|amlodipine|ramipril|perindopril/i,
    titre: "HTA : cible et stratégie",
    answer: `# Viser < 140/90 mmHg au cabinet (< 135/85 en automesure), en commençant par une bithérapie à faible dose si la PA initiale est ≥ 160/100

**Confirmer** par automesure (règle des 3) ou MAPA avant tout traitement, sauf urgence [1].

**Première ligne** : IEC ou ARA2 + inhibiteur calcique ou diurétique thiazidique, en un comprimé si possible [1]. Chez le sujet de plus de 80 ans, cible < 150/90 et pas plus de 3 molécules [1].

**Bilan initial** : créatinine et DFG, kaliémie, glycémie, bilan lipidique, protéinurie, ECG [1].

**Réévaluer** à 4 semaines ; non contrôlée à 3 molécules dont un diurétique = HTA résistante, avis spécialisé [1].`,
    docs: [HAS("has-hta-2016", "Prise en charge de l'hypertension artérielle de l'adulte", 2016, "https://www.has-sante.fr/jcms/c_2059286"), { id: "sfhta-2024", title: "Recommandations SFHTA/ESH 2024", year: 2024, source_id: "SFHTA", source_name: "Société française d'HTA" }],
  },
  {
    match: /cystite|urinaire|ecbu|fosfomycine|pivm[eé]cillinam/i,
    titre: "Cystite simple : traitement probabiliste",
    answer: `# Cystite simple de la femme : fosfomycine-trométamol 3 g en dose unique, sans ECBU

**Diagnostic** : bandelette urinaire positive (leucocytes et/ou nitrites) suffit ; pas d'ECBU en cystite simple [1].

**Traitement** [1][2] :
1. fosfomycine-trométamol 3 g dose unique ;
2. sinon pivmécillinam 400 mg ×2/j pendant 3 jours ;
3. en dernier recours (après ECBU) : nitrofurantoïne 100 mg ×3/j, 5 jours.

**Pas de fluoroquinolone** en cystite simple [1]. Pas de contrôle si les symptômes disparaissent.

**Cystite à risque de complication** (grossesse, > 75 ans, insuffisance rénale, immunodépression, uropathie) : ECBU, et traitement différé si possible [1].`,
    docs: [HAS("has-cystite-2021", "Cystite aiguë simple, à risque de complication ou récidivante, de la femme", 2021, "https://www.has-sante.fr/jcms/p_3278304"), { id: "spilf-2017", title: "Infections urinaires communautaires — SPILF / Antibioclic", year: 2017, source_id: "SPILF", source_name: "SPILF" }],
    drugs: [{ dci: "fosfomycine trométamol", atc: ["J01XX01"], reference: { cis: "67317742", label: "FOSFOMYCINE 3 g, granulés pour solution buvable" } }],
  },
  {
    match: /angine|strepto|trod|amoxicilline/i,
    titre: "Angine : TROD puis amoxicilline 6 jours",
    answer: `# Angine : TROD streptococcique chez l'adulte si score de Mac Isaac ≥ 2 ; amoxicilline 6 jours si positif

**Adulte** : score de Mac Isaac ; < 2 : traitement symptomatique seul ; ≥ 2 : TROD [1].
**Enfant ≥ 3 ans** : TROD d'emblée [1].

**TROD positif** : amoxicilline 1 g ×2/j (adulte) ou 50 mg/kg/j en 2 prises (enfant), **6 jours** [1][2].
**Allergie à la pénicilline** : céfuroxime 4 jours ou, en cas d'allergie vraie aux bêta-lactamines, azithromycine 3 jours [1].

Pas de corticoïdes, pas d'AINS [1].`,
    docs: [HAS("has-angine-2021", "Choix et durées d'antibiothérapie — Angine", 2021, "https://www.has-sante.fr/jcms/p_3251956"), { id: "antibioclic-angine", title: "Antibioclic — Angine", year: 2025, source_id: "ANTIBIOCLIC", source_name: "Antibioclic" }],
    drugs: [{ dci: "amoxicilline", atc: ["J01CA04"], reference: { cis: "63296986", label: "AMOXICILLINE 1 g, comprimé dispersible" } }],
  },
  {
    match: /anticoag|fibrillation|fa\b|cha2ds2|apixaban|rivaroxaban/i,
    titre: "Fibrillation atriale : anticoaguler selon CHA₂DS₂-VASc",
    answer: `# Anticoagulation recommandée si CHA₂DS₂-VASc ≥ 2 (homme) ou ≥ 3 (femme) ; AOD en première intention

**Score** : insuffisance cardiaque 1, HTA 1, âge ≥ 75 2, diabète 1, AVC/AIT 2, maladie vasculaire 1, âge 65-74 1, sexe féminin 1 [1].

**AOD** (apixaban, rivaroxaban, dabigatran, edoxaban) en première intention hors valvulopathie mécanique et sténose mitrale [1][2]. Adapter la dose au DFG, au poids et à l'âge (apixaban 2,5 mg ×2 si 2 critères parmi : ≥ 80 ans, ≤ 60 kg, créatinine ≥ 133 µmol/L) [3].

**Évaluer le risque hémorragique** (HAS-BLED) pour corriger les facteurs modifiables, pas pour contre-indiquer [1].`,
    docs: [HAS("has-fa-2014", "Fibrillation auriculaire — Fiche mémo", 2014, "https://www.has-sante.fr/jcms/c_1749500"), { id: "esc-af-2024", title: "ESC Guidelines for the management of atrial fibrillation", year: 2024, source_id: "ESC", source_name: "European Society of Cardiology" }, { id: "rcp-apixaban", title: "RCP Eliquis — 4.2 Posologie", year: 2025, source_id: "ANSM", source_name: "ANSM" }],
    drugs: [{ dci: "apixaban", atc: ["B01AF02"], reference: { cis: "62045256", label: "ELIQUIS 5 mg, comprimé pelliculé" } }],
  },
  {
    match: /d[eé]pression|anxi|antid[eé]presseur|sertraline|escitalopram|humeur/i,
    titre: "Épisode dépressif caractérisé : prise en charge en soins primaires",
    answer: `# Épisode dépressif caractérisé : psychothérapie d'abord si léger ; ISRS si modéré à sévère, réévalué à 4-8 semaines

**Évaluer** la sévérité (PHQ-9), le risque suicidaire à chaque contact, et les comorbidités (anxiété, addictions, troubles bipolaires) [1].

**Léger** : psychothérapie, activité physique, suivi rapproché ; pas d'antidépresseur d'emblée [1].
**Modéré à sévère** : ISRS (sertraline, escitalopram) + psychothérapie ; efficacité jugée à 4-8 semaines ; poursuivre 6 mois à 1 an après rémission [1].

**Orienter** vers le psychiatre si risque suicidaire élevé, résistance, bipolarité suspectée [1]. Le dispositif Mon soutien psy rembourse 12 séances [2].`,
    docs: [HAS("has-depression-2017", "Épisode dépressif caractérisé de l'adulte : prise en charge en soins de premier recours", 2017, "https://www.has-sante.fr/jcms/c_1739917"), { id: "cnam-msp", title: "Mon soutien psy", year: 2025, source_id: "CNAM", source_name: "Assurance Maladie" }],
  },
];

const FALLBACK: Canned = {
  match: /./,
  titre: "Réponse générique (scénario rejoué)",
  answer: `# Cette question sort du scénario rejoué

Le sandbox rejoue des réponses de Locus préparées à l'avance. Celle-ci en imite la forme (un titre qui répond, des points sourcés [1], des renvois vers les RCP) sans en avoir le fond.

Les thèmes couverts par le scénario rejoué : diabète, HTA, cystite, angine, fibrillation atriale, dépression. Les questions libres demandent un accès live.`,
  docs: [HAS("has-generic", "Recommandations de bonne pratique", 2025, "https://www.has-sante.fr")],
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function* simulateRetrieve(req: RetrieveRequest): AsyncGenerator<StudioStreamEvent> {
  const c = CANNED.find((x) => x.match.test(req.query)) ?? FALLBACK;
  const ehr = (req.patient_ehr ?? "").split("\n")[0] ?? "";
  yield { step: "progress", etape: "cadres" };
  await sleep(250);
  yield { step: "reflexion", titre: ehr ? `Je lis le dossier : ${ehr}` : "Je reformule la question" };
  await sleep(350);
  yield { step: "retrieval", docs: c.docs.length, chunks: c.docs.length * 3 };
  yield { step: "progress", etape: "lecture" };
  await sleep(500);
  yield { step: "reflexion", titre: c.titre };
  yield { step: "progress", etape: "formulation" };
  await sleep(400);
  yield { step: "answer", answer: c.answer };
  yield {
    step: "done",
    payload: {
      traceId: "",
      coreVersion: "simulation",
      reformulated: req.query,
      ehrSummary: ehr,
      ehrAdditions: /enceinte|grossesse/i.test(req.query) ? "Grossesse en cours (déclarée en consultation)." : "",
      answer: c.answer,
      answerShort: c.answer.split("\n")[0].replace(/^#\s*/, ""),
      docs: c.docs,
      chunks: [],
      rcp: c.rcp ?? [],
      drugs: c.drugs ?? [],
      via: "simulation",
    },
  };
}

const SPECIALITES: Record<string, RetrieveSpecialite> = {
  "66185592": { cis: "66185592", label: "METFORMINE 1000 mg, comprimé pelliculé", forme: "comprimé pelliculé", voie: "orale", dosage: "1000 mg", atc: ["A10BA02"], n_rubrics: 3, rubrics: [
    { id: "sim-met-4.2", code: "4.2", label: "Posologie et mode d'administration", text: "Adulte à fonction rénale normale : 500 mg ou 850 mg 2 à 3 fois par jour pendant ou après les repas. DFG 45-59 : maximum 2000 mg/j. DFG 30-44 : maximum 1000 mg/j. DFG < 30 : contre-indiqué." },
    { id: "sim-met-4.3", code: "4.3", label: "Contre-indications", text: "Insuffisance rénale sévère (DFG < 30 mL/min). Acidose métabolique aiguë. Toute affection aiguë susceptible d'altérer la fonction rénale (déshydratation, infection grave, choc). Insuffisance hépatique, intoxication alcoolique aiguë." },
    { id: "sim-met-4.5", code: "4.5", label: "Interactions", text: "Produits de contraste iodés : suspendre la metformine avant ou au moment de l'examen, reprendre 48 h après si la fonction rénale est stable. Alcool. Médicaments altérant la fonction rénale (AINS, IEC, ARA2, diurétiques) : surveiller." },
  ] },
  "62045256": { cis: "62045256", label: "ELIQUIS 5 mg, comprimé pelliculé", forme: "comprimé pelliculé", voie: "orale", dosage: "5 mg", atc: ["B01AF02"], n_rubrics: 2, rubrics: [
    { id: "sim-api-4.2", code: "4.2", label: "Posologie", text: "Prévention de l'AVC dans la FA non valvulaire : 5 mg deux fois par jour. Réduire à 2,5 mg deux fois par jour si au moins deux critères : âge ≥ 80 ans, poids ≤ 60 kg, créatininémie ≥ 1,5 mg/dL (133 µmol/L)." },
    { id: "sim-api-4.5", code: "4.5", label: "Interactions", text: "Inhibiteurs puissants du CYP3A4 et de la P-gp (kétoconazole, itraconazole, ritonavir) : déconseillé. AINS, antiagrégants : majoration du risque hémorragique." },
  ] },
  "63296986": { cis: "63296986", label: "AMOXICILLINE 1 g, comprimé dispersible", forme: "comprimé dispersible", voie: "orale", dosage: "1 g", atc: ["J01CA04"], n_rubrics: 2, rubrics: [
    { id: "sim-amx-4.2", code: "4.2", label: "Posologie", text: "Angine à streptocoque A : 1 g deux fois par jour pendant 6 jours (adulte) ; 50 mg/kg/j en 2 prises (enfant). Adapter en cas d'insuffisance rénale (DFG < 30)." },
    { id: "sim-amx-4.3", code: "4.3", label: "Contre-indications", text: "Hypersensibilité à l'amoxicilline, à l'une des pénicillines ou à l'un des excipients. Antécédent de réaction d'hypersensibilité sévère à un autre bêta-lactamine." },
  ] },
};

export function simulateSpecialite(cis: string): RetrieveSpecialite | null {
  return SPECIALITES[cis] ?? null;
}

export function simulateLogic(req: LogicComputeRequest): LogicComputeResponse {
  if (/cha2ds2/i.test(req.mku_key)) {
    const w: Record<string, number> = { ic: 1, hta: 1, age75: 2, diabete: 1, avc: 2, vasculaire: 1, age65: 1, femme: 1 };
    const total = req.checked.reduce((s, k) => s + (w[k] ?? 0), 0);
    const femme = req.checked.includes("femme");
    const seuil = femme ? 3 : 2;
    return { mku_id: "sim", mku_key: req.mku_key, type: "score", titre: "CHA₂DS₂-VASc", computed: { total, outcome: total >= seuil ? "Anticoagulation recommandée" : total >= 1 ? "Anticoagulation à discuter" : "Pas d'anticoagulation", retained: req.checked, reason: `Seuil ${seuil} (${femme ? "femme" : "homme"}).` } };
  }
  if (/findrisc/i.test(req.mku_key)) {
    const total = Object.values(req.answers).reduce((s, v) => s + (Number(v) || 0), 0);
    return { mku_id: "sim", mku_key: req.mku_key, type: "score", titre: "FINDRISC", computed: { total, outcome: total >= 15 ? "Risque élevé : glycémie à jeun / HbA1c" : total >= 12 ? "Risque modéré" : "Risque faible" } };
  }
  return { mku_id: "sim", mku_key: req.mku_key, type: "score", titre: req.mku_key, computed: { total: 0, outcome: "Unité logique inconnue en simulation" }, note: "Simulation : seuls CHA₂DS₂-VASc et FINDRISC sont implémentés." };
}
