"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "./theme";

/* ---------------- icônes (trait, jamais d'emoji) ---------------- */
export const I = {
  search: (p: { size?: number; color?: string }) => <svg aria-hidden="true" width={p.size ?? 18} height={p.size ?? 18} viewBox="0 0 24 24" fill="none" stroke={p.color ?? "var(--muted-2)"} strokeWidth="1.7" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>,
  mic: () => <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>,
  chevron: (p: { open?: boolean; color?: string }) => <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={p.color ?? "var(--muted-2)"} strokeWidth="2" strokeLinecap="round" className="chev" style={{ transform: p.open ? "rotate(90deg)" : "none" }}><path d="m9 6 6 6-6 6" /></svg>,
  check: (p: { size?: number; color?: string; w?: number }) => <svg aria-hidden="true" width={p.size ?? 14} height={p.size ?? 14} viewBox="0 0 24 24" fill="none" stroke={p.color ?? "currentColor"} strokeWidth={p.w ?? 2} strokeLinecap="round"><path d="m5 12 5 5 9-10" /></svg>,
  card: () => <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M7 10h4" /></svg>,
  plus: () => <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>,
  back: () => <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m15 6-6 6 6 6" /></svg>,
};

export function Kbd({ children, dark, className }: { children: React.ReactNode; dark?: boolean; className?: string }) {
  return <span className={cn("kbd", dark && "kbd-dark", className)}>{children}</span>;
}

export function Wordmark({ href = "/" }: { href?: string }) {
  return <Link href={href} className="flex items-baseline gap-2.5 text-ink hover:text-ink"><span className="text-[17px] tracking-[-.02em]"><b className="font-bold">locus</b><span className="text-muted-2">/</span>studio</span></Link>;
}

export function Avatar({ initials, hue, size = 38, accent, className }: { initials: string; hue?: number; size?: number; accent?: boolean; className?: string }) {
  return <span className={cn("flex shrink-0 items-center justify-center rounded-full font-semibold", className)} style={{ width: size, height: size, fontSize: size >= 36 ? 13 : 11, background: accent ? "var(--accent-soft)" : hue !== undefined ? `oklch(var(--av-bg) 0.04 ${hue})` : "var(--soft)", color: accent ? "var(--accent)" : hue !== undefined ? `oklch(var(--av-fg) 0.09 ${hue})` : "var(--muted)" }}>{initials}</span>;
}

/**
 * L'en-tête : le wordmark ramène toujours à l'accueil ; sur un dossier, une
 * flèche remonte d'un cran et `esc` fait pareil. À droite, le thème et le praticien.
 */
