import "server-only";
import { getDossier, displayName, recordsOf } from "@/data";
import { now } from "@/data/clock";
import { toPatientEhr, ageAt } from "@/locus/ehr";
import type { ComposeInput, PatientLocalPayload, PatientPlan } from "./contract";

/**
 * Le patient tel que le composer le voit, d'où qu'il vienne : du jeu de
 * données (dossier structuré) ou du cabinet local (créé dans le navigateur,
 * reçu avec la demande). Même forme pour les outils et les règles.
 */
export interface PatientCtx {
  id: string;
  local: boolean;
  nom: string; // "Claire Moreau"
  prenom: string;
  sexe: "F" | "M";
  age: number;
  /** JJ/MM/AAAA, pour l'en-tête des documents. */
  naissance: string;
  href: string;
  ehr: string;
  allergies: string[];
  meds: { dci: string; dosage?: string; posologie: string; chronique: boolean }[];
  chronique?: string;
  lastLabNormal?: boolean;
  /** Identité administrative (fictive), pour les formulaires qui la demandent. */
  matricule?: string;
  adresse?: string;
}

/** Le patient tel que la carte rend ses documents. */
export function planPatient(pt: PatientCtx): PatientPlan {
  return { id: pt.id, nom: pt.nom, sexe: pt.sexe, age: pt.age, naissance: pt.naissance, allergies: pt.allergies, matricule: pt.matricule, adresse: pt.adresse };
}

function fr(iso: string) { const [y, m, d] = iso.slice(0, 10).split("-"); return `${d}/${m}/${y}`; }

export function fromLocal(p: PatientLocalPayload): PatientCtx {
  const age = ageAt(p.naissance, now());
  const meds = p.traitements.filter(Boolean).map((l) => { const m = l.match(/^([a-zéèêàç\-]+)\s*(\d+\s*(?:mg|g|µg|mcg|ui)?)?\s*[·,:-]?\s*(.*)$/i); return { dci: (m?.[1] ?? l).toLowerCase(), dosage: m?.[2]?.trim() || undefined, posologie: m?.[3]?.trim() || "selon ordonnance", chronique: true }; });
  const lines = [
    `${p.sexe === "F" ? "Femme" : "Homme"}, ${age} ans.${p.profession ? ` ${p.profession}.` : ""}`,
    p.antecedents.length ? `Antécédents : ${p.antecedents.join(" ; ")}.` : "Pas d'antécédent renseigné.",
    p.allergies.length ? `Allergies : ${p.allergies.join(", ")}.` : "Pas d'allergie connue.",
    p.traitements.length ? `Traitement en cours : ${p.traitements.join(" ; ")}.` : "Pas de traitement en cours.",
    ...p.notes.map((n) => `Consultation du ${fr(n.date)}${n.motif ? ` (${n.motif})` : ""} : ${n.synthese}`),
  ];
  return { id: p.id, local: true, nom: `${p.prenomUsuel} ${p.nomUsage}`, prenom: p.prenomUsuel, sexe: p.sexe, age, naissance: fr(p.naissance), href: `/d/${p.id}`, ehr: lines.join("\n"), allergies: p.allergies, meds, chronique: p.antecedents[0] };
}

export function fromDataset(id: string): PatientCtx | undefined {
  const d = getDossier(id);
  if (!d) return undefined;
  const p = d.patient;
  const lab = recordsOf(d, "lab").sort((a, b) => b.prelevementLe.localeCompare(a.prelevementLe))[0];
  return {
    id, local: false, nom: displayName(p), prenom: p.prenomUsuel, sexe: p.ins.sexe, age: ageAt(p.ins.dateNaissance, now()), naissance: fr(p.ins.dateNaissance), href: `/p/${id}`, ehr: toPatientEhr(d, now()),
    allergies: recordsOf(d, "allergy").map((a) => a.substance),
    meds: recordsOf(d, "medication").filter((m) => m.status === "actif").map((m) => ({ dci: m.dci, dosage: m.dosage, posologie: m.posologie, chronique: m.type === "chronique" })),
    chronique: recordsOf(d, "problem").find((x) => x.enAvant && x.evolution === "chronique")?.libelle,
    lastLabNormal: lab ? lab.resultats.every((r) => r.flag === "normal") : undefined,
    matricule: p.ins.matricule,
    adresse: p.contact.adresse ? `${p.contact.adresse.ligne1}, ${p.contact.adresse.codePostal} ${p.contact.adresse.ville}` : undefined,
  };
}

export function resolvePatient(input: ComposeInput): PatientCtx | undefined {
  if (input.patient && (!input.patientId || input.patientId === input.patient.id)) return fromLocal(input.patient);
  if (input.patientId) return fromDataset(input.patientId);
  return undefined;
}
