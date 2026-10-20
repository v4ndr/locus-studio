import type { Lang } from "@/i18n/config";

/**
 * Les scénarios rejoués du chatbot sourcé : une question de médecin
 * généraliste, la réponse d'un RAG simple et celle de Locus, avec les
 * variantes que les réglages produisent (élicitation, désambiguïsation,
 * sources, format, mode approfondi).
 *
 * Contenu médical à faire relire par Pascal avant mise en ligne. Les sources
 * sont citées par leur titre ; les réponses restent prudentes et générales.
 * Aucun appel réseau : tout est calculé ici, à partir des réglages.
 */

export type SourceKey = "has" | "ansm";
export type AlertKind = "ci" | "risk" | "nv" | "missing";

export interface Settings {
  elic: boolean;
  desamb: boolean;
  deep: boolean;
  reason: boolean;
  inline: boolean;
  has: boolean;
  ansm: boolean;
  court: boolean;
}

export const DEFAULT_SETTINGS: Settings = { elic: false, desamb: false, deep: false, reason: true, inline: false, has: true, ansm: true, court: true };

export interface Choice { key: string; label: string }
export interface Clarification { question: string; options: Choice[] }
export interface Point { text: string; cite: SourceKey[] }

export interface ReplayAnswer {
  alert: AlertKind | null;
  verdict: string;
  why: string;
  points: Point[];
  /** Mode approfondi : une vérification de plus, affichée à part. */
  also?: { text: string; cite: SourceKey[] };
}

export interface Picks { desamb?: string; elic?: string }

export interface Scenario {
  id: string;
  suggestion: Record<Lang, string>;
  question: Record<Lang, string>;
  rag: Record<Lang, { paras: string[]; cite: string }>;
  sources: Record<Lang, Record<SourceKey, string>>;
  desamb?: Record<Lang, Clarification>;
  elic?: Record<Lang, Clarification>;
  answer: (s: Settings, p: Picks, lang: Lang) => ReplayAnswer;
  steps: (s: Settings, p: Picks, lang: Lang) => string[];
}

const pick = <T,>(arr: T[], court: boolean, n: number) => (court ? arr.slice(0, n) : arr);
const labelOf = (c: Clarification | undefined, key: string | undefined) => c?.options.find((o) => o.key === key)?.label;

/* ------------------------------------------------------------------ */
/* 1. Kétoprofène sous IEC et furosémide à 74 ans (maquette validée)    */
/* ------------------------------------------------------------------ */

