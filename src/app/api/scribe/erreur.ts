import "server-only";
import type { CodeErreur, ErreurReponse } from "@/data/scribe/live";

/**
 * Les réponses d'erreur des routes de génération du scribe. Jamais de
 * contenu de repli : une génération qui n'aboutit pas renvoie une erreur
 * que la page affiche telle quelle, avec « Réessayer ».
 */

const MESSAGES: Record<Exclude<CodeErreur, "donnees_reelles">, string> = {
  indisponible: "Le service de génération est injoignable pour l'instant. Rien n'a été généré.",
  sature: "Le service de génération est saturé pour l'instant. Rien n'a été généré.",
  echec: "La génération n'a pas abouti. Rien n'a été généré.",
};

const STATUT: Record<Exclude<CodeErreur, "donnees_reelles">, number> = { indisponible: 503, sature: 503, echec: 502 };

export function erreur(code: Exclude<CodeErreur, "donnees_reelles">): Response {
  const body: ErreurReponse = { error: MESSAGES[code], code };
  return Response.json(body, { status: STATUT[code], headers: { "Cache-Control": "no-store" } });
}

/**
 * Une exception d'un appel de modèle → le code d'erreur. 429 et 529 :
 * saturé ; pas de statut (réseau) ou 5xx : injoignable ; le reste : échec.
 */
export function codeDe(e: unknown): Exclude<CodeErreur, "donnees_reelles"> {
  const s = (e as { status?: unknown } | null)?.status;
  if (s === 429 || s === 529) return "sature";
  if (typeof s !== "number" || s >= 500) return "indisponible";
  return "echec";
}
