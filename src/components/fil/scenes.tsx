"use client";
import * as React from "react";
import { Sparkles, Check, X, Pen, Loader2, BookOpen, ShieldCheck, Lock, Clock, AlertCircle, Pill, Mail, ClipboardList, Database, Receipt, CalendarClock } from "lucide-react";
import type { WorldPatient, Scene, FilEntry, Consigne, Mesure } from "@/fil/types";
import type { Routine } from "@/data/routines";
import type { Proposal, Draft, Prescription, Letter, SickLeave, Message } from "@/domain/types";
import { Avatar, Badge, Button, Card, SectionTitle } from "../ui";
import { Md } from "../md";
import { PrescriptionPreview, LetterPreview, SickLeavePreview, MessagePreview, Refs, ACTION_META, AUTONOMY_LABEL } from "../proposal-card";
import { readNdjson } from "@/locus/ndjson";
import type { StudioStreamEvent, PublicRetrieve } from "@/locus/contract";
import { fmtDate, fmtDateShort, fmtTime, fmtRelative, initials } from "@/lib/format";
import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ */
/* Matinée                                                              */
/* ------------------------------------------------------------------ */

export function SceneMatinee({ patients, etatDe, onPatient, onObjet }: { patients: WorldPatient[]; etatDe: (p: Proposal) => Proposal["etat"]; onPatient: (id: string) => void; onObjet: (patientId: string, p: Proposal) => void }) {
  const rows = patients.filter((p) => p.appointment).map((p) => ({ p, pending: p.proposals.filter((x) => etatDe(x) === "a-valider") })).sort((a, b) => b.pending.length - a.pending.length || a.p.appointment!.debut.localeCompare(b.p.appointment!.debut));
  return (
    <div className="space-y-3">
      <Header titre="Votre matinée" sous="Dans l'ordre des décisions, pas des heures. Chaque bloc porte ce qui est prêt à signer." />
      {rows.map(({ p, pending }) => (
        <Card key={p.id} className={cn("p-3", pending.length === 0 && "opacity-70")}>
          <div className="flex items-start gap-3">
            <Avatar hue={p.hue} initials={initials(p.prenom, p.nomUsage)} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><button onClick={() => onPatient(p.id)} className="font-semibold hover:underline">{p.nom}</button><span className="font-mono text-micro text-muted-foreground">{fmtTime(p.appointment!.debut)}</span><span className="text-micro text-muted-foreground">· {p.appointment!.motif}</span></div>
              {p.briefing ? <p className="mt-1 text-sm text-foreground/85">{p.briefing.synthese}</p> : <p className="mt-1 text-sm text-muted-foreground">Rien de nouveau depuis la dernière fois.</p>}
              {pending.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {pending.map((x) => { const Icon = ACTION_META[x.action].icon; return <li key={x.id}><button onClick={() => onObjet(p.id, x)} className="flex w-full items-center gap-2 rounded-md bg-agent-soft/50 px-2 py-1 text-left text-sm hover:bg-agent-soft"><Icon className="h-3.5 w-3.5 text-agent" /><span className="min-w-0 flex-1 truncate">{x.titre}</span>{(x.action === "ordonnance" || x.action === "arret-travail") && <Lock className="h-3 w-3 text-muted-foreground" />}</button></li>; })}
                </ul>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* État d'un patient                                                    */
/* ------------------------------------------------------------------ */

export function ScenePatient({ p, etatDe, onObjet, onCourbe, onConsult }: { p: WorldPatient; etatDe: (x: Proposal) => Proposal["etat"]; onObjet: (p: Proposal) => void; onCourbe: (m: Mesure) => void; onConsult: () => void }) {
  const pending = p.proposals.filter((x) => etatDe(x) === "a-valider");
  const mesures = (Object.keys(p.series) as Mesure[]).filter((k) => (p.series[k]?.length ?? 0) >= 2);
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <Avatar hue={p.hue} initials={initials(p.prenom, p.nomUsage)} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold leading-tight">{p.nom} <span className="text-base font-normal text-muted-foreground">{p.age} ans · {p.sexe}</span></h2>
          <p className="text-sm text-muted-foreground">{p.ligne}</p>
        </div>
        <Button size="sm" variant="agent" onClick={onConsult}>Consultation</Button>
      </div>
      <Card agent className="p-3 text-sm">
        <SectionTitle>Où elle en est</SectionTitle>
        {p.synthese && <p className="text-foreground/85">{p.synthese}</p>}
        {p.enCeMoment.length > 0 && <ul className="mt-2 space-y-0.5">{p.enCeMoment.map((x, i) => <li key={i} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-agent" />{x}</li>)}</ul>}
      </Card>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Card className="p-3"><SectionTitle>Problèmes</SectionTitle><ul className="space-y-0.5">{p.problems.filter((x) => x.chronique).map((x, i) => <li key={i}>{x.libelle}</li>)}</ul>{p.allergies.length > 0 && <div className="mt-2 text-xs text-destructive">Allergies : {p.allergies.join(", ")}</div>}</Card>
        <Card className="p-3"><SectionTitle>Traitement</SectionTitle><ul className="space-y-0.5">{p.meds.map((m, i) => <li key={i}><span className="font-medium">{m.dci}</span> {m.dosage}<span className="block text-micro text-muted-foreground">{m.posologie}</span></li>)}</ul></Card>
      </div>
      {mesures.length > 0 && <div className="flex flex-wrap gap-1.5">{mesures.map((m) => <button key={m} onClick={() => onCourbe(m)} className="rounded-full border px-2.5 py-1 text-xs hover:bg-muted">courbe {LABEL[m]}</button>)}</div>}
      {pending.length > 0 && (
        <div>
          <SectionTitle>Prêt à signer — {pending.length}</SectionTitle>
          <ul className="space-y-1">{pending.map((x) => { const Icon = ACTION_META[x.action].icon; return <li key={x.id}><button onClick={() => onObjet(x)} className="flex w-full items-center gap-2 rounded-md bg-agent-soft/50 px-2 py-1.5 text-left text-sm hover:bg-agent-soft"><Icon className="h-3.5 w-3.5 text-agent" /><span className="min-w-0 flex-1">{x.titre}</span></button></li>; })}</ul>
        </div>
      )}
      <details className="text-micro text-muted-foreground"><summary className="cursor-pointer">Ce que Locus voit (patient_ehr)</summary><pre className="mt-1 whitespace-pre-wrap rounded bg-muted/60 p-2 font-mono">{p.ehr}</pre></details>
    </div>
  );
}

const LABEL: Record<Mesure, string> = { dfg: "DFG", ta: "tension", hba1c: "HbA1c", poids: "poids", ldl: "LDL" };
const UNIT: Record<Mesure, string> = { dfg: "mL/min", ta: "mmHg", hba1c: "%", poids: "kg", ldl: "g/L" };
const SEUIL: Partial<Record<Mesure, { v: number; label: string }>> = { dfg: { v: 60, label: "60 : seuil de la MRC" }, ta: { v: 140, label: "140 : cible systolique" }, hba1c: { v: 7, label: "7 % : cible" }, ldl: { v: 0.7, label: "0,7 : cible haut risque" } };

/* ------------------------------------------------------------------ */
/* Courbe                                                               */
/* ------------------------------------------------------------------ */

export function SceneCourbe({ p, mesure, lecture }: { p: WorldPatient; mesure: Mesure; lecture: string }) {
  const pts = p.series[mesure] ?? [];
  const [hover, setHover] = React.useState<number | null>(null);
  if (pts.length < 2) return <div className="space-y-3"><Header titre={`${LABEL[mesure]} — ${p.nom}`} /><Card className="p-4 text-sm text-muted-foreground">Pas assez de mesures pour une courbe ({pts.length}).</Card></div>;
  const W = 560, H = 220, mL = 44, mR = 16, mT = 16, mB = 28;
  const xs = pts.map((x) => new Date(x.date).getTime());
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const vals = pts.map((x) => x.valeur);
  const seuil = SEUIL[mesure];
  const lo = Math.min(...vals, seuil?.v ?? Infinity) , hi = Math.max(...vals, seuil?.v ?? -Infinity);
  const pad = (hi - lo) * 0.2 || 1;
  const y0 = lo - pad, y1 = hi + pad;
  const X = (t: number) => mL + ((t - x0) / Math.max(1, x1 - x0)) * (W - mL - mR);
  const Y = (v: number) => mT + (1 - (v - y0) / (y1 - y0)) * (H - mT - mB);
  const path = pts.map((x, i) => `${i ? "L" : "M"}${X(new Date(x.date).getTime()).toFixed(1)},${Y(x.valeur).toFixed(1)}`).join(" ");
  const jalons = p.jalons.filter((j) => { const t = new Date(j.date).getTime(); return t >= x0 && t <= x1; });
  const ticks = [y0 + pad, (y0 + y1) / 2, y1 - pad].map((v) => Math.round(v * 10) / 10);
  const h = hover !== null ? pts[hover] : null;
  return (
    <div className="space-y-3">
      <Header titre={`${LABEL[mesure]} — ${p.nom}`} sous={`${pts.length} mesures, de ${fmtDateShort(pts[0].date)} ${pts[0].date.slice(0, 4)} à ${fmtDateShort(pts[pts.length - 1].date)} ${pts[pts.length - 1].date.slice(0, 4)}. Les traits verticaux sont les décisions qui ont jalonné la courbe.`} />
      <Card className="p-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseLeave={() => setHover(null)}>
          {ticks.map((v) => <g key={v}><line x1={mL} x2={W - mR} y1={Y(v)} y2={Y(v)} stroke="var(--border)" strokeWidth="1" /><text x={mL - 6} y={Y(v) + 3} textAnchor="end" fontSize="10" fill="var(--muted-foreground)">{v}</text></g>)}
          {seuil && <g><line x1={mL} x2={W - mR} y1={Y(seuil.v)} y2={Y(seuil.v)} stroke="var(--warning)" strokeDasharray="4 3" strokeWidth="1" /><text x={W - mR} y={Y(seuil.v) - 4} textAnchor="end" fontSize="10" fill="var(--warning)">{seuil.label}</text></g>}
          {jalons.map((j, i) => { const x = X(new Date(j.date).getTime()); return <g key={i}><line x1={x} x2={x} y1={mT} y2={H - mB} stroke="var(--agent)" strokeDasharray="2 3" strokeWidth="1" /><text x={x + 3} y={mT + 10 + (i % 2) * 11} fontSize="9" fill="var(--agent)">{j.libelle}</text></g>; })}
          <path d={path} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" />
          {pts.map((x, i) => { const cx = X(new Date(x.date).getTime()), cy = Y(x.valeur); return <g key={i}><circle cx={cx} cy={cy} r={hover === i ? 5 : 4} fill="var(--primary)" stroke="var(--card)" strokeWidth="2" /><rect x={cx - 12} y={mT} width={24} height={H - mT - mB} fill="transparent" onMouseEnter={() => setHover(i)} /></g>; })}
          {[0, pts.length - 1].map((i) => <text key={i} x={X(new Date(pts[i].date).getTime())} y={H - 8} textAnchor={i === 0 ? "start" : "end"} fontSize="10" fill="var(--muted-foreground)">{fmtDateShort(pts[i].date)} {pts[i].date.slice(0, 4)}</text>)}
          {h && <g><rect x={Math.min(W - 150, X(new Date(h.date).getTime()) + 8)} y={mT} width={142} height={34} rx={6} fill="var(--popover)" stroke="var(--border)" /><text x={Math.min(W - 150, X(new Date(h.date).getTime()) + 8) + 8} y={mT + 14} fontSize="11" fill="var(--foreground)" fontWeight="600">{h.valeur}{h.valeur2 ? `/${h.valeur2}` : ""} {UNIT[mesure]}</text><text x={Math.min(W - 150, X(new Date(h.date).getTime()) + 8) + 8} y={mT + 27} fontSize="10" fill="var(--muted-foreground)">{fmtDate(h.date)}</text></g>}
        </svg>
      </Card>
      <Card agent className="p-3 text-sm"><div className="mb-1 flex items-center gap-1.5 text-micro font-semibold uppercase tracking-wider text-agent"><Sparkles className="h-3 w-3" /> Lecture de Locus</div><Md text={lecture} /></Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Table de patientèle                                                  */
/* ------------------------------------------------------------------ */

export function SceneTable({ r, onPatient }: { r: Routine; onPatient: (id: string) => void }) {
  const cibles = r.resultats.filter((x) => x.cible);
  return (
    <div className="space-y-3">
      <Header titre={r.nom} sous={`${cibles.length} patient${cibles.length > 1 ? "s" : ""} ciblé${cibles.length > 1 ? "s" : ""} sur ${r.resultats.length} éligible${r.resultats.length > 1 ? "s" : ""}. Règle : ${r.regle}.`} />
      <Card className="divide-y">
        {cibles.map((x) => <div key={x.id + x.detail} className="flex items-center gap-3 px-3 py-2 text-sm"><button onClick={() => onPatient(x.id)} className="font-medium hover:underline">{x.nom}</button><span className="text-muted-foreground">{x.detail}</span><Badge tone="agent" className="ml-auto">{r.autonomie === 2 ? "fait" : "préparé"} · {r.action.split(" ")[0].toLowerCase()}…</Badge></div>)}
        {cibles.length === 0 && <div className="px-3 py-3 text-sm text-success">Personne en retard.</div>}
      </Card>
      <p className="text-micro text-muted-foreground">Cette vue n'existe pas comme écran : elle est rendue depuis l'état de la patientèle, puis jetée. Routine « {r.quand} », Locus {AUTONOMY_LABEL[r.autonomie]}.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Objet à signer                                                       */
/* ------------------------------------------------------------------ */

export function SceneObjet({ p, proposal, etat, onSign, onReject, onCorrect }: { p: WorldPatient; proposal: Proposal; etat: Proposal["etat"]; onSign: () => void; onReject: () => void; onCorrect: () => void }) {
  const meta = ACTION_META[proposal.action];
  const Icon = meta.icon;
  const verrou = proposal.action === "ordonnance" || proposal.action === "arret-travail";
  const c = proposal.charge as Record<string, unknown> | undefined;
  const isPatch = !!c && typeof c === "object" && "recordId" in c;
  const decided = etat !== "a-valider";
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-agent-soft text-agent"><Icon className="h-4.5 w-4.5" /></span>
        <div className="min-w-0 flex-1">
          <div className="text-micro uppercase tracking-wider text-muted-foreground font-semibold">{meta.label} · {p.nom}</div>
          <h2 className="text-base font-semibold leading-snug">{proposal.titre}</h2>
        </div>
        {verrou && <Badge tone="outline"><Lock className="h-2.5 w-2.5" /> signature</Badge>}
      </div>
      <Card agent className="p-3 text-sm"><Md text={proposal.justification} />{proposal.references && proposal.references.length > 0 && <div className="mt-2"><Refs refs={proposal.references} /></div>}</Card>
      {c && !isPatch && proposal.action === "ordonnance" && <PrescriptionPreview p={c as unknown as Draft<Prescription>} />}
      {c && !isPatch && proposal.action === "courrier" && <LetterPreview l={c as unknown as Draft<Letter>} />}
      {c && !isPatch && proposal.action === "arret-travail" && <SickLeavePreview s={c as unknown as Draft<SickLeave>} />}
      {c && !isPatch && (proposal.action === "message-patient" || proposal.action === "message-confrere") && <MessagePreview m={c as unknown as Draft<Message>} />}
      {isPatch && <Card className="p-3 text-sm text-muted-foreground">Inscription au dossier : {JSON.stringify(c.patch)}</Card>}
      {!decided ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="success" onClick={onSign}>{verrou ? <ShieldCheck className="h-4 w-4" /> : <Check className="h-4 w-4" />} {verrou ? "Signer et envoyer" : proposal.action === "signaler" ? "Vu" : "Valider"}</Button>
          <Button variant="outline" onClick={onCorrect}><Pen className="h-4 w-4" /> Corriger en parlant</Button>
          <Button variant="danger" onClick={onReject}><X className="h-4 w-4" /> Rejeter</Button>
          <span className="ml-auto text-micro text-muted-foreground">Locus {AUTONOMY_LABEL[proposal.autonomie]}</span>
        </div>
      ) : (
        <div className="rounded-md bg-muted/60 px-3 py-2 text-sm text-muted-foreground">{etat === "rejetee" ? "Rejeté. Locus retient la correction." : etat === "executee" ? "Exécuté par Locus." : "Signé. Locus transmet et rend compte dans le fil."}</div>
      )}
      <p className="text-micro text-muted-foreground">Déclencheur : {proposal.declencheur.libelle}{proposal.provenance.confidence !== undefined ? ` · confiance ${Math.round(proposal.provenance.confidence * 100)} %` : ""}. Pour corriger : « plutôt 1 mois », « retire la statine », « ajoute du paracétamol ».</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Locus                                                                */
/* ------------------------------------------------------------------ */

export function SceneLocus({ p, question, nonce, onDone }: { p?: WorldPatient; question: string; nonce: number; onDone: (r: PublicRetrieve) => void }) {
  const [steps, setSteps] = React.useState<string[]>([]);
  const [answer, setAnswer] = React.useState<string>();
  const [result, setResult] = React.useState<PublicRetrieve>();
  const [error, setError] = React.useState<string>();
  const [showSources, setShowSources] = React.useState(false);
  const doneRef = React.useRef(onDone);
  doneRef.current = onDone;
  React.useEffect(() => {
    let alive = true;
    setSteps([]); setAnswer(undefined); setResult(undefined); setError(undefined);
    (async () => {
      try {
        const res = await fetch("/api/locus/retrieve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: question, patientId: p?.id, mode: "rapide" }) });
        if (!res.ok || !res.body) throw new Error(`BFF ${res.status}`);
        for await (const ev of readNdjson<StudioStreamEvent>(res.body)) {
          if (!alive) return;
          if (ev.step === "reflexion") setSteps((s) => [...s, ev.titre]);
          else if (ev.step === "progress") setSteps((s) => [...s, { cadres: "Je pose le cadre", lecture: "Je lis les sources", ambiguites: "Je lève les ambiguïtés", formulation: "Je formule" }[ev.etape] ?? ev.etape]);
          else if (ev.step === "retrieval") setSteps((s) => [...s, `${ev.docs} documents, ${ev.chunks} extraits`]);
          else if (ev.step === "answer") setAnswer(ev.answer);
          else if (ev.step === "done") { setResult(ev.payload); setAnswer(ev.payload.answer); doneRef.current(ev.payload); }
          else if (ev.step === "error") setError(ev.detail);
        }
      } catch (e) { if (alive) setError(e instanceof Error ? e.message : String(e)); }
    })();
    return () => { alive = false; };
  }, [question, nonce, p?.id]);
  const n = (result?.docs.length ?? 0) + (result?.rcp.length ?? 0);
  return (
    <div className="space-y-3">
      <Header titre={question} sous={p ? `Locus répond avec le dossier de ${p.nom} en contexte.` : "Locus répond sans patient en contexte."} />
      <Card className="p-3">
        {steps.length > 0 && !result && <ol className="mb-2 space-y-0.5 text-micro text-muted-foreground">{steps.map((s, i) => <li key={i} className="flex items-center gap-1.5">{i === steps.length - 1 && !answer ? <Loader2 className="h-3 w-3 animate-spin text-agent" /> : <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />}{s}</li>)}</ol>}
        {!answer && !error && <div className="text-sm text-muted-foreground animate-pulse-soft">Locus interroge Locus…</div>}
        {error && <div className="rounded bg-destructive/10 px-2 py-1.5 text-xs text-destructive">{error}</div>}
        {answer && <Md text={answer} onCite={() => setShowSources(true)} />}
        {result && n > 0 && (
          <div className="mt-2 border-t pt-2 text-micro">
            <button onClick={() => setShowSources((v) => !v)} className="flex items-center gap-1 text-muted-foreground hover:text-foreground"><BookOpen className="h-3 w-3" /> {n} source{n > 1 ? "s" : ""} {showSources ? "▴" : "▾"}</button>
            {showSources && <div className="mt-1.5 space-y-1">{result.docs.map((d, i) => <div key={d.id} className="flex gap-1.5"><span className="font-mono text-primary">[{i + 1}]</span><span>{d.url ? <a href={d.url} target="_blank" rel="noreferrer" className="hover:underline">{d.title ?? d.id}</a> : d.title ?? d.id}{d.source_name ? ` — ${d.source_name}` : ""}{d.year ? `, ${d.year}` : ""}</span></div>)}{result.rcp.map((x) => <div key={x.id} className="flex gap-1.5"><Pill className="mt-0.5 h-3 w-3 text-primary" /><span><span className="font-medium">{x.specialite ?? x.dci}</span> — RCP {x.code} {x.label}</span></div>)}</div>}
          </div>
        )}
        {result && <div className="mt-2 text-micro text-muted-foreground">{result.via === "locus-core" ? `locus-core ${result.coreVersion}` : "simulation (pas de locus-core configuré)"}{result.traceId ? ` · ${result.traceId}` : ""}</div>}
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Reçu de clôture                                                      */
/* ------------------------------------------------------------------ */

export function SceneRecu({ p, lignes }: { p: WorldPatient; lignes: string[] }) {
  const icons = [Pen, Receipt, Pill, Mail, Database, CalendarClock, ClipboardList];
  return (
    <div className="space-y-3">
      <Header titre={`Consultation clôturée — ${p.nom}`} sous="Un geste. Tout ce qui suit est parti ou est en train de partir ; le fil le montre." />
      <Card className="divide-y">{lignes.map((l, i) => { const Icon = icons[i % icons.length]; return <div key={i} className="flex items-center gap-3 px-3 py-2 text-sm"><Icon className="h-4 w-4 text-success" />{l}</div>; })}</Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sessions, consignes, aide                                            */
/* ------------------------------------------------------------------ */

export function SceneSessions({ entries, patients, onPatient }: { entries: FilEntry[]; patients: Record<string, WorldPatient>; onPatient: (id: string) => void }) {
  const sessions = entries.filter((e) => e.who === "session").sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const counts = { fait: 0, "en-cours": 0, attente: 0, echec: 0 } as Record<string, number>;
  for (const s of sessions) counts[s.session?.etat ?? "fait"]++;
  return (
    <div className="space-y-3">
      <Header titre="Ce que Locus a fait" sous={`${counts.fait} fait${counts.fait > 1 ? "s" : ""}, ${counts["en-cours"]} en cours, ${counts.attente} en attente${counts.echec ? `, ${counts.echec} en échec` : ""}. Chaque ligne a son déclencheur et son état ; rien n'est caché.`} />
      <Card className="divide-y">
        {sessions.map((s) => { const st = s.session?.etat ?? "fait"; const Icon = st === "en-cours" ? Loader2 : st === "attente" ? Clock : st === "echec" ? AlertCircle : Check; const p = s.patientId ? patients[s.patientId] : undefined; return <div key={s.id} className="flex items-center gap-3 px-3 py-2 text-sm"><Icon className={cn("h-4 w-4", st === "en-cours" && "animate-spin text-agent", st === "attente" && "text-warning", st === "echec" && "text-destructive", st === "fait" && "text-success")} /><span className="font-mono text-micro text-muted-foreground">{fmtTime(s.at)}</span><span className="min-w-0 flex-1">{s.titre}</span>{p && <button onClick={() => onPatient(p.id)} className="text-micro text-primary hover:underline">{p.nom}</button>}</div>; })}
        {sessions.length === 0 && <div className="px-3 py-3 text-sm text-muted-foreground">Rien encore.</div>}
      </Card>
    </div>
  );
}

export function SceneConsignes({ consignes }: { consignes: Consigne[] }) {
  return (
    <div className="space-y-3">
      <Header titre="Les consignes du cabinet" sous="Écrites en phrases, versionnées, appliquées par Locus dès la proposition suivante. Un message entrant ne peut jamais en créer une." />
      {consignes.length === 0 ? <Card className="p-4 text-sm text-muted-foreground">Aucune consigne encore. Essayez : « consigne : chez les plus de 75 ans, propose toujours la consultation longue une fois par an ».</Card> : (
        <Card className="divide-y">{consignes.map((c) => <div key={c.id} className="px-3 py-2 text-sm"><div className="font-medium">{c.texte}</div><div className="mt-0.5 text-micro text-muted-foreground">{fmtRelative(c.at)} · {c.lecture}</div></div>)}</Card>
      )}
    </div>
  );
}

export function SceneAide() {
  const lignes: [string, string][] = [
    ["ma matinée", "l'ordre des décisions"],
    ["Delacroix", "l'état d'une patiente, et un focus sur le fil"],
    ["@Delacroix où en est son rein", "une courbe avec les décisions"],
    ["signe l'ordonnance", "l'objet préparé, à signer"],
    ["plutôt 1 mois", "corriger l'objet ouvert en parlant"],
    ["consultation Delacroix", "l'écoute ambiante jouée, la note qui s'écrit"],
    ["clôture", "codage, FSE, DMP, ordonnances, rendez-vous : un geste"],
    ["mes diabétiques en retard", "une table de patientèle, avec l'action prête"],
    ["qu'est-ce que Locus a fait ce matin", "les sessions, avec leur état"],
    ["consigne : …", "programmer le cabinet en une phrase"],
    ["appelle le labo pour la sérologie de Moreau", "une tâche de fond, visible"],
    ["Metformine et DFG à 48 : que faire ?", "Locus répond avec les sources"],
    ["stop", "Locus s'arrête. « reprends » le relance"],
  ];
  return (
    <div className="space-y-3">
      <Header titre="Il n'y a plus de pages." sous="Il y a le fil, et une commande. Dites un nom, une question, une action, une consigne. ⌘K pour écrire, le micro pour dicter (simulé)." />
      <Card className="divide-y">{lignes.map(([a, b]) => <div key={a} className="flex items-baseline gap-3 px-3 py-1.5 text-sm"><code className="shrink-0 rounded bg-muted px-1.5 font-mono text-xs">{a}</code><span className="text-muted-foreground">{b}</span></div>)}</Card>
      <p className="text-micro text-muted-foreground">Les anciens écrans (journée, réception, dossier à colonnes) restent accessibles en bas de page, en « vues héritées », pour la comparaison.</p>
    </div>
  );
}

export function Header({ titre, sous }: { titre: string; sous?: string }) {
  return <div><h2 className="text-lg font-semibold leading-tight">{titre}</h2>{sous && <p className="mt-0.5 text-sm text-muted-foreground">{sous}</p>}</div>;
}
