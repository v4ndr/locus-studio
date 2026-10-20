import { chatbot } from "@/i18n";
import { donneesReelles, guardLive } from "@/lib/server/guard";
import { langOf, lireCorps, MAX_QUESTION, ndjson, TROP_GROS, une } from "../_lib/http";
import { ragStream } from "../_lib/rag";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Colonne « RAG simple » du chatbot sourcé : index HAS, top-5, génération
 * générique (voir `../_lib/rag.ts`). Corps : `{ lang, query }`. Réponse :
 * NDJSON (`delta` au fil des tokens, puis `answer`). En scénario rejoué :
 * `{ t: "replay" }`.
 */
export async function POST(req: Request) {
  const g = await guardLive(req);
  if (!g.ok) return g.response;
  const lu = await lireCorps(req);
  if (lu === TROP_GROS) return Response.json({ error: chatbot.fr.live.tooLong }, { status: 413 });
  const body = (lu ?? {}) as { lang?: string; query?: unknown };
  const lang = langOf(body.lang);
  if (g.replay) return ndjson(une({ t: "replay" }), lang);
  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) return Response.json({ error: chatbot[lang].live.empty }, { status: 400 });
  if (query.length > MAX_QUESTION) return Response.json({ error: chatbot[lang].live.tooLong }, { status: 413 });
  const reel = donneesReelles(query);
  if (reel) return ndjson(une({ t: "error", detail: reel, code: "donnees_reelles" }), lang);
  return ndjson(ragStream(query, lang), lang);
}
