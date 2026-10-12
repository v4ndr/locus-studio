import { DOSSIERS, recordsOf, summaryOf, displayName, TODAY } from "@/data";
import { buildRoutines } from "@/data/routines";
import { SCRIPTS } from "@/data/consultations";
import { DR_LAURENT } from "@/data/cabinet";
import { at, now } from "@/data/clock";
import { ageAt, toPatientEhr } from "@/locus/ehr";
import type { World, WorldPatient, FilEntry } from "./types";
import type { Dossier } from "@/domain/types";

/** La projection du jeu de données pour l'écran unique. Calculée au build. */
export function buildWorld(): World {
  const patients = DOSSIERS.map(project);
  return {
    praticien: { nom: `Dr ${DR_LAURENT.prenom} ${DR_LAURENT.nom}`, agent: DR_LAURENT.agentNom },
    patients,
    routines: buildRoutines(),
    scripts: SCRIPTS,
    seed: seedEntries(patients),
  };
}

function project(d: Dossier): WorldPatient {
  const p = d.patient;
  const sum = summaryOf(d);
  const labs = recordsOf(d, "lab").sort((a, b) => a.prelevementLe.localeCompare(b.prelevementLe));
  const measures = recordsOf(d, "measure").sort((a, b) => a.date.localeCompare(b.date));
  const series: WorldPatient["series"] = {};
  const push = (k: string, date: string, valeur: number, valeur2?: number) => (series[k] ??= []).push({ date, valeur, valeur2 });
  for (const m of measures) {
    if (m.type === "ta") push("ta", m.date, m.valeur, m.valeur2);
    if (m.type === "poids") push("poids", m.date, m.valeur);
    if (m.type === "dfg") push("dfg", m.date, m.valeur);
  }
  for (const l of labs) {
    for (const r of l.resultats) {
      if (typeof r.valeur !== "number") continue;
      if (r.loinc === "62238-1") push("dfg", l.prelevementLe, r.valeur);
      if (r.loinc === "4548-4") push("hba1c", l.prelevementLe, r.valeur);
      if (r.loinc === "13457-7") push("ldl", l.prelevementLe, r.valeur);
      if (r.precedent) {
        if (r.loinc === "62238-1") push("dfg", r.precedent.date, r.precedent.valeur);
        if (r.loinc === "4548-4") push("hba1c", r.precedent.date, r.precedent.valeur);
        if (r.loinc === "13457-7") push("ldl", r.precedent.date, r.precedent.valeur);
      }
    }
  }
  for (const k of Object.keys(series)) {
    const seen = new Set<string>();
    series[k] = series[k].filter((x) => (seen.has(x.date) ? false : (seen.add(x.date), true))).sort((a, b) => a.date.localeCompare(b.date));
  }
  const jalons = recordsOf(d, "medication").filter((m) => m.debut && m.type === "chronique").map((m) => ({ date: m.debut!, libelle: `${m.dci} débuté` }));
  const appointment = recordsOf(d, "appointment").find((a) => a.debut.startsWith(TODAY));
  return {
    id: p.id,
    nom: displayName(p),
    prenom: p.prenomUsuel,
    nomUsage: p.nomUsage,
    hue: p.photoHue ?? 200,
    age: ageAt(p.ins.dateNaissance, now()),
    sexe: p.ins.sexe,
    ligne: sum?.enUneLigne ?? "",
    synthese: sum?.synthese,
    enCeMoment: sum?.enCeMoment ?? [],
    problems: recordsOf(d, "problem").filter((x) => x.status === "actif" && x.enAvant).map((x) => ({ libelle: x.libelle, cim10: x.cim10, chronique: x.evolution === "chronique" })),
    meds: recordsOf(d, "medication").filter((m) => m.status === "actif").map((m) => ({ dci: m.dci, dosage: m.dosage, posologie: m.posologie, type: m.type, ald: m.ald })),
    allergies: recordsOf(d, "allergy").map((a) => a.substance),
    series,
    jalons,
    proposals: recordsOf(d, "proposal"),
    briefing: appointment?.preparationId ? recordsOf(d, "briefing").find((b) => b.id === appointment.preparationId) : undefined,
    appointment,
    messages: recordsOf(d, "message"),
    labs: recordsOf(d, "lab"),
    docs: recordsOf(d, "document"),
    consentementAgent: p.consentement.messagerieAgent,
    ehr: toPatientEhr(d, now()),
  };
}

