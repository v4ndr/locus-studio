"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Header, Omni, Kbd, I, Avatar } from "./chrome";
import { ComposeCard, useCompose } from "./compose";
import { NoteEditor, NoteRow } from "./note";
import { useCabinet, nid, patientPayload, ageDe, type PatientLocal } from "@/store/cabinet";
import { initials } from "@/lib/format";
import { cn } from "@/lib/cn";

const PRATICIEN = { initials: "RV" };

/* ------------------------------------------------------------------ */
/* Le formulaire : créer ou modifier un patient, sans carte Vitale      */
/* ------------------------------------------------------------------ */

/* Hors du formulaire : un composant recréé à chaque rendu perdrait le focus à chaque touche. */
function F({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) { return <label className="flex flex-col gap-1.5"><span className="k">{label}{hint && <span className="ml-2 normal-case tracking-normal text-muted-3">{hint}</span>}</span>{children}</label>; }

export function PatientForm({ initial, onDone }: { initial?: PatientLocal; onDone?: (p: PatientLocal) => void }) {
  const router = useRouter();
  const cab = useCabinet();
  const sp = useSearchParams();
  const q = sp.get("q") ?? "";
  const [nom, setNom] = React.useState(initial?.nomUsage ?? (q.includes(" ") ? q.split(" ").slice(1).join(" ") : q));
  const [prenom, setPrenom] = React.useState(initial?.prenomUsuel ?? (q.includes(" ") ? q.split(" ")[0] : ""));
  const [naissance, setNaissance] = React.useState(initial?.naissance ?? "");
  const [sexe, setSexe] = React.useState<"F" | "M">(initial?.sexe ?? "F");
  const [tel, setTel] = React.useState(initial?.telephone ?? "");
  const [prof, setProf] = React.useState(initial?.profession ?? "");
  const [atcd, setAtcd] = React.useState(initial?.antecedents.join("\n") ?? "");
  const [all, setAll] = React.useState(initial?.allergies.join("\n") ?? "");
  const [tt, setTt] = React.useState(initial?.traitements.join("\n") ?? "");
  const ok = nom.trim() && prenom.trim() && /^\d{4}-\d{2}-\d{2}$/.test(naissance);
  const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
  const save = () => {
    if (!ok) return;
    const now = new Date().toISOString();
    const p: PatientLocal = { id: initial?.id ?? nid("loc"), nomUsage: nom.trim(), prenomUsuel: prenom.trim(), naissance, sexe, telephone: tel || undefined, profession: prof || undefined, antecedents: lines(atcd), allergies: lines(all), traitements: lines(tt), notes: initial?.notes ?? [], creeLe: initial?.creeLe ?? now, modifieLe: now };
    cab.upsert(p);
    onDone ? onDone(p) : router.push(`/d/${p.id}`);
  };
  const cls = "rounded-[10px] border border-line bg-paper px-3.5 py-2.5 text-[15px] text-ink outline-none placeholder:text-muted-3 focus:border-accent-line";
  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <F label="Prénom"><input value={prenom} onChange={(e) => setPrenom(e.target.value)} className={cls} autoFocus /></F>
        <F label="Nom d'usage"><input value={nom} onChange={(e) => setNom(e.target.value)} className={cls} /></F>
        <F label="Date de naissance" hint="AAAA-MM-JJ"><input type="date" value={naissance} onChange={(e) => setNaissance(e.target.value)} className={cls} /></F>
        <F label="Sexe"><div className="flex gap-1.5">{(["F", "M"] as const).map((x) => <button key={x} type="button" onClick={() => setSexe(x)} aria-pressed={sexe === x} className={cn("rounded-full border px-4 py-2 text-sm", sexe === x ? "border-ink bg-ink text-paper" : "border-line bg-paper text-ink-2")}>{x === "F" ? "Femme" : "Homme"}</button>)}</div></F>
        <F label="Téléphone" hint="facultatif"><input value={tel} onChange={(e) => setTel(e.target.value)} className={cls} placeholder="06 …" /></F>
        <F label="Profession · situation" hint="facultatif"><input value={prof} onChange={(e) => setProf(e.target.value)} className={cls} /></F>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <F label="Antécédents" hint="un par ligne"><textarea value={atcd} onChange={(e) => setAtcd(e.target.value)} rows={5} className={cls} placeholder={"HTA depuis 2019\nAppendicectomie 1998"} /></F>
        <F label="Allergies" hint="un par ligne"><textarea value={all} onChange={(e) => setAll(e.target.value)} rows={5} className={cls} placeholder={"Pénicilline (urticaire)"} /></F>
        <F label="Traitements" hint="dci dosage · posologie"><textarea value={tt} onChange={(e) => setTt(e.target.value)} rows={5} className={cls} placeholder={"ramipril 5 mg · 1 cp le matin\nmetformine 1000 mg · 1 cp matin et soir"} /></F>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <button type="submit" disabled={!ok} className="flex items-center gap-2 rounded-[10px] bg-ink px-4 py-[9px] text-sm text-paper disabled:opacity-40">{initial ? "Enregistrer" : "Créer le dossier"} <Kbd dark>⏎</Kbd></button>
        {initial && <button type="button" onClick={() => { if (confirm("Supprimer ce dossier et ses notes ?")) { cab.remove(initial.id); router.push("/d"); } }} className="rounded-[10px] px-3 py-[9px] text-sm text-muted-2 hover:text-rec-text">Supprimer</button>}
        <span className="flex-1" />
        <span className="text-xs text-muted-2">Sans carte Vitale : identité déclarative, INS à qualifier plus tard. Tout reste sur ce poste.</span>
      </div>
    </form>
  );
}

