import type { BaseRecord, DossierRecord, JournalEntry, Provenance, RecordKind, RecordStatus } from "@/domain/types";
import { NOW_ISO } from "./clock";

/**
 * Le constructeur d'enregistrements du jeu de données : une enveloppe
 * cohérente (id lisible, dates, provenance) sans répéter trente lignes.
 */
type OfKind<K extends RecordKind> = Extract<DossierRecord, { kind: K }>;
type Body<T extends DossierRecord> = Omit<T, keyof BaseRecord | "kind"> & Partial<Pick<BaseRecord, "status" | "tags" | "createdAt" | "updatedAt" | "supersedes">>;

const counters = new Map<string, number>();

export function rec<K extends RecordKind>(
  kind: K,
  patientId: string,
  provenance: Provenance,
  body: Body<OfKind<K>>,
  opts: { id?: string; status?: RecordStatus; at?: string } = {},
): OfKind<K> {
  type T = OfKind<K>;
  const key = `${patientId}:${kind}`;
  const n = (counters.get(key) ?? 0) + 1;
  counters.set(key, n);
  const at = opts.at ?? body.createdAt ?? NOW_ISO;
  const { status, tags, createdAt, updatedAt, supersedes, ...rest } = body as Record<string, unknown>;
  return {
    id: opts.id ?? `${patientId}.${kind}.${n}`,
    kind,
    patientId,
    schema: 1,
    createdAt: createdAt ?? at,
    updatedAt: updatedAt ?? at,
    supersedes,
    provenance,
    status: opts.status ?? status ?? "actif",
    tags,
    ...rest,
  } as unknown as T;
}

/* Provenances usuelles. */
export const P = {
  medecin: (validatedAt?: string): Provenance => ({ origin: "praticien", actor: "pr_laurent", validatedBy: "pr_laurent", validatedAt }),
  agent: (confidence: number, derivedFrom?: string[]): Provenance => ({ origin: "agent", actor: "locus", confidence, derivedFrom }),
  agentValide: (confidence: number, validatedAt: string, derivedFrom?: string[]): Provenance => ({ origin: "agent", actor: "locus", confidence, derivedFrom, validatedBy: "pr_laurent", validatedAt }),
  patient: (): Provenance => ({ origin: "patient" }),
  import: (actor: string): Provenance => ({ origin: "import", actor }),
  systeme: (actor: string): Provenance => ({ origin: "systeme", actor }),
};

let journalN = 0;
export function journal(patientId: string | undefined, at: string, acteur: JournalEntry["acteur"], action: string, detail?: string, recordId?: string): JournalEntry {
  journalN += 1;
  return { id: `j${journalN}`, patientId, at, acteur, action, detail, recordId };
}

export const LOCUS = { type: "agent" as const, nom: "Locus" };
export const LAURENT = { type: "praticien" as const, nom: "Dr Laurent" };
export const SYS = (nom: string) => ({ type: "systeme" as const, nom });
