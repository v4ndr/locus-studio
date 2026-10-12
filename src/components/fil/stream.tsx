"use client";
import * as React from "react";
import { Sparkles, Loader2, Check, Clock, AlertCircle, Quote, Mic } from "lucide-react";
import type { FilEntry, WorldPatient, Scene } from "@/fil/types";
import { Avatar } from "../ui";
import { Md } from "../md";
import { fmtTime, initials } from "@/lib/format";
import { cn } from "@/lib/cn";

export function Stream({ entries, patients, focus, onOpen, onPatient, solStopped }: { entries: FilEntry[]; patients: Record<string, WorldPatient>; focus?: string; onOpen: (s: Scene) => void; onPatient: (id: string) => void; solStopped: boolean }) {
  const shown = (focus ? entries.filter((e) => !e.patientId || e.patientId === focus) : entries).slice().sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  const endRef = React.useRef<HTMLDivElement>(null);
  const count = shown.length;
  React.useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [count]);
  const groups = groupByMoment(shown);
  return (
    <div className="space-y-6 pb-4">
      {groups.map((g) => (
        <section key={g.label}>
          <div className="sticky top-0 z-10 -mx-1 mb-2 bg-background/90 px-1 py-1 text-micro uppercase tracking-wider text-muted-foreground/70 backdrop-blur">{g.label}</div>
          <ol className="space-y-2">
            {g.items.map((e) => <Entry key={e.id} e={e} p={e.patientId ? patients[e.patientId] : undefined} onOpen={onOpen} onPatient={onPatient} />)}
          </ol>
        </section>
      ))}
      {solStopped && <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">Locus est arrêté. Rien ne part, rien ne se prépare. Dites « reprends ».</div>}
      <div ref={endRef} />
    </div>
  );
}

function Entry({ e, p, onOpen, onPatient }: { e: FilEntry; p?: WorldPatient; onOpen: (s: Scene) => void; onPatient: (id: string) => void }) {
  const open = e.scene ? () => onOpen(e.scene!) : undefined;
  const PatientChip = p ? <button onClick={() => onPatient(p.id)} className="font-medium text-foreground hover:underline">{p.nom}</button> : null;

  if (e.who === "systeme") {
    return <li className="flex items-center gap-2 px-1 text-micro text-muted-foreground"><span className="font-mono">{fmtTime(e.at)}</span><span className="h-1 w-1 rounded-full bg-muted-foreground/40" /><span>{e.titre}</span>{PatientChip && <span>· {PatientChip}</span>}<span className="opacity-60">· {e.corps}</span></li>;
  }
  if (e.who === "session") {
    const st = e.session?.etat ?? "fait";
    const Icon = st === "en-cours" ? Loader2 : st === "attente" ? Clock : st === "echec" ? AlertCircle : Check;
    return (
      <li className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
        <span className="font-mono text-micro">{fmtTime(e.at)}</span>
        <Icon className={cn("h-3.5 w-3.5", st === "en-cours" && "animate-spin text-agent", st === "attente" && "text-warning", st === "echec" && "text-destructive", st === "fait" && "text-success")} />
        <span className={cn(st === "fait" && "text-foreground/70")}>{e.titre}</span>
        {PatientChip && <span>· {PatientChip}</span>}
        <span className="ml-auto rounded-full bg-muted px-1.5 text-micro">{st === "en-cours" ? "en cours" : st === "attente" ? "en attente" : st === "echec" ? "échec" : "fait"}</span>
      </li>
    );
  }
  if (e.who === "moi") {
    return <li className="flex justify-end px-1 py-1"><div className="max-w-[80%] text-right text-sm text-foreground/70"><span className="mr-2 font-mono text-micro text-muted-foreground/60">{fmtTime(e.at)}</span>{e.corps}</div></li>;
  }
  if (e.who === "consigne") {
    return (
      <li className="rounded-lg border border-dashed border-agent/40 bg-agent-soft/40 px-3 py-2">
        <div className="flex items-center gap-2 text-micro font-semibold uppercase tracking-wider text-agent"><Quote className="h-3 w-3" /> Consigne · {fmtTime(e.at)}</div>
        <div className="mt-0.5 text-sm font-medium">{e.titre}</div>
        {e.corps && <div className="mt-1 text-sm text-foreground/80">{e.corps}</div>}
      </li>
    );
  }
  if (e.who === "consult") {
    return (
      <li className="rounded-lg border bg-card px-3 py-2">
        <div className="flex items-center gap-2 text-micro font-semibold uppercase tracking-wider text-muted-foreground"><Mic className="h-3 w-3" /> Consultation · {fmtTime(e.at)} {PatientChip && <>· {PatientChip}</>}</div>
        <ol className="mt-1.5 space-y-1 text-sm">
          {(e.tours ?? []).map((t, i) => <li key={i} className="flex gap-2"><span className={cn("w-16 shrink-0 text-micro", t.qui === "medecin" ? "text-primary" : t.qui === "patient" ? "text-foreground/60" : "text-warning")}>{t.qui === "medecin" ? "Dr Laurent" : t.qui === "patient" ? p?.prenom ?? "patient" : "accomp."}</span><span className="text-foreground/85">{t.texte}</span></li>)}
        </ol>
        {e.corps && <div className="mt-1.5 text-micro text-muted-foreground">{e.corps}</div>}
        {open && <button onClick={open} className="mt-1 text-micro text-primary hover:underline">rouvrir</button>}
      </li>
    );
  }
  const isSol = e.who === "sol";
  return (
    <li className="flex gap-2.5 px-1">
      {isSol ? <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-agent-soft text-agent"><Sparkles className="h-3.5 w-3.5" /></span> : <Avatar hue={p?.hue ?? 30} initials={p ? initials(p.prenom, p.nomUsage) : "?"} size="sm" className="mt-0.5" />}
      <div className={cn("min-w-0 flex-1 rounded-lg px-3 py-2 -mx-1", isSol ? "" : "border-l-2 border-warning/50 bg-warning/5", open && "cursor-pointer hover:bg-muted/50")} onClick={open}>
        <div className="flex flex-wrap items-center gap-x-2 text-micro text-muted-foreground">
          <span className="font-medium text-foreground/80">{isSol ? "Locus" : e.nom ?? p?.nom}</span>
          <span className="font-mono">{fmtTime(e.at)}</span>
          {PatientChip && isSol && <span>· {PatientChip}</span>}
          {e.aValider && <span className="rounded-full bg-agent px-1.5 text-agent-foreground">à valider</span>}
        </div>
        {e.titre && <div className="mt-0.5 text-sm font-medium">{e.titre}</div>}
        {e.corps && (isSol ? <div className="mt-1 text-sm"><Md text={e.corps} /></div> : <div className="mt-1 whitespace-pre-wrap text-sm text-foreground/85">{e.corps}</div>)}
        {open && <div className="mt-1 text-micro text-muted-foreground/60">→ scène</div>}
      </div>
    </li>
  );
}

function groupByMoment(items: FilEntry[]): { label: string; items: FilEntry[] }[] {
  const out: { label: string; items: FilEntry[] }[] = [];
  for (const e of items) {
    const h = Number(fmtTime(e.at).slice(0, 2));
    const label = new Date(e.at).getTime() < new Date("2026-10-15T00:00:00+02:00").getTime() ? "Hier soir" : h < 8 ? "Cette nuit, Locus" : h < 12 ? "Ce matin" : h < 18 ? "Cet après-midi" : "Ce soir";
    const last = out[out.length - 1];
    if (last && last.label === label) last.items.push(e);
    else out.push({ label, items: [e] });
  }
  return out;
}
