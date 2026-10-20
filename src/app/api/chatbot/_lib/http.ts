import "server-only";
import { isLang, type Lang } from "@/i18n";
import type { ChatEvent } from "@/sandbox/chatbot/events";

export const MAX_QUESTION = 1_000;

export function ndjson(gen: AsyncIterable<ChatEvent>): Response {
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const ev of gen) controller.enqueue(enc.encode(JSON.stringify(ev) + "\n"));
      } catch (e) {
        console.error("[chatbot]", e);
        controller.enqueue(enc.encode(JSON.stringify({ t: "error", detail: "—" } satisfies ChatEvent) + "\n"));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}

export async function* une(ev: ChatEvent): AsyncGenerator<ChatEvent> { yield ev; }

export const langOf = (v: unknown): Lang => (isLang(v) ? v : "fr");
