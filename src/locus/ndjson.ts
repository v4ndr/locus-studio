/** Lecture d'un flux NDJSON — une ligne, un objet. Partagé serveur / navigateur. */
export async function* readNdjson<T = unknown>(body: ReadableStream<Uint8Array>): AsyncGenerator<T> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl = buffer.indexOf("\n");
    while (nl >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line) {
        try {
          yield JSON.parse(line) as T;
        } catch {
          /* ligne tronquée ou bruit : on ignore */
        }
      }
      nl = buffer.indexOf("\n");
    }
  }
  const rest = buffer.trim();
  if (rest) {
    try {
      yield JSON.parse(rest) as T;
    } catch {
      /* idem */
    }
  }
}

export function ndjsonResponse(gen: AsyncIterable<unknown>): Response {
  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const ev of gen) controller.enqueue(enc.encode(JSON.stringify(ev) + "\n"));
      } catch (e) {
        // Jamais un message d'erreur JavaScript brut dans la carte : une phrase en français, le détail dans le journal du serveur.
        console.error("[compose]", e);
        const msg = e instanceof Error ? e.message : String(e);
        const lisible = /^(Claude|Locus)/.test(msg) ? msg : "Le composer a rencontré une erreur en cours de route. Réessayez ; si cela persiste, reformulez la demande.";
        controller.enqueue(enc.encode(JSON.stringify({ step: "error", detail: lisible }) + "\n"));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
