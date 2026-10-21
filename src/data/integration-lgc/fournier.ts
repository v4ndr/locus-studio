/**
 * Le dossier fictif de M. Gilles Fournier, tel que MédiCab 7 l'affiche.
 * Patient inventé pour le sandbox « Intégration LGC » : aucune donnée réelle.
 * Le contenu clinique reste en français dans les deux langues de l'UI.
 *
 * `variante: "non-diabetique"` sert au test d'un workflow : même dossier,
 * sans diabète ni HbA1c, pour montrer une condition qui arrête la chaîne.
 */

/** La date de la consultation ouverte dans MédiCab 7. */
export const REF_DATE = "2026-10-20";

export type Variante = "fournier" | "non-diabetique";

export interface Bio { libelle: string; valeur: number; affichage: string; unite?: string; date: string }

export interface DossierLgc {
  nom: string;
  sexe: "Homme" | "Femme";
  age: number;
  naissance: string;
  numero: string;
  medecin: string;
  antecedents: { libelle: string; annee: number }[];
  allergies: { substance: string; reaction: string; annee: number }[];
  traitement: string[];
  ordonnance: { med: string; posologie: string; duree: string }[];
  note: { motif: string; examen: string; conclusion: string; constantes: string[] };
  biologie: Bio[];
  historique: { date: string; libelle: string }[];
}

const BASE: DossierLgc = {
  nom: "M. FOURNIER Gilles",
  sexe: "Homme",
  age: 58,
  naissance: "14/02/1968",
  numero: "004218",
  medecin: "Dr A. Leclerc",
  antecedents: [
    { libelle: "HTA", annee: 2016 },
    { libelle: "Diabète de type 2", annee: 2017 },
    { libelle: "Appendicectomie", annee: 1987 },
  ],
  allergies: [{ substance: "Pénicilline", reaction: "urticaire", annee: 2019 }],
  traitement: ["AMLODIPINE 5 mg, 1 cp/j", "RAMIPRIL 5 mg, 1 cp/j", "METFORMINE 1000 mg, 1 cp matin et soir"],
  ordonnance: [
    { med: "AMOXICILLINE 1 g", posologie: "1 cp matin et soir", duree: "6 jours" },
    { med: "PARACÉTAMOL 1 g", posologie: "1 cp si douleur ou fièvre, 3 par jour au plus", duree: "5 jours" },
  ],
  note: {
    motif: "mal de gorge depuis 2 jours, fièvre.",
    examen: "T° 38,6 °C. Amygdales érythémateuses avec exsudat, adénopathies cervicales sensibles. Pas de toux.",
    conclusion: "angine. TDR à faire.",
    constantes: ["Poids 84 kg", "TA 138/86", "Pouls 92", "T° 38,6"],
  },
  biologie: [
    { libelle: "Créatinine", valeur: 98, affichage: "98 µmol/L", unite: "µmol/L", date: "2025-06-18" },
    { libelle: "DFG (CKD-EPI)", valeur: 72, affichage: "72", unite: "mL/min/1,73 m²", date: "2025-06-18" },
    { libelle: "Kaliémie", valeur: 4.3, affichage: "4,3 mmol/L", unite: "mmol/L", date: "2025-06-18" },
    { libelle: "HbA1c", valeur: 7.6, affichage: "7,6 %", unite: "%", date: "2026-05-12" },
    { libelle: "HbA1c", valeur: 7.1, affichage: "7,1 %", unite: "%", date: "2025-12-10" },
  ],
  historique: [
    { date: "20/10/2026", libelle: "Consultation" },
    { date: "12/03/2026", libelle: "Renouvellement HTA" },
    { date: "04/11/2025", libelle: "Vaccin grippe" },
    { date: "18/06/2025", libelle: "Bilan biologique" },
    { date: "02/02/2025", libelle: "Lombalgie" },
    { date: "19/09/2024", libelle: "Renouvellement HTA" },
    { date: "07/05/2019", libelle: "Urticaire" },
  ],
};

export function dossier(v: Variante = "fournier"): DossierLgc {
  if (v === "fournier") return BASE;
  return {
    ...BASE,
    antecedents: BASE.antecedents.filter((a) => !/diab/i.test(a.libelle)),
    traitement: BASE.traitement.filter((t) => !/metformine/i.test(t)),
    biologie: BASE.biologie.filter((b) => b.libelle !== "HbA1c"),
  };
}

/** Les données qu'une brique peut transmettre, avec la valeur envoyée pour M. Fournier. */
export const FIELD_KEYS = ["age", "sexe", "allergies", "atcd", "ttt", "bio12", "ligne", "note", "bio", "dfg"] as const;
export type FieldKey = (typeof FIELD_KEYS)[number];

