import "server-only";
import { userAuthHeaders, coreConfig, paths, type CoreConfig } from "./config";
import { readNdjson } from "./ndjson";
import { toPublic, type LogicComputeRequest, type LogicComputeResponse, type RetrieveRequest, type RetrieveResponse, type RetrieveSpecialite, type RetrieveRubric, type StreamEvent, type StudioStreamEvent, type RetrieveSource } from "./contract";

/**
 * Le client locus-core du studio. Toujours côté serveur : la clé `lsk_` ne
 * franchit jamais le navigateur. Pas de réponse de repli : sans core, ou
 * core en panne, l'appel échoue et l'écran le dit, avec de quoi réessayer.
 */

const STUDIO_VERSION = "0.1.0";
/** Le seul message d'erreur qui sort : ni URL de core, ni flag, ni détail de pipeline. */
export const INDISPONIBLE = "Locus est momentanément indisponible. Réessayez.";

/** Core n'a pas répondu (absent, injoignable, en erreur) : les routes en font un 503 lisible. */
export class CoreIndisponible extends Error {
  constructor(detail = INDISPONIBLE) { super(detail); this.name = "CoreIndisponible"; }
}

/**
 * Les lignes brutes de `/v2/retrieve/stream`, telles que core les envoie.
 * Reste côté serveur : la ligne `done` y porte encore les règles (MKU). Une
 * défaillance (core absent, injoignable, en erreur) sort en ligne `error`
 * au message unique `INDISPONIBLE`, le détail reste dans les journaux.
 */
async function* fluxBrut(req: RetrieveRequest, cfg: CoreConfig): AsyncGenerator<StreamEvent> {
  if (cfg.mode === "absent") {
    console.error("[locus] LOCUS_CORE_URL absent : aucun core configuré");
    yield { step: "error", detail: INDISPONIBLE };
    return;
  }
  const p = paths(cfg);
  const body = cfg.mode === "keyless"
    ? { query: req.query, patient_ehr: req.patient_ehr, history: req.history ?? [], mode: req.mode ?? "rapide", sources: req.sources, exclude_sources: req.exclude_sources, deliberate: req.deliberate ?? false }
    : { ...req, history: req.history ?? [], app_version: STUDIO_VERSION, app_platform: "web", app_surface: req.app_surface ?? "studio" };
  let res: Response;
  try {
    res = await fetch(cfg.url + p.retrieve, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/x-ndjson", ...(await userAuthHeaders(cfg)) },
      body: JSON.stringify(body),
      redirect: "manual",
    });
  } catch (e) {
    console.error("[locus] injoignable", e);
    yield { step: "error", detail: INDISPONIBLE };
    return;
  }
  if (res.status === 302 || res.status === 303) {
    // Sandbox de core derrière une session admin : lancer core avec MCP_OAUTH_ENABLED=false, ou renseigner LOCUS_API_KEY.
    console.error("[locus] redirection", res.status, res.headers.get("location"));
    yield { step: "error", detail: INDISPONIBLE };
    return;
  }
  if (!res.ok || !res.body) {
    const txt = await res.text().catch(() => "");
    console.error("[locus]", res.status, txt.slice(0, 300));
    yield { step: "error", detail: INDISPONIBLE };
    return;
  }
  for await (const ev of readNdjson<StreamEvent>(res.body)) {
    if (ev.step === "error") {
      console.error("[locus] erreur de flux", (ev as { detail?: string }).detail);
      yield { step: "error", detail: INDISPONIBLE };
      return;
    }
    yield ev;
  }
}

export async function* retrieveStream(req: RetrieveRequest, cfg: CoreConfig = coreConfig()): AsyncGenerator<StudioStreamEvent> {
  for await (const ev of fluxBrut(req, cfg)) {
    switch (ev.step) {
      case "progress":
        yield { step: "progress", etape: String((ev as { etape?: string }).etape ?? "") };
        break;
      case "reflexion":
        yield { step: "reflexion", titre: String((ev as { titre?: string }).titre ?? "") };
        break;
      case "retrieval":
        yield { step: "retrieval", docs: Number((ev as { docs?: number }).docs ?? 0), chunks: Number((ev as { chunks?: number }).chunks ?? 0) };
        break;
      case "query_maker":
        /* La reformulation est de la PI Locus : elle ne sort pas du serveur. */
        break;
      case "answer":
        yield { step: "answer", answer: String((ev as { answer?: string }).answer ?? "") };
        break;
      case "done":
        yield { step: "done", payload: toPublic((ev as { payload: Parameters<typeof toPublic>[0] }).payload, "locus-core") };
        break;
      case "error":
        yield { step: "error", detail: INDISPONIBLE };
        break;
      default:
        /* route, rcp, drugs, logic… : du détail de pipeline, pas une étape produit. */
        break;
    }
  }
}

