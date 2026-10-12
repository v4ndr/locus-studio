"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { HomeData, PatientRef } from "@/studio/types";
import { Header, Kbd, I, Avatar } from "./chrome";
import { ComposeCard, useCompose } from "./compose";
import { useCabinet, ageDe } from "@/store/cabinet";
import { initials } from "@/lib/format";
import { norm } from "@/lib/norm";
import { cn } from "@/lib/cn";

/** L'accueil : « Qui voyez-vous ? ». Une recherche, l'agenda, rien d'autre. */
export function Home({ data }: { data: HomeData }) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [all, setAll] = React.useState(false);
  const [sel, setSel] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const composer = useCompose();
  const cab = useCabinet();
  // Les dossiers créés sur ce poste rejoignent la patientèle de la palette.
  const patients = React.useMemo<PatientRef[]>(() => [...cab.patients.map((p) => ({ id: p.id, nom: `${p.prenomUsuel} ${p.nomUsage}`, prenom: p.prenomUsuel, nomUsage: p.nomUsage, initials: initials(p.prenomUsuel, p.nomUsage), hue: (p.nomUsage.length * 37) % 360, age: ageDe(p.naissance), naissance: p.naissance.split("-").reverse().join("/"), profession: p.profession?.toLowerCase(), ins: "provisoire" })), ...data.patients], [cab.patients, data.patients]);

  const hits = React.useMemo(() => {
    const t = norm(q);
    if (!t) return [];
    const words = t.split(/\s+/).filter(Boolean);
    return patients.filter((p) => { const hay = norm(`${p.nomUsage} ${p.prenom} ${p.naissance} ${p.profession ?? ""}`); return words.every((w) => hay.includes(w)); }).sort((a, b) => (a.rdv ? 0 : 1) - (b.rdv ? 0 : 1)).slice(0, 5);
  }, [q, patients]);

  const matin = data.agenda.filter((a) => !a.apresMidi);
  const aprem = data.agenda.filter((a) => a.apresMidi);
  // Replié : les prochains seulement, à partir du rendez-vous en cours, quatre au plus.
  const from = Math.max(0, data.agenda.findIndex((a) => a.prochain));
  const prochains = data.agenda.slice(from, from + 4);
  const rows = all ? data.agenda : prochains;
  const reste = data.agenda.filter((a) => !a.libre).length - prochains.filter((a) => !a.libre).length;
  // Dans la palette : les patients trouvés, puis « Demander à Locus » ; vide : les exemples.
  const askRow = open && q.trim().length > 1;
  const hrefOf = (id: string) => (id.startsWith("loc_") ? `/d/${id}` : `/p/${id}`);
  const items: { href?: string; ask?: boolean }[] = open ? (q ? [...hits.map((h) => ({ href: hrefOf(h.id) })), ...(askRow ? [{ ask: true }] : [])] : EXEMPLES.map((e) => ({ href: e.href }))) : rows.map((r) => ({ href: r.libre ? undefined : `/p/${r.patientId}` }));
  const demander = React.useCallback((texte: string) => { setOpen(false); setQ(""); inputRef.current?.blur(); composer.run({ texte, ecran: "home" }); }, [composer]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); inputRef.current?.focus(); setOpen(true); }
      if (e.key === "Escape") { setOpen(false); setQ(""); inputRef.current?.blur(); }
      if (document.activeElement === inputRef.current || !open) {
        if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(items.length - 1, s + 1)); }
        if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
        if (e.key === "Enter" && items[sel]?.ask && open) { e.preventDefault(); demander(q.trim()); }
        else if (e.key === "Enter" && items[sel]?.href && (open || document.activeElement === document.body)) { e.preventDefault(); router.push(items[sel].href!); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items, sel, open, router, q, demander]);

  const first = hits[0];
  const context = first?.rdv ? `RDV ${first.rdv} · motif agenda : ${data.agenda.find((a) => a.patientId === first.id)?.motif.toLowerCase()} · patient${first.nom.endsWith("e") ? "e" : ""} reconnu${first.nom.endsWith("e") ? "e" : ""} depuis l'agenda.` : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <Header praticien={data.praticien} />
      <main className="flex flex-1 flex-col items-center px-4 pb-12 pt-[8vh] sm:px-6 sm:pt-[14vh]">
        <div className="flex w-full max-w-[680px] flex-col gap-7">
          {!open && <h1 className="m-0 text-[26px] font-medium tracking-[-.02em] sm:text-[28px]">Qui voyez-vous ?</h1>}
          <div className={cn("overflow-hidden rounded-[14px] border border-line bg-paper", open ? "shadow-[0_8px_24px_rgba(17,17,17,.06)]" : "")} style={!open ? { boxShadow: "var(--shadow)" } : undefined}>
            <div className={cn("flex items-center gap-3.5 px-5 py-[18px]", open && "border-b border-line-2")} onClick={() => { inputRef.current?.focus(); setOpen(true); }}>
              <I.search color={open ? "var(--ink)" : "var(--muted-2)"} />
              <label htmlFor="q" className="sr-only">Recherche</label>
              <input id="q" ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setSel(0); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Nom, date de naissance, ou une demande…" className="flex-1 bg-transparent text-[17px] text-ink outline-none placeholder:text-muted-3" />
              <Kbd>{open ? "esc" : "⌘K"}</Kbd>
            </div>
            {open && (
              <div className="p-2.5">
                <div className="k px-3 py-2">Patients</div>
                {hits.length === 0 && q && <div className="px-3 py-3 text-sm text-muted-2">Aucun patient à ce nom.</div>}
                {hits.map((h, i) => <PatientRow key={h.id} p={h} active={i === sel} first={i === 0} data={data} onHover={() => setSel(i)} />)}
                {askRow && (
                  <button type="button" onMouseEnter={() => setSel(hits.length)} onClick={() => demander(q.trim())} className={cn("flex w-full items-center gap-3 rounded-[10px] px-3 py-3 text-left text-sm text-ink", sel === hits.length ? "bg-accent-soft-2" : "hover:bg-hover")}>
                    <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold" style={{ color: "var(--accent)" }}>⌘K</span>
                    <span className="flex min-w-0 flex-1 flex-col gap-[3px]"><span className="text-[15px]">Demander à Locus</span><span className="truncate text-[13px] text-muted">« {q} » — une ordonnance, un rendez-vous, un message, une question : il compose, vous validez.</span></span>
                    {sel === hits.length && <Kbd>⏎</Kbd>}
                  </button>
                )}
                {hits.length === 0 && !q && (
                  <>
                    <div className="px-3 pb-2 text-sm text-muted-2">Un nom, une date de naissance, ou directement une demande :</div>
                    {EXEMPLES.map((e, i) => (
                      <Link key={e.t} href={e.href} onMouseEnter={() => setSel(i)} className={cn("flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm text-ink hover:text-ink", i === sel ? "bg-accent-soft-2" : "hover:bg-hover")}>
                        <span className="d w-[72px] shrink-0 text-[10px]">{e.k}</span><span className="min-w-0 flex-1 truncate">{e.t}</span>{i === sel && <Kbd>⏎</Kbd>}
                      </Link>
                    ))}
                  </>
                )}
                <div className="k px-3 pb-2 pt-3.5">Actions</div>
                <div className="flex items-center gap-3 rounded-[10px] px-3 py-3 text-sm text-ink-2"><I.card /><span className="flex-1">Lire la carte Vitale pour confirmer</span><Kbd>⌘V</Kbd></div>
                <Link href={`/nouveau${q ? `?q=${encodeURIComponent(q)}` : ""}`} className="flex items-center gap-3 rounded-[10px] px-3 py-3 text-sm text-ink-2 hover:bg-hover hover:text-ink"><I.plus /><span className="flex-1">Nouveau patient{q ? ` « ${q.slice(0, 1).toUpperCase() + q.slice(1, 24)}${q.length > 24 ? "…" : ""} »` : ""} · sans carte Vitale</span></Link>
              </div>
            )}
          </div>
          {open && context && <p className="m-0 text-[13px] text-muted-2">{context}</p>}
          {composer.open && <ComposeCard state={composer.state} onClose={composer.reset} />}
          {!open && (
            <>
              <div className="flex flex-wrap gap-2">
                <Pill href="/inbox/courriers" label="Courriers" n={data.courriersNonLus} />
                <Pill href="/inbox/bio" label="Résultats bio" n={data.bioNonLues} />
                <Pill href="/inbox/messages" label="Messages" n={data.messagesNonLus} />
                <Pill href="/d" label="Cabinet local" n={cab.patients.length} />
                <Link href="/nouveau" className="flex items-center gap-1.5 rounded-lg border border-dashed border-line px-2.5 py-1.5 text-xs text-ink-2 hover:bg-hover hover:text-ink"><I.plus /> Nouveau patient</Link>
              </div>
              <section className="flex flex-col gap-1">
                {!all && (
                  <>
                    <div className="k px-3.5 pb-2">Agenda · à venir</div>
                    {prochains.map((r, i) => <Slot key={r.heure + r.patientId} r={r} active={sel === i} onHover={() => setSel(i)} />)}
                  </>
                )}
                {all && (
                  <>
                    <div className="k px-3.5 pb-2">Ce matin</div>
                    {matin.map((r, i) => <Slot key={r.heure + r.patientId} r={r} active={sel === i} onHover={() => setSel(i)} />)}
                    <div className="k px-3.5 pb-2 pt-4">Cet après-midi</div>
                    {aprem.map((r, i) => <Slot key={r.heure + r.patientId} r={r} active={sel === matin.length + i} onHover={() => setSel(matin.length + i)} />)}
                  </>
                )}
                <button type="button" onClick={() => setAll((v) => !v)} aria-expanded={all} className="mt-1.5 self-start rounded-[10px] px-3.5 py-2.5 text-sm text-ink-3 hover:bg-hover">{all ? "Replier" : `Voir tout l'agenda · ${reste} autre${reste > 1 ? "s" : ""} rendez-vous`}</button>
              </section>
            </>
          )}
        </div>
      </main>
      <footer className="flex flex-wrap justify-center gap-5 p-5">
        <span className="k"><Kbd>↑↓</Kbd> naviguer</span>
        <span className="k"><Kbd>⏎</Kbd> ouvrir</span>
        <span className="k"><Kbd>⌥ espace</Kbd> dicter</span>
      </footer>
    </div>
  );
}