const KETO_T = {
  fr: {
    noansm: ["Prudence, l'interaction n'a pas pu être vérifiée.", "La source des RCP est désactivée : Locus ne peut pas confirmer les interactions avec le ramipril et le furosémide.", ["Réactivez la source ANSM pour une réponse complète."]],
    gel: ["Le gel est une option, avec précautions.", "Le passage systémique du kétoprofène en gel est faible, mais les AINS topiques exposent à une photosensibilisation.", ["Pas d'exposition au soleil pendant le traitement et 2 semaines après.", "Durée courte, sur peau saine."]],
    lt30: ["Non, contre-indiqué.", "Les AINS sont contre-indiqués en cas d'insuffisance rénale sévère.", ["Pas d'AINS par voie générale.", "Maintien de l'activité, réévaluation à 2 semaines."]],
    inconnu: ["Pas avant de connaître sa fonction rénale.", "Sous IEC et diurétique, un AINS expose à une insuffisance rénale aiguë.", ["Doser la créatinine avant toute prescription d'AINS.", "En attendant, maintien de l'activité."]],
    why: "Un AINS associé à un IEC et à un diurétique expose à une insuffisance rénale aiguë, surtout chez le sujet âgé.",
    avoid: "À éviter.",
    risk: "Possible, mais à risque.",
    long: ["Si un AINS reste nécessaire : dose minimale efficace, durée la plus courte, au cours des repas.", "Hydratation correcte ; suspendre l'AINS en cas de déshydratation (fièvre, diarrhée, vomissements).", "Créatinine contrôlée en début de traitement.", "Maintien de l'activité recommandé dans la lombalgie commune ; réévaluation à 2 semaines."],
    short: ["Si un AINS reste nécessaire : dose minimale efficace, durée la plus courte.", "Hydratation correcte, créatinine contrôlée en début de traitement.", "Maintien de l'activité recommandé dans la lombalgie commune."],
    also: "pas d'autre AINS ni d'aspirine à dose antalgique dans le traitement en cours ; kaliémie à contrôler avec la créatinine.",
    st: { mol: "Molécule : kétoprofène", gel: ", gel", oral: ", voie orale", tt: "Traitements en cours : ramipril (IEC), furosémide (diurétique de l'anse)", rcp: "Interactions recherchées dans les RCP : AINS, IEC, diurétique", norcp: "RCP non consultés (source désactivée)", reco: "Recommandation : lombalgie commune", noreco: "Recommandations non consultées (source désactivée)", age: "Terrain : 74 ans", dfg: ", DFG ", nodfg: ", fonction rénale non précisée" },
  },
  en: {
    noansm: ["Caution, the interaction could not be checked.", "The SmPC source is turned off: Locus cannot confirm interactions with ramipril and furosemide.", ["Turn the ANSM source back on for a complete answer."]],
    gel: ["The gel is an option, with precautions.", "Systemic absorption of ketoprofen gel is low, but topical NSAIDs carry a photosensitivity risk.", ["No sun exposure during treatment and for 2 weeks after.", "Short course, on intact skin."]],
    lt30: ["No, contraindicated.", "NSAIDs are contraindicated in severe renal impairment.", ["No systemic NSAIDs.", "Stay active, reassess at 2 weeks."]],
    inconnu: ["Not before knowing the renal function.", "With an ACE inhibitor and a diuretic, an NSAID carries a risk of acute kidney injury.", ["Check creatinine before any NSAID prescription.", "Meanwhile, stay active."]],
    why: "An NSAID combined with an ACE inhibitor and a diuretic carries a risk of acute kidney injury, especially in older patients.",
    avoid: "Avoid.",
    risk: "Possible, but risky.",
    long: ["If an NSAID is still needed: lowest effective dose, shortest duration, with meals.", "Adequate hydration; stop the NSAID if dehydrated (fever, diarrhoea, vomiting).", "Creatinine checked at start of treatment.", "Staying active is recommended in common low back pain; reassess at 2 weeks."],
    short: ["If an NSAID is still needed: lowest effective dose, shortest duration.", "Adequate hydration, creatinine checked at start of treatment.", "Staying active is recommended in common low back pain."],
    also: "no other NSAID or analgesic-dose aspirin in current treatment; check potassium along with creatinine.",
    st: { mol: "Drug: ketoprofen", gel: ", gel", oral: ", oral", tt: "Current treatment: ramipril (ACE inhibitor), furosemide (loop diuretic)", rcp: "Interactions searched in the SmPC: NSAID, ACE inhibitor, diuretic", norcp: "SmPC not consulted (source turned off)", reco: "Guideline: common low back pain", noreco: "Guidelines not consulted (source turned off)", age: "Patient: 74 years old", dfg: ", eGFR ", nodfg: ", renal function not specified" },
  },
};

