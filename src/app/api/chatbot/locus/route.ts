import { chatbot } from "@/i18n";
import { donneesReelles, guardLive } from "@/lib/server/guard";
import type { FormAnswer } from "@/sandbox/chatbot/events";
import type { LocusSettings } from "@/sandbox/chatbot/request";
import { langOf, lireCorps, MAX_QUESTION, ndjson, TROP_GROS, une } from "../_lib/http";
import { locusStream } from "../_lib/locus";

export const dynamic = "force-dynamic";
// Comme B2Pro : le mode approfondi et la reprise d'un formulaire dépassent souvent la minute.
export const maxDuration = 300;

/**
 * Colonne Locus du chatbot sourcé. Corps : `{ lang, query, settings }`, ou
 * `{ lang, reprise: { token, answers } }` pour répondre au formulaire
 * d'élicitation. Réponse : NDJSON (`src/sandbox/chatbot/events.ts`).
 * Sans core configuré, ou core en panne : une ligne `error`, jamais de
 * réponse de repli.
 */
export async function POST(req: Request) {
  const g = await guardLive(req);
  if (!g.ok) return g.response;
  const lu = await lireCorps(req);
  if (lu === TROP_GROS) return Response.json({ error: chatbot.fr.live.tooLong }, { status: 413 });
  const body = (lu ?? {}) as { lang?: string; query?: unknown; settings?: Partial<LocusSettings>; reprise?: { token?: unknown; answers?: unknown } };
  const lang = langOf(body.lang);

  if (body.reprise && typeof body.reprise.token === "string" && Array.isArray(body.reprise.answers)) {
    const answers = (body.reprise.answers as FormAnswer[]).slice(0, 20).map((a) => ({ i: Number(a?.i), values: Array.isArray(a?.values) ? a.values.slice(0, 20).map(String) : [], skipped: !!a?.skipped }));
    return ndjson(locusStream({ lang, reprise: { token: body.reprise.token, answers }, signal: req.signal }), lang);
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) return Response.json({ error: chatbot[lang].live.empty }, { status: 400 });
  if (query.length > MAX_QUESTION) return Response.json({ error: chatbot[lang].live.tooLong }, { status: 413 });
  const reel = donneesReelles(query);
  if (reel) return ndjson(une({ t: "error", detail: reel, code: "donnees_reelles" }), lang);
  const s = body.settings ?? {};
  const settings: LocusSettings = { elic: !!s.elic, desamb: !!s.desamb, deep: !!s.deep };
  return ndjson(locusStream({ lang, query, settings, signal: req.signal }), lang);
}
