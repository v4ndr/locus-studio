import { guardLive, LIVE_LOCKED } from "@/lib/server/guard";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

/**
 * Le jeton éphémère de la dictée en temps réel. La clé du service de
 * transcription reste ici ; le navigateur reçoit un jeton `rt_…` de courte
 * durée, limité à un modèle, et ouvre lui-même le WebSocket avec.
 *
 * Pas de scénario rejoué pour la dictée : en rejoué, 403.
 */
const STT_API = "https://api.mistral.ai";
const STT_WS = "wss://api.mistral.ai/v1/audio/transcriptions/realtime";
const STT_MODEL_DEFAUT = "voxtral-mini-transcribe-realtime-2602";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  const g = await guardLive(req);
  if (!g.ok) return g.response;
  if (g.replay) return json({ error: "La dictée est réservée aux comptes invités.", code: LIVE_LOCKED }, 403);
  const key = process.env.MISTRAL_API_KEY?.trim();
  if (!key) return json({ error: "La dictée n'est pas disponible pour l'instant." }, 503);
  const model = process.env.SCRIBE_STT_MODEL?.trim() || STT_MODEL_DEFAUT;
  try {
    const res = await fetch(`${STT_API}/v1/client/sessions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ purpose: "realtime", model }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("[scribe/stt]", res.status, (await res.text().catch(() => "")).slice(0, 200));
      return json({ error: "La dictée n'est pas disponible pour l'instant." }, 502);
    }
    const out = (await res.json()) as { client_secret?: { value?: string; expires_at?: string } };
    const token = out.client_secret?.value;
    if (!token) return json({ error: "La dictée n'est pas disponible pour l'instant." }, 502);
    return json({ token, expiresAt: out.client_secret?.expires_at, url: `${STT_WS}?model=${encodeURIComponent(model)}`, delayMs: 480 });
  } catch (e) {
    console.error("[scribe/stt]", e);
    return json({ error: "La dictée n'est pas disponible pour l'instant." }, 502);
  }
}
