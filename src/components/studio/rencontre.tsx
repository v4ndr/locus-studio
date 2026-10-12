"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import type { PatientView } from "@/studio/types";
import { Header, Kbd, CtaLink, useShortcuts } from "./chrome";
import { cn } from "@/lib/cn";

/** La saisie de la rencontre : on dicte, Locus surligne ce qu'il a compris. */
export function RencontreView({ v, praticien }: { v: PatientView; praticien: { initials: string } }) {
  const router = useRouter();
  const r = v.rencontre;
  const total = r.paragraphes.reduce((s, p) => s + p.texte.length, 0);
  const [n, setN] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const done = n >= total;
  React.useEffect(() => {
    if (paused || done) return;
    const id = setTimeout(() => setN((x) => Math.min(total, x + (Math.random() < 0.08 ? 1 : 3))), 28);
    return () => clearTimeout(id);
  }, [n, paused, done, total]);
  useShortcuts({ cmdEnter: () => router.push(`/p/${v.ref.id}/actions`), altSpace: () => setPaused((p) => !p) });

  const detected = new Set<string>();
  let cursor = 0;
  const rendered = r.paragraphes.map((p, i) => {
    const start = cursor; cursor += p.texte.length;
    const shown = Math.max(0, Math.min(p.texte.length, n - start));
    const text = p.texte.slice(0, shown);
    const nodes: React.ReactNode[] = [];
    let last = 0;
    for (const m of p.marks ?? []) {
      const at = p.texte.indexOf(m.texte);
      if (at < 0 || at + m.texte.length > shown) continue;
      detected.add(m.actionId);
      nodes.push(text.slice(last, at));
      nodes.push(<mark key={m.actionId} style={p.muted ? { color: "var(--ink)" } : undefined}>{m.texte}</mark>);
      last = at + m.texte.length;
    }
    nodes.push(text.slice(last));
    const isLast = shown < p.texte.length || (i === r.paragraphes.length - 1 && !done) || (done && i === r.paragraphes.length - 1);
    return { nodes, muted: p.muted, caret: isLast && shown > 0 && (!done || i === r.paragraphes.length - 1), empty: shown === 0 };
  });
  const count = done ? r.actions.length : detected.size;

  return (
    <div className="flex min-h-dvh flex-col">
      <Header praticien={praticien} patient={{ id: v.ref.id, nom: v.ref.nom, initials: v.ref.initials, meta: "08:14" }} back={`/p/${v.ref.id}`} />
      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-5 px-4 pb-8 pt-8 sm:px-6 sm:pt-12">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className={cn("h-2.5 w-2.5 rounded-full", paused ? "bg-gray-dot" : "bg-rec animate-pulse-soft")} />
          <span className="k" style={{ color: paused ? undefined : "var(--rec-text)" }}>{paused ? "Pause" : "Dictée"}</span>
          <span className="flex-1" />
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex items-center gap-2 rounded-full border border-accent-line bg-paper px-3.5 py-[9px] text-sm hover:border-accent"><span className="h-[7px] w-[7px] rounded-full bg-accent" />{count} action{count > 1 ? "s" : ""} détectée{count > 1 ? "s" : ""}</button>
        </div>
        {open && (
          <div className="rounded-[14px] border border-line-3 bg-paper px-[18px] py-2">
            {r.actions.filter((a) => done || detected.has(a.id)).map((a, i) => (
              <div key={a.id} className={cn("flex gap-3 py-2 text-sm leading-[1.4]", i > 0 && "border-t border-soft")}><span className="d w-[30px] shrink-0 text-[11px]">{a.code}</span><span style={a.statut === "attente" ? { color: "var(--muted-2)" } : undefined}>{a.titre} · {a.ligne}</span></div>
            ))}
            {count === 0 && <div className="py-2 text-sm text-muted-2">Rien encore.</div>}
          </div>
        )}
        <div className="text-lg leading-[1.8] text-ink">
          {rendered.map((p, i) => !p.empty && <p key={i} className={cn("m-0 mb-4", p.muted && "text-muted-3")}>{p.nodes}{p.caret && <span className="caret" />}</p>)}
          {n === 0 && <p className="m-0 text-muted-3">…<span className="caret" /></p>}
        </div>
      </main>
      <div className="sticky-fade px-6 pb-6 pt-4">
        <div className="mx-auto flex max-w-[760px] flex-wrap items-center justify-end gap-3.5">
          <button type="button" onClick={() => setPaused((p) => !p)} className="text-sm text-muted-2">{paused ? "Reprendre" : "Pause"} <Kbd>⌥ espace</Kbd></button>
          <CtaLink href={`/p/${v.ref.id}/actions`}>Générer <Kbd dark>⌘⏎</Kbd></CtaLink>
        </div>
      </div>
    </div>
  );
}
