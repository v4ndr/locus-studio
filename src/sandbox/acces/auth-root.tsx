import * as React from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { route, type Lang } from "@/i18n";
import { clerkEnabled } from "@/lib/server/user";
import { StudioAccountProvider } from "./auth";

/**
 * La racine d'authentification, posée par `src/app/[lang]/layout.tsx`.
 * Avec les clés de l'instance Clerk Studio : `ClerkProvider` et le compte
 * connecté. Sans clés : visiteur, aucun script Clerk.
 *
 * L'inscription publique est fermée (accès sur invitation, mode « Restricted »
 * dans Clerk) : connexion et inscription renvoient toutes deux vers `/acces`.
 */
export function AuthRoot({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  if (!clerkEnabled()) return <StudioAccountProvider enabled={false}>{children}</StudioAccountProvider>;
  const acces = route(lang, "acces");
  return (
    <ClerkProvider signInUrl={acces} signUpUrl={acces} signInFallbackRedirectUrl={route(lang, "home")} signUpFallbackRedirectUrl={route(lang, "home")} afterSignOutUrl={acces}>
      <StudioAccountProvider enabled>{children}</StudioAccountProvider>
    </ClerkProvider>
  );
}
