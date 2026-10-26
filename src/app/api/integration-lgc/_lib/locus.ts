import "server-only";
import { coreConfig, paths, userAuthHeaders } from "@/locus/config";
import { readNdjson } from "@/locus/ndjson";
import { stripRuleIds } from "@/locus/contract";
import { patientEhr, type FieldKey } from "@/data/integration-lgc/fournier";
import { json } from "./request";

/**
 * L'appel à core des briques MédiCab 7 qui posent une question clinique
 * (contrôle d'ordonnance, question à Locus) : `/v2/retrieve/stream` avec le
 * dossier transmis (seulement les champs cochés, sans nom) et
 * `app_surface:"studio-ehr"`. La synthèse du dossier ne passe pas ici.
 *
 * Le `done` brut de core reste sur le serveur : il sert à relier chaque
 * renvoi de la réponse (règle, document, RCP, tableau) au document qui le
 * porte. Seuls ces documents cités sortent, sous forme de libellé ; ni les
 * identifiants de règles, ni la liste des documents retrouvés.
 * Pas de sortie de repli : sans core, ou quand core ne répond pas, la route
 * renvoie une erreur et la carte Locus le dit, avec « Réessayer ».
 */

export const APP_SURFACE = "studio-ehr";
const APP_VERSION = "0.1.0";

/** Vrai quand un core est configuré (clé ou Sandbox keyless) : sans URL, il n'y a rien à appeler. */
export const coreDisponible = () => !!coreConfig().url;

/** Codes d'erreur lus par le navigateur (`src/sandbox/integration-lgc/api.ts`). */
export type CoreErrorCode = "core_unconfigured" | "core_unavailable";

export class CoreError extends Error {
  constructor(readonly code: CoreErrorCode) { super(code); }
}

/** La réponse d'erreur d'une route pour un échec de core : 503 sans core, 502 quand il ne répond pas. */
export function coreErrorResponse(e: unknown): Response {
  if (e instanceof CoreError && e.code === "core_unconfigured") return json({ error: "Locus n'est pas configuré sur ce serveur.", code: e.code }, 503);
  return json({ error: "Locus n'a pas répondu. Réessayez.", code: "core_unavailable" }, 502);
}

export interface LocusReply { lines: string[]; short: string; answer: string; sources: string[] }

/** Le `done` de core, réduit à ce qu'il faut pour relier les renvois aux documents. */
interface Done {
  answer?: string;
  answer_short?: string;
  docs?: { id: string; title?: string; year?: number; source_id?: string; source_name?: string }[];
  mkus?: { id: string; doc_id?: string; doc_title?: string }[];
  tables?: { id: string; doc_id?: string; doc_title?: string }[];
  rcp?: { id: string; specialite?: string; dci?: string }[];
}

/** Au plus deux documents sous une carte : au-delà, c'est une bibliographie, pas une carte. */
const MAX_SOURCES = 2;

/**
 * Les documents que la réponse cite, dans l'ordre de première citation.
 * Une règle `(hex16)` renvoie au document qui la porte ; `[doc_id]`,
 * `[rcp:…]` et `[table:…]` aussi. Un document retrouvé mais jamais cité
 * ne sort pas : c'est ce qui faisait afficher un document hors sujet.
 */