/** Ce que le fil contient à l'ouverture : la nuit et le matin de Locus, les messages des patients. */
function seedEntries(patients: WorldPatient[]): FilEntry[] {
  const out: FilEntry[] = [];
  const byId = Object.fromEntries(patients.map((p) => [p.id, p]));
  for (const d of DOSSIERS) {
    for (const j of d.journal) {
      if (j.at < at("17:00", -1)) continue;
      const p = byId[d.patient.id];
      if (j.acteur.type === "systeme") out.push({ id: j.id, at: j.at, who: "systeme", patientId: p.id, titre: `${j.detail}`, corps: j.acteur.nom });
      else if (j.acteur.type === "agent" && !/proposal\.create|message\.draft|briefing\.create|document\.read|message\.triage/.test(j.action)) out.push({ id: j.id, at: j.at, who: "session", patientId: p.id, titre: j.detail, session: { etat: "fait" } });
    }
    for (const m of recordsOf(d, "message")) {
      if (m.de.type === "patient" && m.date >= at("17:00", -1)) out.push({ id: m.id, at: m.date, who: "patient", patientId: d.patient.id, nom: m.de.nom, titre: m.objet, corps: m.corps, scene: { type: "objet", patientId: d.patient.id, proposal: recordsOf(d, "proposal").find((p) => p.action === "message-patient" && p.declencheur.recordId === m.id) ?? recordsOf(d, "proposal")[0] } });
    }
  }
  // Les lectures de Locus, condensées : une entrée par document/biologie lu.
  for (const p of patients) {
    for (const l of p.labs) if (!l.vuLe && l.lecture) out.push({ id: `lu.${l.id}`, at: l.recuLe.replace(/T(\d\d):(\d\d)/, (_, h, m) => `T${h}:${String(Math.min(59, Number(m) + 9)).padStart(2, "0")}`), who: "sol", patientId: p.id, titre: `J'ai lu la biologie de ${p.nom}`, corps: l.lecture.resume, scene: { type: "patient", patientId: p.id } });
    for (const d of p.docs) if (!d.vuLe && d.lecture) out.push({ id: `lu.${d.id}`, at: d.recuLe.replace(/T(\d\d):(\d\d)/, (_, h, m) => `T${h}:${String(Math.min(59, Number(m) + 12)).padStart(2, "0")}`), who: "sol", patientId: p.id, titre: `J'ai lu : ${d.titre} (${p.nom})`, corps: d.lecture.resume, scene: { type: "patient", patientId: p.id } });
  }
  // Le message du matin.
  out.push({
    id: "sol.matin",
    at: at("07:58"),
    who: "sol",
    titre: "Avant 8h30 : trois décisions, rien à remplir.",
    corps: "La biologie de **Marguerite Delacroix** est arrivée : le diabète dérive (HbA1c 8,1 %), le rein baisse (DFG 48). Sa fille a écrit cette nuit ; la cardiologue a répondu hier. J'ai préparé l'ordonnance, l'adressage ophtalmo et la réponse à Anne.\n\n**Julien Garnier** a le dos bloqué et demande un arrêt : je l'ai mis à 10h, l'arrêt est pré-rempli. **Léa Moreau** est enceinte (≈ 7 SA) : 11h, bilan T1 prêt. **Inès Perrin** a une angine fébrile : 15h, ordonnance conditionnelle au TROD. **Sophie Marchand** a une cystite : fosfomycine prête à signer, elle n'a pas besoin de venir.\n\nLe reste de la journée est préparé. Dites « ma matinée », ou un nom.",
    scene: { type: "matinee" },
    aValider: true,
  });
  return out.sort((a, b) => a.at.localeCompare(b.at));
}
