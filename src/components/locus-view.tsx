"use client";
import * as React from "react";
import { Cpu, CheckCircle2, Layers, FlaskConical, Calculator } from "lucide-react";
import type { Capability } from "@/locus/capabilities";
import { Badge, Card, SectionTitle, Button } from "./ui";
import { LocusPanel } from "./locus-panel";
import { cn } from "@/lib/cn";
import type { LogicComputeResponse } from "@/locus/contract";

export function LocusView({ capabilities, mode, url, patients }: { capabilities: Capability[]; mode: string; url: string | null; patients: { id: string; nom: string }[] }) {
  const [status, setStatus] = React.useState<{ health?: { status?: string; checks?: Record<string, boolean> } | null; sources?: { id: string; name?: string; docs: number }[] } | null>(null);
  const [pid, setPid] = React.useState<string>("");
  React.useEffect(() => { fetch("/api/locus/status").then((r) => r.json()).then(setStatus).catch(() => {}); }, []);
  const tone = (s: Capability["statut"]) => (s === "live" ? "success" : s === "compose" ? "primary" : "agent");
  const label = (s: Capability["statut"]) => (s === "live" ? "servie par core" : s === "compose" ? "composée dans le studio" : "projetée — à porter dans core");
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Cpu className="h-5 w-5 text-primary" /> locus-core, le backend</h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-3xl">Le studio est le bac à sable de <code className="font-mono">locus-core</code> : tout ce que l'agent Locus fait passe par locus-core — ce que core sert aujourd'hui, et ce qu'on construit ici avant qu'il le serve. Chaque capacité dit honnêtement d'où elle vient.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <SectionTitle>Mode</SectionTitle>
          <div className="flex items-center gap-2 text-sm"><span className={cn("h-2.5 w-2.5 rounded-full", mode === "core" ? "bg-success" : mode === "keyless" ? "bg-warning" : "bg-muted-foreground/50")} /> <span className="font-medium">{mode === "core" ? "locus-core (clé lsk_)" : mode === "keyless" ? "locus-core en Sandbox (keyless)" : "simulation locale"}</span></div>
          <div className="mt-1 text-micro text-muted-foreground font-mono">{url ?? "LOCUS_CORE_URL non défini"}</div>
          {status?.health && <div className="mt-2 text-micro text-muted-foreground">/health : {String(status.health.status)} {status.health.checks && `· store ${status.health.checks.store ? "✓" : "✗"} · graph ${status.health.checks.graph ? "✓" : "✗"}`}</div>}
          {mode === "simulation" && <p className="mt-2 text-micro text-muted-foreground">Renseigner <code className="font-mono">LOCUS_CORE_URL</code> dans <code className="font-mono">.env.local</code> pour brancher le vrai retrieving.</p>}
        </Card>
        <Card className="p-4">
          <SectionTitle>Sources ouvertes</SectionTitle>
          <div className="flex flex-wrap gap-1.5">{(status?.sources ?? []).map((s) => <Badge key={s.id} tone="outline">{s.id}{s.docs ? ` · ${s.docs}` : ""}</Badge>)}</div>
          <p className="mt-2 text-micro text-muted-foreground"><code className="font-mono">GET /v2/sources</code> — les éditeurs sur lesquels une question peut être restreinte.</p>
        </Card>
        <Card className="p-4">
          <SectionTitle>Le contrat</SectionTitle>
          <ul className="text-micro text-muted-foreground space-y-0.5 font-mono">
            <li>POST /v2/retrieve/stream</li><li>GET /v2/drugs/specialites/{"{cis}"}</li><li>GET /v2/drugs/rubrics/{"{id}"}</li><li>POST /v2/logic/compute</li><li>POST /v2/feedback</li>
          </ul>
          <p className="mt-2 text-micro text-muted-foreground">Le studio projette le dossier en <code className="font-mono">patient_ehr</code> et retire les règles (MKU) avant le navigateur. Voir <code className="font-mono">docs/integration-locus.md</code>.</p>
        </Card>
      </div>

      <section>
        <SectionTitle><Layers className="inline h-3 w-3" /> Les capacités de l'agent — {capabilities.filter((c) => c.statut === "live").length} servies, {capabilities.filter((c) => c.statut === "compose").length} composées, {capabilities.filter((c) => c.statut === "projetee").length} projetées</SectionTitle>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {capabilities.map((c) => (
            <Card key={c.id} className={cn("p-3", c.statut === "projetee" && "border-dashed")}>
              <div className="flex items-center gap-2"><span className="text-sm font-medium">{c.nom}</span><Badge tone={tone(c.statut)} className="ml-auto">{label(c.statut)}</Badge></div>
              <p className="mt-1 text-sm text-foreground/85">{c.quoi}</p>
              <p className="mt-1.5 text-micro text-muted-foreground">{c.comment}</p>
              <div className="mt-1.5 font-mono text-micro text-primary">{c.route}</div>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="p-3">
          <div className="mb-2 flex items-center gap-2 text-micro text-muted-foreground"><FlaskConical className="h-3 w-3" /> Bac à sable : une question, avec ou sans dossier.
            <select value={pid} onChange={(e) => setPid(e.target.value)} className="ml-auto rounded-md border bg-background px-2 py-1 text-xs"><option value="">— sans patient —</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}</select>
          </div>
          <LocusPanel key={pid} patientId={pid || undefined} patientNom={patients.find((p) => p.id === pid)?.nom} suggestions={["Cystite simple chez la femme : traitement de première intention ?", "Angine de l'enfant : quand faire un TROD ?", "Metformine et DFG à 48 : que faire ?", "FA : qui anticoaguler ?"]} compact />
        </Card>
        <LogicCard />
      </section>
    </div>
  );
}

