import type { Metadata } from "next";
import { LANGS, type Lang } from "@/i18n/config";

/**
 * `alternates` d'une page : l'URL canonique dans la langue courante, et
 * `hreflang` vers chaque langue (même chemin, préfixe changé). `path` est le
 * chemin sans préfixe de langue (`""` pour l'accueil, `/chatbot`…).
 */
export function alternates(lang: Lang, path: string): Metadata["alternates"] {
  const languages: Record<string, string> = Object.fromEntries(LANGS.map((l) => [l, `/${l}${path}`]));
  languages["x-default"] = `/fr${path}`;
  return { canonical: `/${lang}${path}`, languages };
}
