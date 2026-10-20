import { coreConfig } from "@/locus/config";
import { sources } from "@/locus/client.server";
import { liveLocked } from "@/lib/server/guard";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * L'état du branchement à core. En production : `{ ok }` seulement, sans
 * URL, mode ni sources (rien qui décrive l'infrastructure).
 */
export async function GET() {
  if (liveLocked()) return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  const cfg = coreConfig();
  let health: unknown = null;
  if (cfg.mode !== "simulation") {
    health = await fetch(cfg.url + "/health", { signal: AbortSignal.timeout(4000) }).then((r) => r.json()).catch(() => ({ status: "injoignable" }));
  }
  return Response.json({ ok: true, mode: cfg.mode, url: cfg.mode === "simulation" ? null : cfg.url, health, sources: await sources(cfg) });
}
