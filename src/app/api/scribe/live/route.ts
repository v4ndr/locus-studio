import { guardLive } from "@/lib/server/guard";
import type { LiveProbe } from "@/data/scribe/live";

export const dynamic = "force-dynamic";

/**
 * Le scribe peut-il passer en direct pour ce navigateur ? 403 `live_locked`
 * tant que le compte n'est pas ouvert : la page garde alors la consultation
 * en direct verrouillée. `dictee` : la transcription au micro est configurée.
 */
export async function GET(req: Request) {
  const g = await guardLive(req);
  if (!g.ok) return g.response;
  const body: LiveProbe = { live: !g.replay, dictee: !g.replay && !!process.env.MISTRAL_API_KEY?.trim() };
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}
