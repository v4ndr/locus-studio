"use client";
import * as React from "react";
import Link from "./nav";
import { useRouter } from "./nav";
import { cn } from "@/lib/cn";
import { useLang } from "@/i18n/lang";
import { common, studio } from "@/i18n";
import { lbl } from "@/i18n/studio";

/** La langue de l'interface, son dictionnaire, et la traduction des libellés produits en français par le serveur. */
export function useT() {
  const lang = useLang();
  return React.useMemo(() => ({ lang, t: studio[lang], L: <T extends string | undefined>(v: T) => lbl(lang, v as string) as T }), [lang]);
}


/* ---------------- icônes (trait, jamais d'emoji) ---------------- */
export const I = {
  search: (p: { size?: number; color?: string }) => <svg aria-hidden="true" width={p.size ?? 18} height={p.size ?? 18} viewBox="0 0 24 24" fill="none" stroke={p.color ?? "var(--dim-2)"} strokeWidth="1.7" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>,
  mic: () => <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>,
  chevron: (p: { open?: boolean; color?: string }) => <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={p.color ?? "var(--dim-2)"} strokeWidth="2" strokeLinecap="round" className="chev" style={{ transform: p.open ? "rotate(90deg)" : "none" }}><path d="m9 6 6 6-6 6" /></svg>,
  check: (p: { size?: number; color?: string; w?: number }) => <svg aria-hidden="true" width={p.size ?? 14} height={p.size ?? 14} viewBox="0 0 24 24" fill="none" stroke={p.color ?? "currentColor"} strokeWidth={p.w ?? 2} strokeLinecap="round"><path d="m5 12 5 5 9-10" /></svg>,
  card: () => <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M7 10h4" /></svg>,
  plus: () => <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>,
  back: () => <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m15 6-6 6 6 6" /></svg>,
};

export function Kbd({ children, dark, className }: { children: React.ReactNode; dark?: boolean; className?: string }) {
  return <span className={cn("kbd", dark && "kbd-dark", className)}>{children}</span>;
}

/** Le nom de l'outil, en tête des écrans du Studio : ramène à son accueil. */
export function Wordmark({ href = "/" }: { href?: string }) {
  const lang = useLang();
  return <Link href={href} className="flex items-center gap-2 text-[15px] font-semibold tracking-[-.01em] text-ink hover:text-ink">{common[lang].tools.lgcNatif}</Link>;
}

export function Avatar({ initials, size = 38, accent, className }: { initials: string; hue?: number; size?: number; accent?: boolean; className?: string }) {
  // Noir : avatars neutres, sans teinte par patient.
  return <span className={cn("flex shrink-0 items-center justify-center rounded-full border font-medium", accent ? "border-input bg-accent text-foreground" : "border-border bg-muted text-muted-foreground", className)} style={{ width: size, height: size, fontSize: size >= 36 ? 13 : 11 }}>{initials}</span>;
}

/**
 * L'en-tête : le wordmark ramène toujours à l'accueil ; sur un dossier, une
 * flèche remonte d'un cran et `esc` fait pareil. À droite, le thème et le praticien.
 */