const keto: Scenario = {
  id: "ketoprofene",
  suggestion: { fr: "Kétoprofène sous IEC et furosémide à 74 ans ?", en: "Ketoprofen with an ACE inhibitor and furosemide at 74?" },
  question: {
    fr: "Patient de 74 ans sous ramipril et furosémide, lombalgie aiguë depuis 3 jours. Je peux lui prescrire du kétoprofène ?",
    en: "74-year-old patient on ramipril and furosemide, acute low back pain for 3 days. Can I prescribe ketoprofen?",
  },
  rag: {
    fr: { paras: ["Dans la lombalgie aiguë, le kétoprofène peut être prescrit à 100 mg deux fois par jour, au cours des repas, sur une durée courte.", "Chez le sujet âgé, associer un inhibiteur de la pompe à protons. En cas d'insuffisance rénale, adapter la posologie."], cite: "HAS · Lombalgie commune, 2019" },
    en: { paras: ["In acute low back pain, ketoprofen can be prescribed at 100 mg twice daily with meals, for a short period.", "In older patients, add a proton pump inhibitor. In renal impairment, adjust the dose."], cite: "HAS · Common low back pain, 2019" },
  },
  sources: {
    fr: { has: "HAS · Lombalgie commune, 2019", ansm: "ANSM · RCP kétoprofène, interactions" },
    en: { has: "HAS · Common low back pain, 2019", ansm: "ANSM · Ketoprofen SmPC, interactions" },
  },
  desamb: {
    fr: { question: "Kétoprofène par voie orale ou en gel ?", options: [{ key: "oral", label: "Voie orale" }, { key: "gel", label: "Gel" }] },
    en: { question: "Oral ketoprofen or gel?", options: [{ key: "oral", label: "Oral" }, { key: "gel", label: "Gel" }] },
  },
  elic: {
    fr: { question: "Quel est son DFG ?", options: [{ key: "ge60", label: "≥ 60" }, { key: "30-59", label: "30 à 59" }, { key: "lt30", label: "< 30" }, { key: "inconnu", label: "Inconnu" }] },
    en: { question: "What is the eGFR?", options: [{ key: "ge60", label: "≥ 60" }, { key: "30-59", label: "30 to 59" }, { key: "lt30", label: "< 30" }, { key: "inconnu", label: "Unknown" }] },
  },
  answer(s, p, lang) {
    const t = KETO_T[lang];
    const pts = (arr: string[], cites: SourceKey[][]): Point[] => arr.map((text, i) => ({ text, cite: cites[i] ?? [] }));
    if (!s.ansm) { const [v, w, l] = t.noansm as [string, string, string[]]; return { alert: "nv", verdict: v, why: w, points: pts(l, []) }; }
    if (s.desamb && p.desamb === "gel") { const [v, w, l] = t.gel as [string, string, string[]]; return { alert: null, verdict: v, why: w, points: pts(l, [["ansm"], ["ansm"]]) }; }
    if (s.elic && p.elic === "lt30") { const [v, w, l] = t.lt30 as [string, string, string[]]; return { alert: "ci", verdict: v, why: w, points: pts(l, [["ansm"], ["has"]]), also: s.deep ? { text: t.also, cite: ["ansm"] } : undefined }; }
    if (s.elic && p.elic === "inconnu") { const [v, w, l] = t.inconnu as [string, string, string[]]; return { alert: "risk", verdict: v, why: w, points: pts(l, [["ansm"], ["has"]]), also: s.deep ? { text: t.also, cite: ["ansm"] } : undefined }; }
    const list = s.court ? t.short : t.long;
    const cites: SourceKey[][] = s.court ? [["ansm"], ["ansm"], ["has"]] : [["ansm"], ["ansm"], ["ansm"], ["has"]];
    return { alert: "risk", verdict: s.elic && p.elic === "30-59" ? t.avoid : t.risk, why: t.why, points: pts(list, cites), also: s.deep ? { text: t.also, cite: ["ansm"] } : undefined };
  },
  steps(s, p, lang) {
    const st = KETO_T[lang].st;
    const dfg = s.elic ? labelOf(this.elic?.[lang], p.elic) : undefined;
    const voie = s.desamb ? p.desamb : undefined;
    return [
      st.mol + (voie === "gel" ? st.gel : voie === "oral" ? st.oral : ""),
      st.tt,
      s.ansm ? st.rcp : st.norcp,
      s.has ? st.reco : st.noreco,
      st.age + (dfg ? st.dfg + dfg : st.nodfg),
    ];
  },
};

/* ------------------------------------------------------------------ */
/* 2. Cible de LDL-c après un infarctus                                 */
/* ------------------------------------------------------------------ */

