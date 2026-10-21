import { chatbot } from "@/i18n";
import { donneesReelles, guardLive } from "@/lib/server/guard";
import type { FormAnswer } from "@/sandbox/chatbot/events";
import type { LocusSettings } from "@/sandbox/chatbot/request";
import { langOf, lireCorps, MAX_QUESTION, ndjson, TROP_GROS, une } from "../_lib/http";
import { locusStream } from "../_lib/locus";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Colonne Locus du chatbot sourcé. Corps : `{ lang, query, settings }`, ou
 * `{ lang, reprise: { token, answers } }` pour répondre au formulaire
 * d'élicitation. Réponse : NDJSON (`src/sandbox/chatbot/events.ts`).
 * En scénario rejoué (garde), ou sans core configuré : `{ t: "replay" }`.
 */
export async function POST(req: Request) {
  const g = await guardLive(req);
  if (!g.ok) return g.response;
  const lu = await lireCorps(req);
  if (lu === TROP_GROS) return Response.json({ error: chatbot.fr.live.tooLong }, { status: 413 });
  const body = (lu ?? {}) as { lang?: string; query?: unknown; settings?: Partial<LocusSettings>; reprise?: { token?: unknown; answers?: unknown } };
  const lang = langOf(body.lang);
  if (g.replay) return ndjson(une({ t: "replay" }), lang);

  if (body.reprise && typeof body.reprise.token === "string" && Array.isArray(body.reprise.answers)) {
    const answers = (body.reprise.answers as FormAnswer[]).slice(0, 20).map((a) => ({ i: Number(a?.i), values: Array.isArray(a?.values) ? a.values.slice(0, 20).map(String) : [], skipped: !!a?.skipped }));
    return ndjson(locusStream({ lang, reprise: { token: body.reprise.token, answers } }), lang);
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) return Response.json({ error: chatbot[lang].live.empty }, { status: 400 });
  if (query.length > MAX_QUESTION) return Response.json({ error: chatbot[lang].live.tooLong }, { status: 413 });
  const reel = donneesReelles(query);
  if (reel) return ndjson(une({ t: "error", detail: reel, code: "donnees_reelles" }), lang);
  const s = body.settings ?? {};
  const settings: LocusSettings = { elic: !!s.elic, desamb: !!s.desamb, deep: !!s.deep, has: s.has !== false, ansm: s.ansm !== false };
  if (!settings.has && !settings.ansm) settings.has = true;
  return ndjson(locusStream({ lang, query, settings }), lang);
}