export function Header({ praticien, patient, back }: { praticien: { initials: string }; patient?: { id: string; nom: string; initials: string; meta?: string; href?: string }; back?: string }) {
  const router = useRouter();
  const lang = useLang();
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
        {up && <Link href={up} aria-label={up === "/" ? studio[lang].backHome : studio[lang].back} title={`${up === "/" ? studio[lang].backHome : studio[lang].back} · esc`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-3 hover:bg-hover hover:text-ink"><span className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-line bg-paper"><I.back /></span></Link>}
        <Wordmark />
      </div>
      <div className="flex min-w-0 flex-1 justify-center">
        {patient && (
          <Link href={patient.href ?? `/p/${patient.id}`} className="flex min-w-0 items-center gap-2 rounded-full border border-line bg-paper py-1 pl-1 pr-3 text-ink hover:text-ink sm:gap-2.5 sm:py-1.5 sm:pl-1.5 sm:pr-3.5">
            <Avatar initials={patient.initials} accent size={26} className="hidden sm:flex" />
            <span className="truncate pl-1.5 text-sm font-medium sm:pl-0">{patient.nom}</span>
            {patient.meta && <span className="hidden text-[13px] text-dim-2 sm:inline">{lbl(lang, patient.meta)}</span>}
          </Link>
        )}
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2 sm:flex-1">
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
  const { t } = useT();
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
          <div className="flex flex-col rounded-[14px] border border-line bg-paper p-1.5" style={{ boxShadow: "var(--shadow)" }} role="listbox" aria-label={t.omni.examples}>
            <span className="k px-3 pb-1.5 pt-2">{t.omni.forExample}</span>
            {suggestions!.map((s, i) => (
              <button key={s.t} type="button" role="option" aria-selected={sel === i} onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setSel(i)} onClick={() => { setV(s.t); ref.current?.focus(); }} className={cn("flex min-h-10 items-center gap-3 rounded-[10px] px-3 py-2 text-left text-sm text-ink", sel === i ? "bg-agent-soft-2" : "hover:bg-hover")}>
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
        <form onSubmit={(e) => { e.preventDefault(); if (showHints && sel >= 0) { setV(suggestions![sel].t); setSel(-1); return; } envoyer(v); }} className="flex items-center gap-2 rounded-[14px] border border-line bg-paper py-2.5 pl-4 pr-2.5 focus-within:border-agent-line sm:gap-3 sm:py-3 sm:pl-[18px] sm:pr-3" style={{ boxShadow: "var(--shadow)" }}>
          <label htmlFor={inputId} className="sr-only">{t.omni.ask}</label>
          <input id={inputId} name="locus-omni" ref={ref} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" value={v} onChange={(e) => { setV(e.target.value); setSel(-1); }} onFocus={() => setFocus(true)} onKeyDown={(e) => {
            if (showHints && e.key === "ArrowDown") { e.preventDefault(); setSel((x) => Math.min(suggestions!.length - 1, x + 1)); }
            else if (showHints && e.key === "ArrowUp") { e.preventDefault(); setSel((x) => Math.max(-1, x - 1)); }
            else if (e.key === "Escape") { if (v) { e.preventDefault(); e.stopPropagation(); setV(""); setSel(-1); } }
          }} placeholder={placeholder} disabled={busy} aria-expanded={showHints} aria-controls={showHints ? `${inputId}-hints` : undefined} className="min-h-10 min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-dim-3 focus-visible:shadow-none" />
          {micro !== "absent" && <button type="button" onClick={dicter} aria-label={micro === "ecoute" ? t.omni.stopDictation : t.omni.dictateRequest} aria-pressed={micro === "ecoute"} title={micro === "ecoute" ? t.omni.stop : t.omni.dictate} className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-paper", micro === "ecoute" ? "border-rec" : "border-line")}>{micro === "ecoute" ? <span className="h-2.5 w-2.5 rounded-full bg-rec animate-pulse-soft" /> : <I.mic />}</button>}
          {cta}
        </form>
      </div>
    </div>
  );
}

export function CtaLink({ href, children, blue, onClick }: { href?: string; children: React.ReactNode; blue?: boolean; onClick?: () => void }) {
  const cls = cn("flex shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] px-3.5 py-[9px] text-sm font-medium sm:px-4", blue ? "bg-primary text-primary-foreground hover:text-primary-foreground" : "bg-ink text-paper hover:text-paper");
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button type="button" onClick={onClick} className={cls}>{children}</button>;
}

/** Texte avec **gras** et ==surligné==. */
export function Rich({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|==[^=]+==)/g);
  return <span className={className}>{parts.map((p, i) => p.startsWith("**") ? <b key={i} className="font-semibold">{p.slice(2, -2)}</b> : p.startsWith("==") ? <span key={i} className="rounded-[4px] bg-agent-soft px-1">{p.slice(2, -2)}</span> : <React.Fragment key={i}>{p}</React.Fragment>)}</span>;
}
