"use client";
import * as React from "react";
import Link from "next/link";
import { Sparkles, Lock, Eye, Hammer, Zap, History } from "lucide-react";
import type { Proposal, AutonomyPolicy, ProposalAction, AutonomyLevel } from "@/domain/types";
import { Badge, Card, SectionTitle, Empty } from "./ui";
import { ProposalCard, ACTION_META, AUTONOMY_LABEL } from "./proposal-card";
import { useStudio, useSetCounts } from "@/store/studio";
import { fmtRelative } from "@/lib/format";
import { cn } from "@/lib/cn";

type Row = { proposal: Proposal; patient: { id: string; nom: string } };
type J = { id: string; at: string; acteur: { type: string; nom: string }; action: string; detail?: string; patient?: { id: string; nom: string } };

export function AgentsView({ all, journal, inboxCount, policy }: { all: Row[]; journal: J[]; inboxCount: number; policy: AutonomyPolicy }) {
  const { etatDe, state, dispatch } = useStudio();
  const rows: Row[] = [...state.propositions.map((p) => ({ proposal: p, patient: { id: p.patientId, nom: all.find((r) => r.patient.id === p.patientId)?.patient.nom ?? p.patientId } })), ...all];
  const by = (e: Proposal["etat"][]) => rows.filter((r) => e.includes(etatDe(r.proposal)));
  const pending = by(["a-valider"]);
  useSetCounts(inboxCount, pending.length);
  const [tab, setTab] = React.useState<"file" | "fait" | "politique" | "journal">("file");
  const done = by(["validee", "modifiee", "executee"]);
  const rejected = by(["rejetee"]);
  const actions = Object.keys(ACTION_META) as ProposalAction[];

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-agent-soft text-agent"><Sparkles className="h-4 w-4" /></span> Sol, l'agent du cabinet</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">Sol est un collègue nommé, délégué, jamais responsable : chaque chose qu'il fait a un humain qui tranche ou qui peut révoquer. Voici sa file de travail, ce qu'il a fait, et ce que vous l'autorisez à faire seul.</p>
        </div>
        <div className="flex rounded-md border p-0.5 text-xs">
          {([["file", `À trancher · ${pending.length}`], ["fait", `Fait · ${done.length}`], ["politique", "Autonomie"], ["journal", "Journal"]] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={cn("rounded px-2.5 py-1", tab === k ? "bg-muted font-medium" : "text-muted-foreground")}>{l}</button>)}
        </div>
      </header>

      {tab === "file" && (pending.length === 0 ? <Empty>Rien à trancher.</Empty> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {pending.map((r) => <ProposalCard key={r.proposal.id} proposal={r.proposal} patient={r.patient} compact />)}
        </div>
      ))}

      {tab === "fait" && (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{done.map((r) => <ProposalCard key={r.proposal.id} proposal={r.proposal} patient={r.patient} compact />)}</div>
          {rejected.length > 0 && <><SectionTitle>Rejeté — Sol retient la correction</SectionTitle><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{rejected.map((r) => <ProposalCard key={r.proposal.id} proposal={r.proposal} patient={r.patient} compact />)}</div></>}
        </div>
      )}

      {tab === "politique" && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="divide-y">
            {actions.map((a) => {
              const meta = ACTION_META[a];
              const Icon = meta.icon;
              const locked = policy.verrous.includes(a);
              const level = (state.autonomie[a] ?? policy.parAction[a] ?? 1) as AutonomyLevel;
              return (
                <div key={a} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div className="min-w-[160px] text-sm font-medium">{meta.label}</div>
                  <div className="flex rounded-md border p-0.5 text-xs">
                    {([0, 1, 2] as AutonomyLevel[]).map((n) => (
                      <button key={n} disabled={locked && n === 2} onClick={() => dispatch({ type: "autonomie", action: a, niveau: n })} className={cn("flex items-center gap-1 rounded px-2 py-1 disabled:opacity-30", level === n ? "bg-agent-soft text-agent font-medium" : "text-muted-foreground")}>
                        {n === 0 ? <Eye className="h-3 w-3" /> : n === 1 ? <Hammer className="h-3 w-3" /> : <Zap className="h-3 w-3" />} {AUTONOMY_LABEL[n]}
                      </button>
                    ))}
                  </div>
                  {locked && <Badge tone="outline"><Lock className="h-2.5 w-2.5" /> verrou : jamais sans signature</Badge>}
                </div>
              );
            })}
          </Card>
          <Card className="p-4 text-sm space-y-2">
            <div className="font-medium">Trois niveaux, pas plus</div>
            <p className="text-muted-foreground"><span className="font-medium text-foreground">0 · observe.</span> Sol signale, n'écrit rien. Pour ce qui est une décision clinique.</p>
            <p className="text-muted-foreground"><span className="font-medium text-foreground">1 · prépare.</span> Sol rédige, vous tranchez. Rien ne sort du cabinet sans votre geste. C'est le défaut.</p>
            <p className="text-muted-foreground"><span className="font-medium text-foreground">2 · agit.</span> Sol exécute et rend compte dans le journal ; vous pouvez révoquer. Pour l'administratif réversible.</p>
            <p className="text-muted-foreground">Les <span className="font-medium text-foreground">verrous</span> (ordonnance, arrêt de travail) ne montent jamais à 2 : une signature est une signature.</p>
            <p className="text-micro text-muted-foreground">Chaque rejet est une correction que Sol retient : il ne refait pas deux fois la même proposition.</p>
          </Card>
        </div>
      )}

      {tab === "journal" && (
        <Card className="divide-y">
          {journal.map((j) => (
            <div key={j.id} className="flex items-start gap-3 px-3 py-2 text-sm">
              <span className="w-24 shrink-0 font-mono text-micro text-muted-foreground">{fmtRelative(j.at)}</span>
              <span className={cn("shrink-0 rounded px-1.5 text-micro font-medium", j.acteur.type === "agent" ? "bg-agent-soft text-agent" : j.acteur.type === "praticien" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground")}>{j.acteur.nom}</span>
              <span className="min-w-0 flex-1"><span className="font-mono text-micro text-muted-foreground mr-2">{j.action}</span>{j.detail}{j.patient && <> · <Link href={`/patients/${j.patient.id}`} className="text-primary hover:underline">{j.patient.nom}</Link></>}</span>
            </div>
          ))}
          <div className="px-3 py-2 text-micro text-muted-foreground flex items-center gap-1"><History className="h-3 w-3" /> Journal append-only : qui a fait quoi, jamais modifié. C'est le « ledger » du cabinet.</div>
        </Card>
      )}
    </div>
  );
}