/** Les trois boîtes, en pastilles : le compte des non-lus, triés par Locus. */
function Pill({ href, label, n }: { href: string; label: string; n: number }) {
  return <Link href={href} className="flex items-center gap-2 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs text-ink hover:bg-hover hover:text-ink"><span>{label}</span>{n > 0 ? <span className="d rounded-[5px] bg-accent-soft px-1.5 text-[11px]" style={{ color: "var(--accent)" }}>{n}</span> : <span className="d text-[11px]">0</span>}</Link>;
}

/** Ce qu'on peut demander directement depuis l'accueil, sans ouvrir un dossier. */
const EXEMPLES: { k: string; t: string; href: string }[] = [
  { k: "ordo", t: "Renouvelle l'ordonnance de Claire Moreau pour 3 mois", href: "/p/pat_cmoreau" },
  { k: "rdv", t: "Rendez-vous Lucas Petit, rappel vaccin, dans un mois", href: "/p/pat_petit" },
  { k: "courriers", t: "Qu'est-ce qui est arrivé ce matin ?", href: "/inbox/courriers" },
  { k: "bio", t: "Les résultats hors norme de la semaine", href: "/inbox/bio" },
  { k: "message", t: "Réponds à la pharmacie pour M. Bernard", href: "/inbox/messages" },
];

