/** Les langues de l'interface. Les patients, documents et le corpus restent en français. */
export const LANGS = ["fr", "en"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "fr";
export const isLang = (v: unknown): v is Lang => typeof v === "string" && (LANGS as readonly string[]).includes(v);
/** Cookie posé par la bascule FR/EN, lu par `src/proxy.ts` pour rediriger `/`. */
export const LANG_COOKIE = "ls-lang";
/** Clé localStorage du thème ; absent = sombre (défaut Noir). */
export const MODE_KEY = "ls-mode";

/** Un dictionnaire de zone : la forme française fait foi, l'anglais doit avoir les mêmes clés. */
export type Dict<T> = { [L in Lang]: T };
