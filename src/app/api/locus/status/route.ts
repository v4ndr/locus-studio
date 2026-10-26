import { coreConfig } from "@/locus/config";
import { sources } from "@/locus/client.server";
import { liveLocked } from "@/lib/server/guard";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * L'état du branchement à core : `ok` vrai seulement si core répond à
 * `/health`. En production, `{ ok }` seulement, sans URL, mode ni sources
 * (rien qui décrive l'infrastructure).
 */
export async function GET() {
  const cfg = coreConfig();
  const health: unknown = cfg.mode === "absent" ? null : await fetch(cfg.url + "/health", { signal: AbortSignal.timeout(4000) }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const ok = !!health;
  const headers = { "Cache-Control": "no-store" };
  if (liveLocked()) return Response.json({ ok }, { status: ok ? 200 : 503, headers });
  return Response.json({ ok, mode: cfg.mode, url: cfg.mode === "absent" ? null : cfg.url, health, sources: ok ? await sources(cfg) : [] }, { status: ok ? 200 : 503, headers });
}
