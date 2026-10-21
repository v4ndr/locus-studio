"use client";
import * as React from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Le clavier des fenêtres de la zone : à l'ouverture, le focus entre dans la
 * fenêtre (sur `[data-autofocus]`, sinon le premier élément focusable) ; à la
 * fermeture, il revient là où il était. `trap` garde Tab dans la fenêtre
 * (fenêtres modales) ; le panneau de l'assistant, lui, laisse sortir vers
 * les boutons « Injecter ici » de MédiCab.
 */
export function useDialogFocus<T extends HTMLElement>(trap = true) {
  const ref = React.useRef<T>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const before = document.activeElement as HTMLElement | null;
    const first = el.querySelector<HTMLElement>("[data-autofocus]") ?? el.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? el).focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (!trap || e.key !== "Tab") return;
      const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((x) => x.offsetParent !== null);
      if (!items.length) return;
      const a = items[0]!, z = items[items.length - 1]!;
      if (e.shiftKey && (document.activeElement === a || !el.contains(document.activeElement))) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && (document.activeElement === z || !el.contains(document.activeElement))) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (before && before.isConnected) before.focus({ preventScroll: true });
    };
  }, [trap]);
  return ref;
}
