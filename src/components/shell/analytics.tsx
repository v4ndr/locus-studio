"use client";
import * as React from "react";
import posthog from "posthog-js";
import { useStudioAccount } from "@/sandbox/acces/auth";

/**
 * La mesure côté navigateur (PostHog) : pages vues, sessions, et le compte
 * connecté, identifié par `studio:<clerkId>` — le même identifiant que les
 * événements serveur (`studio_live_call`) et que `X-Locus-User-Ref` envoyé à
 * core. Un prospect se lit alors d'un bout à l'autre : ce qu'il a ouvert, ce
 * qu'il a lancé, ce que ça a coûté.
 *
 * Inerte sans `NEXT_PUBLIC_POSTHOG_KEY`. Les envois passent par `/ingest`
 * (réécrit vers PostHog dans `next.config.mjs`) : la CSP reste sur `'self'`.
 */
const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() ?? "";
let pret = false;

export function StudioAnalytics() {
  const { loaded, user } = useStudioAccount();

  React.useEffect(() => {
    if (!KEY || pret) return;
    posthog.init(KEY, {
      api_host: "/ingest",
      ui_host: "https://eu.posthog.com",
      capture_pageview: "history_change",
      person_profiles: "identified_only",
    });
    posthog.register({ service: "locus-studio" });
    pret = true;
  }, []);

  React.useEffect(() => {
    if (!KEY || !loaded) return;
    if (user) {
      posthog.identify(`studio:${user.id}`, user.email ? { email: user.email } : undefined);
    } else if (posthog.get_property("$user_state") === "identified") {
      posthog.reset();
    }
  }, [loaded, user]);

  return null;
}
