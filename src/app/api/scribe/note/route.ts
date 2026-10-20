import { z } from "zod";
import { synthetiserNote } from "@/locus/compose/synthese";
import { donneesReelles, guardLive } from "@/lib/server/guard";
import type { NoteReponse } from "@/data/scribe/live";
import type { RubriqueCr } from "@/data/scribe/consultations";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Le compte rendu de la consultation en direct : la même passe de synthèse
 * que `/api/note` (transcript → note courte par rubriques), avec le modèle
 * de note choisi, puis découpée en rubriques éditables.
 */
const Input = z.object({
  transcript: z.string().trim().min(1).max(30_000),
  modele: z.enum(["mg", "ped", "gyn"]).default("mg"),
}).strict();

/** « Motif : … » ligne à ligne → rubriques ; une ligne sans étiquette prolonge la précédente. */
function rubriques(note: string): RubriqueCr[] {
  const out: RubriqueCr[] = [];
  for (const brut of note.split(/\n+/)) {
    const l = brut.replace(/^[-*•\s]+/, "").replace(/\*\*/g, "").trim();
    if (!l) continue;
    const m = /^([A-ZÀ-Ýa-zà-ÿ' ]{2,40})\s*:\s*(.+)$/.exec(l);
    if (m) out.push({ label: m[1]!.trim(), valeur: m[2]!.trim() });
    else if (out.length) out[out.length - 1]!.valeur += ` ${l}`;
    else out.push({ label: "Note", valeur: l });
  }
  return out;
}

export async function POST(req: Request) {
  const g = await guardLive(req);
  if (!g.ok) return g.response;
  let raw: unknown;
  try { raw = await req.json(); } catch { return Response.json({ error: "Corps illisible : JSON attendu." }, { status: 400 }); }
  const parsed = Input.safeParse(raw);
  if (!parsed.success) return Response.json({ error: "Transcription manquante ou trop longue." }, { status: 400 });
  const reel = donneesReelles(parsed.data.transcript);
  if (reel) return Response.json({ error: reel, code: "donnees_reelles" }, { status: 422 });
  try {
    const { note } = await synthetiserNote({ transcript: parsed.data.transcript, modele: parsed.data.modele }, { replay: g.replay });
    const body: NoteReponse = { cr: rubriques(note) };
    return Response.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[scribe/note]", e);
    return Response.json({ error: "La synthèse n'a pas abouti. Réessayez." }, { status: 502 });
  }
}
