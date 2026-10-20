import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { MODEL, composeMode } from "./run";
import { resolvePatient } from "./patient";
import type { PatientLocalPayload } from "./contract";

/**
 * La passe de synthèse : du transcript brut d'une consultation (dictée au
 * micro, dictée simulée, texte collé) à une note clinique TRÈS courte, en
 * français, que le médecin relit, corrige, et décline ensuite en actions.
 *
 * Avec ANTHROPIC_API_KEY : Claude, un seul appel, pas d'outil. Sans clé :
 * des règles qui trient les phrases par rubrique — plus court, moins fin,
 * mais le produit reste entier à sec.
 */

export interface SyntheseInput { transcript: string; motif?: string; patientId?: string; patient?: PatientLocalPayload }
export interface SyntheseOutput { note: string; via: "claude" | "simulation" }

const SYSTEM = `Tu es Locus, l'agent d'un cabinet de médecine générale. On te donne le TRANSCRIPT brut d'une consultation (dictée, parfois décousue, avec des hésitations et des paroles au patient). Tu en écris la NOTE DE CONSULTATION, très courte, en français, style télégraphique de dossier médical.

Règles :
- Quatre rubriques au plus, chacune sur sa ligne, seulement si le transcript en fournit la matière : « Motif : », « Examen : », « Conclusion : », « Conduite à tenir : ». Pas d'autre texte, pas de titre, pas de phrase d'introduction ni de conclusion.
- 80 mots maximum au total. Chaque rubrique : une ligne, les éléments séparés par des virgules ou des points-virgules.
- Tu n'inventes rien : pas de diagnostic, de mesure, de dose ou de durée qui ne soit pas dans le transcript. Les chiffres (tension, poids, température, doses, durées, nombres de séances) sont recopiés exactement.
- Les prescriptions, arrêts, courriers, rendez-vous et messages évoqués vont dans « Conduite à tenir », avec leurs doses et durées telles que dictées.
- Pas de nom de patient, pas de formule de politesse, DCI en minuscules.`;

const phrases = (t: string) => t.replace(/\s+/g, " ").split(/(?<=[.!?;])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length > 3);
const coupe = (s: string, n = 160) => (s.length > n ? s.slice(0, n - 1).replace(/[,;:\s]+\S*$/, "") + "…" : s);
const nettoie = (s: string) => s.replace(/^(donc|alors|bon|voilà|euh|hein|ok|d'accord)[, ]+/i, "").replace(/\s+([,.;:])/g, "$1").replace(/[.;,\s]+$/, "").trim();
const maj = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** À sec : chaque phrase va dans la rubrique que ses mots désignent ; deux phrases par rubrique au plus. */
export function synthetiserRegles(transcript: string, motif?: string): string {
  const CAT = /\b(prescri|ordonnance|renouvel|arr[êe]t|prolong|kin[ée]|s[ée]ances|courrier|adress|revoir|rendez|rdv|contr[ôo]le dans|mg\b|\bg\b|µg|jours?\b|semaines?\b|sem\b|mois\b|bilan|radio|scanner|irm|[ée]cho|message|certificat|vaccin|rappel|dtp|d[ée]claration|\bmp\b|on fait)/i;
  const EXA = /\b(ta\b|tension|auscult|abdomen|temp[ée]rature|poids|sat|spo2|examen|palp|gorge|tympan|souffle|œd[èe]me|oedeme|r[ée]flexe|pouls|fc\b|fr[ée]quence|eva\b|cozen|lasègue|lasegue|douleur [àa] la|scanner vu|radio vue|r[ée]sultats? (vu|re[çc]u)|bio(logie)? (vue|re[çc]ue)|normal)/i;
  const HISTOIRE = /\b(malgr[ée]|d[ée]j[àa]|depuis|avant|la derni[èe]re fois|habituel|automédication|a pris)\b/i;
  const CON = /\b(diagnostic|conclusion|je pense|il s'agit|probable|compatible avec|en faveur|c'est une?|lombalgie|angine|sinusite|gastro|bronchite|otite|cystite|entorse|d[ée]pression|hta|diab)/i;
  const MOT = /\b(vient pour|consulte pour|se plaint|motif|depuis \d|depuis (hier|avant-hier|quelques|une|deux|trois)|douleur|fi[èe]vre|toux|fatigue)/i;
  const r: Record<"motif" | "examen" | "conclusion" | "cat", string[]> = { motif: [], examen: [], conclusion: [], cat: [] };
  for (const p0 of phrases(transcript)) {
    const p = nettoie(p0); if (!p) continue;
    // Un examen ou un résultat vu passe avant une prescription ; une phrase d'histoire (« malgré la kiné ») n'est pas une conduite à tenir.
    const k = EXA.test(p) && !/\b(prescri|renouvel|prolong|adress|revoir)/i.test(p) ? "examen" : CAT.test(p) && !HISTOIRE.test(p) ? "cat" : CON.test(p) ? "conclusion" : MOT.test(p) || !r.motif.length ? "motif" : HISTOIRE.test(p) && r.motif.length < 2 ? "motif" : null;
    // La conduite à tenir garde tout ce qui est prescrit ou demandé ; les autres rubriques, deux phrases.
    if (k && r[k].length < (k === "cat" ? 8 : 2)) r[k].push(coupe(p, k === "cat" ? 110 : 160));
  }
  const lignes: string[] = [];
  const m = motif?.trim() || r.motif.map(maj).join(" ; ");
  if (m) lignes.push(`Motif : ${m}`);
  if (r.examen.length) lignes.push(`Examen : ${r.examen.map(maj).join(" ; ")}`);
  if (r.conclusion.length) lignes.push(`Conclusion : ${r.conclusion.map(maj).join(" ; ")}`);
  if (r.cat.length) lignes.push(`Conduite à tenir : ${r.cat.map(maj).join(" ; ")}`);
  return lignes.join("\n") || coupe(nettoie(transcript), 240);
}

export async function synthetiserNote(input: SyntheseInput, opts: { replay?: boolean } = {}): Promise<SyntheseOutput> {
  const transcript = input.transcript.trim();
  if (opts.replay || composeMode() === "simulation") return { note: synthetiserRegles(transcript, input.motif), via: "simulation" };
  const pt = resolvePatient({ texte: "", ecran: "note", patientId: input.patientId, patient: input.patient });
  const client = new Anthropic();
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: `${pt ? `Patient : ${pt.sexe === "F" ? "femme" : "homme"}, ${pt.age} ans.${pt.allergies.length ? ` Allergies connues : ${pt.allergies.join(", ")}.` : ""}\n` : ""}${input.motif ? `Motif de consultation (agenda) : ${input.motif}\n` : ""}\nTRANSCRIPT :\n${transcript}` }],
  });
  const texte = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
  return { note: texte || synthetiserRegles(transcript, input.motif), via: "claude" };
}
