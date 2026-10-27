"use client";
import * as React from "react";
import { MODE_KEY } from "@/i18n/config";

export type Mode = "dark" | "light";

/**
 * Avant le premier rendu : applique le thème mémorisé. Clair par défaut (le
 * lin de la landing) ; le sombre pose `data-mode="dark"` sur <html>.
 */
export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem('${MODE_KEY}')==='dark')document.documentElement.setAttribute('data-mode','dark')}catch(e){}` }} />;
}

const lire = (): Mode => (typeof document !== "undefined" && document.documentElement.getAttribute("data-mode") === "dark" ? "dark" : "light");

/** Le thème courant, et sa bascule. Les autres instances suivent via l'attribut de <html>. */
export function useTheme() {
  const [mode, setState] = React.useState<Mode>("light");
  React.useEffect(() => {
    setState(lire());
    const obs = new MutationObserver(() => setState(lire()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mode"] });
    return () => obs.disconnect();
  }, []);
  const setMode = React.useCallback((m: Mode) => {
    if (m === "dark") document.documentElement.setAttribute("data-mode", "dark");
    else document.documentElement.removeAttribute("data-mode");
    try { localStorage.setItem(MODE_KEY, m); } catch {}
  }, []);
  return { mode, setMode };
}
