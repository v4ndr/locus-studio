/**
 * Côté navigateur : appeler une route live. Tout Studio est live, derrière
 * un compte : une session expirée reçoit 401 `auth_required` (voir
 * `src/lib/server/guard.ts`), et l'onglet repart vers l'entrée.
 */

const AUTH_REQUIRED = "auth_required";

export async function fetchLive(url: string, init: RequestInit = {}): Promise<Response> {
  const r = await fetch(url, init);
  if (r.status !== 401) return r;
  const j = (await r.clone().json().catch(() => null)) as { code?: string } | null;
  if (j?.code === AUTH_REQUIRED && typeof window !== "undefined") {
    const lang = window.location.pathname.split("/")[1] || "fr";
    window.location.assign(`/${lang}`);
  }
  return r;
}
