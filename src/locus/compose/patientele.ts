import "server-only";
import { DOSSIERS, recordsOf, displayName } from "@/data";
import { now } from "@/data/clock";
import { ageAt } from "@/locus/ehr";
import type { Dossier } from "@/domain/types";
import type { Tableau, TableauLigne } from "./contract";

/**
 * Les requêtes de population que le LGC sait faire, CALCULÉES sur les
 * dossiers : le modèle les reçoit et les commente, il ne les écrit pas.
 * Même calcul pour la palette ⌘K globale, l'accueil, un dossier ouvert
 * (« et ses dépistages ? ») et l'outil `interroger_patientele`.
 *
 * Les règles sont publiques (programmes de dépistage organisé, HAS / INCa /
 * Santé publique France ; intervalle HbA1c, HAS) et écrites ici en clair.
 */

const JOUR = 86_400_000;
function fr(iso: string) { const [y, m, d] = iso.slice(0, 10).split("-"); return `${d}/${m}/${y}`; }
const jours = (a: string, ref: Date) => Math.floor((ref.getTime() - new Date(a).getTime()) / JOUR);
const plus = (iso: string, mois: number) => { const d = new Date(iso); d.setMonth(d.getMonth() + mois); return d.toISOString().slice(0, 10); };

/* ------------------------------------------------------------------ */
/* Dépistages organisés des cancers                                     */
/* ------------------------------------------------------------------ */

export type Programme = "colorectal" | "sein" | "col-uterus";
export type StatutDepistage = "en-retard" | "jamais" | "bientot" | "a-jour" | "specifique" | "exclu" | "refuse" | "hors-age";

export interface LigneDepistage {
  patientId: string;
  nom: string;
  age: number;
  sexe: "F" | "M";
  programme: Programme;
  statut: StatutDepistage;
  /** Le dernier test retrouvé au dossier (ISO). */
  dernier?: string;
  /** L'échéance calculée (ISO). */
  echeance?: string;
  retardJours?: number;
  /** Pourquoi ce statut, en clair (l'intervalle appliqué, l'exclusion). */
  motif: string;
  /** Ce qu'il y a à proposer, quand il y a quelque chose à faire. */
  conduite?: string;
  /** Hors programme mais à faire quand même (risque élevé sans coloscopie récente). */
  aFaire?: boolean;
}

export const PROGRAMMES: Record<Programme, { libelle: string; regle: string }> = {
  colorectal: { libelle: "Cancer colorectal", regle: "50-74 ans, test immunologique fécal tous les 2 ans" },
  sein: { libelle: "Cancer du sein", regle: "femmes de 50-74 ans, mammographie tous les 2 ans" },
  "col-uterus": { libelle: "Cancer du col de l'utérus", regle: "femmes de 25-65 ans : examen cytologique (25-29 ans, tous les 3 ans), puis test HPV-HR (30-65 ans, tous les 5 ans)" },
};

const PREMIER_DEGRE = /^(p[èe]re|m[èe]re|fr[èe]re|s(?:œ|oe)ur|fils|fille)/i;
/** L'âge au diagnostic d'un antécédent familial, s'il est écrit (« à 64 ans »). */
const ageDiag = (s: string) => { const m = /(?:^|\s)à (\d{2}) ans\b/.exec(s); return m ? Number(m[1]) : undefined; };

/** Le dernier test d'un programme retrouvé au dossier : enregistrement de dépistage, biologie ou compte rendu. */
function dernierTest(d: Dossier, prog: Programme): { le: string; coloscopie?: boolean; ageAuTest?: number } | undefined {
  const dates: { le: string; coloscopie?: boolean }[] = [];
  for (const s of recordsOf(d, "screening")) if (s.programme === prog && s.dernierLe) dates.push({ le: s.dernierLe });
  const re = prog === "colorectal" ? /immunolog|sang occulte|\bFIT\b/i : prog === "sein" ? /mammograph/i : /\bHPV\b|frottis|cytolog/i;
  for (const l of recordsOf(d, "lab")) if (l.resultats.some((r) => re.test(r.libelle))) dates.push({ le: l.prelevementLe });
  for (const x of recordsOf(d, "document")) {
    if (prog === "colorectal" && /coloscop/i.test(x.titre)) dates.push({ le: x.dateDocument, coloscopie: true });
    else if (prog === "sein" && x.type === "cr-imagerie" && re.test(x.titre)) dates.push({ le: x.dateDocument });
  }
  const der = dates.sort((a, b) => b.le.localeCompare(a.le))[0];
  return der ? { ...der, ageAuTest: ageAt(d.patient.ins.dateNaissance, new Date(der.le)) } : undefined;
}

