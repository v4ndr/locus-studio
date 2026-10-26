import { CoreIndisponible, logicCompute } from "@/locus/client.server";
import type { LogicComputeRequest } from "@/locus/contract";
import { guardLive, mkuAutorisee } from "@/lib/server/guard";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Relais vers `/v2/logic/compute`, limité aux unités logiques que Studio utilise (liste blanche). */
export async function POST(req: Request) {
  const g = await guardLive(req);
  if (!g.ok) return g.response;
  const body = (await req.json().catch(() => null)) as { mku_key?: unknown; answers?: unknown; checked?: unknown; level?: unknown } | null;
  if (!body?.mku_key) return Response.json({ error: "mku_key manquante" }, { status: 400 });
  if (!mkuAutorisee(body.mku_key)) return Response.json({ error: "Unité logique non disponible." }, { status: 400 });
  const answers: Record<string, string> = {};
  if (body.answers && typeof body.answers === "object" && !Array.isArray(body.answers)) {
    for (const [k, v] of Object.entries(body.answers).slice(0, 60)) if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") answers[k.slice(0, 80)] = String(v).slice(0, 200);
  }
  const checked = Array.isArray(body.checked) ? body.checked.filter((x): x is string => typeof x === "string").slice(0, 50) : [];
  const level = typeof body.level === "string" ? body.level : undefined;
  const req2: LogicComputeRequest = { mku_key: body.mku_key, answers, checked, level };
  // L'identifiant interne de l'unité logique (PI Locus) ne sort pas : la clé publique suffit.
  try {
    const { mku_id: _id, ...res } = await logicCompute(req2);
    return Response.json(res);
  } catch (e) {
    if (e instanceof CoreIndisponible) return Response.json({ error: e.message, code: "locus_indisponible" }, { status: 503 });
    throw e;
  }
}