const LDL_T = {
  fr: {
    missing: ["Pas de cible sans les recommandations HAS.", "Les RCP décrivent les statines, mais ne fixent pas de cible de LDL-c après un infarctus.", "Réactivez la source HAS pour une réponse complète."],
    base: {
      verdict: "Cible : LDL-c inférieur à 0,70 g/L (1,8 mmol/L).",
      why: "Après un infarctus, le risque cardiovasculaire est très élevé : la statine est débutée d'emblée, avec les mesures hygiéno-diététiques, sans attendre leur effet.",
      points: [
        "Statine de forte intensité d'emblée (par exemple atorvastatine 40 à 80 mg).",
        "Bilan lipidique de contrôle 8 semaines après l'instauration ou toute modification.",
        "Cible non atteinte à la dose maximale tolérée : associer l'ézétimibe.",
        "Transaminases avant et après l'instauration ; CPK seulement en cas de symptômes musculaires ou de facteurs de risque.",
        "Vérifier l'observance avant toute intensification.",
      ],
    },
    aucun: { verdict: "Débuter une statine de forte intensité, cible LDL-c inférieure à 0,70 g/L." },
    statine: {
      verdict: "Cible inférieure à 0,70 g/L : ajouter l'ézétimibe si elle n'est pas atteinte.",
      why: "Sous statine de forte intensité, l'étape suivante est l'association à l'ézétimibe, après vérification de l'observance et de la tolérance.",
      points: ["Contrôler l'observance et la tolérance de la statine.", "Si le LDL-c reste à 0,70 g/L ou plus à dose maximale tolérée : ézétimibe 10 mg par jour en association.", "Nouveau bilan lipidique 8 semaines après l'ajout."],
    },
    combo: {
      verdict: "Cible inférieure à 0,70 g/L ; si elle n'est pas atteinte sous association, avis spécialisé.",
      why: "Si le LDL-c reste au-dessus de la cible sous statine à dose maximale tolérée et ézétimibe, la suite relève d'un avis cardiologique ou d'un spécialiste des lipides.",
      points: ["Vérifier l'observance des deux traitements.", "Adresser pour avis spécialisé si la cible n'est pas atteinte.", "Poursuivre les mesures hygiéno-diététiques et la prise en charge des autres facteurs de risque."],
    },
    also: "le risque musculaire des statines est majoré par certaines associations (fibrates, clarithromycine, antifongiques azolés), à rechercher dans le traitement en cours.",
    st: { sit: "Situation : prévention secondaire après infarctus, risque très élevé", tt: "Traitement hypolipémiant : ", nott: "non précisé", reco: "Recommandation : prise en charge des dyslipidémies", noreco: "Recommandations non consultées (source désactivée)", rcp: "RCP consultés : atorvastatine, ézétimibe", norcp: "RCP non consultés (source désactivée)", cible: "Cible retenue : LDL-c < 0,70 g/L" },
  },
  en: {
    missing: ["No target without the HAS guidelines.", "The SmPCs describe statins but do not set an LDL-c target after a myocardial infarction.", "Turn the HAS source back on for a complete answer."],
    base: {
      verdict: "Target: LDL-c below 0.70 g/L (1.8 mmol/L).",
      why: "After a myocardial infarction, cardiovascular risk is very high: start a statin straight away, alongside lifestyle measures, without waiting for their effect.",
      points: [
        "High-intensity statin from the start (for example atorvastatin 40 to 80 mg).",
        "Lipid panel 8 weeks after starting or after any change.",
        "Target not reached at the maximum tolerated dose: add ezetimibe.",
        "Transaminases before and after starting; CK only with muscle symptoms or risk factors.",
        "Check adherence before any intensification.",
      ],
    },
    aucun: { verdict: "Start a high-intensity statin, LDL-c target below 0.70 g/L." },
    statine: {
      verdict: "Target below 0.70 g/L: add ezetimibe if it is not reached.",
      why: "On a high-intensity statin, the next step is to add ezetimibe, after checking adherence and tolerance.",
      points: ["Check statin adherence and tolerance.", "If LDL-c stays at 0.70 g/L or above at the maximum tolerated dose: add ezetimibe 10 mg daily.", "New lipid panel 8 weeks after adding it."],
    },
    combo: {
      verdict: "Target below 0.70 g/L; if not reached on the combination, seek specialist advice.",
      why: "If LDL-c stays above target on a maximum tolerated statin plus ezetimibe, the next step is a cardiology or lipid specialist opinion.",
      points: ["Check adherence to both drugs.", "Refer for specialist advice if the target is not reached.", "Continue lifestyle measures and management of other risk factors."],
    },
    also: "the muscle risk of statins is increased by some combinations (fibrates, clarithromycin, azole antifungals), to look for in current treatment.",
    st: { sit: "Situation: secondary prevention after myocardial infarction, very high risk", tt: "Lipid-lowering treatment: ", nott: "not specified", reco: "Guideline: management of dyslipidaemia", noreco: "Guidelines not consulted (source turned off)", rcp: "SmPC consulted: atorvastatin, ezetimibe", norcp: "SmPC not consulted (source turned off)", cible: "Target: LDL-c < 0.70 g/L" },
  },
};

