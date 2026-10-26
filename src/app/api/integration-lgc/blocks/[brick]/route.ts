import { guardLive, donneesReelles } from "@/lib/server/guard";
import { SUGGESTIONS, cleanSettings, questionFor, toolByApi, type LocusOut, type ToolId } from "@/data/integration-lgc/blocks";
import { askLocus, coreErrorResponse } from "../../_lib/locus";
import { BlockBody, fieldsOf, json, parse } from "../../_lib/request";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Une brique Locus de MédiCab 7 : `POST /api/integration-lgc/blocks/<brique>`
 * (`prescription-check`, `clinical-question`, `record-summary`,
 * `referral-letter`, `lab-interpretation`).
 *
 * Une route de Studio, pas de core : core n'a pas d'endpoint de brique.
 * Chaque appel part vers core `POST /v2/retrieve/stream` avec le dossier
 * transmis et `app_surface:"studio-ehr"`, et c'est cet appel que le panneau
 * « Appel API » de la brique affiche. Pas de sortie précalculée : si
 * core manque ou ne répond pas, la route répond 502/503 et la carte le dit.
 */

const TITRES: Record<ToolId, string> = {
  controle: "Contrôle d'ordonnance",
  question: "Question à Locus",
  synthese: "Synthèse du dossier",
  courrier: "Courrier d'adressage",
  bio: "Interprétation de biologie",
};

export async function POST(req: Request, { params }: { params: Promise<{ brick: string }> }) {
  const g = await guardLive(req);
  if (!g.ok) return g.response;
  const { brick } = await params;
  const tool = toolByApi(brick);
  if (!tool) return json({ error: "Brique inconnue." }, 404);
  const p = await parse(req, BlockBody);
  if (!p.ok) return p.response;
  const b = p.data;
  const fields = fieldsOf(b.fields, b.anchor);
  const settings = cleanSettings(tool, b.settings);
  const question = (b.question ?? "").trim();
  if (question) {
    const refus = donneesReelles(question);
    if (refus) return json({ error: refus }, 422);
  }
  // Le champ « Question à Locus » : rien à calculer avant que le médecin écrive.
  if (tool === "question" && !question) {
    return json({ output: { title: TITRES.question, lines: [], question: true, sugg: settings.suggest ? SUGGESTIONS : [] } satisfies LocusOut });
  }
  try {
    // Une question posée à Locus depuis une carte ou le widget.
    if (question) {
      const r = await askLocus(question, fields);
      const out: LocusOut = { title: question, lines: settings.court === false ? r.lines : [r.short], source: r.source };
      return json({ output: out });
    }
    const r = await askLocus(questionFor(tool, settings), fields);
    const out: LocusOut =
      tool === "courrier"
        ? { title: TITRES.courrier, lines: [r.short], letter: r.lines, actions: ["openLetter"] }
        : { title: TITRES[tool], lines: tool === "synthese" && settings.longueur !== "detail" ? r.lines.slice(0, 3) : r.lines, source: r.source, ...(tool === "controle" ? { actions: ["ignore" as const] } : {}) };
    return json({ output: out });
  } catch (e) {
    return coreErrorResponse(e);
  }
}
