"use client";
import * as React from "react";

/**
 * Une progression de 0 à 1, relancée à chaque nouveau `run` : sert à révéler
 * une réponse au fil de l'eau (core rend `answer` d'un bloc, le scénario
 * rejoué aussi). `run` = 0 : tout est affiché d'emblée. Sans animation si
 * l'utilisateur a demandé à réduire les mouvements.
 */
export function useProgress(run: number, ms: number): number {
  const [p, setP] = React.useState(1);
  React.useEffect(() => {
    if (run === 0) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setP(1); return; }
    let raf = 0;
    const t0 = performance.now();
    setP(0);
    const tick = (t: number) => {
      const v = Math.min(1, (t - t0) / ms);
      setP(v);
      if (v < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, ms]);
  return p;
}

/** Les premiers caractères d'un texte, coupés à la fin d'un mot. */
export function reveal(text: string, p: number): string {
  if (p >= 1) return text;
  const n = Math.floor(text.length * Math.max(0, p));
  const cut = text.lastIndexOf(" ", n);
  return text.slice(0, cut > 0 ? cut : n);
}
