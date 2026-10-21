import "server-only";
import { retrieveStream } from "@/locus/client.server";
import { coreConfig } from "@/locus/config";
import { patientEhr, type FieldKey, type Variante } from "@/data/integration-lgc/fournier";

/**
 * L'appel à core des briques MédiCab 7 : `/v2/retrieve` avec le dossier
 * transmis (seulement les champs cochés, sans nom) et `app_surface:"studio-ehr"`.
 * Renvoie `null` quand core n'est pas configuré ou ne répond pas : la route
 * retombe alors sur le scénario rejoué.
 */

export const APP_SURFACE = "studio-ehr";

/** Vrai quand un core est configuré (clé ou Sandbox keyless). Sans core, les briques rejouent. */
export const coreDisponible = () => coreConfig().mode !== "simulation";

export interface LocusReply { lines: string[]; short: string; source?: string }

/** Le markdown de core en lignes lisibles dans une carte : sans titres, puces ni citations. */
function lignes(md: string): string[] {
  return md
    .replace(/\[(?:[^\]]*)\]\((?:[^)]*)\)/g, "")
    .replace(/\s?\[[^\]]{1,80}\]/g, "")
    .split(/\n+/)
    .map((l) => l.replace(/^#+\s*/, "").replace(/^[-*•]\s+/, "").replace(/\*\*|__|`/g, "").trim())
    .filter((l) => l.length > 1)
    .slice(0, 6);
}

export async function askLocus(question: string, fields: readonly FieldKey[], v: Variante = "fournier"): Promise<LocusReply | null> {
  if (!coreDisponible()) return null;
  let answer = "";
  let short = "";
  let source: string | undefined;
  try {
    for await (const ev of retrieveStream({ query: question, patient_ehr: patientEhr(fields, v), mode: "rapide", app_surface: APP_SURFACE })) {
      if (ev.step === "error") return null;
      if (ev.step === "answer") answer = ev.answer;
      if (ev.step === "done") {
        answer = ev.payload.answer || answer;
        short = ev.payload.answerShort;
        const doc = ev.payload.docs[0];
        if (doc) source = [doc.source_name, doc.title].filter(Boolean).join(" · ").slice(0, 90) || undefined;
      }
    }
  } catch (e) {
    console.error("[integration-lgc] core", e);
    return null;
  }
  const l = lignes(answer);
  if (!l.length && !short) return null;
  return { lines: l.length ? l : [short], short: short || l[0], source };
}
