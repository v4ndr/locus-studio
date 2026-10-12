"use client";
import * as React from "react";
import Link from "next/link";
import { Sparkles, Inbox, Clock, ChevronRight, CheckCircle2, Video, Home, Building2 } from "lucide-react";
import type { Appointment, Briefing, Proposal } from "@/domain/types";
import { Avatar, Badge, Card, SectionTitle, Button } from "./ui";
import { ProposalCard } from "./proposal-card";
import { fmtTime, initials } from "@/lib/format";
import { useStudio, useSetCounts } from "@/store/studio";
import { cn } from "@/lib/cn";

interface Slot {
  appointment: Appointment;
  briefing?: Briefing;
  patient: { id: string; nom: string; hue: number; prenom: string; nomUsage: string; naissance: string; ligne: string };
  pending: number;
}

export function JourneeView({ agenda, pending, stats }: { agenda: Slot[]; pending: { proposal: Proposal; patient: { id: string; nom: string } }[]; stats: { patients: number; executees: number; inbox: number; inboxUrgent: number } }) {
  const { etatDe, state } = useStudio();
  const allPending = [...state.propositions.map((p) => ({ proposal: p, patient: { id: p.patientId, nom: agenda.find((a) => a.patient.id === p.patientId)?.patient.nom ?? p.patientId } })), ...pending].filter((x) => etatDe(x.proposal) === "a-valider");
  useSetCounts(stats.inbox, allPending.length);
  const [sel, setSel] = React.useState<string | null>(agenda[0]?.appointment.id ?? null);
  const selected = agenda.find((a) => a.appointment.id === sel);
  const groups = groupBy(allPending, (x) => x.proposal.action === "signaler" ? "À regarder" : x.proposal.action === "ordonnance" || x.proposal.action === "arret-travail" ? "À signer" : "À valider");

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-micro uppercase tracking-wider text-muted-foreground font-semibold">Jeudi 15 octobre 2026 · Dr Claire Laurent</div>
          <h1 className="text-2xl font-semibold tracking-tight">Votre journée, préparée.</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            Locus a lu ce qui est arrivé cette nuit, préparé chaque consultation et rédigé ce qu'il pouvait. Il vous reste <span className="font-medium text-foreground">{allPending.length} décision{allPending.length > 1 ? "s" : ""}</span> à prendre avant 8h30 — rien à remplir.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-micro">
          <Stat label="consultations" value={agenda.length} />
          <Stat label="à trancher" value={allPending.length} tone="agent" />
          <Stat label="reçus non lus" value={stats.inbox} tone={stats.inboxUrgent ? "warning" : undefined} />
          <Stat label="faits par Locus" value={stats.executees} tone="success" />
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <section>
          <SectionTitle right={<Link href="/patients" className="text-micro text-primary hover:underline">tous les patients</Link>}>Agenda — {agenda.length} rendez-vous</SectionTitle>
          <ol className="space-y-1.5">
            {agenda.map((s) => {
              const active = s.appointment.id === sel;
              const TypeIcon = s.appointment.type === "teleconsultation" ? Video : s.appointment.type === "visite" ? Home : Building2;
              return (
                <li key={s.appointment.id}>
                  <button onClick={() => setSel(s.appointment.id)} className={cn("flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors", active ? "border-primary/40 bg-accent/60" : "bg-card hover:bg-muted/60")}>
                    <span className="w-12 shrink-0 font-mono text-sm tabular-nums">{fmtTime(s.appointment.debut)}</span>
                    <Avatar hue={s.patient.hue} initials={initials(s.patient.prenom, s.patient.nomUsage)} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm font-medium">{s.patient.nom} <TypeIcon className="h-3 w-3 text-muted-foreground" /></span>
                      <span className="block truncate text-micro text-muted-foreground">{s.appointment.motif}</span>
                    </span>
                    {s.appointment.prisPar === "agent" && <Badge tone="agent" className="hidden sm:inline-flex"><Sparkles className="h-2.5 w-2.5" /> ajouté par Locus</Badge>}
                    {s.briefing && <Badge tone="primary" className="hidden sm:inline-flex">brief</Badge>}
                    {s.pending > 0 && <span className="rounded-full bg-agent px-1.5 text-micro font-semibold text-agent-foreground">{s.pending}</span>}
                    <ChevronRight className={cn("h-4 w-4 text-muted-foreground", active && "text-primary")} />
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="mt-3 rounded-lg border border-dashed px-3 py-2 text-micro text-muted-foreground flex items-center gap-2"><Clock className="h-3 w-3" /> 12h00–14h00 : pas de rendez-vous. Locus propose d'y caler les 3 patients qui ont demandé un créneau cette semaine. <Link href="/agents" className="text-primary hover:underline">Voir</Link></div>
        </section>

        <section className="space-y-4">
          {selected ? <BriefingCard slot={selected} /> : null}
        </section>
      </div>

      <section>
        <SectionTitle right={<Link href="/agents" className="text-micro text-primary hover:underline">tout le travail de Locus</Link>}>À trancher maintenant — {allPending.length}</SectionTitle>
        {allPending.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground"><CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-success" />Rien à trancher. Locus vous préviendra.</Card>
        ) : (
          <div className="grid gap-4 xl:grid-cols-3">
            {(["À signer", "À valider", "À regarder"] as const).map((g) => (
              <div key={g} className="space-y-2">
                <div className="text-micro font-semibold uppercase tracking-wider text-muted-foreground">{g} <span className="text-foreground/60">· {groups[g]?.length ?? 0}</span></div>
                {(groups[g] ?? []).slice(0, 6).map((x) => <ProposalCard key={x.proposal.id} proposal={x.proposal} patient={x.patient} compact />)}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm font-medium"><Inbox className="h-4 w-4 text-primary" /> Réception</div>
          <p className="mt-1 text-sm text-muted-foreground">{stats.inbox} éléments reçus non lus, triés par Locus ; {stats.inboxUrgent} à voir aujourd'hui.</p>
          <Link href="/inbox"><Button size="sm" variant="outline" className="mt-2">Ouvrir</Button></Link>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm font-medium"><Sparkles className="h-4 w-4 text-agent" /> Cette nuit, Locus a</div>
          <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground">
            <li>· lu 3 documents et 1 biologie reçus</li><li>· trié 6 messages, pris 3 rendez-vous</li><li>· préparé {agenda.filter((a) => a.briefing).length} briefings</li><li>· déposé 1 résultat dans Mon Espace Santé</li>
          </ul>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm font-medium"><CheckCircle2 className="h-4 w-4 text-success" /> Routines du dimanche</div>
          <p className="mt-1 text-sm text-muted-foreground">Dépistages, renouvellements, vaccins : 14 patients relancés, 5 ordonnances de bilan préparées.</p>
          <Link href="/routines"><Button size="sm" variant="outline" className="mt-2">Voir les routines</Button></Link>
        </Card>
      </section>
    </div>
  );
}

function BriefingCard({ slot }: { slot: Slot }) {
  const b = slot.briefing;
  return (
    <Card agent className="p-4">
      <div className="flex items-start gap-3">
        <Avatar hue={slot.patient.hue} initials={initials(slot.patient.prenom, slot.patient.nomUsage)} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/patients/${slot.patient.id}`} className="text-base font-semibold hover:underline">{slot.patient.nom}</Link>
            <span className="text-sm text-muted-foreground">{fmtTime(slot.appointment.debut)} · {slot.appointment.dureeMin} min · {slot.appointment.motif}</span>
          </div>
          <p className="text-micro text-muted-foreground">{slot.patient.ligne}</p>
        </div>
        <Link href={`/patients/${slot.patient.id}/consultation`}><Button size="sm" variant="agent">Ouvrir la consultation</Button></Link>
      </div>
      {b ? (
        <div className="mt-3 space-y-3 text-sm">
          <p className="leading-relaxed">{b.synthese}</p>
          {b.depuisDerniereFois.length > 0 && <Block title="Depuis la dernière fois" items={b.depuisDerniereFois} />}
          {b.echeances.length > 0 && <Block title="Ce qui est dû" items={b.echeances.map((e) => e.libelle)} tone="warning" />}
          {b.questions.length > 0 && <Block title="À poser" items={b.questions} />}
          <div className="text-micro text-muted-foreground">Briefing de Locus · confiance {Math.round((b.provenance.confidence ?? 0) * 100)} % · {b.propositionsIds.length} proposition{b.propositionsIds.length > 1 ? "s" : ""} pré-remplie{b.propositionsIds.length > 1 ? "s" : ""}</div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Pas de briefing : rien de nouveau depuis la dernière consultation. Locus ouvrira le dossier à l'heure du rendez-vous.</p>
      )}
    </Card>
  );
}

function Block({ title, items, tone }: { title: string; items: string[]; tone?: "warning" }) {
  return (
    <div>
      <div className={cn("text-micro font-semibold uppercase tracking-wider", tone === "warning" ? "text-warning" : "text-muted-foreground")}>{title}</div>
      <ul className="mt-1 space-y-0.5">{items.map((it, i) => <li key={i} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" /><span>{it}</span></li>)}</ul>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "agent" | "warning" | "success" }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-1.5 min-w-[5.5rem]">
      <div className={cn("text-lg font-semibold tabular-nums leading-tight", tone === "agent" && "text-agent", tone === "warning" && "text-warning", tone === "success" && "text-success")}>{value}</div>
      <div className="text-micro text-muted-foreground">{label}</div>
    </div>
  );
}

function groupBy<T>(xs: T[], key: (x: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const x of xs) (out[key(x)] ??= []).push(x);
  return out;
}
