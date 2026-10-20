import { guardLive, donneesReelles } from "@/lib/server/guard";
import { cleanSteps, runSteps } from "@/data/integration-lgc/workflow";
import { askLocus, coreDisponible } from "../../_lib/locus";
import { RunBody, fieldsOf, json, parse } from "../../_lib/request";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Appels à core par exécution : le rate limit compte une requête, pas ses étapes. */
const MAX_CORE = 3;

/**
 * Exécute un workflow stocké sur le dossier fictif, tel quel (le plan n'est
 * pas restructuré à chaque ouverture du dossier). Condition, Extraire et
 * Calcul sont déterministes ; une Question Locus part vers core
 * (`app_surface:"studio-ehr"`) en direct, ou prend la réponse rejouée.
 * `variant: "non-diabetique"` rejoue la chaîne sur un dossier sans diabète.
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
  const variant = b.variant;
  const fields = fieldsOf(b.fields, b.anchor);
  const live = !g.replay && coreDisponible();
  let usedLive = false;
  // Une requête de route ne déclenche pas plus de MAX_CORE appels à core ; au-delà, la réponse rejouée.
  let calls = 0;
  const result = await runSteps(steps, variant, live
    ? async (q) => {
        if (++calls > MAX_CORE) return null;
        const r = await askLocus(q, fields, variant);
        if (!r) return null;
        usedLive = true;
        return { value: r.short, source: r.source };
      }
    : undefined);
  return json({ ...result, via: usedLive ? "live" : "replay" });
}
