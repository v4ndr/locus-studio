import { guardLive } from "@/lib/server/guard";
import { cleanSteps, runSteps } from "@/data/integration-lgc/workflow";
import { askLocus, coreDisponible } from "../../_lib/locus";
import { anchorOf, body, fieldsOf, json } from "../../_lib/request";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
  const b = await body(req);
  const steps = cleanSteps(b.steps);
  if (!steps) return json({ error: "Plan invalide." }, 400);
  const variant = b.variant === "non-diabetique" ? "non-diabetique" : "fournier";
  const fields = fieldsOf(b.fields, anchorOf(b.anchor));
  const live = !g.replay && coreDisponible();
  let usedLive = false;
  const result = await runSteps(steps, variant, live
    ? async (q) => {
        const r = await askLocus(q, fields, variant);
        if (!r) return null;
        usedLive = true;
        return { value: r.short, source: r.source };
      }
    : undefined);
  return json({ ...result, via: usedLive ? "live" : "replay" });
}
