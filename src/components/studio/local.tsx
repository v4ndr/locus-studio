"use client";
import * as React from "react";
import Link from "./nav";
import { useSearchParams } from "next/navigation";
import { useRouter } from "./nav";
import { Header, Omni, Kbd, I, Avatar, useT } from "./chrome";
import { ComposeCard, useCompose } from "./compose";
import { NoteEditor, NoteRow, BrouillonBanner, listBrouillons, AJOUTS, type Brouillon, type Ajout } from "./note";
import { ActionPanel, type PatientRendu } from "./rendu";
import type { ComposeAction } from "@/locus/compose/contract";
import { useCabinet, nid, patientPayload, ageDe, type PatientLocal, type NoteLocal } from "@/store/cabinet";
import { initials } from "@/lib/format";
import { cn } from "@/lib/cn";

const PRATICIEN = { initials: "RV" };

/* ------------------------------------------------------------------ */
/* Le formulaire : créer ou modifier un patient, sans carte Vitale      */
/* ------------------------------------------------------------------ */

/* Hors du formulaire : un composant recréé à chaque rendu perdrait le focus à chaque touche. */
function F({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) { return <label className="flex flex-col gap-1.5"><span className="k">{label}{hint && <span className="ml-2 normal-case tracking-normal text-dim-3">{hint}</span>}</span>{children}</label>; }

export function PatientForm({ initial, onDone }: { initial?: PatientLocal; onDone?: (p: PatientLocal) => void }) {
  const router = useRouter();
  const { t: d } = useT();
  const t = d.local;
  const cab = useCabinet();
  const sp = useSearchParams();
  const q = sp.get("q") ?? "";
  const [nom, setNom] = React.useState(initial?.nomUsage ?? (q.includes(" ") ? q.split(" ").slice(1).join(" ") : q));
  const [prenom, setPrenom] = React.useState(initial?.prenomUsuel ?? (q.includes(" ") ? q.split(" ")[0] : ""));
  const [naissance, setNaissance] = React.useState(initial?.naissance ?? "");
  const [sexe, setSexe] = React.useState<"F" | "M" | undefined>(initial?.sexe);
  const [tel, setTel] = React.useState(initial?.telephone ?? "");
  const [prof, setProf] = React.useState(initial?.profession ?? "");
  const [atcd, setAtcd] = React.useState(initial?.antecedents.join("\n") ?? "");
  const [all, setAll] = React.useState(initial?.allergies.join("\n") ?? "");
  const [tt, setTt] = React.useState(initial?.traitements.join("\n") ?? "");
  const today = new Date().toISOString().slice(0, 10);
  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(naissance) && naissance <= today && naissance >= "1900-01-01";
  const dateErr = naissance && !dateOk ? (naissance > today ? t.futureDate : t.badDate) : null;
  const ok = !!nom.trim() && !!prenom.trim() && dateOk && !!sexe;
  const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
  const doublon = !initial && nom.trim() && prenom.trim() && dateOk ? cab.homonyme(nom, prenom, naissance) : undefined;
  const save = () => {
    if (!ok || !sexe) return;
    if (doublon && !confirm(t.duplicate(`${doublon.prenomUsuel} ${doublon.nomUsage}`, doublon.naissance.split("-").reverse().join("/")))) { router.push(`/d/${doublon.id}`); return; }
    const now = new Date().toISOString();
    const p: PatientLocal = { id: initial?.id ?? nid("loc"), nomUsage: nom.trim(), prenomUsuel: prenom.trim(), naissance, sexe, telephone: tel || undefined, profession: prof || undefined, antecedents: lines(atcd), allergies: lines(all), traitements: lines(tt), notes: initial?.notes ?? [], creeLe: initial?.creeLe ?? now, modifieLe: now };
    cab.upsert(p);
    onDone ? onDone(p) : router.push(`/d/${p.id}`);
  };
  const cls = "min-h-11 rounded-[10px] border border-line bg-paper px-3.5 py-2.5 text-base text-ink placeholder:text-dim-3 sm:text-[15px]";
  return (
    <form onSubmit={(e) => { e.preventDefault(); save(); }} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <F label={t.firstName}><input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" value={prenom} onChange={(e) => setPrenom(e.target.value)} className={cls} autoFocus /></F>
        <F label={t.lastName}><input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" value={nom} onChange={(e) => setNom(e.target.value)} className={cls} /></F>
        <F label={t.birth} hint={dateErr ?? undefined}><input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" type="date" value={naissance} min="1900-01-01" max={today} aria-invalid={!!dateErr} onChange={(e) => setNaissance(e.target.value)} className={cn(cls, dateErr && "border-rec")} /></F>
        <F label={t.sex} hint={sexe ? undefined : t.toChoose}><div className="flex gap-1.5">{(["F", "M"] as const).map((x) => <button key={x} type="button" onClick={() => setSexe(x)} aria-pressed={sexe === x} className={cn("min-h-11 rounded-full border px-4 py-2 text-sm", sexe === x ? "border-ink bg-ink text-paper" : "border-line bg-paper text-ink-2")}>{x === "F" ? t.female : t.male}</button>)}</div></F>
        <F label={t.phone} hint={t.optional}><input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" value={tel} onChange={(e) => setTel(e.target.value)} className={cls} placeholder="06 …" /></F>
        <F label={t.job} hint={t.optional}><input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" value={prof} onChange={(e) => setProf(e.target.value)} className={cls} /></F>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <F label={t.history} hint={t.onePerLine}><textarea autoComplete="off" autoCorrect="off" spellCheck={false} value={atcd} onChange={(e) => setAtcd(e.target.value)} rows={5} className={cls} placeholder={"HTA depuis 2019\nAppendicectomie 1998"} /></F>
        <F label={t.allergies} hint={t.onePerLine}><textarea autoComplete="off" autoCorrect="off" spellCheck={false} value={all} onChange={(e) => setAll(e.target.value)} rows={5} className={cls} placeholder={"Pénicilline (urticaire)"} /></F>
        <F label={t.treatments} hint={t.treatHint}><textarea autoComplete="off" autoCorrect="off" spellCheck={false} value={tt} onChange={(e) => setTt(e.target.value)} rows={5} className={cls} placeholder={"ramipril 5 mg · 1 cp le matin\nmetformine 1000 mg · 1 cp matin et soir"} /></F>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <button type="submit" disabled={!ok} className="flex min-h-11 items-center gap-2 rounded-[10px] bg-ink px-4 py-[9px] text-sm text-paper disabled:opacity-40">{initial ? d.save : t.create} <Kbd dark>⏎</Kbd></button>
        {initial && <button type="button" onClick={() => { if (confirm(t.confirmDelete(`${initial.prenomUsuel} ${initial.nomUsage}`, initial.notes.length))) { cab.remove(initial.id); router.push("/d"); } }} className="min-h-11 rounded-[10px] px-3 py-[9px] text-sm text-dim-2 hover:text-rec-text">{d.remove}</button>}
        <span className="flex-1" />
        <span className="text-xs text-dim-2">{doublon ? <span className="text-warn">{t.exists}<Link href={`/d/${doublon.id}`} className="underline">{t.openIt}</Link></span> : t.noVitale}</span>
      </div>
    </form>
  );
}

export function NouveauView() {
  const { t: d } = useT();
  return (
    <div className="flex min-h-dvh flex-col">
      <Header praticien={PRATICIEN} back="/d" />
      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-6 px-4 pb-10 pt-8 sm:px-6 sm:pt-12">
        <div className="flex flex-col gap-1.5"><h1 className="m-0 text-2xl font-medium tracking-[-.02em]">{d.local.newPatient}</h1><p className="m-0 text-sm text-dim-2">{d.local.newIntro}</p></div>
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
  const { t: d } = useT();
  const t = d.local;
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [info, setInfo] = React.useState<string | null>(null);
  const exporter = () => { const blob = new Blob([cab.exportJson()], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `locus-studio-cabinet-${new Date().toISOString().slice(0, 10)}.json`; a.click(); };
  return (
    <div className="flex min-h-dvh flex-col">
      <Header praticien={PRATICIEN} back="/" />
      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-6 px-4 pb-10 pt-8 sm:px-6 sm:pt-12">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="m-0 text-2xl font-medium tracking-[-.02em]">{t.cabinet}</h1>
          <span className="d">{t.count(cab.patients.length, cab.patients.reduce((n, p) => n + p.notes.length, 0))}</span>
          <span className="flex-1" />
          <Link href="/nouveau" className="flex items-center gap-2 rounded-[10px] bg-ink px-3.5 py-[8px] text-sm text-paper hover:text-paper"><I.plus /> {t.newPatient}</Link>
        </div>
        <p className="m-0 text-sm text-dim-2">{t.cabinetIntro}</p>
        {cab.persistError && <div role="alert" className="rounded-[10px] border border-rec px-3.5 py-2.5 text-sm text-rec-text">{cab.persistError}</div>}
        {info && <div role="status" className="rounded-[10px] bg-soft px-3.5 py-2.5 text-sm">{info}</div>}
        <div className="flex flex-col gap-1">
          {cab.patients.length === 0 && <div className="rounded-[14px] border border-dashed border-line px-5 py-8 text-center text-sm text-dim-2">{t.empty}</div>}
          {cab.patients.map((p) => (
            <Link key={p.id} href={`/d/${p.id}`} className="flex items-center gap-4 rounded-[10px] px-3.5 py-3 text-ink hover:bg-hover hover:text-ink">
              <Avatar initials={initials(p.prenomUsuel, p.nomUsage)} hue={(p.nomUsage.length * 37) % 360} />
              <span className="flex min-w-0 flex-1 flex-col"><span className="text-[15px]">{p.prenomUsuel} {p.nomUsage}</span><span className="text-[13px] text-dim">{t.rowMeta(ageDe(p.naissance), p.notes.length, p.traitements.length)}</span></span>
              <I.chevron />
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exporter} className="min-h-11 rounded-[10px] border border-line bg-paper px-3.5 py-[8px] text-sm text-ink hover:bg-hover">{t.export}</button>
          <button type="button" onClick={() => fileRef.current?.click()} className="min-h-11 rounded-[10px] border border-line bg-paper px-3.5 py-[8px] text-sm text-ink hover:bg-hover">{t.import}</button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { try { const r = cab.importJson(await f.text()); setInfo(r.importes + r.misAJour === 0 && r.ignores === 0 && r.conserves === 0 ? t.importEmpty : t.imported(r)); } catch { setInfo(t.unreadable); } } e.target.value = ""; }} />
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
  const { t: d, L } = useT();
  const t = d.local;
  const composer = useCompose();
  const p = cab.get(id);
  const [edit, setEdit] = React.useState(false);
  const [noteOpen, setNoteOpen] = React.useState(false);
  const [base, setBase] = React.useState<NoteLocal | undefined>(undefined);
  const [vueActions, setVueActions] = React.useState(false);
  const [doc, setDoc] = React.useState<ComposeAction | null>(null);
  const [nonce, setNonce] = React.useState(0);
  const [version, setVersion] = React.useState(0);
  const [ajout, setAjout] = React.useState<Ajout | undefined>(undefined);
  const [menu, setMenu] = React.useState(false);
  const notesRef = React.useRef<HTMLElement>(null);
  const ouvrir = React.useCallback((b?: Brouillon, k?: Ajout) => { const note = b?.noteId ? cab.get(id)?.notes.find((n) => n.id === b.noteId) : undefined; setBase(note); setAjout(k); setMenu(false); setVueActions(false); setNoteOpen(true); setNonce((n) => n + 1); }, [cab, id]);
  const fermer = () => { setNoteOpen(false); setBase(undefined); setVersion((v) => v + 1); };
  // Un brouillon en cours (consultation ou modification) rouvre l'éditeur directement, avec sa note de base.
  React.useEffect(() => { if (!cab.ready) return; const b = listBrouillons(id)[0]; if (b) ouvrir(b); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id, cab.ready]);
  if (!cab.ready) return <div className="flex min-h-dvh flex-col"><Header praticien={PRATICIEN} back="/d" /></div>;
  if (!p) return (
    <div className="flex min-h-dvh flex-col"><Header praticien={PRATICIEN} back="/d" /><main className="mx-auto flex max-w-[720px] flex-1 flex-col items-center justify-center gap-3 px-6 text-center"><h1 className="m-0 text-xl font-medium">{t.notFound}</h1><p className="m-0 text-sm text-dim-2">{t.notFoundHint}</p><Link href="/d" className="text-sm" style={{ color: "var(--agent)" }}>{t.cabinetLink}</Link></main></div>
  );
  const nom = `${p.prenomUsuel} ${p.nomUsage}`;
  const pr: PatientRendu = { nom, naissance: p.naissance.split("-").reverse().join("/"), sexe: p.sexe, age: ageDe(p.naissance), allergies: p.allergies };
  const ini = initials(p.prenomUsuel, p.nomUsage);
  const age = ageDe(p.naissance);
  // La dernière consultation (pas une commande validée depuis ⌘K) fait la phrase d'overview.
  const derniere = p.notes.find((n) => n.origine !== "commande");
  const entete = `${p.prenomUsuel} ${p.nomUsage}, ${age} ans${p.profession ? `, ${p.profession.toLowerCase()}` : ""}.`;
  const concl = derniere?.synthese?.split(/(?<=\.)\s/)[0];
  const prose = derniere ? `${entete} ${derniere.motif ? `Vu${p.sexe === "F" ? "e" : ""} le ${new Date(derniere.date).toLocaleDateString("fr-FR")} pour ${derniere.motif.toLowerCase()} : ` : "Dernière consultation : "}${concl ?? derniere.texte.slice(0, 120)}${concl?.endsWith(".") ? "" : "."}` : `${entete} ${p.antecedents.length ? `Antécédents : ${p.antecedents.slice(0, 3).join(", ")}.` : "Pas d'antécédent renseigné."} ${p.traitements.length ? `Sous ${p.traitements.slice(0, 3).map((t) => t.split(/[·,]/)[0].trim()).join(", ")}.` : ""}`;
  const aNoter = [...p.allergies.map((a) => ({ dot: "gray", texte: a, tag: "à savoir" })), ...(p.notes.length === 0 ? [{ dot: "accent", texte: t.vitaleNote, tag: "nouveau" }] : [])];

  return (
    <div className="flex min-h-dvh flex-col">
      <Header praticien={PRATICIEN} patient={{ id: p.id, nom, initials: ini, meta: `${age} a · ${p.sexe}`, href: `/d/${p.id}` }} back="/d" />
      <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-7 px-4 pb-8 pt-10 sm:px-6 sm:pt-16">
        <div className="flex flex-col gap-3">
          <h1 className="k m-0 px-px font-normal">{t.overview(derniere ? new Date(derniere.date).toLocaleDateString(d.dateLocale) : undefined)}</h1>
          <p className="m-0 text-[21px] leading-[1.45] tracking-[-.01em] sm:text-2xl">{prose}</p>
        </div>
        {cab.persistError && <div role="alert" className="rounded-[10px] border border-rec px-3.5 py-2.5 text-sm text-rec-text">{cab.persistError} <Link href="/d" className="underline">{t.cabinetLink}</Link></div>}
        {!noteOpen && <BrouillonBanner patientId={p.id} href={`/d/${p.id}`} onOpen={ouvrir} version={version} />}
        {aNoter.length > 0 && (
          <section className="flex flex-col">
            <span className="k px-1 pb-2.5">{d.dossier.ofNote}</span>
            {aNoter.map((n, i) => (
              <div key={i} className={cn("flex items-center gap-3 border-t border-line-4 px-1 py-3 text-[15px]", i === aNoter.length - 1 && "border-b")}>
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: n.dot === "accent" ? "var(--agent)" : "var(--gray-dot)" }} />
                <span className="flex-1">{n.texte}</span>
                <span className="d min-w-[46px] text-right" style={{ color: n.dot === "accent" ? "var(--agent)" : undefined }}>{L(n.tag)}</span>
              </div>
            ))}
          </section>
        )}
        <nav className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => setEdit((e) => !e)} aria-expanded={edit} className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm text-ink-3 hover:bg-hover"><I.chevron open={edit} color="currentColor" /> {t.fiche}</button>
          <span className="mx-1 h-[18px] w-px bg-line" />
          <button type="button" onClick={() => { setVueActions(false); fermer(); setTimeout(() => notesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 30); }} className={cn("flex items-center gap-2 rounded-[10px] px-2.5 py-2 text-sm hover:bg-hover", !vueActions ? "text-ink" : "text-ink-3")}>{t.notes} <span className="d">{p.notes.length}</span></button>
          <button type="button" onClick={() => { setVueActions((v) => !v); fermer(); }} aria-pressed={vueActions} className={cn("flex items-center gap-2 rounded-[10px] px-2.5 py-2 text-sm hover:bg-hover", vueActions ? "text-ink" : "text-ink-3")}>{t.validated} <span className="d">{p.notes.reduce((n, x) => n + x.actions.length, 0)}</span></button>
        </nav>
        {vueActions && (
          <section className="card overflow-hidden">
            <div className="flex items-center gap-3 border-b border-line-4 px-4 py-3"><span className="k">{t.validated}</span><span className="d">{p.notes.reduce((n, x) => n + x.actions.length, 0)}</span></div>
            {p.notes.flatMap((n) => n.actions.map((a) => ({ a, n }))).length === 0 && <div className="px-4 py-3 text-sm text-dim-2">{t.noValidated}</div>}
            {p.notes.flatMap((n) => n.actions.map((a) => ({ a, n }))).map(({ a, n }, i) => (
              <button type="button" key={`${n.id}-${a.id}`} onClick={() => setDoc(a)} className={cn("flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-hover", i > 0 && "border-t border-line-4")} title={d.note.seeSent}>
                <span className="d w-[42px] shrink-0 text-[11px]">{new Date(a.envoyeLe ?? n.date).toLocaleDateString(d.dateLocale, { day: "2-digit", month: "2-digit" })}</span>
                <span className="d flex h-6 min-w-6 shrink-0 items-center justify-center rounded-[6px] bg-soft px-1 text-[10px] text-ink-3">{a.code}</span>
                <span className="min-w-0 flex-1 truncate">{a.titre}</span>
                <span className="hidden text-[11px] text-dim-3 sm:inline">{L(a.destination)}</span>
                {a.renvoye && <span className="text-[11px] text-ok">{d.sent}</span>}
                <I.chevron />
              </button>
            ))}
          </section>
        )}
        {doc && <ActionPanel action={doc} patient={pr} onClose={() => setDoc(null)} />}
        {edit && <section className="card px-5 py-5"><PatientForm initial={p} onDone={() => setEdit(false)} /></section>}

        {noteOpen ? (
          <section className="card px-5 py-5"><NoteEditor key={`${base?.id ?? "nouvelle"}-${nonce}`} patientId={p.id} local={p} nom={nom} retour={`/d/${p.id}`} consultHref={`/d/${p.id}`} base={base} patient={pr} ajout={ajout} onRetour={fermer} onAnnuler={fermer} onSaved={() => setVersion((v) => v + 1)} /></section>
        ) : (
          <section ref={notesRef} className="flex scroll-mt-24 flex-col gap-2">
            <div className="flex items-center gap-3"><span className="k px-1">{t.notes}</span><span className="flex-1" /><button type="button" onClick={() => ouvrir()} className="flex min-h-10 items-center gap-2 rounded-[10px] bg-ink px-3.5 py-[8px] text-sm text-paper"><I.plus /> {t.consult}</button></div>
            {p.notes.length === 0 && <div className="rounded-[14px] border border-dashed border-line px-5 py-6 text-center text-sm text-dim-2">{t.noNotes}</div>}
            {p.notes.map((n) => <NoteRow key={n.id} n={n} patient={pr} onModifier={() => ouvrir({ patientId: p.id, noteId: n.id } as Brouillon)} onDelete={() => { cab.removeNote(p.id, n.id); setVersion((v) => v + 1); }} onDeleteAction={(aid) => { cab.saveNote(p.id, { ...n, actions: n.actions.filter((x) => x.id !== aid) }); setVersion((v) => v + 1); }} />)}
          </section>
        )}
      </main>
      <Omni placeholder={d.dossier.placeholderLocal} onSubmit={(t) => composer.run({ texte: t, patientId: p.id, patient: patientPayload(p), ecran: "dossier" })} suggestions={[{ k: d.keys.ordo, t: p.traitements[0] ? `Renouvelle ${p.traitements[0].split(/[·,]/)[0].trim()} pour 3 mois` : "Ordonnance : paracétamol 1 g, 3/j si douleur, 5 jours" }, { k: d.keys.rdv, t: "Revoir dans 6 semaines, 20 minutes" }, { k: d.keys.mail, t: `Mail à ${p.prenomUsuel} : résultats rassurants` }, { k: d.keys.arret, t: "Arrêt de travail 5 jours, sorties libres" }, { k: d.keys.question, t: "Quelle surveillance pour ce traitement ?" }]} cta={<div className="relative flex shrink-0 items-stretch"><button type="button" onClick={() => ouvrir()} className="flex min-h-11 items-center gap-2 whitespace-nowrap rounded-l-[10px] bg-ink px-3.5 py-[9px] text-sm font-medium text-paper sm:px-4">{d.dossier.consult}</button><button type="button" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-haspopup="menu" aria-label={t.addOther} className="flex min-h-11 w-9 items-center justify-center rounded-r-[10px] border-l border-paper/20 bg-ink text-paper"><I.chevron open={menu} color="var(--paper)" /></button>{menu && <div role="menu" className="absolute bottom-full right-0 z-20 mb-1 flex min-w-[200px] flex-col rounded-[12px] border border-line bg-paper p-1" style={{ boxShadow: "var(--shadow)" }}><span className="k px-3 pb-1 pt-2">{t.withoutNote}</span>{AJOUTS.map((a) => <button key={a.k} type="button" role="menuitem" onClick={() => ouvrir(undefined, a.k)} className="min-h-10 rounded-[8px] px-3 py-2 text-left text-sm text-ink hover:bg-hover">{d.note.ajouts[a.k] ?? a.label}</button>)}</div>}</div>}>
        {composer.open && <ComposeCard state={composer.state} onClose={composer.reset} onRetry={(i) => composer.run(i)} suivreSeul={false} patient={pr} onValide={(actions, plan) => { const now = new Date().toISOString(); const envoyees = actions.map((a) => ({ ...a, envoyeLe: now, renvoye: false })); cab.saveNote(p.id, { id: nid("n"), date: now, motif: envoyees.map((a) => a.code).filter((c, i, arr) => arr.indexOf(c) === i).join(" · "), texte: composer.state.input?.texte ?? "", actions: envoyees, synthese: plan.synthese, via: plan.via, origine: "commande" }); setVersion((v) => v + 1); return envoyees; }} />}
      </Omni>
    </div>
  );
}
