import type { Dossier, Medication, Problem, Allergy, Measure, LabReport } from "@/domain/types";

/**
 * La projection du dossier en `patient_ehr` — le texte libre que locus-core
 * accepte aujourd'hui comme seul contexte patient.
 *
 * C'est le point d'intégration le plus important du studio : tout ce que
 * l'agent sait du patient passe par là. On le construit DEPUIS le dossier
 * structuré, jamais l'inverse, et on le garde court : core le résume
 * lui-même (`ehr_summary`), un roman n'aide pas.
 *
 * Quand core acceptera un contexte structuré (voir docs/integration-locus.md,
 * « capacités projetées »), cette fonction deviendra un simple mapping.
 */
export function toPatientEhr(d: Dossier, now = new Date()): string {
  const p = d.patient;
  const age = ageAt(p.ins.dateNaissance, now);
  const sexe = p.ins.sexe === "F" ? "Femme" : "Homme";
  const lines: string[] = [];
  lines.push(`${sexe}, ${age} ans.`);

  const problems = d.records.filter((r): r is Problem => r.kind === "problem" && r.status === "actif" && r.enAvant);
  const chroniques = problems.filter((x) => x.evolution === "chronique");
  const antecedents = problems.filter((x) => x.evolution !== "chronique" && x.categorie !== "familial" && x.categorie !== "mode-de-vie");
  const familiaux = problems.filter((x) => x.categorie === "familial");
  const modeDeVie = problems.filter((x) => x.categorie === "mode-de-vie");
  if (chroniques.length) lines.push(`Problèmes actifs : ${chroniques.map((x) => x.libelle + (x.depuis ? ` (depuis ${x.depuis.slice(0, 4)})` : "")).join(" ; ")}.`);
  if (antecedents.length) lines.push(`Antécédents : ${antecedents.map((x) => x.libelle).join(" ; ")}.`);
  if (familiaux.length) lines.push(`Antécédents familiaux : ${familiaux.map((x) => `${x.libelle}${x.apparente ? ` (${x.apparente})` : ""}`).join(" ; ")}.`);
  if (modeDeVie.length) lines.push(`Mode de vie : ${modeDeVie.map((x) => x.libelle).join(" ; ")}.`);

  const allergies = d.records.filter((r): r is Allergy => r.kind === "allergy" && r.status === "actif");
  lines.push(allergies.length ? `Allergies : ${allergies.map((a) => `${a.substance}${a.reaction ? ` (${a.reaction})` : ""}`).join(", ")}.` : "Pas d'allergie connue.");

  const meds = d.records.filter((r): r is Medication => r.kind === "medication" && r.status === "actif");
  if (meds.length) lines.push(`Traitement en cours : ${meds.map((m) => `${m.dci}${m.dosage ? ` ${m.dosage}` : ""} ${m.posologie}`).join(" ; ")}.`);

  const ald = p.couverture.ald?.map((a) => a.libelle);
  if (ald?.length) lines.push(`ALD : ${ald.join(", ")}.`);

  const mesures = lastMeasures(d.records.filter((r): r is Measure => r.kind === "measure"));
  if (mesures.length) lines.push(`Dernières mesures : ${mesures.join(", ")}.`);

  const labs = d.records.filter((r): r is LabReport => r.kind === "lab").sort((a, b) => b.prelevementLe.localeCompare(a.prelevementLe))[0];
  if (labs) {
    const notable = labs.resultats.filter((x) => x.flag !== "normal").slice(0, 6);
    const txt = notable.length ? notable.map((x) => `${x.libelle} ${x.valeur}${x.unite ? " " + x.unite : ""} (${x.flag})`).join(", ") : "sans anomalie";
    lines.push(`Dernière biologie (${labs.prelevementLe}) : ${txt}.`);
  }

  if (p.ins.sexe === "F" && age >= 15 && age <= 50) lines.push("Statut grossesse : non renseigné.");
  return lines.join("\n");
}

export function ageAt(dateNaissance: string, now = new Date()): number {
  const d = new Date(dateNaissance);
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function lastMeasures(ms: Measure[]): string[] {
  const byType = new Map<string, Measure>();
  for (const m of [...ms].sort((a, b) => a.date.localeCompare(b.date))) byType.set(m.type, m);
  const out: string[] = [];
  const ta = byType.get("ta");
  if (ta) out.push(`TA ${ta.valeur}/${ta.valeur2} mmHg`);
  const poids = byType.get("poids");
  if (poids) out.push(`poids ${poids.valeur} kg`);
  const imc = byType.get("imc");
  if (imc) out.push(`IMC ${imc.valeur}`);
  const dfg = byType.get("dfg");
  if (dfg) out.push(`DFG ${dfg.valeur} mL/min`);
  return out;
}
