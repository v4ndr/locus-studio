import type { Dossier, DossierRecord, Appointment, Proposal, Message, LabReport, ClinicalDocument, Briefing, LivingSummary, Patient, RecordKind, JournalEntry } from "@/domain/types";
import { dossierDelacroix } from "./patients/delacroix";
import { dossierGarnier } from "./patients/garnier";
import { dossierMoreau } from "./patients/moreau";
import { dossierVasseur } from "./patients/vasseur";
import { dossierPerrin } from "./patients/perrin";
import { dossierMarchand } from "./patients/marchand";
import { dossierRoussel } from "./patients/roussel";
import { dossierCMoreau } from "./patients/cmoreau";
import { dossiersSecondaires } from "./patients/secondaires";
import { TODAY } from "./clock";

export { CABINET, DR_LAURENT, AUTONOMY_LAURENT } from "./cabinet";
export { NOW_ISO, TODAY, now, day, at } from "./clock";

/** La patientèle — en mémoire. Le studio est une maquette : pas de base. */
export const DOSSIERS: Dossier[] = [dossierCMoreau, dossierDelacroix, dossierGarnier, dossierMoreau, dossierVasseur, dossierPerrin, dossierMarchand, dossierRoussel, ...dossiersSecondaires];

const byId = new Map(DOSSIERS.map((d) => [d.patient.id, d]));

export function getDossier(id: string): Dossier | undefined {
  return byId.get(id);
}

export function patients(): Patient[] {
  return DOSSIERS.map((d) => d.patient).sort((a, b) => a.nomUsage.localeCompare(b.nomUsage, "fr"));
}

export function recordsOf<K extends RecordKind>(d: Dossier, kind: K): Extract<DossierRecord, { kind: K }>[] {
  return d.records.filter((r) => r.kind === kind) as unknown as Extract<DossierRecord, { kind: K }>[];
}

export function findRecord(id: string): { dossier: Dossier; record: DossierRecord } | undefined {
  for (const d of DOSSIERS) {
    if (d.patient.id === id) return { dossier: d, record: d.patient };
    const r = d.records.find((x) => x.id === id);
    if (r) return { dossier: d, record: r };
  }
  return undefined;
}

/** L'agenda du jour, trié. */
export function todayAppointments(): { appointment: Appointment; dossier: Dossier; briefing?: Briefing }[] {
  const out: { appointment: Appointment; dossier: Dossier; briefing?: Briefing }[] = [];
  for (const d of DOSSIERS) {
    for (const a of recordsOf(d, "appointment")) {
      if (a.debut.startsWith(TODAY)) out.push({ appointment: a, dossier: d, briefing: a.preparationId ? recordsOf(d, "briefing").find((b) => b.id === a.preparationId) : undefined });
    }
  }
  return out.sort((x, y) => x.appointment.debut.localeCompare(y.appointment.debut));
}

export type InboxItem =
  | { kind: "lab"; at: string; dossier: Dossier; record: LabReport }
  | { kind: "document"; at: string; dossier: Dossier; record: ClinicalDocument }
  | { kind: "message"; at: string; dossier: Dossier; record: Message };

/** La boîte de réception : tout ce qui est arrivé et n'a pas été vu. */
export function inbox(): InboxItem[] {
  const out: InboxItem[] = [];
  for (const d of DOSSIERS) {
    for (const r of recordsOf(d, "lab")) if (!r.vuLe) out.push({ kind: "lab", at: r.recuLe, dossier: d, record: r });
    for (const r of recordsOf(d, "document")) if (!r.vuLe) out.push({ kind: "document", at: r.recuLe, dossier: d, record: r });
    for (const r of recordsOf(d, "message")) if (!r.luLe && r.de.type !== "agent" && r.de.type !== "praticien") out.push({ kind: "message", at: r.date, dossier: d, record: r });
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

/** Toutes les propositions, avec leur dossier. */
export function proposals(filter?: (p: Proposal) => boolean): { proposal: Proposal; dossier: Dossier }[] {
  const out: { proposal: Proposal; dossier: Dossier }[] = [];
  for (const d of DOSSIERS) for (const p of recordsOf(d, "proposal")) if (!filter || filter(p)) out.push({ proposal: p, dossier: d });
  return out.sort((a, b) => b.proposal.createdAt.localeCompare(a.proposal.createdAt));
}

export function pendingProposals() {
  return proposals((p) => p.etat === "a-valider");
}

export function summaryOf(d: Dossier): LivingSummary | undefined {
  return recordsOf(d, "summary")[0];
}

/** Le journal du cabinet (tous patients), le plus récent d'abord. */
export function journal(): (JournalEntry & { dossier?: Dossier })[] {
  const out: (JournalEntry & { dossier?: Dossier })[] = [];
  for (const d of DOSSIERS) for (const j of d.journal) out.push({ ...j, dossier: d });
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

export function displayName(p: Patient): string {
  return `${p.prenomUsuel} ${p.nomUsage}`;
}
