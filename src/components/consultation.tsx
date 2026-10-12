"use client";
import * as React from "react";
import Link from "next/link";
import { Mic, MicOff, Play, Pause, Sparkles, CheckCircle2, Receipt, Database, Pen, RotateCcw, Link2 } from "lucide-react";
import type { Patient, Briefing, Proposal, EncounterNote } from "@/domain/types";
import type { Script } from "@/data/consultations";
import { PatientHeader } from "./patient-bits";
import { Badge, Button, Card, SectionTitle } from "./ui";
import { ProposalCard } from "./proposal-card";
import { useStudio } from "@/store/studio";
import { cn } from "@/lib/cn";

const SECTIONS: { key: keyof EncounterNote; label: string }[] = [
  { key: "motifs", label: "Motif" }, { key: "histoire", label: "Histoire" }, { key: "examen", label: "Examen" }, { key: "conclusion", label: "Conclusion" }, { key: "conduite", label: "Conduite à tenir" }, { key: "attentesPatient", label: "Ce que le patient a dit vouloir" },
];

export function ConsultationView({ patient, ligne, script, briefing, existing, scripted }: { patient: Patient; ligne?: string; script: Script; briefing?: Briefing; existing: Proposal[]; scripted: boolean }) {
  const { dispatch, etatDe } = useStudio();
  const [step, setStep] = React.useState(-1);
  const [playing, setPlaying] = React.useState(false);
  const [consent, setConsent] = React.useState(false);
  const [closed, setClosed] = React.useState(false);
  const [hover, setHover] = React.useState<number | null>(null);
  const [generated, setGenerated] = React.useState<Proposal[]>([]);
  const total = script.steps.length;

  React.useEffect(() => {
    if (!playing) return;
    if (step >= total - 1) { setPlaying(false); return; }
    const id = setTimeout(() => setStep((s) => s + 1), 1800);
    return () => clearTimeout(id);
  }, [playing, step, total]);

  React.useEffect(() => {
    if (step < 0) return;
    const s = script.steps[step];
    if (!s.proposals) return;
    setGenerated((g) => {
      const fresh = s.proposals!.filter((_, i) => !g.some((x) => x.id === `live.${patient.id}.${step}.${i}`)).map((p, i) => ({
        id: `live.${patient.id}.${step}.${i}`, kind: "proposal" as const, patientId: patient.id, schema: 1 as const, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        provenance: { origin: "agent" as const, actor: "locus", confidence: 0.9 }, status: "propose" as const,
        action: p.action, titre: p.titre, justification: p.justification, references: p.references, charge: p.charge,
        declencheur: { type: "encounter" as const, libelle: `Dit à ${fmtT(s.turn.t)}` }, autonomie: p.autonomie, etat: (p.autonomie === 2 ? "executee" : "a-valider") as Proposal["etat"], agent: "locus",
      }));
      return [...g, ...fresh];
    });
  }, [step, script, patient.id]);

  const note: Record<string, { text: string; from: number }[]> = {};
  script.steps.slice(0, step + 1).forEach((s, i) => s.note?.forEach((n) => (note[n.section] ??= []).push({ text: n.text, from: i })));
  const pending = [...existing, ...generated].filter((p) => etatDe(p) === "a-valider");

  function close() {
    for (const p of pending) dispatch({ type: "decide", id: p.id, etat: "validee" });
    setClosed(true);
    setPlaying(false);
  }

  return (
    <div className="space-y-4">
      <PatientHeader p={patient} ligne={ligne} right={<Link href={`/patients/${patient.id}`}><Button variant="ghost" size="sm">Dossier</Button></Link>} />

      <Card className="flex flex-wrap items-center gap-3 p-3">
        <button onClick={() => setConsent((v) => !v)} className={cn("flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm", consent ? "border-success/40 bg-success/10 text-success" : "text-muted-foreground")}>
          {consent ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />} {consent ? "Écoute ambiante — consentement oral tracé" : "Recueillir le consentement à l'écoute"}
        </button>
        <Button variant="agent" size="sm" disabled={!consent || closed} onClick={() => { if (step >= total - 1) return; setPlaying((v) => !v); if (step < 0) setStep(0); }}>
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />} {step < 0 ? "Démarrer la consultation" : playing ? "Pause" : step >= total - 1 ? "Terminée" : "Reprendre"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => { setStep(-1); setPlaying(false); setGenerated([]); setClosed(false); }}><RotateCcw className="h-3.5 w-3.5" /> Rejouer</Button>
        <div className="ml-auto flex items-center gap-2 text-micro text-muted-foreground">
          {!scripted && <Badge tone="outline">consultation non scriptée dans le jeu de données</Badge>}
          <span className="font-mono tabular-nums">{step >= 0 ? fmtT(script.steps[step].turn.t) : "00:00"}</span>
          <span>· {script.motif}</span>
          {playing && <span className="flex items-center gap-1 text-agent"><span className="h-2 w-2 rounded-full bg-agent animate-pulse-soft" /> Locus écoute et écrit</span>}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.1fr)_380px]">
        <section>
          <SectionTitle>Transcription</SectionTitle>
          {step < 0 ? (
            <Card className="p-4 text-sm text-muted-foreground space-y-2">
              <p>La consultation n'a pas commencé. Pendant qu'elle a lieu, Locus écoute, écrit la note dans les cases du milieu, et pose à droite ce qu'il propose d'en faire. Rien n'est signé sans vous.</p>
              {briefing && <div className="rounded-md bg-agent-soft/60 p-3 agent-glow"><div className="text-micro font-semibold uppercase tracking-wider text-agent">Le brief de Locus</div><p className="mt-1 text-foreground/90">{briefing.synthese}</p><ul className="mt-2 space-y-0.5">{briefing.questions.map((q, i) => <li key={i}>· {q}</li>)}</ul></div>}
            </Card>
          ) : (
            <ol className="space-y-1.5">
              {script.steps.slice(0, step + 1).map((s, i) => (
                <li key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className={cn("rounded-lg px-3 py-2 text-sm transition-colors", s.turn.qui === "medecin" ? "bg-accent/50" : s.turn.qui === "patient" ? "bg-card border" : "bg-warning/10", hover === i && "ring-2 ring-agent/50")}>
                  <div className="text-micro text-muted-foreground"><span className="font-mono">{fmtT(s.turn.t)}</span> · {s.turn.qui === "medecin" ? "Dr Vandepitterie" : s.turn.qui === "patient" ? patient.prenomUsuel : "Accompagnant"}</div>
                  <div>{s.turn.texte}</div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section>
          <SectionTitle right={<span className="text-micro text-muted-foreground flex items-center gap-1"><Link2 className="h-3 w-3" /> survoler une phrase → le tour d'où elle vient</span>}>Note de consultation — écrite par Locus</SectionTitle>
          <Card agent={playing} className="divide-y">
            {SECTIONS.map((sec) => {
              const lines = note[sec.key] ?? [];
              return (
                <div key={sec.key} className="px-3 py-2.5">
                  <div className="text-micro font-semibold uppercase tracking-wider text-muted-foreground">{sec.label}</div>
                  {lines.length === 0 ? <div className="text-sm text-muted-foreground/60">—</div> : (
                    <p className="text-sm leading-relaxed">
                      {lines.map((l, i) => <span key={i} onMouseEnter={() => setHover(l.from)} onMouseLeave={() => setHover(null)} className={cn("rounded px-0.5 transition-colors", hover === l.from && "bg-agent-soft")}>{l.text} </span>)}
                    </p>
                  )}
                </div>
              );
            })}
            {step >= total - 1 && !closed && (
              <div className="px-3 py-2.5 space-y-2">
                <div className="text-micro font-semibold uppercase tracking-wider text-muted-foreground">Clôture</div>
                <div className="flex flex-wrap gap-1.5">{script.cloture.codes.map((c) => <Badge key={c.code} tone="outline">{c.libelle}</Badge>)}<Badge tone="muted"><Receipt className="h-2.5 w-2.5" /> {script.cloture.acte} {script.cloture.montant} €{script.cloture.tiersPayant ? " · tiers payant AMO" : ""}</Badge></div>
                <div className="text-micro text-muted-foreground">À la signature : FSE télétransmise, {script.cloture.dmp.join(", ").toLowerCase()} déposés dans Mon Espace Santé, propositions validées exécutées.</div>
                <Button variant="success" onClick={close}><Pen className="h-3.5 w-3.5" /> Signer la note et clôturer ({pending.length} proposition{pending.length > 1 ? "s" : ""})</Button>
              </div>
            )}
            {closed && (
              <div className="px-3 py-3 text-sm">
                <div className="flex items-center gap-2 font-medium text-success"><CheckCircle2 className="h-4 w-4" /> Consultation clôturée</div>
                <ul className="mt-1 space-y-0.5 text-muted-foreground"><li>· Note signée, codée {script.cloture.codes.map((c) => c.libelle).join(" + ") || "—"}</li><li>· FSE {script.cloture.acte} {script.cloture.montant} € télétransmise{script.cloture.tiersPayant ? " (tiers payant AMO)" : ""}</li><li className="flex items-center gap-1"><Database className="h-3 w-3" /> Mon Espace Santé : {script.cloture.dmp.join(", ")}</li><li>· Résumé vivant mis à jour par Locus</li></ul>
              </div>
            )}
          </Card>
        </section>

        <aside>
          <SectionTitle>Pendant la consultation, Locus propose</SectionTitle>
          <div className="space-y-2">
            {generated.length === 0 && existing.length === 0 && <Card className="p-3 text-sm text-muted-foreground">Rien encore.</Card>}
            {[...generated].reverse().map((p) => <ProposalCard key={p.id} proposal={p} compact defaultOpen />)}
            {existing.length > 0 && <div className="pt-2 text-micro font-semibold uppercase tracking-wider text-muted-foreground">Préparé avant la consultation</div>}
            {existing.map((p) => <ProposalCard key={p.id} proposal={p} compact />)}
          </div>
          <div className="mt-3 text-micro text-muted-foreground flex items-center gap-1"><Sparkles className="h-3 w-3 text-agent" /> Capacité « scribe » : projetée dans locus-core (simulée ici). Voir <Link href="/locus" className="text-primary hover:underline">Locus</Link>.</div>
        </aside>
      </div>
    </div>
  );
}

function fmtT(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
