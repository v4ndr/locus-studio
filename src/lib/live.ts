/**
 * Côté navigateur : appeler une route live, et retomber sur le scénario
 * rejoué quand le serveur la ferme (403 `live_locked`, voir
 * `src/lib/server/guard.ts`). Après un premier refus, les appels suivants
 * partent directement en rejoué : pas de double requête à chaque geste.
 */

const REPLAY_HEADER = "x-studio-replay";
let verrouille = false;

/** Vrai une fois que le serveur a refusé le mode live dans cet onglet. */
export const enRejoue = () => verrouille;

export async function fetchLive(url: string, init: RequestInit = {}): Promise<Response> {
  const avec = (replay: boolean): RequestInit => {
    const h = new Headers(init.headers);
    if (replay) h.set(REPLAY_HEADER, "1");
    return { ...init, headers: h };
  };
  if (verrouille) return fetch(url, avec(true));
  const r = await fetch(url, avec(false));
  if (r.status !== 403) return r;
  const j = (await r.clone().json().catch(() => null)) as { code?: string } | null;
  if (j?.code !== "live_locked") return r;
  verrouille = true;
  return fetch(url, avec(true));
}