function ligneDepistage(d: Dossier, prog: Programme, ref: Date): LigneDepistage {
  const p = d.patient;
  const age = ageAt(p.ins.dateNaissance, ref);
  const base = { patientId: p.id, nom: displayName(p), age, sexe: p.ins.sexe, programme: prog };
  const pbs = recordsOf(d, "problem").filter((x) => x.status !== "rejete");
  const perso = pbs.filter((x) => x.categorie !== "familial");
  const fam = pbs.filter((x) => x.categorie === "familial");
  const refus = recordsOf(d, "screening").find((s) => s.programme === prog && s.etat === "refuse");

  // Qui le programme concerne.
  if (prog !== "colorectal" && p.ins.sexe !== "F") return { ...base, statut: "hors-age", motif: "programme réservé aux femmes" };
  const [min, max] = prog === "col-uterus" ? [25, 65] : [50, 74];
  if (age < min || age > max) return { ...base, statut: "hors-age", motif: `${age} ans, hors des ${min}-${max} ans du programme${age > max ? " (au-delà, décision individuelle)" : ""}` };

  // Ce qui sort du dépistage organisé : un suivi spécifique, ou plus d'organe à dépister.
  if (prog === "colorectal") {
    const atcd = perso.find((x) => /^C1[89]|^C20|^K5[01]/.test(x.cim10 ?? "") || /cancer colorectal|adénome|maladie de crohn|rectocolite/i.test(x.libelle));
    if (atcd) return { ...base, statut: "specifique", motif: `antécédent personnel : ${atcd.libelle.toLowerCase()}`, conduite: "surveillance par coloscopie, hors dépistage organisé" };
    const parents = fam.filter((x) => /colorectal|côlon|colon\b|rectum/i.test(x.libelle) && PREMIER_DEGRE.test(x.apparente ?? ""));
    const jeune = parents.find((x) => (ageDiag(x.libelle) ?? 99) < 65);
    if (jeune || parents.length >= 2) {
      const x = jeune ?? parents[0];
      const der = dernierTest(d, prog);
      // Une coloscopie de moins de 5 ans couvre ; un test immunologique, lui, n'est pas l'examen de ce niveau de risque.
      const couvert = !!der?.coloscopie && jours(plus(der.le, 60), ref) <= 0;
      const qui = `${x.apparente} atteint${/s(?:œ|oe)ur|m[èe]re|fille/i.test(x.apparente ?? "") ? "e" : ""}${ageDiag(x.libelle) ? ` à ${ageDiag(x.libelle)} ans` : ""}`;
      return { ...base, statut: "specifique", aFaire: !couvert, dernier: der?.le, motif: `risque élevé : ${qui}${der && !der.coloscopie ? ` ; dernier test immunologique le ${fr(der.le)}, inadapté à ce risque` : ""}`, conduite: couvert ? undefined : "coloscopie de dépistage (adressage au gastro-entérologue), pas de test immunologique" };
    }
  }
  if (prog === "sein") {
    const atcd = perso.find((x) => /^C50/.test(x.cim10 ?? "") || /cancer du sein|carcinome (canalaire|lobulaire)|BRCA/i.test(x.libelle));
    if (atcd) return { ...base, statut: "specifique", dernier: dernierTest(d, prog)?.le, motif: `antécédent personnel : ${atcd.libelle.replace(/\s*:.*$/, "").toLowerCase()}`, conduite: "surveillance spécifique (oncologue), hors dépistage organisé" };
  }
  if (prog === "col-uterus") {
    const hyst = perso.find((x) => /hyst[ée]rectomie/i.test(x.libelle) && !/subtotale/i.test(x.libelle));
    if (hyst) return { ...base, statut: "exclu", motif: `${hyst.libelle.toLowerCase()} : plus de col à dépister` };
  }
  if (refus) return { ...base, statut: "refuse", dernier: refus.dernierLe, motif: "refus noté au dossier" };

  const der = dernierTest(d, prog);
  const conduite = prog === "colorectal" ? "remettre le kit de test immunologique (ou commande en ligne)" : prog === "sein" ? "mammographie de dépistage (prise en charge du dépistage organisé)" : age < 30 ? "examen cytologique (frottis) au cabinet ou au laboratoire" : "test HPV-HR sur prélèvement cervico-utérin, au cabinet ou au laboratoire";
  if (!der) return { ...base, statut: "jamais", motif: "aucun test retrouvé au dossier", conduite };
  // L'intervalle : 2 ans (colorectal, sein) ; 5 ans après une coloscopie normale ; col : 3 ans avant 30 ans, 5 ans ensuite.
  const mois = prog === "colorectal" ? (der.coloscopie ? 60 : 24) : prog === "sein" ? 24 : (der.ageAuTest ?? age) < 30 ? 36 : 60;
  const echeance = plus(der.le, mois);
  const ecart = jours(echeance, ref);
  const intervalle = `${mois / 12} ans${der.coloscopie ? " après une coloscopie" : ""}`;
  if (ecart > 0) return { ...base, statut: "en-retard", dernier: der.le, echeance, retardJours: ecart, motif: `dernier test le ${fr(der.le)}, intervalle ${intervalle}`, conduite };
  if (ecart > -90) return { ...base, statut: "bientot", dernier: der.le, echeance, motif: `dernier test le ${fr(der.le)}, échéance le ${fr(echeance)}`, conduite };
  return { ...base, statut: "a-jour", dernier: der.le, echeance, motif: `dernier test le ${fr(der.le)}, prochain le ${fr(echeance)}` };
}

