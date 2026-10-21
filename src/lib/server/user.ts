import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";

/**
 * L'utilisateur Studio connecté, côté serveur.
 *
 * Studio a sa propre instance Clerk (spec §2.2) : un compte Studio n'ouvre
 * jamais la bêta de l'app. Sans les clés de cette instance
 * (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` et `CLERK_SECRET_KEY`), la connexion
 * est éteinte : le proxy ne pose pas Clerk, le layout n'a pas de provider,
 * et ces fonctions renvoient `null` sans rien appeler.
 */

export type StudioUser = { id: string; email: string | null };

/** Vrai quand les deux clés de l'instance Clerk Studio sont posées. */
export function clerkEnabled(): boolean {
  return !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() && !!process.env.CLERK_SECRET_KEY?.trim();
}

/** L'identifiant Clerk de l'utilisateur connecté, sans appel réseau (jeton de session). */
export async function getStudioUserId(): Promise<string | null> {
  if (!clerkEnabled()) return null;
  try {
    const { userId } = await auth();
    return userId ?? null;
  } catch {
    // Hors portée d'une requête, ou proxy Clerk absent sur ce chemin : visiteur.
    return null;
  }
}

/**
 * `{ id, email }` de l'utilisateur connecté, ou `null`. L'email vient d'un
 * claim `email` du jeton s'il est configuré dans Clerk, sinon d'un appel à
 * l'API Clerk : réservé aux écrans, pas aux routes chaudes (`getStudioUserId`).
 */
export async function getStudioUser(): Promise<StudioUser | null> {
  if (!clerkEnabled()) return null;
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) return null;
    const claim = (sessionClaims as Record<string, unknown> | null)?.email;
    if (typeof claim === "string" && claim) return { id: userId, email: claim };
    const u = await currentUser();
    return { id: userId, email: u?.primaryEmailAddress?.emailAddress ?? u?.emailAddresses[0]?.emailAddress ?? null };
  } catch {
    return null;
  }
}

/** La valeur de `X-Locus-User-Ref` pour core : `studio:<clerkUserId>`, ou `studio` pour un visiteur. */
export async function locusUserRef(): Promise<string> {
  const id = await getStudioUserId();
  return id ? `studio:${id}` : "studio";
}