const ldl: Scenario = {
  id: "ldl-infarctus",
  suggestion: { fr: "Cible de LDL-c après un infarctus ?", en: "LDL-c target after a myocardial infarction?" },
  question: {
    fr: "Patient de 58 ans, infarctus du myocarde il y a deux mois. Quelle cible de LDL-c viser, et comment l'atteindre ?",
    en: "58-year-old patient, myocardial infarction two months ago. Which LDL-c target, and how to reach it?",
  },
  rag: {
    fr: { paras: ["L'objectif de LDL-c dépend du niveau de risque cardiovasculaire : moins de 1,9 g/L si le risque est faible, 1,3 g/L s'il est modéré, 1,0 g/L s'il est élevé et 0,7 g/L s'il est très élevé.", "La prise en charge repose d'abord sur les modifications du mode de vie pendant 3 mois ; une statine est introduite si l'objectif n'est pas atteint."], cite: "HAS · Principales dyslipidémies, 2017" },
    en: { paras: ["The LDL-c target depends on cardiovascular risk: below 1.9 g/L if risk is low, 1.3 g/L if moderate, 1.0 g/L if high and 0.7 g/L if very high.", "Management starts with lifestyle changes for 3 months; a statin is added if the target is not reached."], cite: "HAS · Main dyslipidaemias, 2017" },
  },
  sources: {
    fr: { has: "HAS · Principales dyslipidémies, 2017", ansm: "ANSM · RCP atorvastatine, ézétimibe" },
    en: { has: "HAS · Main dyslipidaemias, 2017", ansm: "ANSM · Atorvastatin, ezetimibe SmPC" },
  },
  elic: {
    fr: { question: "Quel traitement hypolipémiant reçoit-il ?", options: [{ key: "aucun", label: "Aucun" }, { key: "statine", label: "Statine forte intensité" }, { key: "combo", label: "Statine + ézétimibe" }] },
    en: { question: "Which lipid-lowering treatment is he on?", options: [{ key: "aucun", label: "None" }, { key: "statine", label: "High-intensity statin" }, { key: "combo", label: "Statin + ezetimibe" }] },
  },
  answer(s, p, lang) {
    const t = LDL_T[lang];
    if (!s.has) return { alert: "missing", verdict: t.missing[0], why: t.missing[1], points: [{ text: t.missing[2], cite: [] }] };
    const rcp: SourceKey[] = s.ansm ? ["has", "ansm"] : ["has"];
    const also = s.deep && s.ansm ? { text: t.also, cite: ["ansm"] as SourceKey[] } : undefined;
    const e = s.elic ? p.elic : undefined;
    if (e === "statine") return { alert: null, verdict: t.statine.verdict, why: t.statine.why, points: pick(t.statine.points.map((text, i) => ({ text, cite: i === 1 ? rcp : ["has"] as SourceKey[] })), s.court, 2), also };
    if (e === "combo") return { alert: null, verdict: t.combo.verdict, why: t.combo.why, points: pick(t.combo.points.map((text) => ({ text, cite: ["has"] as SourceKey[] })), s.court, 2), also };
    const cites: SourceKey[][] = [rcp, ["has"], ["has"], rcp, ["has"]];
    return { alert: null, verdict: e === "aucun" ? t.aucun.verdict : t.base.verdict, why: t.base.why, points: pick(t.base.points.map((text, i) => ({ text, cite: cites[i] })), s.court, 3), also };
  },
  steps(s, p, lang) {
    const st = LDL_T[lang].st;
    const tt = s.elic ? labelOf(this.elic?.[lang], p.elic) : undefined;
    const out = [st.sit, st.tt + (tt ?? st.nott), s.has ? st.reco : st.noreco, s.ansm ? st.rcp : st.norcp];
    if (s.has) out.push(st.cible);
    return out;
  },
};

