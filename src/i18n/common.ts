import type { Dict } from "./config";

/** Zone commune : coque (sidebar, tiroir, palette), noms des outils, bandeau sandbox. */
const fr = {
  brand: { name: "Locus Studio", wordmarkA: "locus", wordmarkB: "/studio" },
  nav: {
    label: "Navigation",
    search: "Rechercher",
    home: "Accueil",
    sandbox: "Sandbox",
    resources: "Ressources",
    sources: "Sources",
    docs: "Documentation",
    keys: "Clés API",
    invite: "invitation",
    soon: "bientôt",
  },
  tools: {
    lgcNatif: "LGC natif IA",
    integration: "Intégration LGC",
    chatbot: "Chatbot sourcé",
    scribe: "Scribe + aide à la décision",
  },
  notice: { title: "Sandbox", text: "Patients fictifs. Non destiné à un usage clinique." },
  banner: "Sandbox · patients fictifs · non destiné à un usage clinique",
  theme: { label: "Thème", dark: "Sombre", light: "Clair" },
  language: { label: "Langue" },
  account: { guest: "Visiteur", guestSub: "Accès public", signin: "Se connecter", request: "Demander un accès" },
  menu: { open: "Menu", close: "Fermer" },
  palette: { placeholder: "Aller à…, ou une question à Locus", empty: "Aucun résultat", hint: "Entrée pour ouvrir", pages: "Pages", ask: "Demander à Locus", askScope: "Toute la patientèle · LGC natif IA" },
  soon: { title: "Bientôt disponible", text: "Cet espace du sandbox arrive bientôt.", back: "Retour à l'accueil" },
  notFound: { code: "404", title: "Cette page n'existe pas", back: "Retour à l'accueil" },
  error: { title: "Cet écran n'a pas pu s'afficher", text: "Rechargez l'écran. Vos brouillons restent sur ce poste.", retry: "Recharger l'écran", home: "Accueil" },
};

const en: typeof fr = {
  brand: { name: "Locus Studio", wordmarkA: "locus", wordmarkB: "/studio" },
  nav: {
    label: "Navigation",
    search: "Search",
    home: "Home",
    sandbox: "Sandbox",
    resources: "Resources",
    sources: "Sources",
    docs: "Documentation",
    keys: "API keys",
    invite: "invite",
    soon: "soon",
  },
  tools: {
    lgcNatif: "AI-native EHR",
    integration: "EHR integration",
    chatbot: "Grounded chatbot",
    scribe: "Scribe to decision support",
  },
  notice: { title: "Sandbox", text: "Fictional patients. Not for clinical use." },
  banner: "Sandbox · fictional patients · not for clinical use",
  theme: { label: "Theme", dark: "Dark", light: "Light" },
  language: { label: "Language" },
  account: { guest: "Visitor", guestSub: "Public access", signin: "Sign in", request: "Request access" },
  menu: { open: "Menu", close: "Close" },
  palette: { placeholder: "Go to…, or a question for Locus", empty: "No results", hint: "Enter to open", pages: "Pages", ask: "Ask Locus", askScope: "Whole patient list · AI-native EHR" },
  soon: { title: "Coming soon", text: "This sandbox space is coming soon.", back: "Back to home" },
  notFound: { code: "404", title: "This page does not exist", back: "Back to home" },
  error: { title: "This screen could not be displayed", text: "Reload the screen. Your drafts stay on this device.", retry: "Reload", home: "Home" },
};

export const common: Dict<typeof fr> = { fr, en };
export type CommonDict = typeof fr;
