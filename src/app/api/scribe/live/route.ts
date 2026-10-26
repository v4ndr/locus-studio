import { guardLive } from "@/lib/server/guard";
import type { LiveProbe } from "@/data/scribe/live";

export const dynamic = "force-dynamic";

/**
 * Ce que le scribe peut proposer sur ce déploiement : `dictee`, la
 * transcription au micro est configurée. Sans elle, la consultation au
 * micro se saisit ou se colle ; la génération, elle, est toujours en direct.
 */
export async function GET(req: Request) {
  const g = await guardLive(req);
  if (!g.ok) return g.response;
  const body: LiveProbe = { dictee: !!process.env.MISTRAL_API_KEY?.trim() };
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}