export function NouveauView() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header praticien={PRATICIEN} back="/" />
      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-6 px-4 pb-10 pt-8 sm:px-6 sm:pt-12">
        <div className="flex flex-col gap-1.5"><h1 className="m-0 text-2xl font-medium tracking-[-.02em]">Nouveau patient</h1><p className="m-0 text-sm text-muted-2">Le minimum pour commencer : une identité, ce qu'on sait. Le reste viendra des notes.</p></div>
        <React.Suspense fallback={null}><PatientForm /></React.Suspense>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* La liste du cabinet local : export, import, nouveau                  */
/* ------------------------------------------------------------------ */

export function CabinetView() {
  const cab = useCabinet();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const exporter = () => { const blob = new Blob([cab.exportJson()], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `locus-studio-cabinet-${new Date().toISOString().slice(0, 10)}.json`; a.click(); };
  return (
    <div className="flex min-h-dvh flex-col">
      <Header praticien={PRATICIEN} back="/" />
      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-6 px-4 pb-10 pt-8 sm:px-6 sm:pt-12">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="m-0 text-2xl font-medium tracking-[-.02em]">Cabinet local</h1>
          <span className="d">{cab.patients.length} dossier{cab.patients.length > 1 ? "s" : ""} · {cab.patients.reduce((n, p) => n + p.notes.length, 0)} notes</span>
          <span className="flex-1" />
          <Link href="/nouveau" className="flex items-center gap-2 rounded-[10px] bg-ink px-3.5 py-[8px] text-sm text-paper hover:text-paper"><I.plus /> Nouveau patient</Link>
        </div>
        <p className="m-0 text-sm text-muted-2">Les dossiers créés ici vivent dans ce navigateur. Exportez la journée en JSON pour la garder ou la rejouer ailleurs.</p>
        <div className="flex flex-col gap-1">
          {cab.patients.length === 0 && <div className="rounded-[14px] border border-dashed border-line px-5 py-8 text-center text-sm text-muted-2">Aucun dossier créé. Commencez par « Nouveau patient ».</div>}
          {cab.patients.map((p) => (
            <Link key={p.id} href={`/d/${p.id}`} className="flex items-center gap-4 rounded-[10px] px-3.5 py-3 text-ink hover:bg-hover hover:text-ink">
              <Avatar initials={initials(p.prenomUsuel, p.nomUsage)} hue={(p.nomUsage.length * 37) % 360} />
              <span className="flex min-w-0 flex-1 flex-col"><span className="text-[15px]">{p.prenomUsuel} {p.nomUsage}</span><span className="text-[13px] text-muted">{ageDe(p.naissance)} ans · {p.notes.length} note{p.notes.length > 1 ? "s" : ""}{p.traitements.length ? ` · ${p.traitements.length} traitement${p.traitements.length > 1 ? "s" : ""}` : ""}</span></span>
              <I.chevron />
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exporter} className="rounded-[10px] border border-line bg-paper px-3.5 py-[8px] text-sm text-ink hover:bg-hover">Exporter (JSON)</button>
          <button type="button" onClick={() => fileRef.current?.click()} className="rounded-[10px] border border-line bg-paper px-3.5 py-[8px] text-sm text-ink hover:bg-hover">Importer</button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { try { cab.importJson(await f.text()); } catch { alert("Fichier illisible."); } } e.target.value = ""; }} />
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Le dossier local : overview, fiche, notes, et la note du jour         */
/* ------------------------------------------------------------------ */

export function DossierLocalView({ id }: { id: string }) {
  const cab = useCabinet();
  const composer = useCompose();
  const p = cab.get(id);
  const [edit, setEdit] = React.useState(false);
  const [noteOpen, setNoteOpen] = React.useState(false);
  if (!cab.ready) return <div className="flex min-h-dvh flex-col"><Header praticien={PRATICIEN} back="/d" /></div>;
  if (!p) return (
    <div className="flex min-h-dvh flex-col"><Header praticien={PRATICIEN} back="/d" /><main className="mx-auto flex max-w-[720px] flex-1 flex-col items-center justify-center gap-3 px-6 text-center"><h1 className="m-0 text-xl font-medium">Dossier introuvable sur ce poste</h1><p className="m-0 text-sm text-muted-2">Les dossiers créés sans carte Vitale vivent dans le navigateur qui les a créés. Importez l'export JSON pour le retrouver.</p><Link href="/d" className="text-sm" style={{ color: "var(--accent)" }}>Cabinet local →</Link></main></div>
  );
  const nom = `${p.prenomUsuel} ${p.nomUsage}`;
  const ini = initials(p.prenomUsuel, p.nomUsage);
  const age = ageDe(p.naissance);
  const derniere = p.notes[0];
  const base = `${p.prenomUsuel} ${p.nomUsage}, ${age} ans${p.profession ? `, ${p.profession.toLowerCase()}` : ""}.`;
  const concl = derniere?.synthese?.split(/(?<=\.)\s/)[0];
  const prose = derniere ? `${base} ${derniere.motif ? `Vu${p.sexe === "F" ? "e" : ""} le ${new Date(derniere.date).toLocaleDateString("fr-FR")} pour ${derniere.motif.toLowerCase()} : ` : "Dernière consultation : "}${concl ?? derniere.texte.slice(0, 120)}${concl?.endsWith(".") ? "" : "."}` : `${base} ${p.antecedents.length ? `Antécédents : ${p.antecedents.slice(0, 3).join(", ")}.` : "Pas d'antécédent renseigné."} ${p.traitements.length ? `Sous ${p.traitements.slice(0, 3).map((t) => t.split(/[·,]/)[0].trim()).join(", ")}.` : ""}`;
  const aNoter = [...p.allergies.map((a) => ({ dot: "gray", texte: a, tag: "à savoir" })), ...(p.notes.length === 0 ? [{ dot: "accent", texte: "Dossier créé sans carte Vitale · INS à qualifier", tag: "nouveau" }] : [])];

  return (
    <div className="flex min-h-dvh flex-col">
      <Header praticien={PRATICIEN} patient={{ id: p.id, nom, initials: ini, meta: `${age} a · ${p.sexe}`, href: `/d/${p.id}` }} back="/" />
      <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-7 px-4 pb-8 pt-10 sm:px-6 sm:pt-16">
        <div className="flex flex-col gap-3">
          <span className="k px-px">Overview · dossier local{derniere ? ` · dernière note ${new Date(derniere.date).toLocaleDateString("fr-FR")}` : ""}</span>
          <p className="m-0 text-[21px] leading-[1.45] tracking-[-.01em] sm:text-2xl">{prose}</p>
        </div>
        {aNoter.length > 0 && (
          <section className="flex flex-col">
            <span className="k px-1 pb-2.5">À noter</span>
            {aNoter.map((n, i) => (
              <div key={i} className={cn("flex items-center gap-3 border-t border-line-4 px-1 py-3 text-[15px]", i === aNoter.length - 1 && "border-b")}>
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: n.dot === "accent" ? "var(--accent)" : "var(--gray-dot)" }} />
                <span className="flex-1">{n.texte}</span>
                <span className="d min-w-[46px] text-right" style={{ color: n.dot === "accent" ? "var(--accent)" : undefined }}>{n.tag}</span>
              </div>
            ))}
          </section>
        )}
        <nav className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => setEdit((e) => !e)} aria-expanded={edit} className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm text-ink-3 hover:bg-hover"><I.chevron open={edit} color="currentColor" /> Fiche</button>
          <span className="mx-1 h-[18px] w-px bg-line" />
          <span className="flex items-center gap-2 rounded-[10px] px-2.5 py-2 text-sm text-ink-3">Notes <span className="d">{p.notes.length}</span></span>
          <span className="flex items-center gap-2 rounded-[10px] px-2.5 py-2 text-sm text-ink-3">Actions validées <span className="d">{p.notes.reduce((n, x) => n + x.actions.length, 0)}</span></span>
        </nav>
        {edit && <section className="card px-5 py-5"><PatientForm initial={p} onDone={() => setEdit(false)} /></section>}

        {noteOpen ? (
          <section className="card px-5 py-5"><NoteEditor patientId={p.id} local={p} nom={nom} retour={`/d/${p.id}`} onSaved={() => setNoteOpen(false)} /></section>
        ) : (
          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-3"><span className="k px-1">Notes</span><span className="flex-1" /><button type="button" onClick={() => setNoteOpen(true)} className="flex items-center gap-2 rounded-[10px] bg-ink px-3.5 py-[8px] text-sm text-paper"><I.plus /> Consultation</button></div>
            {p.notes.length === 0 && <div className="rounded-[14px] border border-dashed border-line px-5 py-6 text-center text-sm text-muted-2">Aucune note. La première consultation commence ici : écrivez ou dictez, Locus décline en actions, vous signez.</div>}
            {p.notes.map((n) => <NoteRow key={n.id} n={n} onDelete={() => cab.removeNote(p.id, n.id)} />)}
          </section>
        )}
      </main>
      <Omni placeholder="Ordo, rendez-vous, mail, courrier, arrêt, question… tout." onSubmit={(t) => composer.run({ texte: t, patientId: p.id, patient: patientPayload(p), ecran: "dossier" })} suggestions={[{ k: "ordo", t: p.traitements[0] ? `Renouvelle ${p.traitements[0].split(/[·,]/)[0].trim()} pour 3 mois` : "Ordonnance : paracétamol 1 g, 3/j si douleur, 5 jours" }, { k: "rdv", t: "Revoir dans 6 semaines, 20 minutes" }, { k: "mail", t: `Mail à ${p.prenomUsuel} : résultats rassurants` }, { k: "arrêt", t: "Arrêt de travail 5 jours, sorties libres" }, { k: "question", t: "Quelle surveillance pour ce traitement ?" }]} cta={<button type="button" onClick={() => setNoteOpen(true)} className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] bg-ink px-3.5 py-[9px] text-sm font-medium text-paper sm:px-4">+ Consultation</button>}>
        {composer.open && <ComposeCard state={composer.state} onClose={composer.reset} suivreSeul={false} onValide={(actions, plan) => cab.saveNote(p.id, { id: nid("n"), date: new Date().toISOString(), motif: composer.state.input?.texte, texte: composer.state.input?.texte ?? "", actions, synthese: plan.synthese, via: plan.via, chrono: { saisie: 0, composition: 0, validation: 0 } })} />}
      </Omni>
    </div>
  );
}