function LogicCard() {
  const items = [["ic", "Insuffisance cardiaque", 1], ["hta", "HTA", 1], ["age75", "Âge ≥ 75", 2], ["diabete", "Diabète", 1], ["avc", "AVC / AIT", 2], ["vasculaire", "Maladie vasculaire", 1], ["age65", "Âge 65-74", 1], ["femme", "Sexe féminin", 1]] as const;
  const [checked, setChecked] = React.useState<string[]>(["hta", "diabete", "age65", "femme"]);
  const [res, setRes] = React.useState<LogicComputeResponse | null>(null);
  const [busy, setBusy] = React.useState(false);
  async function compute() {
    setBusy(true);
    const r = await fetch("/api/locus/logic", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mku_key: "score:cha2ds2vasc", answers: {}, checked }) }).then((x) => x.json()).catch(() => null);
    setRes(r);
    setBusy(false);
  }
  return (
    <Card className="p-3">
      <SectionTitle><Calculator className="inline h-3 w-3" /> Unité logique : CHA₂DS₂-VASc</SectionTitle>
      <p className="text-micro text-muted-foreground mb-2"><code className="font-mono">POST /v2/logic/compute</code> — calculé sans modèle, déterministe. Pré-coché pour Mme Delacroix (74 ans, HTA, DT2, F).</p>
      <div className="grid grid-cols-2 gap-1 text-sm">
        {items.map(([k, l, w]) => <label key={k} className="flex items-center gap-2"><input type="checkbox" checked={checked.includes(k)} onChange={(e) => setChecked((c) => (e.target.checked ? [...c, k] : c.filter((x) => x !== k)))} /> {l} <span className="text-micro text-muted-foreground">+{w}</span></label>)}
      </div>
      <Button size="sm" className="mt-2" onClick={compute} disabled={busy}>Calculer</Button>
      {res && <div className="mt-2 rounded-md bg-muted/60 p-2 text-sm"><div className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4 text-success" /> {res.titre} = {res.computed.total}</div><div className="text-muted-foreground">{res.computed.outcome}{res.computed.reason ? ` · ${res.computed.reason}` : ""}</div>{res.note && <div className="text-micro text-muted-foreground">{res.note}</div>}</div>}
    </Card>
  );
}
