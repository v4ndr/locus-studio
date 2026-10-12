import { compose, composeMode, MODEL } from "@/locus/compose/run";
import { ndjsonResponse } from "@/locus/ndjson";
import type { ComposeInput } from "@/locus/compose/contract";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Le composer : la ligne de commande du LGC. Le navigateur envoie la demande
 * et l'écran ; le serveur donne le contexte à Claude, qui appelle les outils
 * du logiciel (Locus en est un) ; le navigateur reçoit un plan d'actions.
 * Ni la clé du modèle ni celle de Locus ne franchissent le navigateur.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<ComposeInput>;
  const texte = (body.texte ?? "").trim();
  if (!texte) return Response.json({ error: "texte manquant" }, { status: 400 });
  return ndjsonResponse(compose({ texte, patientId: body.patientId || undefined, ecran: body.ecran ?? "home", docId: body.docId, boite: body.boite }));
}

export async function GET() {
  return Response.json({ mode: composeMode(), modele: composeMode() === "claude" ? MODEL : null });
}
