"use client";
import * as React from "react";
import Link from "next/link";
import { Check, X, Pencil, FileText, Pill, Mail, CalendarClock, Stethoscope, ClipboardList, Bell, Eye, Send, Database, Receipt, ChevronDown, ChevronUp, ShieldCheck, Lock } from "lucide-react";
import type { Proposal, ProposalAction, PrescriptionLine, Draft, Prescription, Letter, SickLeave, Message, Citation, AutonomyLevel } from "@/domain/types";
import { Badge, Button, Card } from "./ui";
import { Md } from "./md";
import { useStudio } from "@/store/studio";
import { fmtRelative, fmtDate } from "@/lib/format";
import { cn } from "@/lib/cn";

export const ACTION_META: Record<ProposalAction, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  "creer-enregistrement": { label: "Inscrire au dossier", icon: Database },
  "modifier-enregistrement": { label: "Modifier le dossier", icon: Pencil },
  ordonnance: { label: "Ordonnance", icon: Pill },
  courrier: { label: "Courrier", icon: FileText },
  "arret-travail": { label: "Arrêt de travail", icon: ClipboardList },
  codage: { label: "Codage", icon: Stethoscope },
  facturation: { label: "Facturation", icon: Receipt },
  "message-patient": { label: "Message au patient", icon: Mail },
  "message-confrere": { label: "Message confrère", icon: Send },
  rdv: { label: "Rendez-vous", icon: CalendarClock },
  "alimenter-dmp": { label: "Mon Espace Santé", icon: Database },
  rappel: { label: "Rappel", icon: Bell },
  signaler: { label: "À regarder", icon: Eye },
};

export const AUTONOMY_LABEL: Record<AutonomyLevel, string> = { 0: "observe", 1: "prépare, vous tranchez", 2: "agit et rend compte" };