export const ANCHOR_IDS = ["pv", "ordo", "sign", "note", "lab", "tb"] as const;
export type AnchorId = (typeof ANCHOR_IDS)[number];

export const FIELDS: Record<FieldKey, { value: string; api: string; only?: AnchorId[] }> = {
  age: { value: "58 ans", api: "age" },
  sexe: { value: "Homme", api: "sex" },
  allergies: { value: "Pénicilline (urticaire, 2019)", api: "allergies" },
  atcd: { value: "HTA (2016), diabète de type 2 (2017), appendicectomie", api: "history" },
  ttt: { value: "Amlodipine 5 mg, ramipril 5 mg, metformine 1000 mg ×2/j", api: "medications" },
  bio12: { value: "HbA1c 7,6 % (12/05/2026), 7,1 % (10/12/2025)", api: "labs_12m", only: ["pv", "lab", "tb"] },
  ligne: { value: "Amoxicilline 1 g ×2/j, 6 jours", api: "draft_order", only: ["ordo", "sign"] },
  note: { value: "Mal de gorge, fièvre 38,6 °C…", api: "note", only: ["note", "ordo", "sign", "tb"] },
  bio: { value: "Créatinine 98 µmol/L (18/06/2025)", api: "last_labs", only: ["lab", "pv", "tb"] },
  dfg: { value: "72 mL/min/1,73 m²", api: "egfr", only: ["lab", "pv", "ordo", "sign", "tb"] },
};

export const fieldsFor = (a: AnchorId): FieldKey[] => FIELD_KEYS.filter((k) => !FIELDS[k].only || FIELDS[k].only!.includes(a));

/** Les données cochées par défaut selon le point d'injection. */
export function defaultFields(a: AnchorId, workflow = false): FieldKey[] {
  const f = new Set<FieldKey>(["allergies", "ttt"]);
  if (a === "ordo" || a === "sign") f.add("ligne");
  if (a === "note") { f.add("note"); f.add("age"); }
  if (a === "lab") { f.add("bio"); f.add("dfg"); }
  if (a === "pv") { f.add("age"); f.add("atcd"); }
  if (a === "tb") { f.add("age"); f.add("note"); }
  if (workflow) for (const k of fieldsFor(a)) if (k === "atcd" || k === "bio12") f.add(k);
  return FIELD_KEYS.filter((k) => f.has(k) && fieldsFor(a).includes(k));
}

/**
 * Le texte `patient_ehr` envoyé à core : seulement les champs transmis par la
 * brique, valeurs du dossier fictif, sans nom ni identifiant (pseudonymisé).
 */
export function patientEhr(fields: readonly FieldKey[], v: Variante = "fournier"): string {
  const d = dossier(v);
  const lines: string[] = [];
  const has = (k: FieldKey) => fields.includes(k);
  if (has("age") || has("sexe")) lines.push(`${has("sexe") ? d.sexe : "Patient"}${has("age") ? `, ${d.age} ans` : ""}.`);
  if (has("atcd")) lines.push(`Antécédents : ${d.antecedents.map((a) => `${a.libelle} (${a.annee})`).join(" ; ")}.`);
  if (has("allergies")) lines.push(`Allergies : ${d.allergies.map((a) => `${a.substance} (${a.reaction}, ${a.annee})`).join(", ")}.`);
  if (has("ttt")) lines.push(`Traitement en cours : ${d.traitement.join(" ; ")}.`);
  if (has("ligne")) lines.push(`Prescription en cours : ${d.ordonnance.map((o) => `${o.med}, ${o.posologie}, ${o.duree}`).join(" ; ")}.`);
  if (has("note")) lines.push(`Consultation du jour : ${d.note.motif} ${d.note.examen} ${d.note.conclusion}`);
  const hba = d.biologie.filter((b) => b.libelle === "HbA1c");
  if (has("bio12") && hba.length) lines.push(`Biologie des 12 derniers mois : ${hba.map((b) => `HbA1c ${b.affichage} (${frDate(b.date)})`).join(", ")}.`);
  if (has("bio")) lines.push(`Dernière biologie (18/06/2025) : créatinine 98 µmol/L, kaliémie 4,3 mmol/L.`);
  if (has("dfg")) lines.push(`DFG (CKD-EPI) : 72 mL/min/1,73 m².`);
  return lines.join("\n");
}

export const frDate = (iso: string) => iso.split("-").reverse().join("/");

/** Mois pleins entre une date ISO et la consultation. */
export function moisDepuis(iso: string, ref = REF_DATE): number {
  const [y1, m1, d1] = iso.split("-").map(Number);
  const [y2, m2, d2] = ref.split("-").map(Number);
  let m = (y2 - y1) * 12 + (m2 - m1);
  if (d2 < d1) m -= 1;
  return Math.max(0, m);
}
