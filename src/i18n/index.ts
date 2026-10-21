/**
 * Les dictionnaires, un fichier par zone : chaque PR n'édite que le sien.
 * Usage serveur : `common[lang].nav.home`. Usage client : `useLang()` puis
 * `common[lang]` (voir `src/i18n/lang.tsx`).
 */
export * from "./config";
export * from "./routes";
export { common, type CommonDict } from "./common";
export { home, type HomeDict } from "./home";
export { acces, type AccesDict } from "./acces";
export { chatbot, type ChatbotDict } from "./chatbot";
export { lgc, type LgcDict } from "./lgc";
export { scribe, type ScribeDict } from "./scribe";
export { studio, type StudioDict } from "./studio";
export { ressources, type RessourcesDict } from "./ressources";
