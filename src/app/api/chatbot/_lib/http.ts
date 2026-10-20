import "server-only";
import { chatbot, isLang, type Lang } from "@/i18n";
import type { ChatEvent } from "@/sandbox/chatbot/events";

export const MAX_QUESTION = 1_000;
/** Un corps de requête plus gros n'est pas lu : une question et ses réglages tiennent en quelques Ko. */
const MAX_BODY = 32 * 1024;

export const TROP_GROS = Symbol("trop gros");

/** Le corps JSON de la requête ; `null` s'il est absent ou illisible, `TROP_GROS` au-delà de 32 Ko. */
export async function lireCorps<T>(req: Request): Promise<T | null | typeof TROP_GROS> {
  const annonce = Number(req.headers.get("content-length") ?? 0);
  if (annonce > MAX_BODY) return TROP_GROS;
  try {
    const txt = await req.text();
    if (txt.length > MAX_BODY) return TROP_GROS;
    const v = JSON.parse(txt) as unknown;
    return v && typeof v === "object" && !Array.isArray(v) ? (v as T) : null;
  } catch {
    return null;
  }
}

export function ndjson(gen: AsyncIterable<ChatEvent>, lang: Lang): Response {
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const ev of gen) controller.enqueue(enc.encode(JSON.stringify(ev) + "\n"));
      } catch (e) {
        console.error("[chatbot]", e);
        controller.enqueue(enc.encode(JSON.stringify({ t: "error", detail: chatbot[lang].live.error } satisfies ChatEvent) + "\n"));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}

export async function* une(ev: ChatEvent): AsyncGenerator<ChatEvent> { yield ev; }

export const langOf = (v: unknown): Lang => (isLang(v) ? v : "fr");
