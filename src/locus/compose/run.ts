import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM, buildContext } from "./context";
import { TOOLS, executeTool, type ToolCtx } from "./tools";
import { simulateCompose } from "./simulation";
import { resolvePatient } from "./patient";
import type { ComposeEvent, ComposeInput, ComposePlan } from "./contract";

/**
 * La boucle du composer. Un modèle frontière (Claude) reçoit la demande et le
 * contexte, appelle les outils du LGC — Locus (locus-core) en est un — et
 * termine par une synthèse courte. Le navigateur reçoit les étapes, les
 * actions au fil de l'eau, puis le plan complet.
 *
 * Sans ANTHROPIC_API_KEY : un composeur à règles produit le même plan, pour
 * que le produit soit entier à sec.
 */

export const MODEL = "claude-sonnet-5-5";
const MAX_TOURS = 6;

export function composeMode(): "claude" | "simulation" {
  return process.env.ANTHROPIC_API_KEY ? "claude" : "simulation";
}

/** `replay` : le scénario rejoué, règles et Locus simulé, aucun appel externe. */
export async function* compose(input: ComposeInput, opts: { replay?: boolean } = {}): AsyncGenerator<ComposeEvent> {
  if (opts.replay) { yield* simulateCompose(input, { mode: "simulation", url: "" }); return; }
  if (composeMode() === "simulation") { yield* simulateCompose(input); return; }

  const client = new Anthropic();
  const { contexte } = buildContext(input);
  const queue: ComposeEvent[] = [];
  const ctx: ToolCtx = { input, actions: [], references: [], locus: 0, patient: resolvePatient(input), emit: (ev) => queue.push(ev) };
  const demande = input.ecran === "note" ? `## Note de consultation du jour (dictée ou rédigée par le médecin)${input.motif ? `\nMotif de consultation (agenda) : ${input.motif}` : ""}\n${input.note ?? input.texte}\n\n## Consigne\n${input.texte === input.note || !input.texte ? "Décline cette note en actions : prépare ce qu'elle prescrit ou demande (ordonnances, arrêt, courrier, rendez-vous, message) ; ajoute à la fiche seulement un nouvel antécédent, une allergie ou un changement de traitement de fond qu'elle révèle ; et termine par une seule phrase : la conclusion clinique, sans récapituler les actions." : input.texte}` : `## Demande du médecin\n${input.texte}`;
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: `${contexte}\n\n${demande}` }];
  let synthese = "";

  yield { step: "reflexion", titre: "Je lis le dossier et la demande" };
  for (let tour = 0; tour < MAX_TOURS; tour++) {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      tools: TOOLS.map((t) => ({ ...t, eager_input_streaming: true })),
      messages,
      output_config: { effort: "low" },
    });
    let message: Anthropic.Beta.BetaMessage;
    try {
      message = await stream.finalMessage();
    } catch (e) {
      yield { step: "error", detail: e instanceof Anthropic.APIError ? `Claude a répondu ${e.status} : ${e.message}` : e instanceof Error ? e.message : String(e) };
      return;
    }
    const texts = message.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
    if (texts) { synthese = texts; yield { step: "texte", texte: texts }; }
    if (message.stop_reason === "refusal") { yield { step: "error", detail: "Claude a décliné cette demande." }; return; }
    if (message.stop_reason === "max_tokens") { yield { step: "error", detail: "Réponse tronquée (max_tokens)." }; return; }
    const uses = message.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    if (message.stop_reason !== "tool_use" || uses.length === 0) break;

    messages.push({ role: "assistant", content: message.content as unknown as Anthropic.ContentBlockParam[] });
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const u of uses) {
      const inp = (u.input && typeof u.input === "object" ? u.input : {}) as Record<string, unknown>;
      yield { step: "reflexion", titre: LABEL[u.name] ?? u.name };
      let out: string;
      try { out = await executeTool(u.name, inp, ctx); } catch (e) { out = `Erreur de l'outil : ${e instanceof Error ? e.message : String(e)}`; }
      while (queue.length) yield queue.shift()!;
      results.push({ type: "tool_result", tool_use_id: u.id, content: out });
    }
    messages.push({ role: "user", content: results });
  }

  const pt = ctx.patient;
  const plan: ComposePlan = { synthese: (synthese || (ctx.actions.length ? "Prêt à valider." : "Je n'ai rien trouvé à faire avec cette demande.")).slice(0, 600), actions: ctx.actions, references: ctx.references, via: "claude", modele: MODEL, locus: ctx.locus, patient: pt ? { nom: pt.nom, sexe: pt.sexe, age: pt.age, naissance: pt.naissance, allergies: pt.allergies } : undefined };
  yield { step: "done", plan };
}

const LABEL: Record<string, string> = { locus_retrieve: "Je consulte Locus", lire_document: "Je lis le document", proposer_ordonnance: "Je rédige l'ordonnance", proposer_rdv: "Je cherche un créneau", proposer_message: "Je rédige le message", proposer_courrier: "Je rédige le courrier", proposer_arret: "Je prépare l'arrêt", inscrire_au_dossier: "J'inscris au dossier", ouvrir: "J'ouvre l'écran" };