function Slot({ r, active, onHover }: { r: HomeData["agenda"][number]; active: boolean; onHover: () => void }) {
  const inner = <><span className="k w-12 shrink-0" style={r.prochain ? { color: "var(--accent)" } : undefined}>{r.heure}</span><span className={cn("min-w-0 flex-1 truncate text-[15px]", r.prochain && "font-medium")}>{r.nom}</span><span className="hidden text-[13px] text-muted-2 sm:inline">{r.motif}</span></>;
  const cls = cn("flex items-center gap-3 rounded-[10px] px-3.5 py-3 text-ink hover:text-ink sm:gap-4", active ? "bg-hover" : "hover:bg-hover");
  if (r.libre) return <div className={cn(cls, "text-muted-2")} onMouseEnter={onHover}>{inner}</div>;
  return <Link href={`/p/${r.patientId}`} className={cls} onMouseEnter={onHover}>{inner}</Link>;
}

function PatientRow({ p, active, first, data, onHover }: { p: PatientRef; active: boolean; first: boolean; data: HomeData; onHover: () => void }) {
  const fam = data.patients.filter((x) => x.id !== p.id && x.nomUsage === p.nomUsage);
  return (
    <>
      <Link href={p.id.startsWith("loc_") ? `/d/${p.id}` : `/p/${p.id}`} onMouseEnter={onHover} className={cn("flex items-center gap-3 rounded-[10px] px-3 py-3.5 text-ink hover:text-ink sm:gap-4", active ? "bg-accent-soft-2" : "hover:bg-hover")}>
        <Avatar initials={p.initials} accent={first} />
        <span className="flex flex-1 flex-col gap-[3px]"><span className={cn("text-[15px]", first && "font-medium")}>{p.nom}</span><span className="text-[13px] text-muted">{p.age} ans · né{/^(Marguerite|Léa|Inès|Sophie|Claire|Monique|Nadia|Emma|Thi|Aminata|Hélène|Josiane)/.test(p.prenom) ? "e" : ""} le {p.naissance}{p.profession ? ` · ${p.profession}` : ""}</span></span>
        {p.ins === "qualifiee" && <span className="hidden items-center gap-1.5 text-xs text-ok sm:flex"><I.check />INS qualifiée</span>}
        {p.ins === "provisoire" && <span className="hidden text-xs text-muted-2 sm:inline">dossier local</span>}
        {active && <Kbd>⏎</Kbd>}
      </Link>
      {first && fam.slice(0, 1).map((f) => (
        <Link key={f.id} href={`/p/${f.id}`} className="flex items-center gap-3 rounded-[10px] px-3 py-3.5 text-ink hover:bg-hover hover:text-ink sm:gap-4">
          <Avatar initials={f.initials} />
          <span className="flex flex-1 flex-col gap-[3px]"><span className="text-[15px]">{f.nom}</span><span className="text-[13px] text-muted">{f.age} ans · même nom</span></span>
        </Link>
      ))}
    </>
  );
}
