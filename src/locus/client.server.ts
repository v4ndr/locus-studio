import "server-only";
import { userAuthHeaders, coreConfig, paths, type CoreConfig } from "./config";
import { readNdjson } from "./ndjson";
import { toPublic, type LogicComputeRequest, type LogicComputeResponse, type RetrieveRequest, type RetrieveSpecialite, type RetrieveRubric, type StreamEvent, type StudioStreamEvent, type RetrieveSource } from "./contract";
import { simulateRetrieve, simulateSpecialite, simulateLogic } from "./simulation";

/**
 * Le client locus-core du studio. Toujours côté serveur : la clé `lsk_` ne
 * franchit jamais le navigateur. En l'absence de backend, chaque appel a
 * son équivalent simulé — le produit n'a pas de mode « cassé ».
 */

const STUDIO_VERSION = "0.1.0";
/** Le seul message d'erreur qui sort : ni URL de core, ni flag, ni détail de pipeline. */
const INDISPONIBLE = "Locus est momentanément indisponible. Réessayez.";

export async function* retrieveStream(req: RetrieveRequest, cfg: CoreConfig = coreConfig()): AsyncGenerator<StudioStreamEvent> {
  if (cfg.mode === "simulation") {
    yield* simulateRetrieve(req);
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
        console.error("[locus] erreur de flux", (ev as { detail?: string }).detail);
        yield { step: "error", detail: INDISPONIBLE };
        break;
      default:
        /* route, rcp, drugs, logic… : du détail de pipeline, pas une étape produit. */
        break;
    }
  }
}

export async function specialite(cis: string, cfg: CoreConfig = coreConfig()): Promise<RetrieveSpecialite | null> {
  if (cfg.mode === "simulation") return simulateSpecialite(cis);
  const res = await fetch(cfg.url + paths(cfg).specialite(cis), { headers: await userAuthHeaders(cfg), redirect: "manual" }).catch(() => null);
  if (!res || !res.ok) return simulateSpecialite(cis);
  return (await res.json()) as RetrieveSpecialite;
}

export async function rubric(id: string, cfg: CoreConfig = coreConfig()): Promise<RetrieveRubric | null> {
  if (cfg.mode === "simulation") return null;
  const res = await fetch(cfg.url + paths(cfg).rubric(id), { headers: await userAuthHeaders(cfg), redirect: "manual" }).catch(() => null);
  if (!res || !res.ok) return null;
  return (await res.json()) as RetrieveRubric;
}

export async function logicCompute(req: LogicComputeRequest, cfg: CoreConfig = coreConfig()): Promise<LogicComputeResponse> {
  if (cfg.mode !== "core") return simulateLogic(req);
  const res = await fetch(cfg.url + paths(cfg).logic, { method: "POST", headers: { "Content-Type": "application/json", ...(await userAuthHeaders(cfg)) }, body: JSON.stringify(req) }).catch(() => null);
  if (!res || !res.ok) return simulateLogic(req);
  return (await res.json()) as LogicComputeResponse;
}

export async function sources(cfg: CoreConfig = coreConfig()): Promise<RetrieveSource[]> {
  if (cfg.mode !== "core") return [{ id: "HAS", name: "Haute Autorité de Santé", docs: 0 }, { id: "ANSM", name: "ANSM", docs: 0 }, { id: "SPF", name: "Santé publique France", docs: 0 }];
  const res = await fetch(cfg.url + paths(cfg).sources, { headers: await userAuthHeaders(cfg) }).catch(() => null);
  if (!res || !res.ok) return [];
  return (await res.json()) as RetrieveSource[];
}

export async function feedback(traceId: string, vote: -1 | 0 | 1, note?: string, cfg: CoreConfig = coreConfig()): Promise<boolean> {
  if (cfg.mode !== "core" || !traceId) return true;
  const res = await fetch(cfg.url + paths(cfg).feedback, { method: "POST", headers: { "Content-Type": "application/json", ...(await userAuthHeaders(cfg)) }, body: JSON.stringify({ trace_id: traceId, vote, note }) }).catch(() => null);
  return !!res && res.ok;
}
