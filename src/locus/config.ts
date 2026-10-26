import "server-only";
import { locusUserRef } from "@/lib/server/user";

/**
 * La configuration du backend, lue côté serveur uniquement.
 *
 * Trois états, décidés par l'environnement :
 * - `core`     : LOCUS_CORE_URL + LOCUS_API_KEY → `/v2/*`, la vraie API.
 * - `keyless`  : LOCUS_CORE_URL sans clé → la Sandbox `/console/*` de core
 *                (même retrieving, pas de trace, pas de crédits).
 * - `absent`   : pas d'URL → chaque appel à Locus échoue, honnêtement. Il
 *                n'y a pas de réponse de repli : Studio est live ou rien.
 */
export type CoreMode = "core" | "keyless" | "absent";

export interface CoreConfig {
  mode: CoreMode;
  url: string;
  key?: string;
}

export function coreConfig(): CoreConfig {
  const url = (process.env.LOCUS_CORE_URL ?? "").replace(/\/$/, "");
  const key = process.env.LOCUS_API_KEY?.trim() || undefined;
  if (!url) return { mode: "absent", url: "" };
  return { mode: key ? "core" : "keyless", url, key };
}

export function paths(cfg: CoreConfig) {
  const keyless = cfg.mode === "keyless";
  return {
    retrieve: keyless ? "/console/retrieve" : "/v2/retrieve/stream",
    specialite: (cis: string) => (keyless ? `/console/drugs/specialite/${cis}` : `/v2/drugs/specialites/${cis}`),
    rubric: (id: string) => (keyless ? `/console/drugs/rubric/${id}` : `/v2/drugs/rubrics/${id}`),
    /** Pas d'équivalent keyless dans core : les scores demandent une clé. */
    logic: "/v2/logic/compute",
    feedback: "/v2/feedback",
    sources: "/v2/sources",
  };
}

export function authHeaders(cfg: CoreConfig, userRef = "studio"): HeadersInit {
  if (!cfg.key) return {};
  return { Authorization: `Bearer ${cfg.key}`, "X-Locus-User-Ref": userRef };
}

/** Les en-têtes de core pour la requête en cours : `X-Locus-User-Ref: studio:<clerkUserId>` quand un compte est connecté. */
export async function userAuthHeaders(cfg: CoreConfig): Promise<HeadersInit> {
  if (!cfg.key) return {};
  return authHeaders(cfg, await locusUserRef());
}