/**
 * La réponse complète de core (la ligne `done`), règles comprises, pour un
 * appelant serveur qui en tire lui-même une réponse publique (citations
 * résolues, renumérotées, sans identifiant de règle). `null` si core n'a pas
 * répondu jusqu'au bout. Ne jamais la renvoyer telle quelle au navigateur.
 */
export async function retrieveComplet(req: RetrieveRequest, cfg: CoreConfig = coreConfig()): Promise<RetrieveResponse | null> {
  for await (const ev of fluxBrut(req, cfg)) {
    if (ev.step === "error") return null;
    if (ev.step === "done") return (ev as { payload: RetrieveResponse }).payload ?? null;
  }
  console.error("[locus] flux terminé sans ligne done");
  return null;
}

/** La fiche d'une spécialité ; `null` si core ne la connaît pas (404). Toute autre défaillance lève `CoreIndisponible`. */
export async function specialite(cis: string, cfg: CoreConfig = coreConfig()): Promise<RetrieveSpecialite | null> {
  if (cfg.mode === "absent") throw new CoreIndisponible();
  const res = await fetch(cfg.url + paths(cfg).specialite(cis), { headers: await userAuthHeaders(cfg), redirect: "manual", signal: AbortSignal.timeout(15_000) }).catch((e) => { console.error("[locus] spécialité injoignable", e); return null; });
  if (res?.status === 404) return null;
  if (!res || !res.ok) { if (res) console.error("[locus] spécialité", res.status); throw new CoreIndisponible(); }
  return (await res.json()) as RetrieveSpecialite;
}

export async function rubric(id: string, cfg: CoreConfig = coreConfig()): Promise<RetrieveRubric | null> {
  if (cfg.mode === "absent") throw new CoreIndisponible();
  const res = await fetch(cfg.url + paths(cfg).rubric(id), { headers: await userAuthHeaders(cfg), redirect: "manual", signal: AbortSignal.timeout(15_000) }).catch(() => null);
  if (res?.status === 404) return null;
  if (!res || !res.ok) throw new CoreIndisponible();
  return (await res.json()) as RetrieveRubric;
}

/** Les scores et arbres de core : déterministes, sans modèle, mais servis par `/v2/logic/compute` seulement (clé requise). */
export async function logicCompute(req: LogicComputeRequest, cfg: CoreConfig = coreConfig()): Promise<LogicComputeResponse> {
  if (cfg.mode !== "core") { console.error("[locus] logic : LOCUS_API_KEY requise"); throw new CoreIndisponible(); }
  const res = await fetch(cfg.url + paths(cfg).logic, { method: "POST", headers: { "Content-Type": "application/json", ...(await userAuthHeaders(cfg)) }, body: JSON.stringify(req), signal: AbortSignal.timeout(20_000) }).catch((e) => { console.error("[locus] logic injoignable", e); return null; });
  if (!res || !res.ok) { if (res) console.error("[locus] logic", res.status, (await res.text().catch(() => "")).slice(0, 300)); throw new CoreIndisponible(); }
  return (await res.json()) as LogicComputeResponse;
}

/** Les sources indexées par core ; vide sans clé (la Sandbox keyless ne les expose pas) ou si core ne répond pas. */
export async function sources(cfg: CoreConfig = coreConfig()): Promise<RetrieveSource[]> {
  if (cfg.mode !== "core") return [];
  const res = await fetch(cfg.url + paths(cfg).sources, { headers: await userAuthHeaders(cfg), signal: AbortSignal.timeout(4000) }).catch(() => null);
  if (!res || !res.ok) return [];
  return (await res.json()) as RetrieveSource[];
}

/** Vrai seulement si core a pris le vote en compte. */
export async function feedback(traceId: string, vote: -1 | 0 | 1, note?: string, cfg: CoreConfig = coreConfig()): Promise<boolean> {
  if (cfg.mode !== "core" || !traceId) return false;
  const res = await fetch(cfg.url + paths(cfg).feedback, { method: "POST", headers: { "Content-Type": "application/json", ...(await userAuthHeaders(cfg)) }, body: JSON.stringify({ trace_id: traceId, vote, note }) }).catch(() => null);
  return !!res && res.ok;
}