export function Header({ praticien, patient, back }: { praticien: { initials: string }; patient?: { id: string; nom: string; initials: string; meta?: string; href?: string }; back?: string }) {
  const router = useRouter();
  const up = back ?? (patient ? "/" : undefined);
  React.useEffect(() => {
    if (!up) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      // Un dialogue ou une carte ouverte se ferme d'abord (ils capturent esc eux-mêmes) ; on ne quitte jamais l'écran par-dessus.
      if (document.querySelector("[role=dialog][aria-modal=true]")) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT")) { el.blur(); return; }
      router.push(up);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [up, router]);
  return (
    <header className="flex items-center gap-2 border-b border-line-2 px-4 py-3.5 sm:gap-3 sm:px-7">
      <div className="flex shrink-0 items-center gap-2 sm:flex-1 sm:gap-3">
        {up && <Link href={up} aria-label={up === "/" ? "Retour à l'accueil" : "Retour"} title={`${up === "/" ? "Accueil" : "Retour"} · esc`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-3 hover:bg-hover hover:text-ink"><span className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-line bg-paper"><I.back /></span></Link>}
        <Wordmark />
      </div>
      <div className="flex min-w-0 flex-1 justify-center">
        {patient && (
          <Link href={patient.href ?? `/p/${patient.id}`} className="flex min-w-0 items-center gap-2 rounded-full border border-line bg-paper py-1 pl-1 pr-3 text-ink hover:text-ink sm:gap-2.5 sm:py-1.5 sm:pl-1.5 sm:pr-3.5">
            <Avatar initials={patient.initials} accent size={26} className="hidden sm:flex" />
            <span className="truncate pl-1.5 text-sm font-medium sm:pl-0">{patient.nom}</span>
            {patient.meta && <span className="hidden text-[13px] text-muted-2 sm:inline">{patient.meta}</span>}
          </Link>
        )}
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2 sm:flex-1">
        <ThemeToggle />
        <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-ink text-[11px] font-medium text-paper">{praticien.initials}</span>
      </div>
    </header>
  );
}

/**
 * La barre du bas, présente sur chaque écran : une seule entrée, un micro, un
 * bouton d'action. Au focus, quand elle est vide, des exemples de ce qu'on peut
 * lui demander ; un clic remplit la saisie, ⏎ l'envoie.
 */
/* La reconnaissance vocale du navigateur, pour dicter une demande dans l'omni-saisie. */
type SRLite = { lang: string; continuous: boolean; interimResults: boolean; onresult: ((e: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null; start: () => void; stop: () => void };
function srCtor(): (new () => SRLite) | null { if (typeof window === "undefined") return null; const w = window as unknown as { SpeechRecognition?: new () => SRLite; webkitSpeechRecognition?: new () => SRLite }; return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null; }

export function Omni({ placeholder, onSubmit, cta, chips, children, maxWidth = 720, inputId = "omni", busy, suggestions }: { placeholder: string; onSubmit?: (text: string) => void; cta?: React.ReactNode; chips?: { id: string; label: string; onClick: () => void }[]; children?: React.ReactNode; maxWidth?: number; inputId?: string; busy?: boolean; suggestions?: { k: string; t: string }[] }) {
  const [v, setV] = React.useState("");
  const [focus, setFocus] = React.useState(false);
  const [sel, setSel] = React.useState(-1);
  const [micro, setMicro] = React.useState<"absent" | "pret" | "ecoute">("absent");
  const ref = React.useRef<HTMLInputElement>(null);
  const boite = React.useRef<HTMLDivElement>(null);
  const rec = React.useRef<SRLite | null>(null);
  React.useEffect(() => {
    setMicro(srCtor() ? "pret" : "absent");
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); ref.current?.focus(); ref.current?.select(); } };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); rec.current?.stop(); };
  }, []);
  const hasChild = React.Children.toArray(children).length > 0;
  const showHints = focus && !v && !!suggestions?.length && !hasChild;
  const envoyer = (t: string) => { if (!t.trim() || !onSubmit) return; onSubmit(t.trim()); setV(""); setSel(-1); ref.current?.blur(); };
  const dicter = () => {
    const C = srCtor(); if (!C) return;
    if (micro === "ecoute") { rec.current?.stop(); return; }
    const r = new C(); r.lang = "fr-FR"; r.continuous = false; r.interimResults = true;
    r.onresult = (e) => { let t = ""; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; setV(t); };
    r.onend = () => { setMicro("pret"); rec.current = null; ref.current?.focus(); };
    r.onerror = () => { setMicro("pret"); rec.current = null; };
    rec.current = r; setMicro("ecoute"); try { r.start(); } catch { setMicro("pret"); }
  };
  return (
    <div className="sticky-fade px-4 pb-5 pt-4 sm:px-6 sm:pb-6">
      <div ref={boite} className="mx-auto flex flex-col gap-2.5" style={{ maxWidth }} onBlur={(e) => { if (!boite.current?.contains(e.relatedTarget as Node | null)) { setFocus(false); setSel(-1); } }}>
        {children}
        {showHints && (
          <div className="flex flex-col rounded-[14px] border border-line bg-paper p-1.5" style={{ boxShadow: "var(--shadow)" }} role="listbox" aria-label="Exemples de demandes">
            <span className="k px-3 pb-1.5 pt-2">Par exemple</span>
            {suggestions!.map((s, i) => (
              <button key={s.t} type="button" role="option" aria-selected={sel === i} onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setSel(i)} onClick={() => { setV(s.t); ref.current?.focus(); }} className={cn("flex min-h-10 items-center gap-3 rounded-[10px] px-3 py-2 text-left text-sm text-ink", sel === i ? "bg-accent-soft-2" : "hover:bg-hover")}>
                <span className="d w-[72px] shrink-0 text-[10px]">{s.k}</span><span className="min-w-0 flex-1 truncate">{s.t}</span>{sel === i && <Kbd>⏎</Kbd>}
              </button>
            ))}
          </div>
        )}
        {chips && chips.length > 0 && !showHints && (
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => <button key={c.id} type="button" onClick={c.onClick} className="min-h-10 rounded-full border border-line bg-paper px-3 py-[7px] text-[13px] text-ink hover:bg-hover">{c.label}</button>)}
          </div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); if (showHints && sel >= 0) { setV(suggestions![sel].t); setSel(-1); return; } envoyer(v); }} className="flex items-center gap-2 rounded-[14px] border border-line bg-paper py-2.5 pl-4 pr-2.5 focus-within:border-accent-line sm:gap-3 sm:py-3 sm:pl-[18px] sm:pr-3" style={{ boxShadow: "var(--shadow)" }}>
          <label htmlFor={inputId} className="sr-only">Demander</label>
          <input id={inputId} ref={ref} value={v} onChange={(e) => { setV(e.target.value); setSel(-1); }} onFocus={() => setFocus(true)} onKeyDown={(e) => {
            if (showHints && e.key === "ArrowDown") { e.preventDefault(); setSel((x) => Math.min(suggestions!.length - 1, x + 1)); }
            else if (showHints && e.key === "ArrowUp") { e.preventDefault(); setSel((x) => Math.max(-1, x - 1)); }
            else if (e.key === "Escape") { if (v) { e.preventDefault(); e.stopPropagation(); setV(""); setSel(-1); } }
          }} placeholder={placeholder} disabled={busy} aria-expanded={showHints} aria-controls={showHints ? `${inputId}-hints` : undefined} className="min-h-10 min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted-3" />
          {micro !== "absent" && <button type="button" onClick={dicter} aria-label={micro === "ecoute" ? "Arrêter la dictée" : "Dicter la demande"} aria-pressed={micro === "ecoute"} title={micro === "ecoute" ? "Arrêter" : "Dicter"} className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-paper", micro === "ecoute" ? "border-rec" : "border-line")}>{micro === "ecoute" ? <span className="h-2.5 w-2.5 rounded-full bg-rec animate-pulse-soft" /> : <I.mic />}</button>}
          {cta}
        </form>
      </div>
    </div>
  );
}

