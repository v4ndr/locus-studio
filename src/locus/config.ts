import "server-only";

/**
 * La configuration du backend, lue côté serveur uniquement.
 *
 * Trois modes, décidés par l'environnement :
 * - `core`     : LOCUS_CORE_URL + LOCUS_API_KEY → `/v2/*`, la vraie API.
 * - `keyless`  : LOCUS_CORE_URL sans clé → la Sandbox `/console/*` de core
 *                (même retrieving, pas de trace, pas de crédits).
 * - `simulation` : pas d'URL → l'agent répond depuis une base locale.
 *                C'est le mode du dépôt cloné à sec : tout le produit tourne.
 */
export type CoreMode = "core" | "keyless" | "simulation";

export interface CoreConfig {
  mode: CoreMode;
  url: string;
  key?: string;
}

export function coreConfig(): CoreConfig {
  const url = (process.env.LOCUS_CORE_URL ?? "").replace(/\/$/, "");
  const key = process.env.LOCUS_API_KEY?.trim() || undefined;
  if (!url) return { mode: "simulation", url: "" };
  return { mode: key ? "core" : "keyless", url, key };
}

export function paths(cfg: CoreConfig) {
  const keyless = cfg.mode === "keyless";
  return {
    retrieve: keyless ? "/console/retrieve" : "/v2/retrieve/stream",
    specialite: (cis: string) => (keyless ? `/console/drugs/specialite/${cis}` : `/v2/drugs/specialites/${cis}`),
    rubric: (id: string) => (keyless ? `/console/drugs/rubric/${id}` : `/v2/drugs/rubrics/${id}`),
    /** Pas d'équivalent keyless dans core : en keyless on simule. */
    logic: "/v2/logic/compute",
    feedback: "/v2/feedback",
    sources: "/v2/sources",
  };
}

export function authHeaders(cfg: CoreConfig, userRef = "studio"): HeadersInit {
  if (!cfg.key) return {};
  return { Authorization: `Bearer ${cfg.key}`, "X-Locus-User-Ref": userRef };
}