/* ------------------------------------------------------------------ */
/* 3. Angine et allergie à la pénicilline                                */
/* ------------------------------------------------------------------ */

const ANG_T = {
  fr: {
    missing: ["Pas de conduite à tenir sans les recommandations HAS.", "Les RCP décrivent chaque antibiotique, mais pas la stratégie dans l'angine ni le choix en cas d'allergie.", "Réactivez la source HAS pour une réponse complète."],
    neg: { verdict: "Pas d'antibiotique.", why: "Chez l'adulte, un TDR négatif ne justifie pas d'antibiothérapie : traitement symptomatique.", points: ["Antalgique et antipyrétique, par exemple paracétamol.", "Réévaluer en cas de persistance ou d'aggravation des symptômes."] },
    nd: { verdict: "D'abord le TDR.", why: "Chez l'adulte, le TDR est réalisé si le score de Mac Isaac est d'au moins 2 ; seul un TDR positif justifie un antibiotique.", points: ["Calculer le score de Mac Isaac.", "Score de 2 ou plus : TDR, et antibiotique seulement s'il est positif.", "Score inférieur à 2 : ni TDR ni antibiotique."] },
    si: ", si le TDR est positif",
    tdrPoint: "Antibiotique seulement si le TDR est positif.",
    peni: { verdict: "Céphalosporine orale", why: "Allergie aux pénicillines sans allergie aux céphalosporines : céphalosporine de 2e ou 3e génération.", points: ["Céfuroxime-axétil 250 mg deux fois par jour, 4 jours.", "Ou cefpodoxime 100 mg deux fois par jour, 5 jours.", "Ou céfotiam 200 mg deux fois par jour, 5 jours."] },
    all: { verdict: "Macrolide", why: "Contre-indication à toutes les bêtalactamines : un macrolide.", points: ["Azithromycine 500 mg par jour, 3 jours.", "Ou clarithromycine 250 mg deux fois par jour, 5 jours.", "Ou josamycine 1 g deux fois par jour, 5 jours."] },
    cond: { verdict: "Selon le type d'allergie", why: "Une allergie aux pénicillines n'exclut pas toujours les céphalosporines : le choix en dépend.", points: ["Pénicillines seules : céfuroxime-axétil 250 mg deux fois par jour, 4 jours.", "Toutes les bêtalactamines : azithromycine 500 mg par jour, 3 jours.", "Préciser la nature de l'allergie dans le dossier."] },
    alsoMacro: "avant un macrolide, interactions (la clarithromycine inhibe le CYP3A4) et risque d'allongement du QT à rechercher dans le traitement en cours.",
    alsoCeph: "le céfuroxime-axétil se prend au cours d'un repas, pour une meilleure absorption.",
    st: { inf: "Situation : angine aiguë de l'adulte", all: "Allergie : ", noall: "type non précisé", tdr: "TDR : ", notdr: "résultat non précisé", reco: "Recommandation : antibiothérapie de l'angine", noreco: "Recommandations non consultées (source désactivée)", rcp: "RCP consultés : céphalosporines orales, macrolides", norcp: "RCP non consultés (source désactivée)" },
  },
  en: {
    missing: ["No course of action without the HAS guidelines.", "The SmPCs describe each antibiotic, but not the strategy in sore throat nor the choice in allergy.", "Turn the HAS source back on for a complete answer."],
    neg: { verdict: "No antibiotic.", why: "In adults, a negative rapid strep test does not justify antibiotics: symptomatic treatment.", points: ["Analgesic and antipyretic, for example paracetamol.", "Reassess if symptoms persist or worsen."] },
    nd: { verdict: "Rapid strep test first.", why: "In adults, the rapid test is done if the McIsaac score is at least 2; only a positive test justifies an antibiotic.", points: ["Calculate the McIsaac score.", "Score of 2 or more: rapid test, and an antibiotic only if positive.", "Score below 2: no test, no antibiotic."] },
    si: ", if the rapid strep test is positive",
    tdrPoint: "Antibiotic only if the rapid strep test is positive.",
    peni: { verdict: "Oral cephalosporin", why: "Penicillin allergy without cephalosporin allergy: 2nd or 3rd generation cephalosporin.", points: ["Cefuroxime axetil 250 mg twice daily, 4 days.", "Or cefpodoxime 100 mg twice daily, 5 days.", "Or cefotiam 200 mg twice daily, 5 days."] },
    all: { verdict: "Macrolide", why: "Contraindication to all beta-lactams: a macrolide.", points: ["Azithromycin 500 mg daily, 3 days.", "Or clarithromycin 250 mg twice daily, 5 days.", "Or josamycin 1 g twice daily, 5 days."] },
    cond: { verdict: "Depends on the type of allergy", why: "A penicillin allergy does not always rule out cephalosporins: the choice depends on it.", points: ["Penicillins only: cefuroxime axetil 250 mg twice daily, 4 days.", "All beta-lactams: azithromycin 500 mg daily, 3 days.", "Record the nature of the allergy in the chart."] },
    alsoMacro: "before a macrolide, look for interactions (clarithromycin inhibits CYP3A4) and QT prolongation risk in current treatment.",
    alsoCeph: "cefuroxime axetil is taken with a meal, for better absorption.",
    st: { inf: "Situation: acute sore throat in an adult", all: "Allergy: ", noall: "type not specified", tdr: "Rapid strep test: ", notdr: "result not specified", reco: "Guideline: antibiotics in sore throat", noreco: "Guidelines not consulted (source turned off)", rcp: "SmPC consulted: oral cephalosporins, macrolides", norcp: "SmPC not consulted (source turned off)" },
  },
};

