"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { common, route, type Lang } from "@/i18n";
import { Kbd } from "@/components/ui/kbd";
import { LocusMark } from "./locus-mark";

export interface PaletteItem { href: string; label: string; icon: LucideIcon }

/**
 * La palette ⌘K de la coque : aller à une page, ou poser une question à Locus.
 * Une question part au composer du LGC natif IA avec toute la patientèle pour
 * contexte (`?demande=`, portée « patientèle ») : la palette n'est attachée à
 * aucun dossier, elle ne peut donc pas répondre pour un seul patient.
 */
export function CommandPalette({ items, lang, onClose }: { items: PaletteItem[]; lang: Lang; onClose: () => void }) {
  const t = common[lang];
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [sel, setSel] = React.useState(0);
  const input = React.useRef<HTMLInputElement>(null);
  const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const texte = q.trim();
  const liste = items.filter((i) => norm(i.label).includes(norm(texte)));
  // Une phrase (un « ? », trois mots) ou rien à ouvrir : la question passe devant les pages.
  const question = texte.length >= 3 && (/\?\s*$/.test(texte) || texte.split(/\s+/).length >= 3 || liste.length === 0);
  const demander = texte.length >= 3;
  type Ligne = { kind: "page"; item: PaletteItem } | { kind: "ask" };
  const lignes: Ligne[] = [...(demander && question ? [{ kind: "ask" as const }] : []), ...liste.map((item) => ({ kind: "page" as const, item })), ...(demander && !question ? [{ kind: "ask" as const }] : [])];
  React.useEffect(() => { input.current?.focus(); }, []);
  React.useEffect(() => { setSel(0); }, [q]);
  const aller = (l?: Ligne) => {
    if (!l) return;
    onClose();
    if (l.kind === "page") router.push(l.item.href);
    else router.push(`${route(lang, "lgcNatif")}?demande=${encodeURIComponent(texte.slice(0, 500))}`);
  };
  return (
    <div role="dialog" aria-modal="true" aria-label={t.nav.search} className="fixed inset-0 z-[80] flex items-start justify-center bg-green-ink/45 px-4 pt-[12vh]" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-[560px] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-sm">
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search size={16} aria-hidden="true" className="text-muted-foreground" />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.palette.placeholder} aria-label={t.palette.placeholder} autoComplete="off" spellCheck={false} className="h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            onKeyDown={(e) => {
              if (e.key === "Escape") { e.preventDefault(); onClose(); }
              else if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(lignes.length - 1, s + 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
              else if (e.key === "Enter") { e.preventDefault(); aller(lignes[sel]); }
            }} />
          <Kbd>esc</Kbd>
        </div>
        <ul role="listbox" aria-label={t.nav.search} className="m-0 grid list-none gap-px p-1.5">
          {lignes.length === 0 && <li className="px-2.5 py-2 text-sm text-muted-foreground">{t.palette.empty}</li>}
          {lignes.map((l, k) => (
            <li key={l.kind === "page" ? l.item.href : "ask"} role="option" aria-selected={k === sel}>
              {l.kind === "page" ? (
                <button type="button" onMouseEnter={() => setSel(k)} onClick={() => aller(l)} className={cn("flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-sm", k === sel ? "bg-accent" : "")}>
                  <l.item.icon size={16} aria-hidden="true" className="shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{l.item.label}</span>
                  {k === sel && <Kbd>⏎</Kbd>}
                </button>
              ) : (
                <button type="button" onMouseEnter={() => setSel(k)} onClick={() => aller(l)} className={cn("flex min-h-12 w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm", k === sel ? "bg-accent" : "")}>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground"><LocusMark size={15} /></span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate"><b className="font-medium">{t.palette.ask}</b> · « {texte} »</span>
                    <span className="truncate text-xs text-muted-foreground">{t.palette.askScope}</span>
                  </span>
                  {k === sel && <Kbd>⏎</Kbd>}
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
