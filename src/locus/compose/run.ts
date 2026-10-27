import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM, buildContext } from "./context";
import { TOOLS, executeTool, ajouteTableau, type ToolCtx } from "./tools";
import { estPopulation, interrogerPatientele, sujetDe } from "./patientele";
import { MODELE_ABSENT, erreurModele, modeleConfigure } from "./erreurs";
import { resolvePatient, planPatient } from "./patient";
import type { ComposeEvent, ComposeInput, ComposePlan } from "./contract";

/**
 * La boucle du composer. Un modèle frontière (Claude) reçoit la demande et le
 * contexte, appelle les outils du LGC — Locus (locus-core) en est un — et
 * termine par une synthèse courte. Le navigateur reçoit les étapes, les
 * actions au fil de l'eau, puis le plan complet.
 *
 * Tout est live : sans ANTHROPIC_API_KEY, ou le modèle en panne, le flux
 * s'arrête sur une erreur lisible. Pas de plan à règles en remplacement.
 */

export const MODEL = "claude-sonnet-5-5";
const MAX_TOURS = 6;

export async function* compose(input: ComposeInput): AsyncGenerator<ComposeEvent> {
  if (!modeleConfigure()) { console.error("[compose] ANTHROPIC_API_KEY absente"); yield { step: "error", detail: MODELE_ABSENT.message }; return; }

  const client = new Anthropic();
  const queue: ComposeEvent[] = [];
  const ctx: ToolCtx = { input, actions: [], references: [], locus: 0, tableaux: [], patient: input.portee === "patientele" ? undefined : resolvePatient(input), emit: (ev) => queue.push(ev) };
  // Une demande sur la patientèle (la palette globale, ou une phrase qui la vise) : la requête est calculée AVANT le modèle,
  // et son tableau part au navigateur tel quel. Le modèle la commente ; il ne peut ni l'oublier ni l'inventer.
  let population: string | undefined;
  if (input.ecran !== "note" && (input.portee === "patientele" || estPopulation(input.texte))) {
    const r = interrogerPatientele(sujetDe(input.texte));
    population = r.texte;
    for (const t of r.tableaux) ajouteTableau(ctx, t);
  }
  const { contexte } = buildContext(input.portee === "patientele" ? { ...input, patientId: undefined, patient: undefined, docId: undefined } : input, population);
  const demande = input.ecran === "note" ? `## Note de consultation du jour (dictée ou rédigée par le médecin)${input.motif ? `\nMotif de consultation (agenda) : ${input.motif}` : ""}\n${input.note ?? input.texte}\n\n## Consigne\n${input.texte === input.note || !input.texte ? "Décline cette note en actions : prépare ce qu'elle prescrit ou demande (ordonnances, arrêt, courrier, rendez-vous, message) ; ajoute à la fiche seulement un nouvel antécédent, une allergie ou un changement de traitement de fond qu'elle révèle ; et termine par une seule phrase : la conclusion clinique, sans récapituler les actions." : input.texte}` : `## Demande du médecin\n${input.texte}`;
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: `${contexte}\n\n${demande}` }];
  let synthese = "";

  yield { step: "reflexion", titre: population ? "Je calcule sur la patientèle" : "Je lis le dossier et la demande" };
  while (queue.length) yield queue.shift()!;
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
      console.error("[compose]", e);
      yield { step: "error", detail: erreurModele(e).message };
      return;
    }
    const texts = message.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
    if (texts) { synthese = texts; yield { step: "texte", texte: texts }; }
    if (message.stop_reason === "refusal") { yield { step: "error", detail: "Cette demande n'a pas pu être composée." }; return; }
    if (message.stop_reason === "max_tokens") { yield { step: "error", detail: "Composition interrompue : la demande est trop longue." }; return; }
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
  const plan: ComposePlan = { synthese: renvoisValides((synthese || (ctx.actions.length || ctx.tableaux.length ? "Prêt à valider." : "Je n'ai rien trouvé à faire avec cette demande.")).slice(0, 900), ctx.references.length), actions: ctx.actions, references: ctx.references, locus: ctx.locus, locusEnPanne: ctx.locusEnPanne || undefined, patient: pt ? planPatient(pt) : undefined, tableaux: ctx.tableaux.length ? ctx.tableaux : undefined };
  yield { step: "done", plan };
}

/** Un renvoi [n] sans la référence n (Locus pas appelé, ou source non gardée) est retiré : la carte ne montre jamais une source qui n'existe pas. */
function renvoisValides(texte: string, n: number): string {
  return texte.replace(/\s?\[(\d+)\]/g, (m, k) => (Number(k) >= 1 && Number(k) <= n ? m : ""));
}

const LABEL: Record<string, string> = { interroger_patientele: "Je calcule sur la patientèle", proposer_transport: "Je prépare le bon de transport", locus_retrieve: "Je consulte Locus", lire_document: "Je lis le document", proposer_ordonnance: "Je rédige l'ordonnance", proposer_rdv: "Je cherche un créneau", proposer_message: "Je rédige le message", proposer_courrier: "Je rédige le courrier", proposer_arret: "Je prépare l'arrêt", inscrire_au_dossier: "J'inscris au dossier", ouvrir: "J'ouvre l'écran" };
