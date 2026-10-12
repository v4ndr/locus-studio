"use client";
import * as React from "react";
import Link from "next/link";
import { FlaskConical, FileText, MessageSquare, AlertTriangle, Check, ChevronRight, Sparkles, ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { LabReport, ClinicalDocument, Message, Proposal, AgentReading } from "@/domain/types";
import { Avatar, Badge, Button, Card, SectionTitle, Empty } from "./ui";
import { ProposalCard, MessagePreview } from "./proposal-card";
import { fmtRelative, fmtDate, initials } from "@/lib/format";
import { useStudio, useSetCounts } from "@/store/studio";
import { cn } from "@/lib/cn";

export type InboxEntry = {
  kind: "lab" | "document" | "message";
  at: string;
  patient: { id: string; nom: string; hue: number; prenom: string; nomUsage: string };
  record: LabReport | ClinicalDocument | Message;
  proposals: Proposal[];
  reply?: Message;
};

const URG: Record<string, { label: string; tone: "danger" | "warning" | "primary" | "muted" }> = { immediate: { label: "immédiat", tone: "danger" }, jour: { label: "aujourd'hui", tone: "warning" }, semaine: { label: "cette semaine", tone: "primary" }, aucune: { label: "quand vous voulez", tone: "muted" } };

function urgenceOf(e: InboxEntry): string {
  if (e.kind === "message") return (e.record as Message).triage?.urgence ?? "aucune";
  return (e.record as LabReport | ClinicalDocument).lecture?.urgence ?? "aucune";
}

export function InboxView({ items, pendingTotal }: { items: InboxEntry[]; pendingTotal: number }) {
  const { estVu, dispatch, etatDe } = useStudio();
  const [filter, setFilter] = React.useState<"tous" | "lab" | "document" | "message">("tous");
  const visible = items.filter((i) => !estVu(i.record.id)).filter((i) => filter === "tous" || i.kind === filter);
  const order = { immediate: 0, jour: 1, semaine: 2, aucune: 3 } as Record<string, number>;
  const sorted = [...visible].sort((a, b) => order[urgenceOf(a)] - order[urgenceOf(b)] || b.at.localeCompare(a.at));
  const [sel, setSel] = React.useState<string | null>(null);
  const current = sorted.find((i) => i.record.id === sel) ?? sorted[0];
  useSetCounts(visible.length, pendingTotal);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Réception</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">Biologies, courriers, messages : tout ce qui est arrivé, lu et trié par Sol. L'ordre est l'urgence qu'il propose, pas l'heure d'arrivée. Chaque élément vient avec ce qu'il a compris et ce qu'il a préparé.</p>
        </div>
        <div className="flex rounded-md border p-0.5 text-xs">
          {([["tous", "Tout"], ["lab", "Biologie"], ["document", "Documents"], ["message", "Messages"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className={cn("rounded px-2.5 py-1", filter === k ? "bg-muted font-medium" : "text-muted-foreground")}>{l} <span className="opacity-60">{k === "tous" ? visible.length : visible.filter((i) => i.kind === k).length}</span></button>
          ))}
        </div>
      </header>
      {sorted.length === 0 ? <Empty>Réception vide. Ce n'est pas l'objectif — l'objectif est que rien ne vous ait échappé.</Empty> : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
          <ol className="space-y-1.5">
            {sorted.map((i) => {
              const u = URG[urgenceOf(i)];
              const Icon = i.kind === "lab" ? FlaskConical : i.kind === "document" ? FileText : MessageSquare;
              const resume = i.kind === "message" ? (i.record as Message).triage?.resume : (i.record as LabReport | ClinicalDocument).lecture?.resume;
              const titre = i.kind === "lab" ? `Biologie — ${(i.record as LabReport).laboratoire}` : i.kind === "document" ? (i.record as ClinicalDocument).titre : (i.record as Message).objet ?? "Message";
              const active = current?.record.id === i.record.id;
              return (
                <li key={i.record.id}>
                  <button onClick={() => setSel(i.record.id)} className={cn("flex w-full gap-3 rounded-lg border px-3 py-2.5 text-left", active ? "border-primary/40 bg-accent/60" : "bg-card hover:bg-muted/60")}>
                    <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md", u.tone === "danger" ? "bg-destructive/10 text-destructive" : u.tone === "warning" ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground")}><Icon className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-micro text-muted-foreground"><Link href={`/patients/${i.patient.id}`} className="font-medium text-foreground hover:underline" onClick={(e) => e.stopPropagation()}>{i.patient.nom}</Link> · {fmtRelative(i.at)} <Badge tone={u.tone} className="ml-auto">{u.label}</Badge></span>
                      <span className="block text-sm font-medium truncate">{titre}</span>
                      {resume && <span className="line-clamp-2 text-xs text-muted-foreground">{resume}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          {current && <Detail entry={current} onVu={() => { dispatch({ type: "vu", id: current.record.id }); setSel(null); }} etatDe={etatDe} />}
        </div>
      )}
    </div>
  );
}

function Detail({ entry, onVu, etatDe }: { entry: InboxEntry; onVu: () => void; etatDe: (p: Proposal) => Proposal["etat"] }) {
  const lecture: AgentReading | undefined = entry.kind === "message" ? undefined : (entry.record as LabReport | ClinicalDocument).lecture;
  return (
    <div className="space-y-3">
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <Avatar hue={entry.patient.hue} initials={initials(entry.patient.prenom, entry.patient.nomUsage)} />
          <div className="min-w-0 flex-1">
            <Link href={`/patients/${entry.patient.id}`} className="font-semibold hover:underline">{entry.patient.nom}</Link>
            <div className="text-micro text-muted-foreground">{entry.kind === "lab" ? `Prélèvement du ${fmtDate((entry.record as LabReport).prelevementLe)} · ${(entry.record as LabReport).laboratoire} · HPRIM/CDA` : entry.kind === "document" ? `${(entry.record as ClinicalDocument).auteur ?? ""} · ${fmtDate((entry.record as ClinicalDocument).dateDocument)} · reçu par ${(entry.record as ClinicalDocument).canal}` : `${(entry.record as Message).de.nom} · ${fmtRelative((entry.record as Message).date)} · ${(entry.record as Message).canal}`}</div>
          </div>
          <Link href={`/patients/${entry.patient.id}`}><Button size="sm" variant="ghost">Dossier <ChevronRight className="h-3.5 w-3.5" /></Button></Link>
          <Button size="sm" variant="outline" onClick={onVu}><Check className="h-3.5 w-3.5" /> Vu</Button>
        </div>

        {(lecture || (entry.kind === "message" && (entry.record as Message).triage)) && (
          <div className="mt-3 rounded-lg bg-agent-soft/60 p-3 agent-glow">
            <div className="flex items-center gap-1.5 text-micro font-semibold uppercase tracking-wider text-agent"><Sparkles className="h-3 w-3" /> Ce que Sol a compris</div>
            <p className="mt-1 text-sm">{lecture?.resume ?? (entry.record as Message).triage?.resume}</p>
            {lecture && lecture.pointsAttention.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm">{lecture.pointsAttention.map((p, i) => <li key={i} className="flex gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" /><span>{p}</span></li>)}</ul>
            )}
            {lecture && lecture.faitsExtraits.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">{lecture.faitsExtraits.map((f, i) => <Badge key={i} tone="outline">{factLabel(f)}</Badge>)}</div>
            )}
            {lecture?.references && lecture.references.length > 0 && <div className="mt-2 text-micro text-muted-foreground">Sources : {lecture.references.map((r) => `${r.titre} (${r.editeur})`).join(" · ")}</div>}
          </div>
        )}

        <div className="mt-3">
          {entry.kind === "lab" && <LabTable lab={entry.record as LabReport} />}
          {entry.kind === "document" && <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-md border bg-background p-3 font-sans text-sm leading-relaxed">{(entry.record as ClinicalDocument).texte}</pre>}
          {entry.kind === "message" && <div className="rounded-md border bg-background p-3 text-sm whitespace-pre-wrap leading-relaxed">{(entry.record as Message).corps}</div>}
        </div>

        {entry.reply && (
          <div className="mt-3">
            <SectionTitle>Réponse préparée par Sol</SectionTitle>
            <MessagePreview m={entry.reply} />
          </div>
        )}
      </Card>
      {entry.proposals.length > 0 && (
        <div>
          <SectionTitle>Ce que Sol propose — {entry.proposals.filter((p) => etatDe(p) === "a-valider").length} à trancher</SectionTitle>
          <div className="space-y-2">{entry.proposals.map((p) => <ProposalCard key={p.id} proposal={p} compact defaultOpen />)}</div>
        </div>
      )}
    </div>
  );
}

function factLabel(f: AgentReading["faitsExtraits"][number]): string {
  switch (f.type) {
    case "problem": return `${f.statut === "nouveau" ? "+ " : ""}${f.libelle}${f.cim10 ? ` (${f.cim10})` : ""}`;
    case "medication": return `${f.action === "debute" ? "+" : f.action === "arrete" ? "−" : "~"} ${f.dci}${f.posologie ? ` ${f.posologie}` : ""}`;
    case "measure": return `${f.mesure.toUpperCase()} ${f.valeur}${f.valeur2 ? `/${f.valeur2}` : ""} ${f.unite}`;
    case "rdv": return `RDV : ${f.libelle}`;
    case "allergy": return `Allergie : ${f.substance}`;
    default: return f.libelle;
  }
}

export function LabTable({ lab }: { lab: LabReport }) {
  return (
    <table className="w-full text-sm">
      <thead><tr className="text-micro uppercase tracking-wider text-muted-foreground"><th className="py-1 text-left font-semibold">Analyse</th><th className="py-1 text-right font-semibold">Résultat</th><th className="py-1 text-right font-semibold">Réf.</th><th className="py-1 text-right font-semibold">Précédent</th></tr></thead>
      <tbody>
        {lab.resultats.map((r, i) => (
          <tr key={i} className={cn("border-t", r.flag !== "normal" && "font-medium")}>
            <td className="py-1.5">{r.libelle}{r.loinc && <span className="ml-1.5 font-mono text-micro text-muted-foreground">{r.loinc}</span>}</td>
            <td className={cn("py-1.5 text-right tabular-nums", r.flag === "haut" && "text-warning", r.flag === "bas" && "text-primary", r.flag === "critique" && "text-destructive")}>{r.valeur} {r.unite}{r.flag === "haut" && <ArrowUpRight className="ml-1 inline h-3 w-3" />}{r.flag === "bas" && <ArrowDownRight className="ml-1 inline h-3 w-3" />}</td>
            <td className="py-1.5 text-right text-micro text-muted-foreground tabular-nums">{r.refMin !== undefined && r.refMax !== undefined ? `${r.refMin}–${r.refMax}` : r.refMax !== undefined ? `< ${r.refMax}` : r.refMin !== undefined ? `> ${r.refMin}` : ""}</td>
            <td className="py-1.5 text-right text-micro text-muted-foreground tabular-nums">{r.precedent ? `${r.precedent.valeur} (${fmtRelative(r.precedent.date)})` : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
