import { inbox, pendingProposals } from "@/data";
import { PatientsCounts } from "@/components/counts";
import { RUPTURES } from "@/data/manifeste";

export const dynamic = "force-static";

export default function Page() {
  return (
    <div className="space-y-6">
      <PatientsCounts inbox={inbox().length} proposals={pendingProposals().length} />
      <header className="max-w-3xl">
        <div className="text-micro uppercase tracking-wider text-muted-foreground font-semibold">Manifeste</div>
        <h1 className="text-3xl font-semibold tracking-tight">Il n'y a plus de pages.</h1>
        <p className="mt-3 text-base leading-relaxed text-foreground/85">Les logiciels de cabinet sont des collections d'écrans entre lesquels on circule : l'agenda, la boîte, le dossier, l'ordonnance, la facturation. Leur prochaine version aura une journée préparée, une boîte triée, un dossier à trois colonnes. Ce sera un meilleur LGC. Ce n'est pas l'avenir. L'avenir n'a aucun écran : il a un <strong>fil</strong>, où tout ce qui se passe au cabinet s'inscrit dans le temps, et une <strong>commande</strong>, par laquelle tout entre. Le médecin dit ; l'agent compose ; le médecin signe. Sept ruptures, chacune adossée à ce qu'on observe de plus radical ailleurs, et jouée dans <a href="/" className="text-primary hover:underline">l'écran unique</a>.</p>
      </header>
      <ol className="grid gap-4 md:grid-cols-2">
        {RUPTURES.map((p, i) => (
          <li key={i} className="rounded-lg border bg-card p-4">
            <div className="flex items-baseline gap-3"><span className="font-mono text-2xl text-primary/70">{String(i + 1).padStart(2, "0")}</span><h2 className="text-base font-semibold leading-snug">{p.titre}</h2></div>
            <p className="mt-2 text-sm leading-relaxed text-foreground/85">{p.texte}</p>
            <p className="mt-2 text-micro text-muted-foreground"><span className="font-medium">Dans le studio :</span> {p.studio}</p>
            <p className="mt-1 text-micro text-muted-foreground"><span className="font-medium">Vu ailleurs :</span> {p.ailleurs}</p>
          </li>
        ))}
      </ol>
      <p className="max-w-3xl text-sm text-muted-foreground">Les trois scènes qui jouent ces ruptures sont décrites dans <code className="font-mono">docs/scenes.md</code> ; la première version du manifeste (quinze prises de parti pour un meilleur LGC) est conservée dans <code className="font-mono">docs/manifeste-v1.md</code> ; la recherche dans <code className="font-mono">docs/recherche/</code>. Ce manifeste est une prise de position, pas une revue : il est là pour être contredit.</p>
    </div>
  );
}
