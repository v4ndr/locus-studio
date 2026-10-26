import "server-only";
import { after } from "next/server";

/**
 * Les événements serveur de Studio, vers le projet PostHog des apps Locus.
 *
 * Chaque appel live (`guardLive`) y laisse `studio_live_call` : quel outil,
 * quel compte, admis ou refusé (quota, connexion). C'est la seule mesure des
 * outils qui ne passent pas par core (RAG simple, LGC natif) ; ceux qui y
 * passent laissent en plus `api_call` côté core, sous le client Studio.
 *
 * Inerte sans clé (`NEXT_PUBLIC_POSTHOG_KEY`). Ne bloque pas la réponse
 * (`after`) et ne lève jamais : une mesure ne casse pas l'outil qu'elle mesure.
 */

const host = () => (process.env.POSTHOG_HOST?.trim() || "https://eu.i.posthog.com").replace(/\/$/, "");
const key = () => process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() || "";

export function analyticsEnabled(): boolean {
  return !!key();
}

async function envoyer(event: string, distinctId: string, properties: Record<string, unknown>): Promise<void> {
  try {
    await fetch(`${host()}/i/v0/e/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key(),
        event,
        distinct_id: distinctId,
        properties: { ...properties, service: "locus-studio", $lib: "locus-studio-server" },
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(3_000),
    });
  } catch {
    // Une instance PostHog injoignable ne coûte qu'un événement.
  }
}

/** Émet un événement après la réponse. `distinctId` : `studio:<clerkId>`, le même que l'app identifie. */
export function captureServer(event: string, distinctId: string, properties: Record<string, unknown> = {}): void {
  if (!analyticsEnabled()) return;
  try {
    after(() => envoyer(event, distinctId, properties));
  } catch {
    // Hors d'une requête (tests, scripts) : envoi direct, sans attendre.
    void envoyer(event, distinctId, properties);
  }
}