export function CtaLink({ href, children, blue, onClick }: { href?: string; children: React.ReactNode; blue?: boolean; onClick?: () => void }) {
  const cls = cn("flex shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] px-3.5 py-[9px] text-sm font-medium sm:px-4", blue ? "bg-accent text-white hover:text-white" : "bg-ink text-paper hover:text-paper");
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button type="button" onClick={onClick} className={cls}>{children}</button>;
}

/** La carte de résultat au-dessus de l'omni : ce que Locus a composé, prêt à valider. */
export function ResultCard({ tool, title, body, cta, onCta, onClose, secondary, onSecondary, busy, children }: { tool: string; title: string; body?: React.ReactNode; cta: string; onCta: () => void; onClose: () => void; secondary?: string; onSecondary?: () => void; busy?: boolean; children?: React.ReactNode }) {
  // esc ferme la carte avant que l'en-tête ne remonte d'un cran.
  React.useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape" && !document.querySelector("[role=dialog][aria-modal=true]") && !(e.target as HTMLElement | null)?.closest("input, textarea")) { e.preventDefault(); e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", k, true);
    return () => window.removeEventListener("keydown", k, true);
  }, [onClose]);
  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-accent-line bg-paper px-[18px] py-4" style={{ boxShadow: "var(--shadow-accent)" }}>
      <div className="flex items-center gap-2.5"><span className="k text-accent" style={{ color: "var(--accent)" }}>{tool}</span><span className="flex-1" /><button type="button" onClick={onClose} aria-label="Fermer" className="px-1 text-base text-muted-3">×</button></div>
      {title && <span className="text-base font-medium">{title}</span>}
      {body && <div className="text-sm leading-relaxed text-ink-3">{body}</div>}
      {children}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onCta} disabled={busy} className="min-h-11 rounded-[10px] bg-ink px-4 py-[9px] text-sm text-paper disabled:opacity-50">{cta}</button>
        {secondary && onSecondary && <button type="button" onClick={onSecondary} className="min-h-11 rounded-[10px] border border-line bg-paper px-4 py-[9px] text-sm text-ink">{secondary}</button>}
      </div>
    </div>
  );
}

/** Raccourcis ⌘⏎ et ⌥ espace — jamais depuis un champ qui a quelque chose à envoyer, ni sous un dialogue. */
export function useShortcuts(map: { cmdEnter?: () => void; altSpace?: () => void }) {
  const ref = React.useRef(map);
  ref.current = map;
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || document.querySelector("[role=dialog][aria-modal=true]")) return;
      const el = e.target as HTMLElement | null;
      const champ = el?.closest("input, textarea, select, [contenteditable=true]") as HTMLInputElement | null;
      if (champ && (champ.value?.trim() || champ.tagName === "TEXTAREA" || champ.tagName === "SELECT")) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && ref.current.cmdEnter) { e.preventDefault(); ref.current.cmdEnter(); }
      if (e.altKey && e.code === "Space" && ref.current.altSpace) { e.preventDefault(); ref.current.altSpace(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

/** Texte avec **gras** et ==surligné==. */
export function Rich({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|==[^=]+==)/g);
  return <span className={className}>{parts.map((p, i) => p.startsWith("**") ? <b key={i} className="font-semibold">{p.slice(2, -2)}</b> : p.startsWith("==") ? <span key={i} className="rounded-[4px] bg-accent-soft px-1">{p.slice(2, -2)}</span> : <React.Fragment key={i}>{p}</React.Fragment>)}</span>;
}