export function ProposalCard({ proposal, patient, compact, defaultOpen }: { proposal: Proposal; patient?: { id: string; nom: string }; compact?: boolean; defaultOpen?: boolean }) {
  const { etatDe, dispatch } = useStudio();
  const etat = etatDe(proposal);
  const [open, setOpen] = React.useState(defaultOpen ?? !compact);
  const meta = ACTION_META[proposal.action];
  const Icon = meta.icon;
  const decided = etat !== "a-valider";
  const verrou = proposal.action === "ordonnance" || proposal.action === "arret-travail";

  return (
    <Card agent={!decided} className={cn("p-3", decided && "opacity-80")}>
      <div className="flex items-start gap-2.5">
        <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md", decided ? "bg-muted text-muted-foreground" : "bg-agent-soft text-agent")}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-micro uppercase tracking-wider text-muted-foreground font-semibold">{meta.label}</span>
            {patient && <Link href={`/patients/${patient.id}`} className="text-micro text-primary hover:underline">{patient.nom}</Link>}
            <span className="text-micro text-muted-foreground">· {fmtRelative(proposal.createdAt)}</span>
            <EtatBadge etat={etat} />
            {verrou && <Badge tone="outline"><Lock className="h-2.5 w-2.5" /> signature requise</Badge>}
            <span className="ml-auto text-micro text-muted-foreground" title="Niveau d'autonomie appliqué">Locus {AUTONOMY_LABEL[proposal.autonomie]}</span>
          </div>
          <button onClick={() => setOpen((v) => !v)} className="mt-0.5 flex w-full items-start gap-2 text-left">
            <span className="text-sm font-medium leading-snug">{proposal.titre}</span>
            <span className="ml-auto mt-0.5 shrink-0 text-muted-foreground">{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
          </button>
          {open && (
            <div className="mt-2 space-y-3">
              <div className="text-sm text-foreground/85"><Md text={proposal.justification} /></div>
              {proposal.references && proposal.references.length > 0 && <Refs refs={proposal.references} />}
              {proposal.charge && <Charge proposal={proposal} />}
              <div className="flex flex-wrap items-center gap-x-2 text-micro text-muted-foreground">
                <span>Déclencheur : {proposal.declencheur.libelle}</span>
                {proposal.provenance.confidence !== undefined && <span>· confiance {Math.round(proposal.provenance.confidence * 100)} %</span>}
                {proposal.traceId && <span className="font-mono">· {proposal.traceId}</span>}
              </div>
              {!decided ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="success" onClick={() => dispatch({ type: "decide", id: proposal.id, etat: "validee" })}>
                    {verrou ? <ShieldCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />} {verrou ? "Signer et envoyer" : proposal.action === "signaler" ? "Vu" : "Valider"}
                  </Button>
                  {proposal.action !== "signaler" && (
                    <Button size="sm" variant="outline" onClick={() => dispatch({ type: "decide", id: proposal.id, etat: "modifiee" })}><Pencil className="h-3.5 w-3.5" /> Modifier</Button>
                  )}
                  <Button size="sm" variant="danger" onClick={() => dispatch({ type: "decide", id: proposal.id, etat: "rejetee", commentaire: "Rejeté en séance" })}><X className="h-3.5 w-3.5" /> Rejeter</Button>
                </div>
              ) : (
                <div className="text-micro text-muted-foreground">
                  {etat === "executee" ? "Exécuté par Locus" : etat === "validee" ? "Validé par Dr Laurent" : etat === "modifiee" ? "Modifié puis validé par Dr Laurent" : etat === "rejetee" ? "Rejeté par Dr Laurent — Locus retient la correction" : etat}
                  {proposal.decision?.le && ` · ${fmtRelative(proposal.decision.le)}`}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export function EtatBadge({ etat }: { etat: Proposal["etat"] }) {
  const map: Record<Proposal["etat"], { label: string; tone: React.ComponentProps<typeof Badge>["tone"] }> = {
    "a-valider": { label: "à trancher", tone: "agent" },
    validee: { label: "validée", tone: "success" },
    modifiee: { label: "modifiée", tone: "success" },
    rejetee: { label: "rejetée", tone: "danger" },
    executee: { label: "exécutée", tone: "muted" },
    expiree: { label: "expirée", tone: "muted" },
  };
  const m = map[etat];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

export function Refs({ refs }: { refs: Citation[] }) {
  return (
    <ol className="space-y-0.5 text-micro text-muted-foreground">
      {refs.map((r, i) => (
        <li key={i} className="flex gap-1.5">
          <span className="font-mono text-primary">[{i + 1}]</span>
          <span>
            {r.url ? <a href={r.url} target="_blank" rel="noreferrer" className="hover:underline text-foreground/80">{r.titre}</a> : <span className="text-foreground/80">{r.titre}</span>}
            {" — "}{r.editeur}{r.date ? `, ${r.date}` : ""}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Charge({ proposal }: { proposal: Proposal }) {
  const c = proposal.charge as unknown;
  if (!c || typeof c !== "object") return null;
  if ("recordId" in (c as object)) {
    const patch = (c as { recordId: string; patch: Record<string, unknown> });
    return <div className="rounded-md bg-muted/60 px-2.5 py-1.5 text-micro font-mono text-muted-foreground">patch {patch.recordId} → {JSON.stringify(patch.patch)}</div>;
  }
  switch (proposal.action) {
    case "ordonnance": return <PrescriptionPreview p={c as Draft<Prescription>} />;
    case "courrier": return <LetterPreview l={c as Draft<Letter>} />;
    case "arret-travail": return <SickLeavePreview s={c as Draft<SickLeave>} />;
    case "message-confrere":
    case "message-patient": return <MessagePreview m={c as Draft<Message>} />;
    default: return <pre className="rounded-md bg-muted/60 p-2 text-micro overflow-x-auto">{JSON.stringify(c, null, 1)}</pre>;
  }
}

export function PrescriptionPreview({ p }: { p: Draft<Prescription> }) {
  return (
    <div className="rounded-md border bg-background">
      <div className="flex items-center justify-between border-b px-3 py-1.5 text-micro text-muted-foreground">
        <span>Ordonnance {p.type} · {fmtDate(p.date)}</span>
        <span>Dr Claire Laurent · RPPS 10003456789</span>
      </div>
      <ul className="divide-y">
        {p.lignes.map((l, i) => <LineView key={i} l={l} />)}
      </ul>
      {p.mention && <div className="border-t px-3 py-1.5 text-xs italic text-muted-foreground">{p.mention}</div>}
    </div>
  );
}

function LineView({ l }: { l: PrescriptionLine }) {
  return (
    <li className="px-3 py-2">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-sm font-medium">{l.libelle}</span>
        {l.ald && <Badge tone="primary">ALD</Badge>}
        {l.nonSubstituable && <Badge tone="outline">NS {l.nonSubstituable}</Badge>}
      </div>
      <div className="text-xs text-muted-foreground">{[l.posologie, l.duree, l.quantite, l.renouvellement ? `renouvelable ${l.renouvellement} fois` : null].filter(Boolean).join(" · ")}</div>
      {l.alertes?.map((a, i) => (
        <div key={i} className={cn("mt-1.5 rounded px-2 py-1 text-micro", a.niveau === "contre-indique" || a.niveau === "deconseille" ? "bg-destructive/10 text-destructive" : a.niveau === "precaution" ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground")}>
          <span className="font-semibold uppercase">{a.type.replace("-", " ")} · {a.niveau}</span> — {a.message}
          {a.reference && <span className="opacity-70"> ({a.reference.titre})</span>}
        </div>
      ))}
    </li>
  );
}

export function LetterPreview({ l }: { l: Draft<Letter> }) {
  return (
    <div className="rounded-md border bg-background px-4 py-3">
      <div className="mb-2 flex items-center justify-between text-micro text-muted-foreground">
        <span>{l.titre} · {fmtDate(l.date)}</span>
        <span>À : {l.destinataire.nom}{l.destinataire.specialite ? `, ${l.destinataire.specialite}` : ""}{l.destinataire.mssante ? " · MSSanté" : ""}</span>
      </div>
      <div className="whitespace-pre-wrap text-sm leading-relaxed">{l.corps}</div>
    </div>
  );
}

export function SickLeavePreview({ s }: { s: Draft<SickLeave> }) {
  return (
    <div className="rounded-md border bg-background px-3 py-2 text-sm">
      <div className="text-micro text-muted-foreground mb-1">Avis d'arrêt de travail · téléservice AAT amelipro</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-muted-foreground">Du</span><span>{fmtDate(s.du)}</span>
        <span className="text-muted-foreground">Au</span><span>{fmtDate(s.au)} inclus</span>
        <span className="text-muted-foreground">Motif (volet médical)</span><span>{s.motif}</span>
        <span className="text-muted-foreground">Sorties</span><span>{s.sortiesAutorisees === "libres" ? "libres (justification médicale)" : s.sortiesAutorisees === "oui" ? "autorisées 10h-12h / 16h-18h" : "non autorisées"}</span>
      </div>
    </div>
  );
}

export function MessagePreview({ m }: { m: Draft<Message> }) {
  return (
    <div className="rounded-md border bg-background px-3 py-2">
      <div className="text-micro text-muted-foreground mb-1">{m.canal === "mssante" ? "MSSanté" : "Messagerie patient"} · à {m.a.map((x) => x.nom).join(", ")}{m.objet ? ` · ${m.objet}` : ""}</div>
      <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.corps}</div>
    </div>
  );
}