/** Les dépistages d'un dossier, ou de toute la patientèle (les dossiers décédés sont exclus). */
export function depistages(opts: { patientId?: string; programme?: Programme } = {}): LigneDepistage[] {
  const ref = now();
  const progs: Programme[] = opts.programme ? [opts.programme] : ["colorectal", "sein", "col-uterus"];
  return DOSSIERS.filter((d) => !d.patient.deces && (!opts.patientId || d.patient.id === opts.patientId)).flatMap((d) => progs.map((g) => ligneDepistage(d, g, ref)));
}

const STATUT_LIB: Record<StatutDepistage, string> = { "en-retard": "en retard", jamais: "jamais fait", bientot: "à faire sous 3 mois", "a-jour": "à jour", specifique: "suivi spécifique", exclu: "non concerné", refuse: "refusé", "hors-age": "non concerné" };
const A_FAIRE: StatutDepistage[] = ["en-retard", "jamais", "specifique"];
/** En retard au sens du médecin : passé l'échéance, jamais fait, ou un risque élevé sans l'examen qu'il demande. */
const enRetard = (r: LigneDepistage) => r.statut === "en-retard" || r.statut === "jamais" || (r.statut === "specifique" && !!r.aFaire);

/**
 * La carte « Dépistages » du dossier, depuis le même calcul que la requête de
 * population : le dossier et le composer ne peuvent pas dire deux choses.
 */
export function ficheDepistages(patientId: string): { k: string; v: string; muted?: boolean; warn?: boolean }[] {
  // Hors âge : on ne montre que ce qui vient d'être dépassé (au-delà de 65 ou 74 ans), pas un programme qui n'a jamais concerné le patient.
  return depistages({ patientId }).filter((r) => r.statut !== "hors-age" || /au-delà/.test(r.motif)).map((r) => ({
    k: PROGRAMMES[r.programme].libelle,
    v: enRetard(r) ? (r.aFaire ? "risque élevé" : r.statut === "jamais" ? "jamais fait" : "en retard") : r.statut === "a-jour" ? `à jour · ${r.echeance?.slice(0, 4) ?? ""}`.replace(/ · $/, "") : STATUT_LIB[r.statut],
    muted: r.statut === "exclu" || r.statut === "hors-age",
    warn: enRetard(r) || r.statut === "bientot",
  }));
}

/** Les dépistages d'UN patient, tous programmes, à jour compris : de quoi répondre « et ses dépistages ? » depuis son dossier. */
export function texteDepistagesPatient(patientId: string): string {
  const rows = depistages({ patientId });
  return `## Dépistages organisés de ce patient, calculés sur le dossier (programme · statut · pourquoi · à proposer)\n${rows.map((r) => `- ${PROGRAMMES[r.programme].libelle} · ${r.aFaire ? "risque élevé, à faire" : STATUT_LIB[r.statut]}${r.retardJours ? ` de ${r.retardJours} j` : ""} · ${r.motif}${r.conduite ? ` · à proposer : ${r.conduite}` : ""}`).join("\n")}`;
}

