"use client";
import * as React from "react";
import { Send, Sparkles, BookOpen, Loader2, ThumbsUp, ThumbsDown, PlusCircle, Pill } from "lucide-react";
import { readNdjson } from "@/locus/ndjson";
import type { StudioStreamEvent, PublicRetrieve, RetrieveTurn } from "@/locus/contract";
import { Md } from "./md";
import { Badge, Button } from "./ui";
import { useStudio } from "@/store/studio";
import type { Proposal } from "@/domain/types";
import { cn } from "@/lib/cn";

interface Turn {
  question: string;
  steps: string[];
  answer?: string;
  result?: PublicRetrieve;
  error?: string;
  pending: boolean;
}

/**
 * « Demander à Locus » — le fil avec locus-core, contextualisé par le dossier.
 * La question part au BFF avec l'identifiant du patient ; le serveur projette
 * le dossier en `patient_ehr`. Ce que le navigateur reçoit est public : pas
 * de règle (MKU), seulement l'étape, la réponse et les sources.
 */
export function LocusPanel({ patientId, patientNom, suggestions, compact }: { patientId?: string; patientNom?: string; suggestions?: string[]; compact?: boolean }) {
  const [turns, setTurns] = React.useState<Turn[]>([]);
  const [q, setQ] = React.useState("");
  const [mode, setMode] = React.useState<"rapide" | "approfondi">("rapide");
  const busy = turns.some((t) => t.pending);
  const endRef = React.useRef<HTMLDivElement>(null);
  const { dispatch } = useStudio();

  React.useEffect(() => { if (turns.length) endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [turns]);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    setQ("");
    const history: RetrieveTurn[] = turns.filter((t) => t.result).map((t) => ({ question: t.question, answer_short: t.result!.answerShort, precisions: [] }));
    setTurns((ts) => [...ts, { question: text, steps: [], pending: true }]);
    const update = (fn: (t: Turn) => Turn) => setTurns((ts) => ts.map((t, i) => (i === ts.length - 1 ? fn(t) : t)));
    try {
      const res = await fetch("/api/locus/retrieve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: text, patientId, history, mode }) });
      if (!res.ok || !res.body) throw new Error(`BFF ${res.status}`);
      for await (const ev of readNdjson<StudioStreamEvent>(res.body)) {
        if (ev.step === "reflexion") update((t) => ({ ...t, steps: [...t.steps, ev.titre] }));
        else if (ev.step === "progress") update((t) => ({ ...t, steps: [...t.steps, { cadres: "Je pose le cadre", lecture: "Je lis les sources", ambiguites: "Je lève les ambiguïtés", formulation: "Je formule" }[ev.etape] ?? ev.etape] }));
        else if (ev.step === "retrieval") update((t) => ({ ...t, steps: [...t.steps, `${ev.docs} document${ev.docs > 1 ? "s" : ""}, ${ev.chunks} extraits retenus`] }));
        else if (ev.step === "answer") update((t) => ({ ...t, answer: ev.answer }));
        else if (ev.step === "done") update((t) => ({ ...t, result: ev.payload, answer: ev.payload.answer, pending: false }));
        else if (ev.step === "error") update((t) => ({ ...t, error: ev.detail, pending: false }));
      }
      update((t) => (t.pending ? { ...t, pending: false, error: t.error ?? "Flux interrompu." } : t));
    } catch (e) {
      update((t) => ({ ...t, pending: false, error: e instanceof Error ? e.message : String(e) }));
    }
  }

  function proposeAddition(t: Turn) {
    if (!t.result?.ehrAdditions || !patientId) return;
    const p: Proposal = {
      id: `session.proposal.${Date.now()}`, kind: "proposal", patientId, schema: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      provenance: { origin: "agent", actor: "locus", confidence: 0.8 }, status: "propose",
      action: "creer-enregistrement", titre: `Inscrire au dossier : ${t.result.ehrAdditions}`,
      justification: "Fait patient énoncé pendant le dialogue avec Locus (champ `ehr_additions` de locus-core). À inscrire pour qu'il compte dans les prochaines réponses.",
      declencheur: { type: "praticien", libelle: `Question : « ${t.question} »` }, autonomie: 1, etat: "a-valider", agent: "locus", traceId: t.result.traceId || undefined,
    };
    dispatch({ type: "ajouter", proposal: p });
    setTurns((ts) => ts.map((x) => (x === t ? { ...x, result: { ...x.result!, ehrAdditions: "" } } : x)));
  }

  return (
    <div className={cn("flex flex-col", compact ? "h-[520px]" : "h-[calc(100dvh-7rem)] min-h-[480px]")}>
      <div className="flex items-center gap-2 border-b pb-2 mb-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-agent-soft text-agent"><Sparkles className="h-3.5 w-3.5" /></span>
        <div className="text-sm font-medium">Demander à Locus</div>
        {patientNom && <Badge tone="primary">dossier : {patientNom}</Badge>}
        <div className="ml-auto flex rounded-md border p-0.5 text-micro">
          {(["rapide", "approfondi"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={cn("rounded px-2 py-0.5", mode === m ? "bg-muted font-medium" : "text-muted-foreground")}>{m}</button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {turns.length === 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-sm text-muted-foreground">{patientNom ? `Une question clinique sur ${patientNom}. Locus lit le dossier, interroge Locus (HAS, ANSM, SPF, sociétés savantes…) et répond avec les sources.` : "Une question clinique, sans patient : Locus interroge Locus et répond avec les sources."}</p>
            {suggestions && (
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => <button key={s} onClick={() => ask(s)} className="rounded-full border px-2.5 py-1 text-xs hover:bg-muted text-left">{s}</button>)}
              </div>
            )}
          </div>
        )}
        {turns.map((t, i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-end"><div className="max-w-[90%] rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">{t.question}</div></div>
            <div className="rounded-lg border bg-card p-3">
              {t.steps.length > 0 && (
                <ol className="mb-2 space-y-0.5 text-micro text-muted-foreground">
                  {t.steps.map((s, j) => <li key={j} className="flex items-center gap-1.5">{t.pending && j === t.steps.length - 1 ? <Loader2 className="h-3 w-3 animate-spin text-agent" /> : <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />}{s}</li>)}
                </ol>
              )}
              {t.pending && !t.answer && <div className="text-sm text-muted-foreground animate-pulse-soft">Locus réfléchit…</div>}
              {t.error && <div className="rounded bg-destructive/10 px-2 py-1.5 text-xs text-destructive">{t.error}</div>}
              {t.answer && <Md text={t.answer} />}
              {t.result && <Sources r={t.result} />}
              {t.result && (
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t pt-2 text-micro text-muted-foreground">
                  <span>{t.result.via === "locus-core" ? `locus-core ${t.result.coreVersion}` : "simulation (pas de locus-core configuré)"}</span>
                  {t.result.traceId && <span className="font-mono">{t.result.traceId}</span>}
                  <span className="ml-auto flex gap-1">
                    <button className="rounded p-1 hover:bg-muted" title="Utile"><ThumbsUp className="h-3 w-3" /></button>
                    <button className="rounded p-1 hover:bg-muted" title="Pas utile"><ThumbsDown className="h-3 w-3" /></button>
                  </span>
                  {t.result.ehrAdditions && patientId && (
                    <Button size="sm" variant="agent" onClick={() => proposeAddition(t)}><PlusCircle className="h-3 w-3" /> Inscrire : « {t.result.ehrAdditions} »</Button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="mt-2 flex items-end gap-2 rounded-lg border bg-card p-1.5 focus-within:ring-2 focus-within:ring-ring/40">
        <textarea value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(q); } }} rows={1} placeholder={patientNom ? `Une question sur ${patientNom}…` : "Une question clinique…"} className="max-h-32 min-h-[2.25rem] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none" />
        <Button type="submit" size="icon" variant="agent" disabled={busy || !q.trim()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
      </form>
    </div>
  );
}

function Sources({ r }: { r: PublicRetrieve }) {
  const [open, setOpen] = React.useState(false);
  const n = r.docs.length + r.rcp.length;
  if (!n) return null;
  return (
    <div className="mt-2 text-micro">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1 text-muted-foreground hover:text-foreground"><BookOpen className="h-3 w-3" /> {n} source{n > 1 ? "s" : ""} {open ? "▴" : "▾"}</button>
      {open && (
        <div className="mt-1.5 space-y-1">
          {r.docs.map((d, i) => (
            <div key={d.id} className="flex gap-1.5"><span className="font-mono text-primary">[{i + 1}]</span><span>{d.url ? <a href={d.url} target="_blank" rel="noreferrer" className="hover:underline">{d.title ?? d.id}</a> : d.title ?? d.id}{d.source_name ? ` — ${d.source_name}` : ""}{d.year ? `, ${d.year}` : ""}</span></div>
          ))}
          {r.rcp.map((x) => (
            <div key={x.id} className="flex gap-1.5"><Pill className="mt-0.5 h-3 w-3 text-primary" /><span><span className="font-medium">{x.specialite ?? x.dci}</span> — RCP {x.code} {x.label}{x.excerpt ? ` : « ${x.excerpt.slice(0, 160)}… »` : ""}</span></div>
          ))}
        </div>
      )}
    </div>
  );
}
