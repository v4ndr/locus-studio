import { z } from "zod";
import { compose } from "@/locus/compose/run";
import { MODELE_ABSENT, modeleConfigure } from "@/locus/compose/erreurs";
import { ndjsonResponse } from "@/locus/ndjson";
import { guardLive } from "@/lib/server/guard";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Le composer : la ligne de commande du LGC. Le navigateur envoie la demande
 * et l'écran ; le serveur donne le contexte au modèle, qui appelle les outils
 * du logiciel (Locus en est un) ; le navigateur reçoit un plan d'actions.
 * Ni la clé du modèle ni celle de Locus ne franchissent le navigateur.
 *
 * Le corps est validé : bornes de taille (une note de consultation, pas un
 * roman), formes strictes, identifiants plausibles. Un corps invalide reçoit
 * un 400 lisible, jamais une erreur interne.
 */

const Ligne = z.string().trim().max(300);
const Patient = z.object({
  id: z.string().regex(/^loc_[a-z0-9]{1,40}$/),
  nomUsage: z.string().trim().min(1).max(80),
  prenomUsuel: z.string().trim().min(1).max(80),
  naissance: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sexe: z.enum(["F", "M"]),
  profession: z.string().trim().max(120).optional(),
  antecedents: z.array(Ligne).max(60).default([]),
  allergies: z.array(Ligne).max(30).default([]),
  traitements: z.array(Ligne).max(60).default([]),
  notes: z.array(z.object({ date: z.string().max(40), motif: z.string().max(200).optional(), synthese: z.string().max(1500) })).max(10).default([]),
}).strict();

const Input = z.object({
  texte: z.string().max(2_000).default(""),
  note: z.string().max(20_000).optional(),
  motif: z.string().trim().max(200).optional(),
  patientId: z.string().regex(/^(pat|loc)_[a-z0-9_]{1,40}$/).optional(),
  ecran: z.enum(["home", "dossier", "documents", "document", "inbox", "actions", "note"]).default("home"),
  docId: z.string().max(80).optional(),
  boite: z.enum(["courriers", "bio", "messages"]).optional(),
  patient: Patient.optional(),
}).strict();

export async function POST(req: Request) {
  const g = await guardLive(req);
  if (!g.ok) return g.response;
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > 64_000) return Response.json({ error: "Demande trop longue." }, { status: 413 });
  let raw: unknown;
  try { raw = await req.json(); } catch { return Response.json({ error: "Corps illisible : JSON attendu." }, { status: 400 }); }
  const parsed = Input.safeParse(raw);
  if (!parsed.success) {
    const premier = parsed.error.issues[0];
    return Response.json({ error: `Demande invalide (${premier?.path.join(".") || "corps"} : ${premier?.message ?? "forme inattendue"}).` }, { status: 400 });
  }
  const b = parsed.data;
  const texte = b.texte.trim();
  const note = b.note?.trim() || undefined;
  if (!texte && !note) return Response.json({ error: "Rien à composer : la demande est vide." }, { status: 400 });
  if (b.patient && b.patientId && b.patient.id !== b.patientId) return Response.json({ error: "Le patient local ne correspond pas à l'identifiant." }, { status: 400 });
  return ndjsonResponse(compose({ texte, patientId: b.patientId, ecran: b.ecran, docId: b.docId, boite: b.boite, patient: b.patient, note, motif: b.motif || undefined }));
}

export async function GET(req: Request) {
  const g = await guardLive(req);
  if (!g.ok) return g.response;
  // Ni nom de modèle ni fournisseur dans une réponse publique : branché ou non, c'est tout.
  if (!modeleConfigure()) return Response.json({ ok: false, error: MODELE_ABSENT.message, code: MODELE_ABSENT.code }, { status: 503, headers: { "Cache-Control": "no-store" } });
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
