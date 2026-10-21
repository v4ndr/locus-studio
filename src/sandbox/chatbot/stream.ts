"use client";
import { fetchLive } from "@/lib/live";
import { readNdjson } from "@/locus/ndjson";
import type { ChatEvent } from "./events";

/** Appelle une route `/api/chatbot/*` et lit son flux NDJSON ; retombe en rejoué si le live est fermé. */
export async function* chatStream(url: string, body: unknown, signal: AbortSignal, erreur: string): AsyncGenerator<ChatEvent> {
  let r: Response;
  try {
    r = await fetchLive(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
  } catch {
    if (!signal.aborted) yield { t: "error", detail: erreur };
    return;
  }
  if (!r.ok || !r.body) {
    const j = (await r.json().catch(() => null)) as { error?: string } | null;
    yield { t: "error", detail: j?.error ?? erreur };
    return;
  }
  try {
    yield* readNdjson<ChatEvent>(r.body);
  } catch {
    if (!signal.aborted) yield { t: "error", detail: erreur };
  }
}

/** Le format court d'une réponse markdown : le titre, deux paragraphes et trois puces au plus. */
export function formatCourt(md: string): string {
  const out: string[] = [];
  let titre = false, paras = 0, puces = 0, liste = false;
  for (const l of md.split("\n")) {
    const t = l.trim();
    if (!t) { out.push(l); continue; }
    if (/^#/.test(t)) { if (titre || paras) break; titre = true; out.push(l); continue; }
    if (/^([-*•]|\d+[.)])\s/.test(t)) { liste = true; if (puces++ < 3) out.push(l); continue; }
    if (liste || paras >= 2) break;
    paras++;
    out.push(l);
  }
  return out.join("\n").trim();
}

/** Retire les renvois numérotés « [1][2] » d'un texte. */
export const sansRenvois = (md: string) => md.replace(/\s?(\[\d+\])+/g, "");
