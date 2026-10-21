import type { Lang } from "./config";

/**
 * Les routes de l'app. Les slugs sont identiques en FR et en EN.
 * Toute navigation entre zones passe par `route()` : un slug ne change qu'ici.
 */
export const SLUGS = {
  home: "",
  acces: "acces",
  lgcNatif: "lgc-natif",
  integration: "integration-lgc",
  chatbot: "chatbot",
  scribe: "scribe",
  sources: "sources",
  documentation: "documentation",
  clesApi: "cles-api",
} as const;
export type RouteKey = keyof typeof SLUGS;

export function route(lang: Lang, key: RouteKey, rest = ""): string {
  const slug = SLUGS[key];
  return `/${lang}${slug ? `/${slug}` : ""}${rest}`;
}

/** Les quatre outils du sandbox, dans l'ordre de la sidebar et de l'accueil. */
export const TOOLS = ["lgcNatif", "integration", "chatbot", "scribe"] as const satisfies readonly RouteKey[];
export type ToolKey = (typeof TOOLS)[number];
