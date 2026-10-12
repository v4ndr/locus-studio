"use client";
import * as React from "react";
import Link from "next/link";
import { Repeat, Plus, Play } from "lucide-react";
import { Badge, Button, Card, SectionTitle } from "./ui";
import { AUTONOMY_LABEL } from "./proposal-card";
import { cn } from "@/lib/cn";

export interface Routine { id: string; nom: string; quand: string; action: string; autonomie: 0 | 1 | 2; regle: string; resultats: { id: string; nom: string; detail: string; cible: boolean }[] }

export function RoutinesView({ routines }: { routines: Routine[] }) {
  const [sel, setSel] = React.useState(routines[0]?.id);
  const r = routines.find((x) => x.id === sel) ?? routines[0];
  const [draft, setDraft] = React.useState("");
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Repeat className="h-5 w-5 text-primary" /> Routines</h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">Des agents sur la patientèle entière, pas seulement sur le patient devant vous. Une routine est une règle lisible, un moment, une action, et un niveau d'autonomie. Vous les écrivez en français ; Sol les exécute et rend compte.</p>
      </header>
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-2">
          {routines.map((x) => {
            const n = x.resultats.filter((y) => y.cible).length;
            return (
              <button key={x.id} onClick={() => setSel(x.id)} className={cn("w-full rounded-lg border px-3 py-2.5 text-left", x.id === r?.id ? "border-primary/40 bg-accent/60" : "bg-card hover:bg-muted/60")}>
                <div className="flex items-center gap-2 text-sm font-medium">{x.nom}<span className={cn("ml-auto rounded-full px-1.5 text-micro font-semibold", n ? "bg-warning/15 text-warning" : "bg-success/12 text-success")}>{n}</span></div>
                <div className="text-micro text-muted-foreground">{x.quand} · Sol {AUTONOMY_LABEL[x.autonomie]}</div>
              </button>
            );
          })}
          <Card className="p-3">
            <SectionTitle>Nouvelle routine</SectionTitle>
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} placeholder="Ex. : « Chaque vendredi, les patients sous AVK sans INR depuis 6 semaines : préparer l'ordonnance d'INR et un message. »" className="w-full resize-none rounded-md border bg-background p-2 text-sm outline-none focus:ring-2 focus:ring-ring/40" />
            <Button size="sm" variant="agent" className="mt-2" disabled={!draft.trim()}><Plus className="h-3.5 w-3.5" /> Proposer à Sol</Button>
            <p className="mt-1.5 text-micro text-muted-foreground">Sol traduit la phrase en règle sur le dossier structuré, la montre, et vous la validez. (Capacité projetée.)</p>
          </Card>
        </div>
        {r && (
          <Card className="p-4">
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold">{r.nom}</h2>
                <div className="mt-1 flex flex-wrap gap-1.5"><Badge tone="muted">{r.quand}</Badge><Badge tone="agent">Sol {AUTONOMY_LABEL[r.autonomie]}</Badge></div>
                <p className="mt-2 text-sm"><span className="font-medium">Action :</span> {r.action}</p>
                <p className="mt-1 text-micro text-muted-foreground font-mono">règle : {r.regle}</p>
              </div>
              <Button size="sm" variant="outline"><Play className="h-3.5 w-3.5" /> Exécuter maintenant</Button>
            </div>
            <div className="mt-4">
              <SectionTitle>Résultat du dernier passage — {r.resultats.filter((x) => x.cible).length} patient{r.resultats.filter((x) => x.cible).length > 1 ? "s" : ""} ciblé{r.resultats.filter((x) => x.cible).length > 1 ? "s" : ""} sur {r.resultats.length} éligible{r.resultats.length > 1 ? "s" : ""}</SectionTitle>
              <ul className="divide-y rounded-md border">
                {r.resultats.sort((a, b) => Number(b.cible) - Number(a.cible)).map((x) => (
                  <li key={x.id + x.detail} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <span className={cn("h-2 w-2 rounded-full", x.cible ? "bg-warning" : "bg-success")} />
                    <Link href={`/patients/${x.id}`} className="font-medium hover:underline">{x.nom}</Link>
                    <span className="text-muted-foreground">{x.detail}</span>
                    {x.cible && <Badge tone="agent" className="ml-auto">{r.autonomie === 2 ? "fait" : "préparé"}</Badge>}
                  </li>
                ))}
                {r.resultats.length === 0 && <li className="px-3 py-3 text-sm text-muted-foreground">Aucun patient éligible.</li>}
              </ul>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
