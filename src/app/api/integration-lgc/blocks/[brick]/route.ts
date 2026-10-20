import { guardLive, donneesReelles } from "@/lib/server/guard";
import { cleanSettings, questionFor, replayAnswer, replayOutput, toolByApi, type LocusOut, type ToolId } from "@/data/integration-lgc/blocks";
import { askLocus, coreDisponible } from "../../_lib/locus";
import { BlockBody, fieldsOf, json, parse } from "../../_lib/request";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Une brique Locus de MédiCab 7 : `POST /api/integration-lgc/blocks/<brique>`
 * (`prescription-check`, `clinical-question`, `record-summary`,
 * `referral-letter`, `lab-interpretation`).
 *
 * C'est la route BFF qui porte, pour l'instant, la façade proposée
 * « API Briques (aperçu) » `POST /v2/blocks/<brique>` : elle n'existe pas
 * dans core. En direct, la brique appelle core `/v2/retrieve` avec le
 * dossier transmis et `app_surface:"studio-ehr"` ; en scénario rejoué (ou
 * sans core configuré), elle renvoie la sortie précalculée pour M. Fournier.
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
  const live = !g.replay && coreDisponible();

  // Une question posée à Locus depuis une carte ou le widget.
  if (question) {
    const rejouee = replayAnswer(question, settings.court !== false);
    if (!live) return json({ output: rejouee, via: "replay" });
    const r = await askLocus(question, fields);
    if (!r) return json({ output: rejouee, via: "replay" });
    const out: LocusOut = { title: question, lines: settings.court === false ? r.lines : [r.short], source: r.source };
    return json({ output: out, via: "live" });
  }

  const rejouee = replayOutput(tool, settings);
  if (!live || tool === "question") return json({ output: rejouee, via: live ? "live" : "replay" });
  const r = await askLocus(questionFor(tool, settings), fields);
  if (!r) return json({ output: rejouee, via: "replay" });
  const out: LocusOut =
    tool === "courrier"
      ? { title: TITRES.courrier, lines: [r.short], letter: r.lines, actions: ["openLetter"] }
      : { title: TITRES[tool], lines: tool === "synthese" && settings.longueur !== "detail" ? r.lines.slice(0, 3) : r.lines, source: r.source, ...(tool === "controle" ? { actions: ["ignore" as const] } : {}) };
  return json({ output: out, via: "live" });
}
