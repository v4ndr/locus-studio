"use client";
import * as React from "react";
import { Mic, Play, Pause, Pen, Sparkles, Lock } from "lucide-react";
import type { WorldPatient } from "@/fil/types";
import type { Script } from "@/data/consultations";
import type { Proposal, EncounterNote, TranscriptTurn } from "@/domain/types";
import { Badge, Button, Card } from "../ui";
import { ACTION_META } from "../proposal-card";
import { Header } from "./scenes";
import { cn } from "@/lib/cn";

const SECTIONS: { key: keyof EncounterNote; label: string }[] = [
  { key: "motifs", label: "Motif" }, { key: "histoire", label: "Histoire" }, { key: "examen", label: "Examen" }, { key: "conclusion", label: "Conclusion" }, { key: "conduite", label: "Conduite à tenir" }, { key: "attentesPatient", label: "Ce que la patiente a dit vouloir" },
];

/**
 * La consultation dans la scène : la transcription s'écrit, la note se
 * structure, chaque phrase renvoie à son tour de parole. Les propositions
 * générées remontent au fil (onProposal) ; la clôture se dit au composer.
 */
export function SceneConsultation({ p, script, scripted, generated, etatDe, onProposal, onTurns, onObjet, onCloture }: { p: WorldPatient; script: Script; scripted: boolean; generated: Proposal[]; etatDe: (x: Proposal) => Proposal["etat"]; onProposal: (x: Proposal) => void; onTurns: (t: TranscriptTurn[]) => void; onObjet: (x: Proposal) => void; onCloture: () => void }) {
  const [step, setStep] = React.useState(-1);
  const [playing, setPlaying] = React.useState(false);
  const [hover, setHover] = React.useState<number | null>(null);
  const total = script.steps.length;
  const ended = step >= total - 1;

  React.useEffect(() => {
    if (!playing) return;
    if (step >= total - 1) { setPlaying(false); return; }
    const id = setTimeout(() => setStep((s) => s + 1), 1700);
    return () => clearTimeout(id);
  }, [playing, step, total]);

  React.useEffect(() => {
    if (step < 0) return;
    onTurns(script.steps.slice(0, step + 1).map((s) => s.turn));
    const s = script.steps[step];
    s.proposals?.forEach((x, i) => onProposal({
      id: `live.${p.id}.${step}.${i}`, kind: "proposal", patientId: p.id, schema: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      provenance: { origin: "agent", actor: "locus", confidence: 0.9 }, status: "propose",
      action: x.action, titre: x.titre, justification: x.justification, references: x.references, charge: x.charge,
      declencheur: { type: "encounter", libelle: `Dit à ${fmtT(s.turn.t)} en consultation` }, autonomie: x.autonomie, etat: x.autonomie === 2 ? "executee" : "a-valider", agent: "locus",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const note: Record<string, { text: string; from: number }[]> = {};
  script.steps.slice(0, step + 1).forEach((s, i) => s.note?.forEach((n) => (note[n.section] ??= []).push({ text: n.text, from: i })));
  const live = generated.filter((x) => x.id.startsWith(`live.${p.id}.`));
  const pending = [...live, ...p.proposals].filter((x) => etatDe(x) === "a-valider");

  return (
    <div className="space-y-3">
      <Header titre={`Consultation — ${p.nom}`} sous={script.motif} />
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="agent" onClick={() => { if (ended) return; setPlaying((v) => !v); if (step < 0) setStep(0); }} disabled={ended}>{playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />} {step < 0 ? "Écouter (consentement oral tracé)" : playing ? "Pause" : ended ? "Terminée" : "Reprendre"}</Button>
        {playing && <span className="flex items-center gap-1 text-micro text-agent"><Mic className="h-3 w-3" /> Locus écoute et écrit</span>}
        {!scripted && <Badge tone="outline">non scriptée dans le jeu de données</Badge>}
        {ended && <Button size="sm" variant="success" onClick={onCloture}><Pen className="h-3.5 w-3.5" /> Clôturer ({pending.length} à signer)</Button>}
        <span className="ml-auto font-mono text-micro text-muted-foreground">{step >= 0 ? fmtT(script.steps[step].turn.t) : "00:00"}</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="max-h-[52vh] overflow-y-auto p-2">
          {step < 0 ? <div className="p-2 text-sm text-muted-foreground">{p.briefing ? <><span className="font-medium text-foreground">Le brief de Locus.</span> {p.briefing.synthese}<ul className="mt-2 space-y-0.5">{p.briefing.questions.map((q, i) => <li key={i}>· {q}</li>)}</ul></> : "Appuyez sur Écouter."}</div> : (
            <ol className="space-y-1">{script.steps.slice(0, step + 1).map((s, i) => <li key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className={cn("rounded-md px-2 py-1.5 text-sm", s.turn.qui === "medecin" ? "bg-accent/50" : s.turn.qui === "patient" ? "bg-muted/50" : "bg-warning/10", hover === i && "ring-2 ring-agent/50")}><span className="mr-1.5 font-mono text-micro text-muted-foreground">{fmtT(s.turn.t)}</span>{s.turn.texte}</li>)}</ol>
          )}
        </Card>
        <Card agent={playing} className="max-h-[52vh] divide-y overflow-y-auto">
          {SECTIONS.map((sec) => { const lines = note[sec.key] ?? []; return <div key={sec.key} className="px-3 py-2"><div className="text-micro font-semibold uppercase tracking-wider text-muted-foreground">{sec.label}</div>{lines.length === 0 ? <div className="text-sm text-muted-foreground/60">—</div> : <p className="text-sm leading-relaxed">{lines.map((l, i) => <span key={i} onMouseEnter={() => setHover(l.from)} onMouseLeave={() => setHover(null)} className={cn("rounded px-0.5", hover === l.from && "bg-agent-soft")}>{l.text} </span>)}</p>}</div>; })}
        </Card>
      </div>
      {pending.length > 0 && (
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-micro font-semibold uppercase tracking-wider text-agent"><Sparkles className="h-3 w-3" /> Locus propose — {pending.length}</div>
          <ul className="space-y-1">{pending.map((x) => { const Icon = ACTION_META[x.action].icon; return <li key={x.id}><button onClick={() => onObjet(x)} className="flex w-full items-center gap-2 rounded-md bg-agent-soft/50 px-2 py-1.5 text-left text-sm hover:bg-agent-soft"><Icon className="h-3.5 w-3.5 text-agent" /><span className="min-w-0 flex-1">{x.titre}</span>{(x.action === "ordonnance" || x.action === "arret-travail") && <Lock className="h-3 w-3 text-muted-foreground" />}</button></li>; })}</ul>
        </div>
      )}
      <p className="text-micro text-muted-foreground">Survoler une phrase de la note montre le tour de parole dont elle vient. Pour corriger : « plutôt 1 mois pour le bisoprolol ». Pour finir : « clôture ».</p>
    </div>
  );
}

function fmtT(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
