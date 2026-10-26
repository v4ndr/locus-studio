import { chatbot } from "@/i18n";
import { donneesReelles, guardLive } from "@/lib/server/guard";
import { langOf, lireCorps, MAX_QUESTION, ndjson, TROP_GROS, une } from "../_lib/http";
import { ragStream } from "../_lib/rag";

export const dynamic = "force-dynamic";
// Chargement de l'index au premier appel d'une instance, plus la génération.
export const maxDuration = 120;

/**
 * Colonne « RAG simple » du chatbot sourcé : index HAS, top-5, génération
 * générique (voir `../_lib/rag.ts`). Corps : `{ lang, query }`. Réponse :
 * NDJSON (`delta` au fil des tokens, puis `answer`), ou une ligne `error`
 * quand la colonne ne peut pas répondre (non configurée, index absent,
 * fournisseur en panne) : jamais de réponse de repli.
 */
export async function POST(req: Request) {
  const g = await guardLive(req);
  if (!g.ok) return g.response;
  const lu = await lireCorps(req);
  if (lu === TROP_GROS) return Response.json({ error: chatbot.fr.live.tooLong }, { status: 413 });
  const body = (lu ?? {}) as { lang?: string; query?: unknown };
  const lang = langOf(body.lang);
  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) return Response.json({ error: chatbot[lang].live.empty }, { status: 400 });
  if (query.length > MAX_QUESTION) return Response.json({ error: chatbot[lang].live.tooLong }, { status: 413 });
  const reel = donneesReelles(query);
  if (reel) return ndjson(une({ t: "error", detail: reel, code: "donnees_reelles" }), lang);
  return ndjson(ragStream(query, lang), lang);
}
