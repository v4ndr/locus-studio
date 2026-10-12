"use client";
import * as React from "react";
import { Mic, CornerDownLeft, Sparkles, X } from "lucide-react";
import type { WorldPatient } from "@/fil/types";
import { norm } from "@/fil/intent";
import { Avatar } from "../ui";
import { initials } from "@/lib/format";
import { cn } from "@/lib/cn";

export interface Suggestion { label: string; hint?: string; patient?: WorldPatient; insert: string; run?: boolean }

const COMMANDS: Suggestion[] = [
  { label: "ma matinée", hint: "l'ordre des décisions, pas des heures", insert: "ma matinée", run: true },
  { label: "@patient où en est son rein", hint: "une courbe avec les décisions", insert: "@" },
  { label: "signe l'ordonnance", hint: "l'objet préparé pour le patient en focus", insert: "signe l'ordonnance", run: true },
  { label: "consultation @patient", hint: "l'écoute ambiante jouée", insert: "consultation @" },
  { label: "mes diabétiques en retard", hint: "une table avec l'action prête", insert: "mes diabétiques en retard", run: true },
  { label: "qu'est-ce que Locus a fait ce matin", hint: "les sessions, avec leur état", insert: "qu'est-ce que Locus a fait ce matin", run: true },
  { label: "consigne : …", hint: "programmer le cabinet en une phrase", insert: "consigne : " },
  { label: "une question clinique", hint: "Locus répond avec les sources", insert: "" },
];

export const VOIX = [
  "Delacroix, où en est son rein",
  "renouvelle Delacroix et ajoute la dapagliflozine",
  "réponds à la mère d'Inès",
  "mes diabétiques en retard",
  "consigne : chez les plus de 75 ans, propose toujours la consultation longue une fois par an",
];

export function Composer({ patients, focus, onFocusClear, onSubmit, busy }: { patients: WorldPatient[]; focus?: WorldPatient; onFocusClear: () => void; onSubmit: (text: string) => void; busy: boolean }) {
  const [value, setValue] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [sel, setSel] = React.useState(0);
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const voix = React.useRef(0);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); ref.current?.focus(); setOpen(true); setValue((v) => v); }
      if (e.key === "Escape") { setOpen(false); ref.current?.blur(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const suggestions = React.useMemo<Suggestion[]>(() => {
    const t = norm(value);
    const at = value.match(/@([^\s]*)$/);
    if (at) {
      const q = norm(at[1]);
      return patients.filter((p) => !q || norm(p.nomUsage).startsWith(q) || norm(p.prenom).startsWith(q)).slice(0, 7).map((p) => ({ label: p.nom, hint: `${p.age} ans · ${p.ligne.slice(0, 60)}`, patient: p, insert: value.replace(/@[^\s]*$/, `@${p.nomUsage} `) }));
    }
    if (!t) return COMMANDS;
    const named = patients.filter((p) => norm(p.nomUsage).startsWith(t) || norm(p.prenom).startsWith(t)).slice(0, 4).map((p) => ({ label: p.nom, hint: `${p.age} ans · ${p.ligne.slice(0, 60)}`, patient: p, insert: `@${p.nomUsage} `, run: false }));
    return [...named, ...COMMANDS.filter((c) => norm(c.label).includes(t)).slice(0, 4)];
  }, [value, patients]);

  function submit(text = value) {
    const v = text.trim();
    if (!v) return;
    onSubmit(v);
    setValue("");
    setOpen(false);
  }
  function pick(s: Suggestion) {
    if (s.run) { submit(s.insert); return; }
    setValue(s.insert);
    setSel(0);
    ref.current?.focus();
  }

  return (
    <div className="relative">
      {open && suggestions.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-xl border border-border/70 bg-popover shadow-2xl">
          <ul className="max-h-72 overflow-y-auto py-1">
            {suggestions.map((s, i) => (
              <li key={s.label + i}>
                <button onMouseDown={(e) => { e.preventDefault(); pick(s); }} onMouseEnter={() => setSel(i)} className={cn("flex w-full items-center gap-3 px-3 py-2 text-left", i === sel && "bg-muted")}>
                  {s.patient ? <Avatar hue={s.patient.hue} initials={initials(s.patient.prenom, s.patient.nomUsage)} size="sm" /> : <span className="flex h-7 w-7 items-center justify-center rounded-full bg-agent-soft text-agent"><Sparkles className="h-3.5 w-3.5" /></span>}
                  <span className="min-w-0 flex-1"><span className="block text-sm">{s.label}</span>{s.hint && <span className="block truncate text-micro text-muted-foreground">{s.hint}</span>}</span>
                  {s.run && <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className={cn("flex items-end gap-2 border-t border-border/70 pt-2 transition-colors", open && "border-agent/60")}>
        {focus && (
          <button onClick={onFocusClear} className="mb-1 flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-2 py-1 text-xs text-accent-foreground" title="Retirer le focus">
            <Avatar hue={focus.hue} initials={initials(focus.prenom, focus.nomUsage)} size="sm" className="h-5 w-5 text-[9px]" />{focus.nomUsage}<X className="h-3 w-3 opacity-60" />
          </button>
        )}
        <textarea
          ref={ref}
          value={value}
          rows={1}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onChange={(e) => { setValue(e.target.value); setSel(0); setOpen(true); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && open) { e.preventDefault(); setSel((s) => Math.min(suggestions.length - 1, s + 1)); }
            else if (e.key === "ArrowUp" && open) { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
            else if (e.key === "Tab" && open && suggestions[sel]) { e.preventDefault(); pick(suggestions[sel]); }
            else if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (open && suggestions[sel]?.patient && /@[^\s]*$/.test(value)) pick(suggestions[sel]);
              else submit();
            }
          }}
          placeholder={focus ? `${focus.prenom} : une question, une action… (⌘K)` : "Un nom, une question, une action, une consigne… (⌘K)"}
          className="max-h-40 min-h-[2.5rem] flex-1 resize-none bg-transparent px-1 py-2 text-base outline-none placeholder:text-muted-foreground/60"
        />
        <button type="button" title="Dicter (simulé)" onClick={() => { const v = VOIX[voix.current++ % VOIX.length]; setValue(v); ref.current?.focus(); setOpen(false); }} className="mb-0.5 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><Mic className="h-4 w-4" /></button>
        <button type="button" onClick={() => submit()} disabled={busy || !value.trim()} className={cn("mb-0.5 rounded-full p-2 text-muted-foreground transition-opacity", value.trim() ? "opacity-100 hover:text-foreground" : "opacity-0")} aria-label="Envoyer"><CornerDownLeft className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