/** Le texte que le modèle reçoit : une ligne par dépistage à faire, puis le compte du reste. */
export function texteDepistages(rows: LigneDepistage[], titre = "Dépistages organisés des cancers, calculés sur les dossiers"): string {
  const faire = rows.filter((r) => A_FAIRE.includes(r.statut) || r.statut === "bientot");
  const lignes = faire.map((r) => `- ${r.patientId} · ${r.nom} · ${r.age} ans · ${PROGRAMMES[r.programme].libelle} · ${STATUT_LIB[r.statut]}${r.aFaire ? " (à faire)" : ""}${r.retardJours ? ` de ${r.retardJours} j` : ""} · ${r.motif}${r.conduite ? ` · à proposer : ${r.conduite}` : ""}`);
  const n = (s: StatutDepistage[]) => rows.filter((r) => s.includes(r.statut)).length;
  return `## ${titre} (id · nom · âge · programme · statut · pourquoi · à proposer)\n${lignes.length ? lignes.join("\n") : "- aucun dépistage en retard"}\n- et, sur ${new Set(rows.map((r) => r.patientId)).size} dossiers : ${n(["a-jour"])} dépistage(s) à jour, ${n(["refuse"])} refusé(s), ${n(["exclu", "hors-age"])} sans objet (âge, sexe, hystérectomie).\nRègles : ${Object.values(PROGRAMMES).map((p) => `${p.libelle.toLowerCase()}, ${p.regle}`).join(" ; ")}.`;
}

