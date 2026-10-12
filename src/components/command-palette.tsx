"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, User, ArrowRight } from "lucide-react";
import { Avatar } from "./ui";
import { initials } from "@/lib/format";

interface Hit { id: string; nom: string; prenom: string; hue: number; ligne: string }

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [hits, setHits] = React.useState<Hit[]>([]);
  const [sel, setSel] = React.useState(0);
  const ref = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    setQ("");
    setSel(0);
    setTimeout(() => ref.current?.focus(), 10);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    fetch(`/api/patients?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j: Hit[]) => setHits(j))
      .catch(() => {});
    return () => ctrl.abort();
  }, [q, open]);

  if (!open) return null;
  const go = (h: Hit) => {
    onClose();
    router.push(`/patients/${h.id}`);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/20 backdrop-blur-sm p-4 pt-[12vh]" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl border bg-popover shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={ref}
            value={q}
            onChange={(e) => { setQ(e.target.value); setSel(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(hits.length - 1, s + 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
              if (e.key === "Enter" && hits[sel]) go(hits[sel]);
              if (e.key === "Escape") onClose();
            }}
            placeholder="Un patient, un problème, un médicament…"
            className="h-11 flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <ul className="max-h-80 overflow-y-auto py-1">
          {hits.length === 0 && <li className="px-3 py-4 text-sm text-muted-foreground">Aucun résultat.</li>}
          {hits.map((h, i) => (
            <li key={h.id}>
              <button onMouseEnter={() => setSel(i)} onClick={() => go(h)} className={`flex w-full items-center gap-3 px-3 py-2 text-left ${i === sel ? "bg-muted" : ""}`}>
                <Avatar hue={h.hue} initials={initials(h.prenom, h.nom)} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{h.prenom} {h.nom}</div>
                  <div className="truncate text-micro text-muted-foreground">{h.ligne}</div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
        <div className="border-t px-3 py-1.5 text-micro text-muted-foreground flex items-center gap-2"><User className="h-3 w-3" /> La recherche lit le résumé vivant, les problèmes et les traitements.</div>
      </div>
    </div>
  );
}
