"use client";
import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/cn";
import { Segmented } from "@/components/ui/segmented";

export type Snippet = { id: string; label: string; code: string };

/** Bouton copier : copie `text`, affiche « Copié » deux secondes. */
export function CopyButton({ text, label, done }: { text: string; label: string; done: string }) {
  const [ok, setOk] = React.useState(false);
  React.useEffect(() => {
    if (!ok) return;
    const id = window.setTimeout(() => setOk(false), 2000);
    return () => window.clearTimeout(id);
  }, [ok]);
  const copier = async () => {
    try { await navigator.clipboard.writeText(text); setOk(true); } catch { /* presse-papiers refusé : rien à faire */ }
  };
  return (
    <button type="button" onClick={copier} className="inline-flex h-7 items-center gap-1.5 rounded-md border border-input bg-background px-2 text-[12px] font-medium text-muted-foreground shadow-xs hover:text-foreground [&_svg]:size-3.5">
      {ok ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      <span aria-live="polite">{ok ? done : label}</span>
    </button>
  );
}

/**
 * Bloc de code en Geist Mono, avec bouton copier. Plusieurs extraits :
 * un sélecteur segmenté (cURL / TypeScript) dans l'en-tête.
 */
export function CodeBlock({ snippets, title, copy, copied, className }: { snippets: Snippet[]; title?: string; copy: string; copied: string; className?: string }) {
  const [cur, setCur] = React.useState(snippets[0]?.id ?? "");
  const s = snippets.find((x) => x.id === cur) ?? snippets[0];
  if (!s) return null;
  return (
    <div className={cn("min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm", className)}>
      <div className="flex min-h-11 items-center gap-2 border-b border-border px-3 py-1.5">
        {snippets.length > 1
          ? <Segmented label={title ?? ""} value={s.id} onChange={setCur} options={snippets.map((x) => ({ value: x.id, label: x.label }))} />
          : <span className="font-mono text-[11.5px] font-medium text-muted-foreground">{title ?? s.label}</span>}
        <span className="flex-1" />
        <CopyButton text={s.code} label={copy} done={copied} />
      </div>
      <pre className="m-0 overflow-x-auto px-4 py-3.5 font-mono text-[12.5px] leading-[1.6] text-foreground"><code>{s.code}</code></pre>
    </div>
  );
}
