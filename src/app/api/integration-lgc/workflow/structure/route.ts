import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import * as z from "zod/v4";
import { guardLive, donneesReelles } from "@/lib/server/guard";
import { MODEL } from "@/locus/compose/run";
import { STEP_TYPES, MAX_STEPS, cleanSteps, replayStructure, runSteps, type WfStep } from "@/data/integration-lgc/workflow";
import { body, json } from "../../_lib/request";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * « Structurer » : transforme une consigne en langage naturel en une chaîne
 * d'étapes liées (Condition, Extraire du dossier, Question Locus, Calcul,
 * Action dans le LGC, Sortie), validée par un schéma, puis l'évalue sur le
 * dossier fictif pour montrer la valeur de chaque étape.
 *
 * En direct (clé serveur posée, route ouverte) : un appel de modèle côté
 * serveur. Le nom du modèle ne sort jamais. En scénario rejoué, ou si
 * l'appel échoue : la structuration précalculée.
 * L'aperçu n'interroge pas core : les Questions Locus prennent la réponse
 * rejouée ici, la réponse en direct vient avec « Tester sur ce dossier ».
 */

const Plan = z.object({
  steps: z.array(z.object({
    type: z.enum(STEP_TYPES),
    config: z.string(),
    action: z.string().optional(),
  })),
});

const SYSTEM = `Tu structures la consigne d'un médecin généraliste en un workflow exécuté dans son logiciel médical, à l'ouverture d'un dossier patient.
Types d'étape :
- condition : un critère sur le dossier (antécédent, allergie, âge, DFG, HbA1c). Une condition fausse arrête la chaîne. Mets-la en premier si la consigne dit « si ».
- extract : une donnée à lire dans le dossier (dernière HbA1c, créatinine, DFG, kaliémie, traitement, allergies, antécédents, poids, tension, ligne d'ordonnance).
- locus_question : une question clinique posée à Locus, qui répond avec les recommandations françaises.
- compute : un calcul sur les valeurs précédentes (écart à une cible, délai depuis un dosage).
- ehr_action : un brouillon d'action dans le logiciel (jamais exécuté sans validation).
- output : la phrase affichée au médecin, toujours en dernière étape ; \`action\` est le geste proposé, s'il y en a un.
Règles : 2 à 6 étapes ; \`config\` est une phrase nominale courte (60 caractères au plus), dans la langue de la consigne ; pas de valeur inventée, le logiciel calcule les valeurs.`;

async function structurer(instruction: string): Promise<WfStep[] | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const client = new Anthropic();
    const r = await client.messages.parse({
      model: MODEL,
      max_tokens: 2000,
      system: SYSTEM,
      messages: [{ role: "user", content: `Consigne : ${instruction}` }],
      output_config: { format: zodOutputFormat(Plan), effort: "low" },
    });
    if (r.stop_reason === "refusal" || !r.parsed_output) return null;
    const steps = cleanSteps(r.parsed_output.steps.slice(0, MAX_STEPS));
    if (!steps) return null;
    // La sortie est toujours la dernière étape, et la seule.
    const sans = steps.filter((s) => s.type !== "output");
    const sortie = steps.find((s) => s.type === "output") ?? { type: "output" as const, config: "Carte dans la zone" };
    return [...sans.slice(0, MAX_STEPS - 1), sortie];
  } catch (e) {
    console.error("[integration-lgc] structuration", e instanceof Error ? e.message : e);
    return null;
  }
}

export async function POST(req: Request) {
  const g = await guardLive(req);
  if (!g.ok) return g.response;
  const b = await body(req);
  const instruction = typeof b.instruction === "string" ? b.instruction.trim().slice(0, 500) : "";
  if (!instruction) return json({ error: "Consigne vide." }, 400);
  const refus = donneesReelles(instruction);
  if (refus) return json({ error: refus }, 422);
  const lang = b.lang === "en" ? "en" : "fr";
  const live = g.replay ? null : await structurer(instruction);
  const steps = live ?? replayStructure(instruction, lang);
  const apercu = await runSteps(steps, "fournier");
  return json({ steps, preview: apercu.steps.map((s) => ({ value: s.value, source: s.source, status: s.status })), via: live ? "live" : "replay" });
}
