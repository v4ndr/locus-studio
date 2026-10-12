"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Kbd, I } from "./chrome";
import { ComposeCard, useCompose } from "./compose";
import { useCabinet, nid, patientPayload, type NoteLocal, type PatientLocal } from "@/store/cabinet";
import type { ComposeAction, ComposePlan } from "@/locus/compose/contract";
import { cn } from "@/lib/cn";

/**
 * La note de consultation, écrite ou dictée (même forme que la sortie d'un
 * scribe), puis déclinée en actions par le composer. Le chrono mesure les
 * trois temps : saisie, composition, validation — pour comparer à la montre.
 */

const MODELE = `Motif : 
Histoire : 
Examen : 
Conclusion : 
Conduite à tenir : `;

export function fmtMs(ms: number) { const s = Math.round(ms / 1000); return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")}`; }

export function NoteEditor({ patientId, local, nom, retour, onSaved }: { patientId: string; local?: PatientLocal; nom: string; retour: string; onSaved?: (n: NoteLocal) => void }) {
  const router = useRouter();
  const cab = useCabinet();
  const composer = useCompose();
  const [texte, setTexte] = React.useState("");
  const [motif, setMotif] = React.useState("");
  const [debut, setDebut] = React.useState<number | null>(null);
  const [tick, setTick] = React.useState(0);
  const chrono = React.useRef({ saisie: 0, composeDebut: 0, composition: 0 });
  const ref = React.useRef<HTMLTextAreaElement>(null);
  React.useEffect(() => { ref.current?.focus(); }, []);
  React.useEffect(() => { if (debut === null) return; const id = setInterval(() => setTick((t) => t + 1), 1000); return () => clearInterval(id); }, [debut]);
  React.useEffect(() => { if (composer.state.plan && chrono.current.composeDebut && !chrono.current.composition) chrono.current.composition = Date.now() - chrono.current.composeDebut; }, [composer.state.plan]);

  const decliner = React.useCallback(() => {
    if (!texte.trim()) return;
    chrono.current.saisie = debut ? Date.now() - debut : 0;
    chrono.current.composeDebut = Date.now(); chrono.current.composition = 0;
    composer.run({ texte: "", note: texte, ecran: "note", patientId, patient: local ? patientPayload(local) : undefined });
  }, [texte, debut, composer, patientId, local]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && document.activeElement === ref.current) { e.preventDefault(); decliner(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [decliner]);

  const onValide = React.useCallback((actions: ComposeAction[], plan: ComposePlan) => {
    const validation = Date.now() - (chrono.current.composeDebut + chrono.current.composition);
    const note: NoteLocal = { id: nid("n"), date: new Date().toISOString(), motif: motif || undefined, texte, actions, synthese: plan.synthese, via: plan.via, chrono: { saisie: chrono.current.saisie, composition: chrono.current.composition, validation } };
    if (local) cab.saveNote(local.id, note);
    else { try { const k = `locus-studio-notes-${patientId}`; const prev = JSON.parse(localStorage.getItem(k) ?? "[]"); localStorage.setItem(k, JSON.stringify([note, ...prev])); } catch {} }
    onSaved?.(note);
    setTimeout(() => router.push(retour), 900);
  }, [motif, texte, local, cab, patientId, onSaved, router, retour]);

  const ecoule = debut ? Date.now() - debut : 0;
  void tick;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="k">Note · {nom}</span>
        <input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Motif (facultatif)" className="min-w-0 flex-1 rounded-[8px] border border-line bg-paper px-3 py-1.5 text-sm text-ink outline-none placeholder:text-muted-3" />
        <span className={cn("d text-[11px]", debut && "text-ink")}>{debut ? `⏱ ${fmtMs(ecoule)}` : "⏱ démarre à la première touche"}</span>
      </div>
      <textarea ref={ref} value={texte} onChange={(e) => { if (debut === null && e.target.value.trim()) setDebut(Date.now()); setTexte(e.target.value); }} placeholder={`Dictez, collez la sortie du scribe, ou écrivez librement.\n\n${MODELE}`} rows={14} className="w-full resize-y rounded-[14px] border border-line bg-paper px-5 py-4 text-[16px] leading-[1.7] text-ink outline-none placeholder:text-muted-3 focus:border-accent-line" />
      <div className="flex flex-wrap items-center gap-2.5">
        <button type="button" onClick={decliner} disabled={!texte.trim() || composer.state.busy} className="flex items-center gap-2 rounded-[10px] bg-ink px-4 py-[9px] text-sm text-paper disabled:opacity-40">Décliner en actions <Kbd dark>⌘⏎</Kbd></button>
        <button type="button" onClick={() => { setTexte((t) => (t.trim() ? t : MODELE)); ref.current?.focus(); }} className="rounded-[10px] border border-line bg-paper px-3.5 py-[9px] text-sm text-ink">Structure</button>
        <span className="flex-1" />
        {composer.state.plan && <span className="d text-[11px]">saisie {fmtMs(chrono.current.saisie)} · composition {fmtMs(chrono.current.composition)}</span>}
      </div>
      {composer.open && <ComposeCard state={composer.state} onClose={composer.reset} suivreSeul={false} onValide={onValide} libelleValider="Signer et verser au dossier" />}
    </div>
  );
}

/** Une note enregistrée, telle qu'elle s'affiche dans le dossier local. */
export function NoteRow({ n, onDelete }: { n: NoteLocal; onDelete?: () => void }) {
  const [open, setOpen] = React.useState(false);
  const d = new Date(n.date);
  return (
    <div className="card overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-hover">
        <span className="d w-[92px] shrink-0">{String(d.getDate()).padStart(2, "0")}/{String(d.getMonth() + 1).padStart(2, "0")} {String(d.getHours()).padStart(2, "0")}:{String(d.getMinutes()).padStart(2, "0")}</span>
        <span className="flex min-w-0 flex-1 flex-col"><span className="truncate text-[15px]">{n.motif || n.synthese?.slice(0, 80) || "Consultation"}</span><span className="truncate text-[13px] text-muted-2">{n.actions.length} action{n.actions.length > 1 ? "s" : ""} · saisie {fmtMs(n.chrono.saisie)} · composition {fmtMs(n.chrono.composition)} · validation {fmtMs(n.chrono.validation)}{n.via ? ` · ${n.via}` : ""}</span></span>
        <I.chevron open={open} />
      </button>
      {open && (
        <div className="flex flex-col gap-3 border-t border-line-4 px-4 py-3">
          {n.synthese && <p className="m-0 text-sm leading-relaxed">{n.synthese}</p>}
          <pre className="m-0 whitespace-pre-wrap rounded-[10px] bg-bg px-3.5 py-3 font-sans text-sm leading-relaxed text-ink-2">{n.texte}</pre>
          {n.actions.length > 0 && <div className="flex flex-col gap-1">{n.actions.map((a) => <div key={a.id} className="flex items-center gap-3 text-sm"><span className="d flex h-6 min-w-6 items-center justify-center rounded-[6px] bg-soft px-1 text-[10px] text-ink-3">{a.code}</span><span className="min-w-0 flex-1 truncate">{a.titre}</span><span className="text-[11px] text-muted-3">{a.destination}</span></div>)}</div>}
          {onDelete && <button type="button" onClick={onDelete} className="self-start text-xs text-muted-2 hover:text-rec-text">Supprimer cette note</button>}
        </div>
      )}
    </div>
  );
}