const angine: Scenario = {
  id: "angine-allergie",
  suggestion: { fr: "Angine et allergie à la pénicilline : quel antibiotique ?", en: "Sore throat with penicillin allergy: which antibiotic?" },
  question: {
    fr: "Femme de 32 ans, angine depuis 2 jours, se dit allergique à la pénicilline. Quel antibiotique prescrire ?",
    en: "32-year-old woman, sore throat for 2 days, reports a penicillin allergy. Which antibiotic should I prescribe?",
  },
  rag: {
    fr: { paras: ["En cas d'allergie à la pénicilline, un macrolide est l'alternative : azithromycine 500 mg par jour pendant 3 jours.", "La durée de traitement de l'angine à streptocoque est de 6 jours avec l'amoxicilline."], cite: "HAS · Angine, antibiothérapie, 2016" },
    en: { paras: ["In penicillin allergy, a macrolide is the alternative: azithromycin 500 mg daily for 3 days.", "Treatment of strep throat lasts 6 days with amoxicillin."], cite: "HAS · Sore throat, antibiotics, 2016" },
  },
  sources: {
    fr: { has: "HAS · Angine, antibiothérapie, 2016", ansm: "ANSM · RCP céfuroxime, azithromycine" },
    en: { has: "HAS · Sore throat, antibiotics, 2016", ansm: "ANSM · Cefuroxime, azithromycin SmPC" },
  },
  desamb: {
    fr: { question: "Allergie aux pénicillines seules, ou à toutes les bêtalactamines ?", options: [{ key: "peni", label: "Pénicillines seules" }, { key: "all", label: "Toutes les bêtalactamines" }] },
    en: { question: "Allergy to penicillins only, or to all beta-lactams?", options: [{ key: "peni", label: "Penicillins only" }, { key: "all", label: "All beta-lactams" }] },
  },
  elic: {
    fr: { question: "Résultat du TDR streptococcique ?", options: [{ key: "pos", label: "Positif" }, { key: "neg", label: "Négatif" }, { key: "nd", label: "Non réalisé" }] },
    en: { question: "Rapid strep test result?", options: [{ key: "pos", label: "Positive" }, { key: "neg", label: "Negative" }, { key: "nd", label: "Not done" }] },
  },
  answer(s, p, lang) {
    const t = ANG_T[lang];
    if (!s.has) return { alert: "missing", verdict: t.missing[0], why: t.missing[1], points: [{ text: t.missing[2], cite: [] }] };
    const rcp: SourceKey[] = s.ansm ? ["has", "ansm"] : ["has"];
    const e = s.elic ? p.elic : undefined;
    if (e === "neg") return { alert: null, verdict: t.neg.verdict, why: t.neg.why, points: t.neg.points.map((text) => ({ text, cite: ["has"] as SourceKey[] })) };
    if (e === "nd") return { alert: null, verdict: t.nd.verdict, why: t.nd.why, points: t.nd.points.map((text) => ({ text, cite: ["has"] as SourceKey[] })) };
    const d = s.desamb ? p.desamb : undefined;
    const block = d === "peni" ? t.peni : d === "all" ? t.all : t.cond;
    const sure = e === "pos";
    const verdict = block.verdict + (sure ? "." : `${t.si}.`);
    let points: Point[] = block.points.map((text) => ({ text, cite: rcp }));
    if (d !== "peni" && d !== "all") points[2] = { text: block.points[2], cite: ["has"] };
    points = pick(points, s.court, 2);
    if (!sure) points.push({ text: t.tdrPoint, cite: ["has"] });
    const also = s.deep && s.ansm ? { text: d === "peni" ? t.alsoCeph : t.alsoMacro, cite: ["ansm"] as SourceKey[] } : undefined;
    return { alert: null, verdict, why: block.why, points, also };
  },
  steps(s, p, lang) {
    const st = ANG_T[lang].st;
    const all = s.desamb ? labelOf(this.desamb?.[lang], p.desamb) : undefined;
    const tdr = s.elic ? labelOf(this.elic?.[lang], p.elic) : undefined;
    return [st.inf, st.all + (all ?? st.noall), st.tdr + (tdr ?? st.notdr), s.has ? st.reco : st.noreco, s.ansm ? st.rcp : st.norcp];
  },
};

export const SCENARIOS: Scenario[] = [keto, ldl, angine];

/** Les clarifications à poser pour ces réglages (avant la réponse). */
export function pendingClarifications(sc: Scenario, s: Settings, p: Picks) {
  const desamb = s.desamb && sc.desamb && !p.desamb;
  const elic = s.elic && sc.elic && !p.elic;
  return { desamb: !!desamb, elic: !!elic, done: !desamb && !elic };
}

/** Les sources affichées sous la réponse, numérotées dans l'ordre de première citation. */
export function citedSources(a: ReplayAnswer, s: Settings): SourceKey[] {
  const out: SourceKey[] = [];
  const add = (k: SourceKey) => { if (s[k] && !out.includes(k)) out.push(k); };
  for (const p of a.points) p.cite.forEach(add);
  a.also?.cite.forEach(add);
  return out;
}
