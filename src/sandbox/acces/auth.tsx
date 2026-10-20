"use client";
import * as React from "react";
import { useClerk, useUser } from "@clerk/nextjs";

/**
 * Le compte Studio côté navigateur, que Clerk soit branché ou non.
 *
 * `enabled` vient du layout serveur (les deux clés de l'instance Clerk
 * Studio sont posées) : sans clés, aucun hook Clerk n'est appelé et tout le
 * monde est visiteur.
 */
export type StudioAccount = {
  enabled: boolean;
  loaded: boolean;
  user: { id: string; email: string | null } | null;
  signOut: () => Promise<void>;
};

const VISITEUR: StudioAccount = { enabled: false, loaded: true, user: null, signOut: async () => {} };
const AccountContext = React.createContext<StudioAccount>(VISITEUR);

function ClerkBridge({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const clerk = useClerk();
  const value = React.useMemo<StudioAccount>(() => ({
    enabled: true,
    loaded: isLoaded,
    user: isSignedIn && user ? { id: user.id, email: user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null } : null,
    signOut: () => clerk.signOut(),
  }), [isLoaded, isSignedIn, user, clerk]);
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function StudioAccountProvider({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  if (!enabled) return <AccountContext.Provider value={VISITEUR}>{children}</AccountContext.Provider>;
  return <ClerkBridge>{children}</ClerkBridge>;
}

export const useStudioAccount = () => React.useContext(AccountContext);
