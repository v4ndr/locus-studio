import { inbox, pendingProposals } from "@/data";
import { PatientsCounts } from "@/components/counts";
import { PRISES_DE_PARTI } from "@/data/manifeste";

export const dynamic = "force-static";

export default function Page() {
  return (
    <div className="space-y-6">
      <PatientsCounts inbox={inbox().length} proposals={pendingProposals().length} />
      <header className="max-w-3xl">
        <div className="text-micro uppercase tracking-wider text-muted-foreground font-semibold">Manifeste</div>
        <h1 className="text-3xl font-semibold tracking-tight">Le LGC agentique</h1>
        <p className="mt-3 text-base leading-relaxed text-foreground/85">Les logiciels de cabinet ont été construits autour de la feuille de soins. Puis on leur a ajouté le dossier, puis les téléservices, puis un chat. Le résultat est connu : trop de clics, un dossier chronologique qu'on ne lit plus, des agents « à côté ». Locus Studio prend le problème à l'envers : <strong>le médecin tranche, l'agent fait le reste</strong>, et le logiciel est organisé autour de cette division du travail. Voici nos partis pris, chacun adossé à ce qu'on a observé ailleurs.</p>
      </header>
      <ol className="grid gap-4 md:grid-cols-2">
        {PRISES_DE_PARTI.map((p, i) => (
          <li key={i} className="rounded-lg border bg-card p-4">
            <div className="flex items-baseline gap-3"><span className="font-mono text-2xl text-primary/70">{String(i + 1).padStart(2, "0")}</span><h2 className="text-base font-semibold leading-snug">{p.titre}</h2></div>
            <p className="mt-2 text-sm leading-relaxed text-foreground/85">{p.texte}</p>
            <p className="mt-2 text-micro text-muted-foreground"><span className="font-medium">Dans le studio :</span> {p.studio}</p>
            <p className="mt-1 text-micro text-muted-foreground"><span className="font-medium">Vu ailleurs :</span> {p.ailleurs}</p>
          </li>
        ))}
      </ol>
      <p className="max-w-3xl text-sm text-muted-foreground">La recherche complète (agentic healthcare, LGC français, interop) est dans <code className="font-mono">docs/recherche/</code>. Ce manifeste est une prise de position, pas une revue : il est là pour être contredit.</p>
    </div>
  );
}
