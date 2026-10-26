import { z } from "zod";
import { synthetiserNote } from "@/locus/compose/synthese";
import { donneesReelles, guardLive } from "@/lib/server/guard";
import type { NoteReponse } from "@/data/scribe/live";
import type { RubriqueCr } from "@/data/scribe/consultations";
import { codeDe, erreur } from "../erreur";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Le compte rendu, généré en direct à chaque appel : la même passe de
 * synthèse que `/api/note` (transcript → note courte par rubriques), avec le
 * modèle de note choisi, puis découpée en rubriques éditables. La dictée
 * vient du micro ou d'une consultation enregistrée ; le traitement est le
 * même.
 *
 * Sans service de génération configuré ou joignable, 503 : pas de note à
 * règles en remplacement, la page dit que rien n'a été généré.
 */
const Input = z.object({
  transcript: z.string().trim().min(1).max(30_000),
  modele: z.enum(["mg", "ped", "gyn"]).default("mg"),
  motif: z.string().trim().max(200).optional(),
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
  const { transcript, modele, motif } = parsed.data;
  const reel = donneesReelles(`${transcript}\n${motif ?? ""}`);
  if (reel) return Response.json({ error: reel, code: "donnees_reelles" }, { status: 422 });
  try {
    const out = await synthetiserNote({ transcript, modele, motif });
    // Une note à règles (service non configuré) n'est pas une génération : elle ne sort pas d'ici.
    if ((out as { via?: unknown }).via === "simulation") return erreur("indisponible");
    const { note } = out;
    const cr = rubriques(note);
    if (!cr.length) return erreur("echec");
    const body: NoteReponse = { cr };
    return Response.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[scribe/note]", e instanceof Error ? e.message : e);
    return erreur(codeDe(e));
  }
}
