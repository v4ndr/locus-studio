import "server-only";
import { retrieveStream } from "@/locus/client.server";
import { coreConfig } from "@/locus/config";
import { patientEhr, type FieldKey, type Variante } from "@/data/integration-lgc/fournier";
import { json } from "./request";

/**
 * L'appel à core des briques MédiCab 7 : `/v2/retrieve` avec le dossier
 * transmis (seulement les champs cochés, sans nom) et `app_surface:"studio-ehr"`.
 * Pas de sortie de repli : sans core, ou quand core ne répond pas, la route
 * renvoie une erreur et la carte Locus le dit, avec « Réessayer ».
 */

export const APP_SURFACE = "studio-ehr";

/** Vrai quand un core est configuré (clé ou Sandbox keyless) : sans URL, il n'y a rien à appeler. */
export const coreDisponible = () => !!coreConfig().url;

/** Codes d'erreur lus par le navigateur (`src/sandbox/integration-lgc/api.ts`). */
export type CoreErrorCode = "core_unconfigured" | "core_unavailable";

export class CoreError extends Error {
  constructor(readonly code: CoreErrorCode) { super(code); }
}

/** La réponse d'erreur d'une route pour un échec de core : 503 sans core, 502 quand il ne répond pas. */
export function coreErrorResponse(e: unknown): Response {
  if (e instanceof CoreError && e.code === "core_unconfigured") return json({ error: "Locus n'est pas configuré sur ce serveur.", code: e.code }, 503);
  return json({ error: "Locus n'a pas répondu. Réessayez.", code: "core_unavailable" }, 502);
}

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

/** Une question à core sur le dossier transmis. Lève `CoreError` quand il n'y a pas de réponse. */
export async function askLocus(question: string, fields: readonly FieldKey[], v: Variante = "fournier"): Promise<LocusReply> {
  if (!coreDisponible()) throw new CoreError("core_unconfigured");
  let answer = "";
  let short = "";
  let source: string | undefined;
  try {
    for await (const ev of retrieveStream({ query: question, patient_ehr: patientEhr(fields, v), mode: "rapide", app_surface: APP_SURFACE })) {
      if (ev.step === "error") throw new CoreError("core_unavailable");
      if (ev.step === "answer") answer = ev.answer;
      if (ev.step === "done") {
        answer = ev.payload.answer || answer;
        short = ev.payload.answerShort;
        const doc = ev.payload.docs[0];
        if (doc) source = [doc.source_name, doc.title].filter(Boolean).join(" · ").slice(0, 90) || undefined;
      }
    }
  } catch (e) {
    if (!(e instanceof CoreError)) console.error("[integration-lgc] core", e);
    throw e instanceof CoreError ? e : new CoreError("core_unavailable");
  }
  const l = lignes(answer);
  if (!l.length && !short) throw new CoreError("core_unavailable");
  return { lines: l.length ? l : [short], short: short || l[0], source };
}
