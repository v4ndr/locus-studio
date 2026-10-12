"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { PatientView, Chip, NoteAction } from "@/studio/types";
import { Header, Omni, ResultCard, CtaLink, I, Rich } from "./chrome";
import { ComposeCard, useCompose } from "./compose";
import { useRencontre } from "@/store/rencontre";
import { cn } from "@/lib/cn";

/** L'overview du dossier : une phrase, trois choses à noter, et tout le reste à un clic. */
export function DossierView({ v, praticien }: { v: PatientView; praticien: { initials: string } }) {
  const router = useRouter();
  const { me, dispatch } = useRencontre(v.ref.id);
  const [open, setOpen] = React.useState(false);
  const [done, setDone] = React.useState<string | null>(null);
  const chip = v.chips.find((c) => c.id === me.cmd);
  const composer = useCompose();

  /** Un clic sur « à noter » : le document source, le raccourci préparé, la question à Locus, ou la fiche. */
  function act(a: NoteAction) {
    switch (a.type) {
      case "doc": router.push(a.href); return;
      case "cmd": dispatch({ type: "cmd", patientId: v.ref.id, cmd: a.chipId }); return;
      case "ask": dispatch({ type: "cmd", patientId: v.ref.id, cmd: null }); composer.run({ texte: a.texte, patientId: v.ref.id, ecran: "dossier" }); return;
      case "fiche": setOpen(true); setTimeout(() => document.getElementById(`fiche-${a.section}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50); return;
    }
  }

  /** Tout ce qu'on tape dans ⌘K part au composer : un plan d'actions revient. Un raccourci déjà préparé prend le pas s'il correspond mot pour mot. */
  function ask(text: string) {
    if (/^(consult|rencontre)/i.test(text.trim())) { router.push(`/p/${v.ref.id}/rencontre`); return; }
    dispatch({ type: "cmd", patientId: v.ref.id, cmd: null });
    composer.run({ texte: text, patientId: v.ref.id, ecran: "dossier" });
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Header praticien={praticien} patient={{ id: v.ref.id, nom: v.ref.nom, initials: v.ref.initials, meta: v.meta }} />
      <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-7 px-4 pb-8 pt-10 sm:px-6 sm:pt-16">
        <div className="flex flex-col gap-3">
          <span className="k px-px">Overview{v.rdv ? ` · ${v.rdv.heure} · ${v.rdv.motif}` : ""}</span>
          <p className="m-0 text-[21px] leading-[1.45] tracking-[-.01em] sm:text-2xl"><Rich text={v.prose} /></p>
        </div>
        <section className="flex flex-col">
          <span className="k px-1 pb-2.5">À noter</span>
          {v.aNoter.map((n, i) => (
            <button key={i} type="button" onClick={() => act(n.action)} title={n.action.type === "doc" ? "Ouvrir le document" : n.action.type === "cmd" ? "Préparer" : n.action.type === "ask" ? "Demander à Locus" : "Voir dans le dossier"} className={cn("group flex w-full items-center gap-3 border-t border-line-4 px-1 py-3 text-left text-[15px] text-ink hover:bg-hover", i === v.aNoter.length - 1 && "border-b")}>
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: n.dot === "accent" ? "var(--accent)" : n.dot === "warn" ? "var(--warn-dot)" : "var(--gray-dot)" }} />
              <span className="flex-1">{n.texte}</span>
              <span className="d min-w-[46px] text-right" style={{ color: n.dot === "accent" ? "var(--accent)" : n.dot === "warn" ? "var(--warn)" : undefined }}>{n.tag}</span>
              <span className="opacity-0 transition-opacity group-hover:opacity-100"><I.chevron /></span>
            </button>
          ))}
        </section>
        <nav aria-label="Dossier complet" className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm text-ink-3 hover:bg-hover"><I.chevron open={open} color="currentColor" /> Dossier</button>
          <span className="mx-1 h-[18px] w-px bg-line" />
          {([["Tout", v.counts.documents, ""], ["Ordonnances", v.counts.ordonnances, "Ordonnance"], ["Biologie", v.counts.biologie, "Biologie"], ["Imagerie", v.counts.imagerie, "Imagerie"]] as const).map(([l, n, t]) => (
            <Link key={l} href={`/p/${v.ref.id}/documents${t ? `?type=${encodeURIComponent(t)}` : ""}`} className="flex items-center gap-2 rounded-[10px] px-2.5 py-2 text-sm text-ink-3 hover:bg-hover">{l} <span className="d">{n}</span></Link>
          ))}
        </nav>
        {open && (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))" }}>
            <Card id="fiche-antecedents" title="Antécédents">
              {v.dossier.antecedents.map((f, i) => <Li key={i} k={f.k} v={f.v} />)}
              {v.dossier.familiaux && <div className="li border-t border-soft pt-1.5 text-ink-3"><span className="flex-1"><b className="font-medium">Familiaux</b> · {v.dossier.familiaux}</span></div>}
            </Card>
            <Card id="fiche-allergies" title="Allergies · intolérances">{v.dossier.allergies.map((f, i) => <Li key={i} k={f.k} v={f.v} />)}</Card>
            <Card title="Mode de vie">{v.dossier.modeDeVie.map((f, i) => <div key={i} className="li"><span className="w-[84px] shrink-0 text-muted-2">{f.k}</span><span className="flex-1">{f.v}</span></div>)}</Card>
            <Card id="fiche-traitements" title="Traitements en cours">
              {v.dossier.traitements.length === 0 && <Li k="Aucun traitement de fond" />}
              {v.dossier.traitements.map((f, i) => <Li key={i} k={f.k} v={f.v} />)}
              <Link href={`/p/${v.ref.id}/documents?type=Ordonnance`} className="text-[13px]" style={{ color: "var(--accent)" }}>Toutes les ordonnances →</Link>
            </Card>
            <Card id="fiche-suivis" title="Suivis en cours">
              {v.dossier.suivis.length === 0 && <Li k="Rien en cours" />}
              {v.dossier.suivis.map((f, i) => <div key={i} className="li"><span className="flex-1"><b className="font-medium">{f.k}</b>{f.v ? ` · ${f.v}` : ""}</span></div>)}
            </Card>
            <Card id="fiche-depistages" title="Dépistages · vaccins">{v.dossier.depistages.map((f, i) => <Li key={i} k={f.k} v={f.v} muted={f.muted} warn={f.v === "dû" || f.v === "en retard"} />)}</Card>
          </div>
        )}
      </main>
      <Omni placeholder="Ordo, rendez-vous, mail, courrier, question… tout." onSubmit={ask} suggestions={exemples(v)} chips={v.chips.slice(0, 3).map((c) => ({ id: c.id, label: c.label, onClick: () => { composer.reset(); dispatch({ type: "cmd", patientId: v.ref.id, cmd: c.id }); } }))} cta={<CtaLink href={`/p/${v.ref.id}/rencontre`}>+ Consultation</CtaLink>}>
        {chip && !done && <ResultCard tool={chip.tool} title={chip.title} body={chip.body.replace(/\[\d+\]/g, "")} cta={chip.cta} onCta={() => { setDone(chip.id); setTimeout(() => { dispatch({ type: "cmd", patientId: v.ref.id, cmd: null }); setDone(null); }, 1400); }} onClose={() => dispatch({ type: "cmd", patientId: v.ref.id, cmd: null })} />}
        {chip && done === chip.id && <div className="flex items-center gap-2.5 rounded-[14px] border border-line bg-paper px-[18px] py-3.5 text-sm text-ok"><I.check />{chip.cta === "Envoyer" ? "Envoyé." : chip.cta === "Réserver" ? "Réservé, SMS envoyé." : "Signé et transmis."}</div>}
        {composer.open && <ComposeCard state={composer.state} onClose={composer.reset} />}
      </Omni>
    </div>
  );
}

/** Les exemples du composer, adaptés au dossier ouvert. */
function exemples(v: PatientView): { k: string; t: string }[] {
  const prenom = v.ref.prenom;
  const med = v.dossier.traitements[0]?.k.split(" · ")[0]?.toLowerCase();
  return [
    { k: "ordo", t: med ? `Renouvelle ${med} pour 3 mois` : "Ordonnance : paracétamol 1 g, 3/j si douleur, 5 jours" },
    { k: "rdv", t: "Revoir dans 6 semaines, 20 minutes, un matin" },
    { k: "mail", t: `Mail à ${prenom} : résultats rassurants, on en reparle au prochain rendez-vous` },
    { k: "courrier", t: "Courrier au cardiologue : avis pour une HTA résistante" },
    { k: "arrêt", t: "Arrêt de travail 5 jours, sorties libres" },
    { k: "question", t: "Quelle est la dernière créatinine et son évolution ?" },
  ];
}

function Card({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return <section id={id} className="card flex scroll-mt-24 flex-col gap-2.5 px-5 py-[18px]"><span className="k">{title}</span>{children}</section>;
}
function Li({ k, v, muted, warn }: { k: string; v?: string; muted?: boolean; warn?: boolean }) {
  return <div className="li"><span className={cn("flex-1", muted && "text-muted-2")}>{k}</span>{v && <span className="d" style={warn ? { color: "var(--warn)" } : undefined}>{v}</span>}</div>;
}
