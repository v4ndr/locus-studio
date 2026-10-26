import { z } from "zod";
import { SyntheseIndisponible, synthetiserNote } from "@/locus/compose/synthese";
import { donneesReelles, guardLive } from "@/lib/server/guard";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** La passe de synthèse : transcript brut → note de consultation très courte. Un JSON, pas de flux. */
const Input = z.object({
  transcript: z.string().trim().min(1).max(30_000),
  motif: z.string().trim().max(200).optional(),
  patientId: z.string().regex(/^(pat|loc)_[a-z0-9_]{1,40}$/).optional(),
  patient: z.object({
    id: z.string().regex(/^loc_[a-z0-9]{1,40}$/), nomUsage: z.string().max(80), prenomUsuel: z.string().max(80), naissance: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), sexe: z.enum(["F", "M"]), profession: z.string().max(120).optional(),
    antecedents: z.array(z.string().max(300)).max(60).default([]), allergies: z.array(z.string().max(300)).max(30).default([]), traitements: z.array(z.string().max(300)).max(60).default([]),
    notes: z.array(z.object({ date: z.string().max(40), motif: z.string().max(200).optional(), synthese: z.string().max(1500) })).max(10).default([]),
  }).strict().optional(),
}).strict();

export async function POST(req: Request) {
  const g = await guardLive(req);
  if (!g.ok) return g.response;
  let raw: unknown;
  try { raw = await req.json(); } catch { return Response.json({ error: "Corps illisible : JSON attendu." }, { status: 400 }); }
  const parsed = Input.safeParse(raw);
  if (!parsed.success) return Response.json({ error: "Transcript manquant ou trop long." }, { status: 400 });
  // Sandbox : patients fictifs uniquement. Un NIR ou une date de naissance complète ne part nulle part.
  const reel = donneesReelles(`${parsed.data.transcript}\n${parsed.data.motif ?? ""}`);
  if (reel) return Response.json({ error: reel, code: "donnees_reelles" }, { status: 422 });
  try {
    const out = await synthetiserNote(parsed.data);
    return Response.json(out, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    // Une panne du modèle se dit telle quelle (non branché, quota, surcharge) : jamais de note de repli.
    if (e instanceof SyntheseIndisponible) return Response.json({ error: e.erreur.message, code: e.erreur.code }, { status: e.erreur.status, headers: { "Cache-Control": "no-store" } });
    console.error("[note]", e);
    return Response.json({ error: "La synthèse n'a pas abouti. Réessayez, ou écrivez la note directement." }, { status: 502 });
  }
}
