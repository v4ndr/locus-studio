import { coreConfig } from "@/locus/config";
import { sources } from "@/locus/client.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const cfg = coreConfig();
  let health: unknown = null;
  if (cfg.mode !== "simulation") {
    health = await fetch(cfg.url + "/health", { signal: AbortSignal.timeout(4000) }).then((r) => r.json()).catch(() => ({ status: "injoignable" }));
  }
  return Response.json({ mode: cfg.mode, url: cfg.mode === "simulation" ? null : cfg.url, health, sources: await sources(cfg) });
}
