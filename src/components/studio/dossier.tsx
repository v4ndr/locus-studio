"use client";
import * as React from "react";
import { useRouter } from "./nav";
import Link from "./nav";
import type { PatientView, NoteAction } from "@/studio/types";
import { Header, Omni, CtaLink, I, Rich, useT } from "./chrome";
import type { StudioDict } from "@/i18n/studio";
import { ComposeCard, useCompose } from "./compose";
import { NotesSession, BrouillonBanner } from "./note";
import { cn } from "@/lib/cn";

/** L'overview du dossier : une phrase, trois choses à noter, et tout le reste à un clic. */
export function DossierView({ v, praticien }: { v: PatientView; praticien: { initials: string } }) {
  const router = useRouter();
  const { t, L } = useT();
  const [open, setOpen] = React.useState(false);
  const composer = useCompose();
  /** Un raccourci n'est qu'une demande toute écrite : il part au composer, live, comme une frappe dans ⌘K. */
  const lancer = (texte: string) => composer.run({ texte, patientId: v.ref.id, ecran: "dossier" });

  /** Un clic sur « à noter » : le document source, le raccourci, la question à Locus, ou la fiche. */
  function act(a: NoteAction) {
    switch (a.type) {
      case "doc": router.push(a.href); return;
      case "cmd": { const c = v.chips.find((x) => x.id === a.chipId); if (c) lancer(c.label); return; }
      case "ask": lancer(a.texte); return;
      case "fiche": setOpen(true); setTimeout(() => document.getElementById(`fiche-${a.section}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50); return;
    }
  }

  /** Tout ce qu'on tape dans ⌘K part au composer : un plan d'actions revient. */
  function ask(text: string) {
    if (/^(consult|rencontre)/i.test(text.trim())) { router.push(`/p/${v.ref.id}/rencontre`); return; }
    lancer(text);
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Header praticien={praticien} patient={{ id: v.ref.id, nom: v.ref.nom, initials: v.ref.initials, meta: v.meta }} />
      <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-7 px-4 pb-8 pt-10 sm:px-6 sm:pt-16">
        <BrouillonBanner patientId={v.ref.id} href={`/p/${v.ref.id}/rencontre`} />
        <div className="flex flex-col gap-3">
          <span className="k px-px">{t.dossier.overview}{v.rdv ? ` · ${v.rdv.heure} · ${v.rdv.motif}` : ""}</span>
          <p className="m-0 text-[21px] leading-[1.45] tracking-[-.01em] sm:text-2xl"><Rich text={v.prose} /></p>
        </div>
        <section className="flex flex-col">
          <span className="k px-1 pb-2.5">{t.dossier.ofNote}</span>
          {v.aNoter.map((n, i) => (
            <button key={i} type="button" onClick={() => act(n.action)} title={n.action.type === "doc" ? t.openDoc : n.action.type === "cmd" ? t.dossier.prepare : n.action.type === "ask" ? t.askLocus : t.dossier.seeInRecord} className={cn("group flex w-full items-center gap-3 border-t border-line-4 px-1 py-3 text-left text-[15px] text-ink hover:bg-hover", i === v.aNoter.length - 1 && "border-b")}>
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: n.dot === "accent" ? "var(--agent)" : n.dot === "warn" ? "var(--warn-dot)" : "var(--gray-dot)" }} />
              <span className="flex-1">{n.texte}</span>
              <span className="d min-w-[46px] text-right" style={{ color: n.dot === "accent" ? "var(--agent)" : n.dot === "warn" ? "var(--warn)" : undefined }}>{L(n.tag)}</span>
              <span className="opacity-0 transition-opacity group-hover:opacity-100"><I.chevron /></span>
            </button>
          ))}
        </section>
        <nav aria-label={t.dossier.fullRecord} className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm text-ink-3 hover:bg-hover"><I.chevron open={open} color="currentColor" /> {t.dossier.record}</button>
          <span className="mx-1 h-[18px] w-px bg-line" />
          {([[t.dossier.all, v.counts.documents, ""], [t.dossier.prescriptions, v.counts.ordonnances, "Ordonnance"], [t.dossier.labs, v.counts.biologie, "Biologie"], [t.dossier.imaging, v.counts.imagerie, "Imagerie"]] as const).map(([l, n, t]) => (
            <Link key={l} href={`/p/${v.ref.id}/documents${t ? `?type=${encodeURIComponent(t)}` : ""}`} className="flex items-center gap-2 rounded-[10px] px-2.5 py-2 text-sm text-ink-3 hover:bg-hover">{l} <span className="d">{n}</span></Link>
          ))}
        </nav>
        {open && (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))" }}>
            <Card id="fiche-antecedents" title={t.dossier.history}>
              {v.dossier.antecedents.map((f, i) => <Li key={i} k={f.k} v={f.v} />)}
              {v.dossier.familiaux && <div className="li border-t border-soft pt-1.5 text-ink-3"><span className="flex-1"><b className="font-medium">{t.dossier.family}</b> · {v.dossier.familiaux}</span></div>}
            </Card>
            <Card id="fiche-allergies" title={t.dossier.allergies}>{v.dossier.allergies.map((f, i) => <Li key={i} k={L(f.k)} v={f.v} />)}</Card>
            <Card title={t.dossier.lifestyle}>{v.dossier.modeDeVie.map((f, i) => <div key={i} className="li"><span className="w-[84px] shrink-0 text-dim-2">{L(f.k)}</span><span className="flex-1">{f.v}</span></div>)}</Card>
            <Card id="fiche-traitements" title={t.dossier.treatments}>
              {v.dossier.traitements.length === 0 && <Li k={t.dossier.noTreatment} />}
              {v.dossier.traitements.map((f, i) => <Li key={i} k={f.k} v={L(f.v)} />)}
              <Link href={`/p/${v.ref.id}/documents?type=Ordonnance`} className="text-[13px]" style={{ color: "var(--agent)" }}>{t.dossier.allPrescriptions}</Link>
            </Card>
            <Card id="fiche-suivis" title={t.dossier.followUps}>
              {v.dossier.suivis.length === 0 && <Li k={t.dossier.nothingOngoing} />}
              {v.dossier.suivis.map((f, i) => <div key={i} className="li"><span className="flex-1"><b className="font-medium">{f.k}</b>{f.v ? ` · ${f.v}` : ""}</span></div>)}
            </Card>
            <Card id="fiche-depistages" title={t.dossier.screening}>{v.dossier.depistages.map((f, i) => <Li key={i} k={f.k} v={L(f.v)} muted={f.muted} warn={f.v === "dû" || f.v === "en retard"} />)}</Card>
          </div>
        )}
        <NotesSession patientId={v.ref.id} patient={{ nom: v.ref.nom, naissance: v.ref.naissance, age: v.ref.age, sexe: v.meta.endsWith("F") ? "F" : "M" }} />
      </main>
      <Omni placeholder={t.dossier.placeholder} onSubmit={ask} suggestions={exemples(v, t)} chips={v.chips.slice(0, 3).map((c) => ({ id: c.id, label: c.label, onClick: () => lancer(c.label) }))} cta={<CtaLink href={`/p/${v.ref.id}/rencontre`}>{t.dossier.consult}</CtaLink>}>
        {composer.open && <ComposeCard state={composer.state} onClose={composer.reset} onRetry={(i) => composer.run(i)} />}
      </Omni>
    </div>
  );
}

/** Les exemples du composer, adaptés au dossier ouvert. */
/* Les demandes restent en français : elles partent au composer, dans le contexte de soins français. */
function exemples(v: PatientView, d: StudioDict): { k: string; t: string }[] {
  const prenom = v.ref.prenom;
  const med = v.dossier.traitements[0]?.k.split(" · ")[0]?.toLowerCase();
  return [
    { k: d.keys.ordo, t: med ? `Renouvelle ${med} pour 3 mois` : "Ordonnance : paracétamol 1 g, 3/j si douleur, 5 jours" },
    { k: d.keys.rdv, t: "Revoir dans 6 semaines, 20 minutes, un matin" },
    { k: d.keys.mail, t: `Mail à ${prenom} : résultats rassurants, on en reparle au prochain rendez-vous` },
    { k: d.keys.courrier, t: "Courrier au cardiologue : avis pour une HTA résistante" },
    { k: d.keys.arret, t: "Arrêt de travail 5 jours, sorties libres" },
    { k: d.keys.question, t: "Quelle est la dernière créatinine et son évolution ?" },
  ];
}

function Card({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return <section id={id} className="card flex scroll-mt-24 flex-col gap-2.5 px-5 py-[18px]"><span className="k">{title}</span>{children}</section>;
}
function Li({ k, v, muted, warn }: { k: string; v?: string; muted?: boolean; warn?: boolean }) {
  return <div className="li"><span className={cn("flex-1", muted && "text-dim-2")}>{k}</span>{v && <span className="d" style={warn ? { color: "var(--warn)" } : undefined}>{v}</span>}</div>;
}
