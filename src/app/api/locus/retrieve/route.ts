import { retrieveStream } from "@/locus/client.server";
import { ndjsonResponse } from "@/locus/ndjson";
import { toPatientEhr } from "@/locus/ehr";
import { getDossier } from "@/data";
import { now } from "@/data/clock";
import type { RetrieveTurn } from "@/locus/contract";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Le BFF du studio vers locus-core. Le navigateur envoie une question et un
 * identifiant de patient ; le serveur projette le dossier en `patient_ehr`,
 * interroge core (ou la simulation) et rediffuse les étapes. Les règles
 * (MKU) sont retirées avant le navigateur.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { query?: string; patientId?: string; history?: RetrieveTurn[]; mode?: "rapide" | "approfondi"; sources?: string[] };
  const query = (body.query ?? "").trim();
  if (!query) return Response.json({ error: "query manquante" }, { status: 400 });
  const dossier = body.patientId ? getDossier(body.patientId) : undefined;
  const patient_ehr = dossier ? toPatientEhr(dossier, now()) : undefined;
  return ndjsonResponse(retrieveStream({ query, patient_ehr, history: body.history, mode: body.mode ?? "rapide", sources: body.sources }));
}
