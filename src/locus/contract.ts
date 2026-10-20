/**
 * Le contrat de locus-core, côté studio — le sous-ensemble que le LGC consomme.
 * Source de vérité : `locus-core/query/contracts/retrieve.py`, `logic.py`,
 * `query/services/stream.py`. Recopié à la main, volontairement partiel :
 * ce que le studio ne lit pas n'est pas typé.
 */

export interface RetrieveTurn {
  question: string;
  answer_short: string;
  precisions: string[];
}

export interface RetrieveRequest {
  query: string;
  /** Le dossier patient en texte libre — la seule entrée patient de core aujourd'hui. */
  patient_ehr?: string;
  history?: RetrieveTurn[];
  mode?: "rapide" | "approfondi";
  sources?: string[];
  exclude_sources?: string[];
  deliberate?: boolean;
  orchestrate?: boolean;
  include_usage?: boolean;
  app_version?: string;
  app_platform?: "web" | "ios" | "android";
  app_surface?: string;
  conversation_id?: string;
}

export interface RetrieveDoc {
  id: string;
  title?: string;
  year?: number;
  url?: string;
  summary?: string;
  source_id?: string;
  source_name?: string;
}

export interface RetrieveChunk {
  id: string;
  text: string;
  score?: number;
  doc_id?: string;
  doc_title?: string;
  section_title?: string;
}

export interface RetrieveRcp {
  id: string;
  concept_id?: string;
  dci: string;
  cis?: string;
  specialite?: string;
  code: string; // "4.3"
  label: string;
  text: string;
  excerpt?: string;
  url?: string;
  source_name?: string;
}

export interface RetrieveSpecialite {
  cis: string;
  label: string;
  forme?: string;
  voie?: string;
  dosage?: string;
  atc?: string[];
  n_rubrics?: number;
  rubrics?: RetrieveRubric[];
  unavailable_reason?: string;
  rcp_external_url?: string;
}

export interface RetrieveRubric {
  id: string;
  code: string;
  label: string;
  text: string;
  truncated?: boolean;
  blocks?: { kind: "prose" | "table"; text: string; table?: { columns: string[]; rows: string[][] } }[];
  source?: string;
  source_url?: string;
}

export interface RetrieveDrug {
  concept_id: string;
  dci: string;
  aliases?: string[];
  atc?: string[];
  mentions?: string[];
  reference?: RetrieveSpecialite;
  others?: RetrieveSpecialite[];
  others_total?: number;
}

export interface RetrieveResponse {
  trace_id: string;
  core_version: string;
  query: string;
  reformulated: string;
  ehr_summary: string;
  turn_kind: "nouvelle_question" | "precision_question" | "fait_patient";
  /** Un fait clinique nouveau, à ajouter au dossier côté client. */
  ehr_additions: string;
  answer: string; // markdown, citations (mku16hex) [doc_id] [rcp:sha] [table:id]
  answer_short: string;
  docs: RetrieveDoc[];
  chunks: RetrieveChunk[];
  drugs: RetrieveDrug[];
  rcp?: RetrieveRcp[];
  source_scope?: { include: string[]; exclude: string[] } | null;
  /** Les règles (MKU) — l'IP de Locus. Le BFF du studio les retire avant le navigateur. */
  mkus?: unknown[];
  elicitations?: unknown[];
  orchestration?: unknown;
  deliberation?: unknown;
}

export interface RetrieveSource {
  id: string;
  name?: string;
  docs: number;
}

export interface LogicComputeRequest {
  mku_key: string;
  answers: Record<string, string>;
  checked: string[];
  level?: string;
}

export interface LogicComputeResponse {
  mku_id: string;
  mku_key: string;
  type: "score" | "tree";
  titre: string;
  url?: string;
  computed: {
    total?: number;
    outcome?: string;
    description?: string;
    path?: string[];
    retained?: string[];
    reason?: string;
  };
  note?: string;
}

/** Les lignes NDJSON de `/v2/retrieve/stream` (et `/console/retrieve`). */
export type StreamEvent =
  | { step: "route"; intent?: string; routes?: string[] }
  | { step: "query_maker"; reformulated: string; ehr_summary?: string; turn_kind?: string; ehr_additions?: string; concept_terms?: string[]; rubric_codes?: string[] }
  | { step: "retrieval"; mkus?: number; chunks?: number; tables?: number; docs?: number }
  | { step: "progress"; etape: string }
  | { step: "rcp"; rubriques?: number; codes?: string[]; substances?: string[] }
  | { step: "reflexion"; titre: string; texte?: string }
  | { step: "answer"; answer: string }
  | { step: "drugs"; drugs?: number; noms?: string[] }
  | { step: "done"; payload: RetrieveResponse }
  | { step: "error"; detail: string; code?: string; known_sources?: string[] }
  | { step: string; [k: string]: unknown };

/**
 * Ce que le NAVIGATEUR reçoit du BFF du studio : la même suite d'événements,
 * à ceci près que `done` porte une réponse PUBLIQUE — sans MKU.
 */
export interface PublicRetrieve {
  traceId: string;
  coreVersion: string;
  reformulated: string;
  ehrSummary: string;
  ehrAdditions: string;
  answer: string;
  answerShort: string;
  docs: RetrieveDoc[];
  chunks: RetrieveChunk[];
  rcp: RetrieveRcp[];
  drugs: { dci: string; atc?: string[]; reference?: { cis: string; label: string } }[];
  /** Mode de production : vrai backend, ou simulation locale. */
  via: "locus-core" | "simulation";
}

export type StudioStreamEvent =
  | { step: "progress"; etape: string }
  | { step: "reflexion"; titre: string }
  | { step: "retrieval"; docs: number; chunks: number }
  | { step: "answer"; answer: string }
  | { step: "done"; payload: PublicRetrieve }
  | { step: "error"; detail: string };

export function toPublic(r: RetrieveResponse, via: PublicRetrieve["via"]): PublicRetrieve {
  return {
    traceId: r.trace_id ?? "",
    // Ni la version de core ni la reformulation (PI Locus) ne sortent du serveur.
    coreVersion: "",
    reformulated: "",
    ehrSummary: r.ehr_summary ?? "",
    ehrAdditions: r.ehr_additions ?? "",
    answer: stripRuleIds(r.answer ?? ""),
    answerShort: r.answer_short ?? "",
    docs: r.docs ?? [],
    chunks: (r.chunks ?? []).map((c) => ({ id: c.id, text: c.text, doc_id: c.doc_id, doc_title: c.doc_title, section_title: c.section_title })),
    rcp: (r.rcp ?? []).map((x) => ({ id: x.id, dci: x.dci, cis: x.cis, specialite: x.specialite, code: x.code, label: x.label, text: x.text, excerpt: x.excerpt, url: x.url, source_name: x.source_name })),
    drugs: (r.drugs ?? []).map((d) => ({ dci: d.dci, atc: d.atc, reference: d.reference ? { cis: d.reference.cis, label: d.reference.label } : undefined })),
    via,
  };
}

/** Les identifiants de règles (16 hex entre parenthèses) ne franchissent pas le navigateur. */
export function stripRuleIds(markdown: string): string {
  return markdown.replace(/\s?\((?:[0-9a-f]{16})(?:,\s*[0-9a-f]{16})*\)/g, "");
}
