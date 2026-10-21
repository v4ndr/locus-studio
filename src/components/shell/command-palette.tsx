"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { common, type Lang } from "@/i18n";
import { Kbd } from "@/components/ui/kbd";

export interface PaletteItem { href: string; label: string; icon: LucideIcon }

/** La recherche ⌘K de la coque : pour l'instant, aller à une page du Studio. */
export function CommandPalette({ items, lang, onClose }: { items: PaletteItem[]; lang: Lang; onClose: () => void }) {
  const t = common[lang];
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [sel, setSel] = React.useState(0);
  const input = React.useRef<HTMLInputElement>(null);
  const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const liste = items.filter((i) => norm(i.label).includes(norm(q.trim())));
  React.useEffect(() => { input.current?.focus(); }, []);
  React.useEffect(() => { setSel(0); }, [q]);
  const aller = (i?: PaletteItem) => { if (!i) return; onClose(); router.push(i.href); };
  return (
    <div role="dialog" aria-modal="true" aria-label={t.nav.search} className="fixed inset-0 z-[80] flex items-start justify-center bg-black/50 px-4 pt-[12vh]" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-[520px] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-sm">
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search size={16} aria-hidden="true" className="text-muted-foreground" />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.palette.placeholder} aria-label={t.palette.placeholder} className="h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            onKeyDown={(e) => {
              if (e.key === "Escape") { e.preventDefault(); onClose(); }
              else if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(liste.length - 1, s + 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
              else if (e.key === "Enter") { e.preventDefault(); aller(liste[sel]); }
            }} />
          <Kbd>esc</Kbd>
        </div>
        <ul role="listbox" className="m-0 grid list-none gap-px p-1.5">
          {liste.length === 0 && <li className="px-2.5 py-2 text-sm text-muted-foreground">{t.palette.empty}</li>}
          {liste.map((i, k) => (
            <li key={i.href} role="option" aria-selected={k === sel}>
              <button type="button" onMouseEnter={() => setSel(k)} onClick={() => aller(i)} className={cn("flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-sm", k === sel ? "bg-accent" : "")}>
                <i.icon size={16} aria-hidden="true" className="shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{i.label}</span>
                {k === sel && <Kbd>⏎</Kbd>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
