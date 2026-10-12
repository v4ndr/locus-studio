"use client";
import * as React from "react";

/** Avant le premier rendu : applique le thème mémorisé (ou celui du système). */
export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('ls-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}` }} />;
}

export function useTheme() {
  const [dark, setDark] = React.useState(false);
  React.useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = React.useCallback(() => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    setDark(next);
    try { localStorage.setItem("ls-theme", next ? "dark" : "light"); } catch {}
  }, []);
  return { dark, toggle };
}

export function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <button type="button" onClick={toggle} aria-label={dark ? "Passer en clair" : "Passer en sombre"} title={dark ? "Clair" : "Sombre"} className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-line bg-paper text-ink-3 hover:bg-hover">
      {dark ? <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg> : <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>}
    </button>
  );
}
