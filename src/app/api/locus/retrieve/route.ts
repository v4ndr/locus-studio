import { retrieveStream } from "@/locus/client.server";
import { ndjsonResponse } from "@/locus/ndjson";
import { toPatientEhr } from "@/locus/ehr";
import { getDossier } from "@/data";
import { now } from "@/data/clock";
import { guardLive } from "@/lib/server/guard";
import type { RetrieveTurn } from "@/locus/contract";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Le BFF du studio vers locus-core. Le navigateur envoie une question et un
 * identifiant de patient ; le serveur projette le dossier en `patient_ehr`,
 * interroge core (ou la simulation) et rediffuse les étapes. Les règles
 * (MKU) sont retirées avant le navigateur.
 */
export async function POST(req: Request) {
  const g = await guardLive(req);
  if (!g.ok) return g.response;
  const body = (await req.json().catch(() => ({}))) as { query?: string; patientId?: string; history?: RetrieveTurn[]; mode?: "rapide" | "approfondi"; sources?: string[] };
  const query = (typeof body.query === "string" ? body.query : "").trim();
  if (!query) return Response.json({ error: "query manquante" }, { status: 400 });
  if (query.length > 2_000) return Response.json({ error: "Question trop longue." }, { status: 413 });
  const dossier = typeof body.patientId === "string" ? getDossier(body.patientId) : undefined;
  const patient_ehr = dossier ? toPatientEhr(dossier, now()) : undefined;
  const history = Array.isArray(body.history) ? body.history.slice(-10) : undefined;
  const sources = Array.isArray(body.sources) ? body.sources.filter((s): s is string => typeof s === "string").slice(0, 20) : undefined;
  const mode = body.mode === "approfondi" ? "approfondi" : "rapide";
  return ndjsonResponse(retrieveStream({ query, patient_ehr, history, mode, sources }, g.replay ? { mode: "simulation", url: "" } : undefined));
}
