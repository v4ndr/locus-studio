"use client";
import * as React from "react";
import Link from "next/link";
import { Sparkles, FlaskConical, FileText, MessageSquare, Stethoscope, Pill, ClipboardList, Mail, Syringe, CalendarClock, Eye, EyeOff, Code2, History, AlertTriangle } from "lucide-react";
import type { Dossier, DossierRecord, Problem, Medication, Allergy, Measure, LabReport, ClinicalDocument, Encounter, Prescription, Letter, Message, Vaccination, Screening, CarePlan, Proposal, Briefing, Appointment, SickLeave } from "@/domain/types";
import { PatientHeader } from "./patient-bits";
import { Badge, Button, Card, SectionTitle, Dot } from "./ui";
import { ProposalCard, PrescriptionPreview } from "./proposal-card";
import { LocusPanel } from "./locus-panel";
import { LabTable } from "./inbox";
import { fmtDate, fmtRelative, fmtDue, fmtTime } from "@/lib/format";
import { useStudio } from "@/store/studio";
import { cn } from "@/lib/cn";

function of<K extends DossierRecord["kind"]>(d: Dossier, kind: K) {
  return d.records.filter((r) => r.kind === kind) as unknown as Extract<DossierRecord, { kind: K }>[];
}

export function DossierView({ dossier: d, ehr }: { dossier: Dossier; ehr: string }) {
  const { etatDe, state } = useStudio();
  const p = d.patient;
  const summary = of(d, "summary")[0];
  const proposals = [...state.propositions.filter((x) => x.patientId === p.id), ...of(d, "proposal")];
  const pending = proposals.filter((x) => etatDe(x) === "a-valider");
  const rdv = of(d, "appointment").find((a) => a.debut.startsWith("2026-10-15"));
  const [tab, setTab] = React.useState<"sol" | "ehr">("sol");

  const questions = [
    ...of(d, "problem").filter((x) => x.evolution === "chronique" && x.status === "actif").slice(0, 2).map((x) => `Quel suivi recommandé pour ${x.libelle.toLowerCase()} ?`),
    of(d, "medication").filter((m) => m.status === "actif").length > 1 ? "Y a-t-il une interaction dans son traitement ?" : "Quels vaccins sont dus à son âge ?",
  ];

  return (
    <div className="space-y-4">
      <PatientHeader p={p} ligne={summary?.enUneLigne} right={<>
        {rdv && <Link href={`/patients/${p.id}/consultation`}><Button variant="agent" size="sm"><Stethoscope className="h-3.5 w-3.5" /> Consultation de {fmtTime(rdv.debut)}</Button></Link>}
        {!rdv && <Link href={`/patients/${p.id}/consultation`}><Button variant="outline" size="sm"><Stethoscope className="h-3.5 w-3.5" /> Nouvelle consultation</Button></Link>}
      </>} />

      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_380px]">
        {/* Colonne 1 — l'état du patient */}
        <aside className="space-y-4">
          <SummaryCard summary={summary} changed={summary?.changementsDepuis?.length ?? 0} />
          <Problems problems={of(d, "problem")} />
          <Allergies allergies={of(d, "allergy")} />
          <Treatments meds={of(d, "medication")} />
          <Measures measures={of(d, "measure")} />
          <FollowUp plans={of(d, "care-plan")} screenings={of(d, "screening")} vaccins={of(d, "vaccination")} />
          <Admin p={p} />
        </aside>

        {/* Colonne 2 — le fil */}
        <section className="min-w-0">
          <Timeline d={d} />
        </section>

        {/* Colonne 3 — Sol */}
        <aside className="space-y-3">
          <div className="flex rounded-md border p-0.5 text-xs">
            <button onClick={() => setTab("sol")} className={cn("flex-1 rounded px-2 py-1", tab === "sol" ? "bg-muted font-medium" : "text-muted-foreground")}><Sparkles className="mr-1 inline h-3 w-3" />Sol {pending.length > 0 && <span className="ml-1 rounded-full bg-agent px-1.5 text-micro text-agent-foreground">{pending.length}</span>}</button>
            <button onClick={() => setTab("ehr")} className={cn("flex-1 rounded px-2 py-1", tab === "ehr" ? "bg-muted font-medium" : "text-muted-foreground")}><Code2 className="mr-1 inline h-3 w-3" />Ce que Locus voit</button>
          </div>
          {tab === "sol" ? (
            <>
              {proposals.length > 0 && (
                <div>
                  <SectionTitle>Propositions — {pending.length} à trancher</SectionTitle>
                  <div className="space-y-2">{proposals.slice(0, 8).map((x) => <ProposalCard key={x.id} proposal={x} compact defaultOpen={etatDe(x) === "a-valider"} />)}</div>
                </div>
              )}
              <Card className="p-3"><LocusPanel patientId={p.id} patientNom={`${p.prenomUsuel} ${p.nomUsage}`} suggestions={questions} compact /></Card>
            </>
          ) : (
            <Card className="p-3">
              <div className="text-micro text-muted-foreground mb-2">La projection du dossier envoyée à locus-core comme <code className="font-mono">patient_ehr</code> — construite depuis les enregistrements structurés, jamais saisie. C'est ce que l'agent « sait » du patient quand il répond.</div>
              <pre className="whitespace-pre-wrap rounded-md bg-muted/60 p-3 font-mono text-micro leading-relaxed">{ehr}</pre>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

function SummaryCard({ summary, changed }: { summary?: Extract<DossierRecord, { kind: "summary" }>; changed: number }) {
  if (!summary) return null;
  return (
    <Card agent className="p-3">
      <SectionTitle right={changed > 0 ? <Badge tone="agent">{changed} changement{changed > 1 ? "s" : ""} depuis votre validation</Badge> : <Badge tone="success">validé</Badge>}>Résumé vivant</SectionTitle>
      <p className="text-sm leading-relaxed">{summary.synthese}</p>
      {summary.enCeMoment.length > 0 && (
        <div className="mt-2">
          <div className="text-micro font-semibold uppercase tracking-wider text-agent">En ce moment</div>
          <ul className="mt-1 space-y-0.5 text-sm">{summary.enCeMoment.map((x, i) => <li key={i} className="flex gap-2"><Dot tone="agent" /><span className="-mt-0.5">{x}</span></li>)}</ul>
        </div>
      )}
      <div className="mt-2 text-micro text-muted-foreground">Tenu par Sol · validé {summary.derniereValidation ? fmtRelative(summary.derniereValidation) : "jamais"}</div>
    </Card>
  );
}

function Problems({ problems }: { problems: Problem[] }) {
  const actifs = problems.filter((x) => x.status === "actif" && x.enAvant);
  const proposes = problems.filter((x) => x.status === "propose");
  const anciens = problems.filter((x) => (x.status === "resolu" || !x.enAvant) && x.status !== "propose");
  const [all, setAll] = React.useState(false);
  const group = (c: Problem["categorie"]) => actifs.filter((x) => x.categorie === c);
  return (
    <Card className="p-3">
      <SectionTitle>Problèmes</SectionTitle>
      <ul className="space-y-1 text-sm">
        {group("medical").concat(group("psycho-social"), group("gyneco-obstetrical")).map((x) => <li key={x.id} className="flex items-start gap-2"><Dot tone={x.evolution === "chronique" ? "primary" : "muted"} /><span className="-mt-0.5"><span>{x.libelle}</span>{x.cim10 && <span className="ml-1.5 font-mono text-micro text-muted-foreground">{x.cim10}</span>}{x.depuis && <span className="ml-1 text-micro text-muted-foreground">depuis {x.depuis.slice(0, 4)}</span>}{x.provenance.origin === "agent" && !x.provenance.validatedBy && <Badge tone="agent" className="ml-1">Sol</Badge>}</span></li>)}
        {proposes.map((x) => <li key={x.id} className="flex items-start gap-2 rounded bg-agent-soft/60 px-1.5 py-0.5"><Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-agent" /><span className="-mt-0.5">{x.libelle} <span className="text-micro text-agent">proposé par Sol</span></span></li>)}
      </ul>
      {(group("chirurgical").length + group("familial").length + group("mode-de-vie").length) > 0 && (
        <div className="mt-2 space-y-1 border-t pt-2 text-xs text-muted-foreground">
          {group("chirurgical").length > 0 && <div><span className="font-medium text-foreground/70">Chirurgie :</span> {group("chirurgical").map((x) => x.libelle).join(" · ")}</div>}
          {group("familial").length > 0 && <div><span className="font-medium text-foreground/70">Famille :</span> {group("familial").map((x) => `${x.libelle}${x.apparente ? ` (${x.apparente})` : ""}`).join(" · ")}</div>}
          {group("mode-de-vie").length > 0 && <div><span className="font-medium text-foreground/70">Mode de vie :</span> {group("mode-de-vie").map((x) => x.libelle).join(" · ")}</div>}
        </div>
      )}
      {anciens.length > 0 && <button onClick={() => setAll((v) => !v)} className="mt-2 text-micro text-muted-foreground hover:text-foreground">{all ? <EyeOff className="inline h-3 w-3" /> : <Eye className="inline h-3 w-3" />} {anciens.length} résolu{anciens.length > 1 ? "s" : ""}</button>}
      {all && <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">{anciens.map((x) => <li key={x.id}>{x.libelle}</li>)}</ul>}
    </Card>
  );
}

function Allergies({ allergies }: { allergies: Allergy[] }) {
  return (
    <Card className={cn("p-3", allergies.length > 0 && "border-destructive/30")}>
      <SectionTitle>Allergies</SectionTitle>
      {allergies.length === 0 ? <div className="text-sm text-muted-foreground">Aucune connue</div> : (
        <ul className="space-y-1 text-sm">{allergies.map((a) => <li key={a.id} className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" /><span><span className="font-medium">{a.substance}</span>{a.reaction && <span className="text-muted-foreground"> — {a.reaction}</span>}<span className="ml-1 text-micro text-muted-foreground">{a.certitude}</span></span></li>)}</ul>
      )}
    </Card>
  );
}

function Treatments({ meds }: { meds: Medication[] }) {
  const actifs = meds.filter((m) => m.status === "actif");
  return (
    <Card className="p-3">
      <SectionTitle>Traitement</SectionTitle>
      {actifs.length === 0 ? <div className="text-sm text-muted-foreground">Aucun</div> : (
        <ul className="space-y-1.5 text-sm">
          {actifs.map((m) => {
            const due = m.dernierRenouvellement && m.dureeRenouvellementJours ? new Date(new Date(m.dernierRenouvellement).getTime() + m.dureeRenouvellementJours * 86_400_000).toISOString().slice(0, 10) : undefined;
            return (
              <li key={m.id}>
                <div className="flex items-baseline gap-1.5"><span className="font-medium">{m.dci}</span>{m.dosage && <span className="text-muted-foreground">{m.dosage}</span>}{m.type === "si-besoin" && <Badge tone="outline">si besoin</Badge>}{m.ald && <Badge tone="primary">ALD</Badge>}</div>
                <div className="text-xs text-muted-foreground">{m.posologie}{m.prescripteur ? ` · ${m.prescripteur}` : ""}</div>
                {(due || m.observance === "partielle" || m.observance === "mauvaise") && <div className="text-micro text-muted-foreground">{due && m.type === "chronique" ? `renouvellement ${fmtDue(due)}` : ""}{m.observance === "partielle" || m.observance === "mauvaise" ? <span className="text-warning"> · observance {m.observance}</span> : ""}</div>}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function Measures({ measures }: { measures: Measure[] }) {
  const last = new Map<string, Measure>();
  for (const m of [...measures].sort((a, b) => a.date.localeCompare(b.date))) last.set(m.type, m);
  const ta = measures.filter((m) => m.type === "ta").sort((a, b) => a.date.localeCompare(b.date)).slice(-8);
  const L = (t: string) => last.get(t);
  return (
    <Card className="p-3">
      <SectionTitle>Mesures</SectionTitle>
      <div className="grid grid-cols-3 gap-2 text-sm">
        {L("ta") && <Stat label="TA" value={`${L("ta")!.valeur}/${L("ta")!.valeur2}`} sub={L("ta")!.contexte === "automesure" || L("ta")!.contexte === "connecte" ? "automesure" : fmtRelative(L("ta")!.date)} warn={(L("ta")!.valeur >= 140 || (L("ta")!.valeur2 ?? 0) >= 90)} />}
        {L("poids") && <Stat label="Poids" value={`${L("poids")!.valeur} kg`} sub={fmtRelative(L("poids")!.date)} />}
        {L("imc") && <Stat label="IMC" value={`${L("imc")!.valeur}`} sub={L("imc")!.valeur >= 30 ? "obésité" : L("imc")!.valeur >= 25 ? "surpoids" : "normal"} warn={L("imc")!.valeur >= 30} />}
        {L("dfg") && <Stat label="DFG" value={`${L("dfg")!.valeur}`} sub="mL/min" warn={L("dfg")!.valeur < 60} />}
        {L("spo2") && <Stat label="SpO₂" value={`${L("spo2")!.valeur} %`} sub={fmtRelative(L("spo2")!.date)} warn={L("spo2")!.valeur < 94} />}
      </div>
      {ta.length >= 3 && <Spark values={ta.map((m) => m.valeur)} label={`TA systolique, ${ta.length} dernières`} />}
    </Card>
  );
}

function Stat({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return <div className="rounded-md bg-muted/60 px-2 py-1.5"><div className="text-micro text-muted-foreground">{label}</div><div className={cn("font-semibold tabular-nums", warn && "text-warning")}>{value}</div>{sub && <div className="text-micro text-muted-foreground truncate">{sub}</div>}</div>;
}

function Spark({ values, label }: { values: number[]; label: string }) {
  const w = 240, h = 36, min = Math.min(...values) - 5, max = Math.max(...values) + 5;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / (max - min)) * h}`).join(" ");
  const y140 = h - ((140 - min) / (max - min)) * h;
  return (
    <div className="mt-2">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-full" preserveAspectRatio="none">
        {y140 > 0 && y140 < h && <line x1="0" x2={w} y1={y140} y2={y140} stroke="var(--warning)" strokeDasharray="3 3" strokeWidth="1" />}
        <polyline points={pts} fill="none" stroke="var(--primary)" strokeWidth="1.5" />
      </svg>
      <div className="text-micro text-muted-foreground">{label} · pointillé : 140</div>
    </div>
  );
}

function FollowUp({ plans, screenings, vaccins }: { plans: CarePlan[]; screenings: Screening[]; vaccins: Vaccination[] }) {
  const dus = plans.flatMap((p) => p.items.filter((i) => i.echeance && i.echeance < "2026-10-15").map((i) => ({ libelle: i.libelle, echeance: i.echeance!, plan: p.libelle })));
  const retards = screenings.filter((s) => s.etat === "en-retard" || s.etat === "a-proposer");
  const rappels = vaccins.filter((v) => v.rappelPrevu && v.rappelPrevu < "2026-10-15");
  if (plans.length === 0 && screenings.length === 0 && vaccins.length === 0) return null;
  return (
    <Card className="p-3">
      <SectionTitle>Suivi & prévention</SectionTitle>
      {dus.length + retards.length + rappels.length === 0 ? <div className="text-sm text-success">Tout est à jour.</div> : (
        <ul className="space-y-1 text-sm">
          {dus.map((x, i) => <li key={`d${i}`} className="flex gap-2"><Dot tone="warning" /><span className="-mt-0.5">{x.libelle} <span className="text-micro text-warning">{fmtDue(x.echeance)}</span></span></li>)}
          {retards.map((s) => <li key={s.id} className="flex gap-2"><Dot tone={s.etat === "en-retard" ? "warning" : "muted"} /><span className="-mt-0.5">{s.libelle} <span className="text-micro text-muted-foreground">{s.etat === "en-retard" ? "en retard" : "à proposer"}</span></span></li>)}
          {rappels.map((v) => <li key={v.id} className="flex gap-2"><Dot tone="warning" /><span className="-mt-0.5">Rappel {v.valences.join("/")} <span className="text-micro text-warning">{fmtDue(v.rappelPrevu!)}</span></span></li>)}
        </ul>
      )}
      {plans.map((p) => (
        <div key={p.id} className="mt-2 border-t pt-2">
          <div className="text-micro font-semibold uppercase tracking-wider text-muted-foreground">{p.libelle}</div>
          <ul className="mt-1 space-y-0.5 text-xs">{p.objectifs.map((o, i) => <li key={i} className="flex justify-between gap-2"><span>{o.libelle} <span className="text-muted-foreground">cible {o.cible}</span></span><span className={cn("font-medium tabular-nums", o.atteint === false ? "text-warning" : "text-success")}>{o.actuel ?? "—"}</span></li>)}</ul>
        </div>
      ))}
      {vaccins.length > 0 && <div className="mt-2 border-t pt-2 text-micro text-muted-foreground">Vaccins : {vaccins.slice(0, 4).map((v) => `${v.valences.join("/")} ${v.date.slice(0, 4)}`).join(" · ")}</div>}
    </Card>
  );
}

function Admin({ p }: { p: Dossier["patient"] }) {
  return (
    <Card className="p-3 text-xs text-muted-foreground space-y-1">
      <SectionTitle>Administratif</SectionTitle>
      <div><span className="text-foreground/70">INS</span> {p.ins.matricule} <span className="font-mono">{p.ins.oid.slice(-1) === "8" ? "NIR" : "NIA"}</span> · né(e) {fmtDate(p.ins.dateNaissance)} à {p.ins.lieuNaissance}</div>
      <div><span className="text-foreground/70">Nom de naissance</span> {p.ins.nomNaissance} {p.ins.prenoms}</div>
      <div><span className="text-foreground/70">Droits</span> {p.couverture.regime}{p.couverture.mutuelle ? ` · ${p.couverture.mutuelle.nom}` : ""} · vérifiés {p.couverture.droitsVerifiesLe ? fmtRelative(p.couverture.droitsVerifiesLe) : "—"}</div>
      <div><span className="text-foreground/70">Médecin traitant</span> {p.couverture.medecinTraitant?.nom ?? "non déclaré"}</div>
      {p.personneConfiance && <div><span className="text-foreground/70">Personne de confiance</span> {p.personneConfiance.nom} ({p.personneConfiance.lien})</div>}
      <div><span className="text-foreground/70">Consentements</span> MES {p.consentement.monEspaceSante ? "oui" : "non"} · DMP {p.consentement.dmpAlimentation ? "oui" : "non"} · Sol peut écrire au patient : {p.consentement.messagerieAgent}</div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Le fil                                                               */
/* ------------------------------------------------------------------ */

type Item = { id: string; at: string; kind: string; node: React.ReactNode; origin: DossierRecord["provenance"]["origin"] };

const KINDS: { key: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "encounter", label: "Consultations", icon: Stethoscope }, { key: "lab", label: "Biologie", icon: FlaskConical }, { key: "document", label: "Documents", icon: FileText }, { key: "message", label: "Messages", icon: MessageSquare }, { key: "prescription", label: "Ordonnances", icon: Pill }, { key: "letter", label: "Courriers", icon: Mail }, { key: "proposal", label: "Sol", icon: Sparkles },
];

function Timeline({ d }: { d: Dossier }) {
  const [on, setOn] = React.useState<Set<string>>(new Set(KINDS.map((k) => k.key)));
  const items: Item[] = [];
  const push = (r: DossierRecord, at: string, node: React.ReactNode, kind = r.kind) => items.push({ id: r.id, at, kind, node, origin: r.provenance.origin });
  for (const r of d.records) {
    switch (r.kind) {
      case "encounter": push(r, r.date, <EncounterItem e={r} d={d} />); break;
      case "lab": push(r, r.recuLe, <LabItem l={r} />); break;
      case "document": push(r, r.recuLe, <DocItem x={r} />); break;
      case "message": if (r.status !== "propose") push(r, r.date, <MsgItem m={r} />); break;
      case "prescription": push(r, r.date, <RxItem p={r} />); break;
      case "letter": push(r, r.date, <LetterItem l={r} />); break;
      case "sick-leave": push(r, r.du, <SickItem s={r} />, "letter"); break;
      case "proposal": if (r.etat === "executee") push(r, r.createdAt, <ExecItem p={r} />); break;
      case "vaccination": push(r, r.date, <VacItem v={r} />, "encounter"); break;
      case "appointment": if (r.etat === "prevu") push(r, r.debut, <ApptItem a={r} />, "encounter"); break;
      default: break;
    }
  }
  items.sort((a, b) => b.at.localeCompare(a.at));
  const shown = items.filter((i) => on.has(i.kind));
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <History className="h-3.5 w-3.5 text-muted-foreground" />
        {KINDS.map((k) => {
          const n = items.filter((i) => i.kind === k.key).length;
          if (!n) return null;
          const active = on.has(k.key);
          return <button key={k.key} onClick={() => setOn((s) => { const n2 = new Set(s); if (n2.has(k.key)) n2.delete(k.key); else n2.add(k.key); return n2; })} className={cn("flex items-center gap-1 rounded-full border px-2 py-0.5 text-micro", active ? "bg-card" : "bg-muted text-muted-foreground line-through")}><k.icon className="h-3 w-3" />{k.label} {n}</button>;
        })}
        <span className="ml-auto text-micro text-muted-foreground">le plus récent d'abord · provenance : <Dot tone="primary" /> praticien <Dot tone="agent" /> Sol <Dot tone="muted" /> reçu</span>
      </div>
      <ol className="relative space-y-2 border-l pl-4 ml-2">
        {shown.map((i) => (
          <li key={i.id} className="relative">
            <span className={cn("absolute -left-[21px] top-3 h-2.5 w-2.5 rounded-full border-2 border-background", i.origin === "praticien" ? "bg-primary" : i.origin === "agent" ? "bg-agent" : i.origin === "patient" ? "bg-warning" : "bg-muted-foreground/50")} />
            {i.node}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Frame({ icon: Icon, title, at, children, tone, badge }: { icon: React.ComponentType<{ className?: string }>; title: React.ReactNode; at: string; children?: React.ReactNode; tone?: "agent"; badge?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Card agent={tone === "agent"} className="p-3">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-start gap-2 text-left">
        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", tone === "agent" ? "text-agent" : "text-muted-foreground")} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 text-sm"><span className="font-medium">{title}</span>{badge}<span className="ml-auto text-micro text-muted-foreground">{fmtDate(at)}{at.length > 10 ? ` ${fmtTime(at)}` : ""}</span></div>
        </div>
      </button>
      {children && <div className={cn("mt-2 pl-6", !open && "line-clamp-2 text-sm text-muted-foreground")}>{children}</div>}
    </Card>
  );
}

function EncounterItem({ e, d }: { e: Encounter; d: Dossier }) {
  const rx = of(d, "prescription").filter((p) => p.encounterId === e.id);
  return (
    <Frame icon={Stethoscope} title={`${e.type === "visite" ? "Visite" : e.type === "teleconsultation" ? "Téléconsultation" : "Consultation"} — ${e.note.motifs.join(", ")}`} at={e.date} badge={<>{e.codes.map((c) => <Badge key={c.code} tone="outline">{c.libelle}</Badge>)}<Badge tone="muted">{e.actes.map((a) => a.code).join("+")} {e.actes.reduce((s, a) => s + a.montant, 0)} €</Badge></>}>
      <div className="space-y-1.5 text-sm">
        {e.note.histoire && <p><span className="font-medium text-foreground/70">Histoire.</span> {e.note.histoire}</p>}
        {e.note.examen && <p><span className="font-medium text-foreground/70">Examen.</span> {e.note.examen}</p>}
        {e.note.conclusion && <p><span className="font-medium text-foreground/70">Conclusion.</span> {e.note.conclusion}</p>}
        {e.note.conduite && <p><span className="font-medium text-foreground/70">Conduite à tenir.</span> {e.note.conduite}</p>}
        {rx.length > 0 && <div className="text-micro text-muted-foreground">{rx.length} ordonnance{rx.length > 1 ? "s" : ""} · {e.facturation?.mode === "fse" ? `FSE télétransmise${e.facturation.tiersPayant !== "aucun" ? " en tiers payant" : ""}` : ""}</div>}
      </div>
    </Frame>
  );
}
function LabItem({ l }: { l: LabReport }) {
  const abn = l.resultats.filter((r) => r.flag !== "normal");
  return <Frame icon={FlaskConical} title={`Biologie — ${l.laboratoire}`} at={l.recuLe} badge={abn.length ? <Badge tone="warning">{abn.length} hors norme</Badge> : <Badge tone="success">normale</Badge>}><div className="text-sm">{l.lecture && <p className="mb-2 text-foreground/85"><Sparkles className="mr-1 inline h-3 w-3 text-agent" />{l.lecture.resume}</p>}<LabTable lab={l} /></div></Frame>;
}
function DocItem({ x }: { x: ClinicalDocument }) {
  return <Frame icon={FileText} title={x.titre} at={x.recuLe} badge={<Badge tone="muted">{x.canal}</Badge>}><div className="text-sm">{x.lecture && <p className="mb-2 text-foreground/85"><Sparkles className="mr-1 inline h-3 w-3 text-agent" />{x.lecture.resume}</p>}<pre className="whitespace-pre-wrap font-sans text-xs text-muted-foreground">{x.texte}</pre></div></Frame>;
}
function MsgItem({ m }: { m: Message }) {
  return <Frame icon={MessageSquare} title={`${m.de.nom}${m.objet ? ` — ${m.objet}` : ""}`} at={m.date} badge={<Badge tone="muted">{m.canal}</Badge>}><p className="whitespace-pre-wrap text-sm">{m.corps}</p></Frame>;
}
function RxItem({ p }: { p: Prescription }) {
  return <Frame icon={Pill} title={`Ordonnance ${p.type} — ${p.lignes.length} ligne${p.lignes.length > 1 ? "s" : ""}`} at={p.date} badge={p.ordonnanceNumerique ? <Badge tone="success">numérique{p.ordonnanceNumerique.dispenseeLe ? " · dispensée" : ""}</Badge> : undefined}><PrescriptionPreview p={p} /></Frame>;
}
function LetterItem({ l }: { l: Letter }) {
  return <Frame icon={Mail} title={l.titre} at={l.date} badge={l.envoi ? <Badge tone="success">envoyé {l.envoi.canal}</Badge> : <Badge tone="muted">brouillon</Badge>}><p className="whitespace-pre-wrap text-sm">{l.corps}</p></Frame>;
}
function SickItem({ s }: { s: SickLeave }) {
  return <Frame icon={ClipboardList} title={`Arrêt de travail du ${fmtDate(s.du)} au ${fmtDate(s.au)}`} at={s.du} badge={s.teletransmis ? <Badge tone="success">AAT télétransmis</Badge> : undefined} />;
}
function ExecItem({ p }: { p: Proposal }) {
  return <Frame icon={Sparkles} title={p.titre} at={p.createdAt} tone="agent" badge={<Badge tone="agent">fait par Sol</Badge>}><p className="text-sm">{p.justification}</p></Frame>;
}
function VacItem({ v }: { v: Vaccination }) {
  return <Frame icon={Syringe} title={`Vaccin ${v.valences.join(" / ")}${v.nomCommercial ? ` — ${v.nomCommercial}` : ""}`} at={v.date} />;
}
function ApptItem({ a }: { a: Appointment }) {
  return <Frame icon={CalendarClock} title={`Rendez-vous — ${a.motif}`} at={a.debut} badge={a.prisPar === "agent" ? <Badge tone="agent">pris par Sol</Badge> : undefined} />;
}

