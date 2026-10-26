/**
 * Le dossier fictif de M. Gilles Fournier, tel que MédiCab 7 l'affiche.
 * Patient inventé pour le sandbox « Intégration LGC » : aucune donnée réelle.
 * Le contenu clinique reste en français dans les deux langues de l'UI.
 */

/** La date de la consultation ouverte dans MédiCab 7. */
export const REF_DATE = "2026-10-20";

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

export const dossier = (): DossierLgc => BASE;

/** Les données qu'une brique peut transmettre, avec la valeur envoyée pour M. Fournier. */
export const FIELD_KEYS = ["age", "sexe", "allergies", "atcd", "ttt", "bio12", "ligne", "note", "bio", "dfg"] as const;
export type FieldKey = (typeof FIELD_KEYS)[number];

/** Les points d'injection retenus : ceux où une brique a toujours quelque chose de juste à dire. */
export const ANCHOR_IDS = ["pv", "ordo", "note", "tb"] as const;
export type AnchorId = (typeof ANCHOR_IDS)[number];

export const FIELDS: Record<FieldKey, { value: string; api: string; only?: AnchorId[] }> = {
  age: { value: "58 ans", api: "age" },
  sexe: { value: "Homme", api: "sex" },
  allergies: { value: "Pénicilline (urticaire, 2019)", api: "allergies" },
  atcd: { value: "HTA (2016), diabète de type 2 (2017), appendicectomie", api: "history" },
  ttt: { value: "Amlodipine 5 mg, ramipril 5 mg, metformine 1000 mg ×2/j", api: "medications" },
  bio12: { value: "HbA1c 7,6 % (12/05/2026), 7,1 % (10/12/2025)", api: "labs_12m", only: ["pv", "tb"] },
  ligne: { value: "Amoxicilline 1 g ×2/j 6 j ; paracétamol 1 g", api: "draft_order", only: ["ordo"] },
  note: { value: "Mal de gorge, fièvre 38,6 °C…", api: "note", only: ["note", "ordo", "tb"] },
  bio: { value: "Créatinine 98 µmol/L, kaliémie 4,3 mmol/L (18/06/2025)", api: "last_labs", only: ["pv", "tb"] },
  dfg: { value: "72 mL/min/1,73 m² (18/06/2025)", api: "egfr" },
};

export const fieldsFor = (a: AnchorId): FieldKey[] => FIELD_KEYS.filter((k) => !FIELDS[k].only || FIELDS[k].only!.includes(a));

/** Les données cochées par défaut selon le point d'injection. */
export function defaultFields(a: AnchorId): FieldKey[] {
  const f = new Set<FieldKey>(["age", "allergies", "ttt"]);
  if (a === "ordo") { f.add("ligne"); f.add("dfg"); }
  if (a === "note") f.add("note");
  if (a === "pv" || a === "tb") { f.add("sexe"); f.add("atcd"); f.add("bio12"); }
  if (a === "tb") f.add("note");
  return FIELD_KEYS.filter((k) => f.has(k) && fieldsFor(a).includes(k));
}

/**
 * Le texte `patient_ehr` envoyé à core : seulement les champs transmis par la
 * brique, valeurs du dossier fictif, sans nom ni identifiant (pseudonymisé).
 */
export function patientEhr(fields: readonly FieldKey[]): string {
  const d = dossier();
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
  const b = bilan(d);
  if (has("bio")) lines.push(`Dernière biologie (${frDate(b.creat.date)}) : créatinine ${b.creat.affichage}, kaliémie ${b.kali.affichage}.`);
  if (has("dfg")) lines.push(`DFG (CKD-EPI) : ${b.dfg.affichage} mL/min/1,73 m² (${frDate(b.dfg.date)}).`);
  return lines.join("\n");
}

/** Le dernier bilan rénal et les HbA1c, de la plus récente à la plus ancienne. */
function bilan(d: DossierLgc) {
  const lib = (re: RegExp) => d.biologie.find((b) => re.test(b.libelle))!;
  return {
    creat: lib(/^Créatinine/),
    kali: lib(/^Kaliémie/),
    dfg: lib(/^DFG/),
    hba: d.biologie.filter((b) => b.libelle === "HbA1c").sort((a, b) => b.date.localeCompare(a.date)),
  };
}

const minuscule = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

/**
 * La synthèse du dossier : construite à partir des seules données transmises,
 * sans recommandation ni source. Une ligne par rubrique cochée ; rien n'est
 * déduit au-delà d'une comparaison de deux dosages datés.
 */
export function syntheseDossier(fields: readonly FieldKey[]): string[] {
  const d = dossier();
  const has = (k: FieldKey) => fields.includes(k);
  const b = bilan(d);
  const out: string[] = [];
  const profil = [has("sexe") ? d.sexe : has("age") ? "Patient" : "", has("age") ? `${d.age} ans` : ""].filter(Boolean).join(", ");
  const atcd = has("atcd") ? d.antecedents.map((a) => `${a.libelle} (${a.annee})`).join(", ") : "";
  if (profil || atcd) out.push([profil, atcd].filter(Boolean).join(" ; ") + ".");
  if (has("allergies")) out.push(`Allergie : ${d.allergies.map((a) => `${a.substance.toLowerCase()} (${a.reaction}, ${a.annee})`).join(", ")}.`);
  if (has("ttt")) out.push(`Traitement de fond : ${d.traitement.map((t) => minuscule(t)).join(" ; ")}.`);
  if (has("bio12") && b.hba.length) {
    const [der, prec] = b.hba;
    const sens = prec ? (der.valeur > prec.valeur ? `en hausse depuis ${prec.affichage} (${frDate(prec.date)})` : der.valeur < prec.valeur ? `en baisse depuis ${prec.affichage} (${frDate(prec.date)})` : `stable depuis ${frDate(prec.date)}`) : "";
    out.push(`HbA1c ${der.affichage} (${frDate(der.date)})${sens ? `, ${sens}` : ""}.`);
  }
  const renal = [has("bio") ? `créatinine ${b.creat.affichage}, kaliémie ${b.kali.affichage}` : "", has("dfg") ? `DFG ${b.dfg.affichage} mL/min/1,73 m²` : ""].filter(Boolean).join(", ");
  if (renal) out.push(`Bilan du ${frDate(b.dfg.date)} : ${renal}.`);
  if (has("note")) out.push(`Consultation du jour : ${d.note.motif.replace(/\.$/, "")} ; ${d.note.conclusion}`);
  if (has("ligne")) out.push(`Ordonnance en cours : ${d.ordonnance.map((o) => `${minuscule(o.med)}, ${o.posologie}, ${o.duree}`).join(" ; ")}.`);
  return out;
}

export const frDate = (iso: string) => iso.split("-").reverse().join("/");