/** Le tableau montré au médecin : les dépistages à faire, du plus en retard au moins en retard. */
export function tableauDepistages(rows: LigneDepistage[]): Tableau {
  const ordre: StatutDepistage[] = ["jamais", "en-retard", "specifique", "bientot"];
  const rang = (r: LigneDepistage) => (enRetard(r) ? 0 : r.statut === "bientot" ? 1 : 2);
  const faire = rows.filter((r) => ordre.includes(r.statut)).sort((a, b) => rang(a) - rang(b) || ordre.indexOf(a.statut) - ordre.indexOf(b.statut) || (b.retardJours ?? 0) - (a.retardJours ?? 0) || a.nom.localeCompare(b.nom, "fr"));
  const lignes: TableauLigne[] = faire.map((r) => ({
    patientId: r.patientId,
    nom: r.nom,
    cellules: [`${r.age} ans`, PROGRAMMES[r.programme].libelle, r.dernier ? fr(r.dernier) : "aucun", `${r.aFaire ? "risque élevé" : STATUT_LIB[r.statut]}${r.retardJours ? ` · ${r.retardJours >= 60 ? `${Math.round(r.retardJours / 30.4)} mois` : `${r.retardJours} j`}` : ""}`, r.conduite ?? r.motif],
    statut: enRetard(r) ? "retard" : r.statut === "bientot" ? "bientot" : "info",
  }));
  const n = (s: StatutDepistage[]) => rows.filter((r) => s.includes(r.statut)).length;
  return {
    id: "depistages",
    titre: `Dépistages des cancers · ${faire.filter(enRetard).length} en retard`,
    colonnes: ["Patient", "Âge", "Dépistage", "Dernier test", "Statut", "À proposer"],
    derniereSousLigne: true,
    lignes,
    pied: [
      `Sur ${new Set(rows.map((r) => r.patientId)).size} dossiers. Non listés : ${n(["a-jour"])} dépistage(s) à jour, ${n(["refuse"])} refusé(s), ${n(["exclu", "hors-age"])} sans objet (âge, sexe, hystérectomie).`,
      `Règles du dépistage organisé (HAS, INCa) : ${Object.values(PROGRAMMES).map((p) => `${p.libelle.toLowerCase()}, ${p.regle}`).join(" ; ")}.`,
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Suivi du diabète : la dernière HbA1c contre l'intervalle HAS         */
/* ------------------------------------------------------------------ */

export interface LigneDiabete { patientId: string; nom: string; age: number; derniere?: { le: string; valeur: number }; mois: number; retardJours?: number; enRetard: boolean }

/** Les diabétiques et leur dernière HbA1c : tous les 3 mois, 6 mois si l'équilibre est atteint (≤ 7 %). */
export function suiviDiabete(): LigneDiabete[] {
  const ref = now();
  return DOSSIERS.filter((d) => !d.patient.deces).flatMap((d): LigneDiabete[] => {
    const diab = recordsOf(d, "problem").some((p) => p.categorie !== "familial" && (/^E1[0-4]/.test(p.cim10 ?? "") || /diab[eè]te/i.test(p.libelle)));
    if (!diab) return [];
    const p = d.patient;
    const mesures = recordsOf(d, "lab").flatMap((l) => l.resultats.filter((r) => r.loinc === "4548-4" || /hba1c/i.test(r.libelle)).map((r) => ({ le: l.prelevementLe, valeur: typeof r.valeur === "number" ? r.valeur : Number(String(r.valeur).replace(",", ".")) }))).filter((m) => Number.isFinite(m.valeur)).sort((a, b) => b.le.localeCompare(a.le));
    const der = mesures[0];
    const base = { patientId: p.id, nom: displayName(p), age: ageAt(p.ins.dateNaissance, ref) };
    if (!der) return [{ ...base, mois: 3, enRetard: true }];
    const mois = der.valeur <= 7 ? 6 : 3;
    const retard = jours(der.le, ref) - Math.round(mois * 30.4);
    return [{ ...base, derniere: der, mois, retardJours: retard, enRetard: retard > 0 }];
  });
}

const pct = (v: number) => `${String(v).replace(".", ",")} %`;

export function texteDiabete(rows: LigneDiabete[]): string {
  const l = rows.map((r) => `- ${r.patientId} · ${r.nom} · ${r.age} ans · ${r.derniere ? `dernière HbA1c ${pct(r.derniere.valeur)} le ${fr(r.derniere.le)}` : "aucune HbA1c au dossier"} · intervalle ${r.mois} mois${r.mois === 6 ? " (équilibré)" : ""} · ${r.enRetard ? `EN RETARD${r.retardJours ? ` de ${r.retardJours} j` : ""}` : `à jour, prochaine dans ${-(r.retardJours ?? 0)} j`}`);
  return `## Suivi du diabète de la patientèle, calculé sur les dossiers (id · nom · âge · dernière HbA1c · intervalle HAS · statut)\n${l.length ? l.join("\n") : "- aucun patient diabétique"}`;
}

export function tableauDiabete(rows: LigneDiabete[]): Tableau {
  const tri = [...rows].sort((a, b) => Number(b.enRetard) - Number(a.enRetard) || (b.retardJours ?? 9e9) - (a.retardJours ?? 9e9));
  return {
    id: "diabete",
    titre: `Suivi du diabète · ${rows.filter((r) => r.enRetard).length} HbA1c en retard`,
    colonnes: ["Patient", "Âge", "Dernière HbA1c", "Le", "Intervalle", "Statut"],
    lignes: tri.map((r) => ({ patientId: r.patientId, nom: r.nom, cellules: [`${r.age} ans`, r.derniere ? pct(r.derniere.valeur) : "aucune", r.derniere ? fr(r.derniere.le) : "—", `${r.mois} mois`, r.enRetard ? `en retard${r.retardJours ? ` · ${r.retardJours} j` : ""}` : `à jour · dans ${-(r.retardJours ?? 0)} j`], statut: r.enRetard ? "retard" : "ok" })),
    pied: ["HbA1c tous les 3 mois, tous les 6 mois quand l'objectif est atteint et stable (HAS, diabète de type 2)."],
  };
}

/* ------------------------------------------------------------------ */
/* La requête, d'où qu'elle vienne                                      */
/* ------------------------------------------------------------------ */

export type Sujet = "depistages" | "diabete" | "tout";

/** Une demande qui porte sur la patientèle, pas sur le patient ouvert. */
export function estPopulation(texte: string): boolean {
  return /patient[eè]le|\bmes patients?\b|\b(?:tous|toutes) (?:mes|les) patients?\b|\b(?:quels|quelles|combien de|liste des?|lesquels de mes) patients?\b|\bpopulation\b|\bau cabinet\b.*\b(?:retard|revoir|relancer)\b|\bqui (?:dois-je|faut-il) (?:revoir|relancer|convoquer)\b/i.test(texte);
}

export function sujetDe(texte: string): Sujet {
  const dep = /d[ée]pist|mammo|frottis|\bhpv\b|colorectal|c[ôo]lon|\bcol\b|cancer du sein|cytolog/i.test(texte);
  const diab = /diab|hba1c|glyc|h[ée]moglobine glyqu/i.test(texte);
  return dep && !diab ? "depistages" : diab && !dep ? "diabete" : "tout";
}

export interface ResultatPopulation { texte: string; tableaux: Tableau[] }

export function interrogerPatientele(sujet: Sujet, programme?: Programme): ResultatPopulation {
  const out: ResultatPopulation = { texte: "", tableaux: [] };
  const parts: string[] = [];
  if (sujet !== "diabete") { const rows = depistages({ programme }); parts.push(texteDepistages(rows)); out.tableaux.push(tableauDepistages(rows)); }
  if (sujet !== "depistages") { const rows = suiviDiabete(); parts.push(texteDiabete(rows)); out.tableaux.push(tableauDiabete(rows)); }
  out.texte = parts.join("\n\n");
  return out;
}
