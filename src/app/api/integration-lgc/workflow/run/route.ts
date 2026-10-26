import { guardLive, donneesReelles } from "@/lib/server/guard";
import { cleanSteps, runSteps } from "@/data/integration-lgc/workflow";
import { askLocus, coreErrorResponse } from "../../_lib/locus";
import { RunBody, fieldsOf, json, parse } from "../../_lib/request";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Questions Locus par plan : le rate limit compte une requête, pas ses étapes. */
const MAX_CORE = 3;

/**
 * Exécute un workflow stocké sur le dossier fictif, tel quel (le plan n'est
 * pas restructuré à chaque ouverture du dossier). Condition, Extraire et
 * Calcul sont déterministes ; chaque Question Locus part vers core
 * (`app_surface:"studio-ehr"`). Si core manque ou ne répond pas, toute
 * l'exécution échoue (502/503) : pas de valeur de remplacement.
 * `variant: "non-diabetique"` exécute la chaîne sur un dossier sans diabète.
 */
export async function POST(req: Request) {
  const g = await guardLive(req);
  if (!g.ok) return g.response;
  const p = await parse(req, RunBody);
  if (!p.ok) return p.response;
  const b = p.data;
  const steps = cleanSteps(b.steps);
  if (!steps) return json({ error: "Plan invalide." }, 400);
  // Les consignes d'étape sont du texte libre : même refus des données réelles que pour une question.
  for (const s of steps) {
    const refus = donneesReelles(`${s.config} ${s.action ?? ""}`);
    if (refus) return json({ error: refus }, 422);
  }
  if (steps.filter((s) => s.type === "locus_question").length > MAX_CORE) {
    return json({ error: `Au plus ${MAX_CORE} questions Locus par workflow.`, code: "too_many_questions" }, 400);
  }
  const variant = b.variant;
  const fields = fieldsOf(b.fields, b.anchor);
  try {
    const result = await runSteps(steps, variant, async (q) => {
      const r = await askLocus(q, fields, variant);
      return { value: r.short, source: r.source };
    });
    return json(result);
  } catch (e) {
    return coreErrorResponse(e);
  }
}
