import Link from "next/link";
import { DOSSIERS, summaryOf, recordsOf, pendingProposals, inbox } from "@/data";
import { Avatar, Badge } from "@/components/ui";
import { initials } from "@/lib/format";
import { ageAt } from "@/locus/ehr";
import { now } from "@/data/clock";
import { PatientsCounts } from "@/components/counts";

export const dynamic = "force-static";

export default function Page() {
  const rows = DOSSIERS.map((d) => ({ p: d.patient, sum: summaryOf(d), pending: recordsOf(d, "proposal").filter((x) => x.etat === "a-valider").length, chroniques: recordsOf(d, "problem").filter((x) => x.evolution === "chronique" && x.status === "actif").length, rdv: recordsOf(d, "appointment").some((a) => a.debut.startsWith("2026-10-15")) })).sort((a, b) => a.p.nomUsage.localeCompare(b.p.nomUsage, "fr"));
  return (
    <div className="space-y-4">
      <PatientsCounts inbox={inbox().length} proposals={pendingProposals().length} />
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Patients</h1>
        <p className="mt-1 text-sm text-muted-foreground">{rows.length} dossiers. Chaque ligne est le résumé vivant que Locus maintient — pas la dernière consultation. <span className="font-mono text-micro">⌘K</span> pour chercher.</p>
      </header>
      <ul className="divide-y rounded-lg border bg-card">
        {rows.map(({ p, sum, pending, chroniques, rdv }) => (
          <li key={p.id}>
            <Link href={`/patients/${p.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60">
              <Avatar hue={p.photoHue} initials={initials(p.prenomUsuel, p.nomUsage)} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-sm"><span className="font-medium">{p.nomUsage.toUpperCase()} {p.prenomUsuel}</span><span className="text-muted-foreground">{ageAt(p.ins.dateNaissance, now())} ans</span>{p.couverture.ald?.map((a) => <Badge key={a.code} tone="primary">ALD</Badge>)}{rdv && <Badge tone="outline">RDV aujourd'hui</Badge>}</div>
                <div className="truncate text-xs text-muted-foreground">{sum?.enUneLigne}</div>
              </div>
              <div className="hidden sm:block text-micro text-muted-foreground">{chroniques} chronique{chroniques > 1 ? "s" : ""}</div>
              {pending > 0 && <span className="rounded-full bg-agent px-1.5 text-micro font-semibold text-agent-foreground">{pending}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
