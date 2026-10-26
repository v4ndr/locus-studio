import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { MODEL } from "./run";
import { MODELE_ABSENT, erreurModele, modeleConfigure, type ErreurLive } from "./erreurs";
import { resolvePatient } from "./patient";
import type { PatientLocalPayload } from "./contract";

/**
 * La passe de synthèse : du transcript brut d'une consultation (dictée au
 * micro, dictée scriptée, texte collé) à une note clinique TRÈS courte, en
 * français, que le médecin relit, corrige, et décline ensuite en actions.
 *
 * Un seul appel au modèle, pas d'outil. Sans clé ou modèle en panne,
 * `SyntheseIndisponible` : la route le rend tel quel, le médecin réessaie
 * ou écrit sa note. Pas de tri à règles en remplacement.
 */

export interface SyntheseInput { transcript: string; motif?: string; patientId?: string; patient?: PatientLocalPayload; /** Le modèle de note (scribe) : médecine générale par défaut. */ modele?: "mg" | "ped" | "gyn" }

const MODELES: Record<string, string> = { ped: "Modèle de note : pédiatrie (poids, taille, température et développement s'ils sont dictés).\n", gyn: "Modèle de note : gynécologie (date des dernières règles, contraception et cycle s'ils sont dictés).\n" };
export interface SyntheseOutput { note: string }

/** La synthèse n'a pas eu lieu : `erreur` porte le statut HTTP et le message à montrer. */
export class SyntheseIndisponible extends Error {
  constructor(readonly erreur: ErreurLive) { super(erreur.message); this.name = "SyntheseIndisponible"; }
}

const SYSTEM = `Tu es Locus, l'agent d'un cabinet de médecine générale. On te donne le TRANSCRIPT brut d'une consultation (dictée, parfois décousue, avec des hésitations et des paroles au patient). Tu en écris la NOTE DE CONSULTATION, très courte, en français, style télégraphique de dossier médical.

Règles :
- Quatre rubriques au plus, chacune sur sa ligne, seulement si le transcript en fournit la matière : « Motif : », « Examen : », « Conclusion : », « Conduite à tenir : ». Pas d'autre texte, pas de titre, pas de phrase d'introduction ni de conclusion.
- 80 mots maximum au total. Chaque rubrique : une ligne, les éléments séparés par des virgules ou des points-virgules.
- Tu n'inventes rien : pas de diagnostic, de mesure, de dose ou de durée qui ne soit pas dans le transcript. Les chiffres (tension, poids, température, doses, durées, nombres de séances) sont recopiés exactement.
- Les prescriptions, arrêts, courriers, rendez-vous et messages évoqués vont dans « Conduite à tenir », avec leurs doses et durées telles que dictées.
- Pas de nom de patient, pas de formule de politesse, DCI en minuscules.`;

export async function synthetiserNote(input: SyntheseInput): Promise<SyntheseOutput> {
  const transcript = input.transcript.trim();
  if (!modeleConfigure()) { console.error("[note] ANTHROPIC_API_KEY absente"); throw new SyntheseIndisponible(MODELE_ABSENT); }
  const pt = resolvePatient({ texte: "", ecran: "note", patientId: input.patientId, patient: input.patient });
  const client = new Anthropic();
  let res: Anthropic.Message;
  try {
    res = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: `${MODELES[input.modele ?? ""] ?? ""}${pt ? `Patient : ${pt.sexe === "F" ? "femme" : "homme"}, ${pt.age} ans.${pt.allergies.length ? ` Allergies connues : ${pt.allergies.join(", ")}.` : ""}\n` : ""}${input.motif ? `Motif de consultation (agenda) : ${input.motif}\n` : ""}\nTRANSCRIPT :\n${transcript}` }],
    });
  } catch (e) {
    console.error("[note]", e);
    throw new SyntheseIndisponible(erreurModele(e));
  }
  const texte = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
  if (!texte) throw new SyntheseIndisponible({ status: 502, code: "note_vide", message: "Le modèle n'a rien rendu pour ce transcript. Réessayez, ou écrivez la note directement." });
  return { note: texte };
}
