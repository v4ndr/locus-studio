"use client";
import * as React from "react";
import { DEFAULT_LANG, type Lang } from "./config";

/** La langue courante côté client, posée par `src/app/[lang]/layout.tsx`. */
const LangContext = React.createContext<Lang>(DEFAULT_LANG);

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export const useLang = () => React.useContext(LangContext);