export function sourcesCitees(p: Done): string[] {
  const docs = new Map((p.docs ?? []).map((d) => [String(d.id), d]));
  const mkus = new Map((p.mkus ?? []).map((m) => [m.id, m]));
  const tables = new Map((p.tables ?? []).map((t) => [t.id, t]));
  const rcps = new Map((p.rcp ?? []).map((r) => [r.id, r]));
  const out: string[] = [];
  const add = (label?: string) => { if (label && !out.includes(label)) out.push(label.slice(0, 90)); };
  const doc = (id?: string, titre?: string) => {
    if (!id) return undefined;
    const d = docs.get(String(id));
    const title = d?.title ?? titre;
    if (!title) return undefined;
    const editeur = d?.source_name || d?.source_id?.replace(/[-_].*$/, "") || "HAS";
    return `${editeur} · ${title}${d?.year ? `, ${d.year}` : ""}`;
  };
  // Les renvois, dans l'ordre du texte : règles entre parenthèses, le reste entre crochets.
  for (const m of (p.answer ?? "").matchAll(/\(((?:[0-9a-f]{16})(?:,\s*[0-9a-f]{16})*)\)|\[([^\]\s]{1,80})\]/g)) {
    if (m[1]) {
      for (const id of m[1].split(/,\s*/)) { const r = mkus.get(id); add(doc(r?.doc_id, r?.doc_title)); }
    } else if (m[2].startsWith("rcp:")) {
      const r = rcps.get(m[2].slice(4));
      if (r) add(`ANSM · RCP ${r.specialite ?? r.dci ?? ""}`.trim());
    } else if (m[2].startsWith("table:")) {
      const t = tables.get(m[2].slice(6));
      add(doc(t?.doc_id, t?.doc_title));
    } else add(doc(m[2]));
  }
  return out.slice(0, MAX_SOURCES);
}

/** Le markdown de core en lignes lisibles dans une carte : sans titres, puces ni renvois ; le texte d'un lien reste. */
function lignes(md: string): string[] {
  return stripRuleIds(md)
    .replace(/\[([^\]]*)\]\((?:[^)]*)\)/g, "$1")
    .replace(/\s?\[[^\]]{1,80}\]/g, "")
    .split(/\n+/)
    .map((l) => l.replace(/^#+\s*/, "").replace(/^[-*•]\s+/, "").replace(/\*\*|__|`/g, "").trim())
    .filter((l) => l.length > 1)
    .slice(0, 6);
}

/** Une question clinique à core sur le dossier transmis. Lève `CoreError` quand il n'y a pas de réponse. */
export async function askLocus(question: string, fields: readonly FieldKey[]): Promise<LocusReply> {
  const cfg = coreConfig();
  if (!cfg.url) throw new CoreError("core_unconfigured");
  const ehr = patientEhr(fields);
  const body = cfg.mode === "keyless"
    ? { query: question, patient_ehr: ehr, history: [], mode: "rapide" }
    : { query: question, patient_ehr: ehr, history: [], mode: "rapide", app_version: APP_VERSION, app_platform: "web", app_surface: APP_SURFACE };
  let done: Done | null = null;
  try {
    const res = await fetch(cfg.url + paths(cfg).retrieve, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/x-ndjson", ...(await userAuthHeaders(cfg)) },
      body: JSON.stringify(body),
      redirect: "manual",
      signal: AbortSignal.timeout(55_000),
    });
    if (!res.ok || !res.body) {
      console.error("[integration-lgc] core", res.status, (await res.text().catch(() => "")).slice(0, 300));
      throw new CoreError("core_unavailable");
    }
    for await (const ev of readNdjson<{ step: string; payload?: Done; detail?: string }>(res.body)) {
      if (ev.step === "error") { console.error("[integration-lgc] erreur de flux", ev.detail); throw new CoreError("core_unavailable"); }
      if (ev.step === "done" && ev.payload) done = ev.payload;
    }
  } catch (e) {
    if (!(e instanceof CoreError)) console.error("[integration-lgc] core", e);
    throw e instanceof CoreError ? e : new CoreError("core_unavailable");
  }
  const answer = done?.answer ?? "";
  const short = stripRuleIds(done?.answer_short ?? "").replace(/\s?\[[^\]]{1,80}\]/g, "").trim();
  const l = lignes(answer);
  if (!done || (!l.length && !short)) throw new CoreError("core_unavailable");
  return { lines: l.length ? l : [short], short: short || l[0], answer, sources: sourcesCitees(done) };
}
