import { clientIp, guardLive, hit, sameOrigin } from "@/lib/server/guard";
import { getStudioUserId } from "@/lib/server/user";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

/**
 * Le jeton éphémère de la dictée en temps réel. La clé du service de
 * transcription reste ici ; le navigateur reçoit un jeton `rt_…` de courte
 * durée, limité à un modèle, et ouvre lui-même le WebSocket avec.
 *
 * **Quota de minutes.** Chaque jeton ouvre un bloc de `BLOC_S` secondes de
 * dictée : le navigateur coupe la session à la fin du bloc et en redemande
 * un, sans trou audible, tant que la dictée continue. Un compte dispose de
 * `STUDIO_SCRIBE_MINUTES_PER_DAY` minutes par jour (60 par défaut, 0 pour
 * ne pas limiter), décomptées par bloc avec le compteur du garde (`hit`).
 * Comme le rate limit du garde, le quota ne compte pas sous `next dev`.
 *
 * Limite connue : le protocole du service exige le modèle dans l'URL du
 * WebSocket (paramètre `model` obligatoire, et le jeton est lié à ce
 * modèle). L'URL renvoyée ici en contient donc le nom ; elle n'est servie
 * qu'aux comptes, au moment de dicter, et n'est jamais dans le bundle.
 */
const STT_API = "https://api.mistral.ai";
const STT_WS = "wss://api.mistral.ai/v1/audio/transcriptions/realtime";
const STT_MODEL_DEFAUT = "voxtral-mini-transcribe-realtime-2602";
/** Un bloc de dictée : 5 minutes. */
const BLOC_S = 300;

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
const indisponible = (status: number) => json({ error: "La dictée n'est pas disponible pour l'instant." }, status);

/** Le compte qui dicte : l'utilisateur Studio connecté, sinon l'IP (jeton interne, ou `next dev` sans comptes). */
async function compte(req: Request): Promise<string> {
  return (await getStudioUserId()) ?? clientIp(req);
}

function minutesParJour(): number {
  const v = Number(process.env.STUDIO_SCRIBE_MINUTES_PER_DAY);
  return Number.isFinite(v) && v >= 0 ? Math.floor(v) : 60;
}

export async function POST(req: Request) {
  // Un jeton se demande depuis Studio, pas depuis une autre origine (qui consommerait le quota du compte).
  if (!sameOrigin(req)) return json({ error: "Requête refusée." }, 403);

  const g = await guardLive(req);
  if (!g.ok) return g.response;
  const key = process.env.MISTRAL_API_KEY?.trim();
  if (!key) return indisponible(503);

  const minutes = minutesParJour();
  const decompte = process.env.NODE_ENV === "production" || !!process.env.VERCEL_ENV;
  if (minutes > 0 && decompte) {
    const blocs = Math.max(1, Math.floor((minutes * 60) / BLOC_S));
    const { n, resetS } = await hit("scribe-dictee", await compte(req), 86_400);
    if (n > blocs) {
      return json({ error: "Quota de dictée du jour atteint pour ce compte. Il se renouvelle demain.", code: "quota_dictee" }, 429, { "Retry-After": String(resetS) });
    }
  }

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
      return indisponible(502);
    }
    const out = (await res.json()) as { client_secret?: { value?: string } };
    const token = out.client_secret?.value;
    if (!token) return indisponible(502);
    return json({ token, url: `${STT_WS}?model=${encodeURIComponent(model)}`, delayMs: 480, blocS: BLOC_S });
  } catch (e) {
    console.error("[scribe/stt]", e instanceof Error ? e.message : "erreur");
    return indisponible(502);
  }
}
