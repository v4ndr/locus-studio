"use client";
import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

/* ---------------- icônes (trait, jamais d'emoji) ---------------- */
export const I = {
  search: (p: { size?: number; color?: string }) => <svg aria-hidden="true" width={p.size ?? 18} height={p.size ?? 18} viewBox="0 0 24 24" fill="none" stroke={p.color ?? "#6B6B66"} strokeWidth="1.7" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>,
  mic: () => <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>,
  chevron: (p: { open?: boolean; color?: string }) => <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={p.color ?? "#8A8A84"} strokeWidth="2" strokeLinecap="round" style={{ transform: p.open ? "rotate(90deg)" : "none", transition: "transform .15s" }}><path d="m9 6 6 6-6 6" /></svg>,
  check: (p: { size?: number; color?: string; w?: number }) => <svg aria-hidden="true" width={p.size ?? 14} height={p.size ?? 14} viewBox="0 0 24 24" fill="none" stroke={p.color ?? "currentColor"} strokeWidth={p.w ?? 2} strokeLinecap="round"><path d="m5 12 5 5 9-10" /></svg>,
  card: () => <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M7 10h4" /></svg>,
  plus: () => <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>,
  back: () => <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round"><path d="m15 6-6 6 6 6" /></svg>,
};

export function Kbd({ children, dark, className }: { children: React.ReactNode; dark?: boolean; className?: string }) {
  return <span className={cn("kbd", dark && "kbd-dark", className)}>{children}</span>;
}

export function Wordmark({ href = "/" }: { href?: string }) {
  return <Link href={href} className="flex items-baseline gap-2.5" style={{ color: "#111" }}><span className="text-[17px] tracking-[-.02em]"><b className="font-bold">locus</b><span className="text-muted-3">/</span>studio</span></Link>;
}

export function Avatar({ initials, hue, size = 38, accent, className }: { initials: string; hue?: number; size?: number; accent?: boolean; className?: string }) {
  return <span className={cn("flex shrink-0 items-center justify-center rounded-full font-semibold", className)} style={{ width: size, height: size, fontSize: size >= 36 ? 13 : 11, background: accent ? "#E4E9FF" : hue !== undefined ? `oklch(0.93 0.04 ${hue})` : "#F0EFEA", color: accent ? "#1A4DFF" : hue !== undefined ? `oklch(0.4 0.09 ${hue})` : "#55554F" }}>{initials}</span>;
}

export function Header({ praticien, patient, back = "/" }: { praticien: { initials: string }; patient?: { id: string; nom: string; initials: string; meta?: string; href?: string }; back?: string }) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-line-2 px-4 py-4 sm:px-7">
      <Wordmark href={back} />
      {patient && (
        <Link href={patient.href ?? `/p/${patient.id}`} className="flex min-w-0 items-center gap-2.5 rounded-full border border-line bg-paper py-1.5 pl-1.5 pr-3.5" style={{ color: "#111" }}>
          <Avatar initials={patient.initials} accent size={26} />
          <span className="truncate text-sm font-medium">{patient.nom}</span>
          {patient.meta && <span className="hidden text-[13px] text-muted-2 sm:inline">{patient.meta}</span>}
        </Link>
      )}
      <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-ink text-[11px] font-medium text-white">{praticien.initials}</span>
    </header>
  );
}

/** La barre du bas, présente sur chaque écran : une seule entrée, un micro, un bouton d'action. */
export function Omni({ placeholder, onSubmit, cta, chips, children, maxWidth = 720, inputId = "omni", busy }: { placeholder: string; onSubmit?: (text: string) => void; cta?: React.ReactNode; chips?: { id: string; label: string; onClick: () => void }[]; children?: React.ReactNode; maxWidth?: number; inputId?: string; busy?: boolean }) {
  const [v, setV] = React.useState("");
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); ref.current?.focus(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="sticky-fade px-6 pb-6 pt-4">
      <div className="mx-auto flex flex-col gap-2.5" style={{ maxWidth }}>
        {children}
        {chips && chips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => <button key={c.id} type="button" onClick={c.onClick} className="rounded-full border border-line bg-paper px-3 py-[7px] text-[13px] text-ink hover:bg-hover">{c.label}</button>)}
          </div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); if (!v.trim() || !onSubmit) return; onSubmit(v.trim()); setV(""); }} className="flex items-center gap-3 rounded-[14px] border border-line bg-paper py-3 pl-[18px] pr-3" style={{ boxShadow: "var(--shadow)" }}>
          <label htmlFor={inputId} className="sr-only">Demander</label>
          <input id={inputId} ref={ref} value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} disabled={busy} className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted-3" />
          <button type="button" aria-label="Dicter" className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-paper"><I.mic /></button>
          {cta}
        </form>
      </div>
    </div>
  );
}

export function CtaLink({ href, children, blue, onClick }: { href?: string; children: React.ReactNode; blue?: boolean; onClick?: () => void }) {
  const cls = cn("flex items-center gap-2 rounded-[10px] px-4 py-[9px] text-sm font-medium text-white", blue ? "bg-accent" : "bg-ink");
  if (href) return <Link href={href} className={cls} style={{ color: "#fff" }}>{children}</Link>;
  return <button type="button" onClick={onClick} className={cls}>{children}</button>;
}

/** La carte de résultat au-dessus de l'omni : ce que Locus a composé, prêt à valider. */
export function ResultCard({ tool, title, body, cta, onCta, onClose, secondary = "Modifier", busy, children }: { tool: string; title: string; body?: React.ReactNode; cta: string; onCta: () => void; onClose: () => void; secondary?: string; busy?: boolean; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-accent-line bg-paper px-[18px] py-4" style={{ boxShadow: "var(--shadow-accent)" }}>
      <div className="flex items-center gap-2.5"><span className="k" style={{ color: "#1A4DFF" }}>{tool}</span><span className="flex-1" /><button type="button" onClick={onClose} aria-label="Fermer" className="px-1 text-base text-muted-3">×</button></div>
      {title && <span className="text-base font-medium">{title}</span>}
      {body && <div className="text-sm leading-relaxed text-ink-3">{body}</div>}
      {children}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onCta} disabled={busy} className="rounded-[10px] bg-ink px-4 py-[9px] text-sm text-white disabled:opacity-50">{cta}</button>
        <button type="button" className="rounded-[10px] border border-line bg-paper px-4 py-[9px] text-sm text-ink">{secondary}</button>
      </div>
    </div>
  );
}

/** Raccourcis ⌘⏎ et ⌥ espace. */
export function useShortcuts(map: { cmdEnter?: () => void; altSpace?: () => void }) {
  const ref = React.useRef(map);
  ref.current = map;
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
