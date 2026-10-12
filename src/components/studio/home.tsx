"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { HomeData, PatientRef } from "@/studio/types";
import { Header, Kbd, I, Avatar } from "./chrome";
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

  const hits = React.useMemo(() => {
    const t = norm(q);
    if (!t) return [];
    const words = t.split(/\s+/).filter(Boolean);
    return data.patients.filter((p) => { const hay = norm(`${p.nomUsage} ${p.prenom} ${p.naissance} ${p.profession ?? ""}`); return words.every((w) => hay.includes(w)); }).sort((a, b) => (a.rdv ? 0 : 1) - (b.rdv ? 0 : 1)).slice(0, 5);
  }, [q, data.patients]);

  const matin = data.agenda.filter((a) => !a.apresMidi);
  const aprem = data.agenda.filter((a) => a.apresMidi);
  const rows = all ? data.agenda : matin;
  const items: { href?: string }[] = open ? hits.map((h) => ({ href: `/p/${h.id}` })) : rows.map((r) => ({ href: r.libre ? undefined : `/p/${r.patientId}` }));

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); inputRef.current?.focus(); setOpen(true); }
      if (e.key === "Escape") { setOpen(false); setQ(""); inputRef.current?.blur(); }
      if (document.activeElement === inputRef.current || !open) {
        if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(items.length - 1, s + 1)); }
        if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
        if (e.key === "Enter" && items[sel]?.href && (open || document.activeElement === document.body)) { e.preventDefault(); router.push(items[sel].href!); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items, sel, open, router]);

  const first = hits[0];
  const context = first?.rdv ? `RDV ${first.rdv} · motif agenda : ${data.agenda.find((a) => a.patientId === first.id)?.motif.toLowerCase()} · patient${first.nom.endsWith("e") ? "e" : ""} reconnu${first.nom.endsWith("e") ? "e" : ""} depuis l'agenda.` : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <Header praticien={data.praticien} />
      <main className="flex flex-1 flex-col items-center px-6 pb-12 pt-[14vh]">
        <div className="flex w-full max-w-[680px] flex-col gap-7">
          {!open && <h1 className="m-0 text-[28px] font-medium tracking-[-.02em]">Qui voyez-vous ?</h1>}
          <div className={cn("overflow-hidden rounded-[14px] border border-line bg-paper", open ? "shadow-[0_8px_24px_rgba(17,17,17,.06)]" : "")} style={!open ? { boxShadow: "var(--shadow)" } : undefined}>
            <div className={cn("flex items-center gap-3.5 px-5 py-[18px]", open && "border-b border-line-2")} onClick={() => { inputRef.current?.focus(); setOpen(true); }}>
              <I.search color={open ? "#111" : "#6B6B66"} />
              <label htmlFor="q" className="sr-only">Recherche</label>
              <input id="q" ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setSel(0); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Nom, date de naissance, ou une demande…" className="flex-1 bg-transparent text-[17px] text-ink outline-none placeholder:text-muted-3" />
              <Kbd>{open ? "esc" : "⌘K"}</Kbd>
            </div>
            {open && (
              <div className="p-2.5">
                <div className="k px-3 py-2">Patients</div>
                {hits.length === 0 && <div className="px-3 py-3 text-sm text-muted-2">{q ? "Aucun patient. Essayez un nom, une date de naissance." : "Tapez un nom, une date de naissance, ou une demande."}</div>}
                {hits.map((h, i) => <PatientRow key={h.id} p={h} active={i === sel} first={i === 0} data={data} onHover={() => setSel(i)} />)}
                <div className="k px-3 pb-2 pt-3.5">Actions</div>
                <div className="flex items-center gap-3 rounded-[10px] px-3 py-3 text-sm text-ink-2"><I.card /><span className="flex-1">Lire la carte Vitale pour confirmer</span><Kbd>⌘V</Kbd></div>
                <div className="flex items-center gap-3 rounded-[10px] px-3 py-3 text-sm text-ink-2"><I.plus /><span className="flex-1">Nouveau patient{q ? ` « ${q.slice(0, 1).toUpperCase() + q.slice(1, 10)}${q.length > 10 ? "…" : ""} »` : ""}</span></div>
              </div>
            )}
          </div>
          {open && context && <p className="m-0 text-[13px] text-muted-2">{context}</p>}
          {!open && (
            <>
              <div className="flex flex-wrap gap-2">
                <span className="kbd text-xs" style={{ padding: "6px 10px", borderRadius: 8 }}>Lire la carte Vitale</span>
                <Link href="/inbox" className="kbd text-xs" style={{ padding: "6px 10px", borderRadius: 8 }}>Courriers non lus · {data.courriersNonLus}</Link>
                <Link href="/inbox" className="kbd text-xs" style={{ padding: "6px 10px", borderRadius: 8 }}>Résultats bio · {data.bioNonLues}</Link>
              </div>
              <section className="flex flex-col gap-1">
                <div className="k px-3.5 pb-2">Agenda · ce matin</div>
                {matin.map((r, i) => <Slot key={r.heure + r.patientId} r={r} active={sel === i} onHover={() => setSel(i)} />)}
                {all && (
                  <>
                    <div className="k px-3.5 pb-2 pt-4">Cet après-midi</div>
                    {aprem.map((r, i) => <Slot key={r.heure + r.patientId} r={r} active={sel === matin.length + i} onHover={() => setSel(matin.length + i)} />)}
                  </>
                )}
                <button type="button" onClick={() => setAll((v) => !v)} aria-expanded={all} className="mt-1.5 self-start rounded-[10px] px-3.5 py-2.5 text-sm text-ink-3 hover:bg-hover">{all ? "Replier" : `Voir tout l'agenda · ${data.agenda.filter((a) => !a.libre).length} rendez-vous`}</button>
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

function Slot({ r, active, onHover }: { r: HomeData["agenda"][number]; active: boolean; onHover: () => void }) {
  const inner = <><span className="k w-12" style={r.prochain ? { color: "#1A4DFF" } : undefined}>{r.heure}</span><span className={cn("flex-1 text-[15px]", r.prochain && "font-medium")}>{r.nom}</span><span className="text-[13px] text-muted-2">{r.motif}</span></>;
  const cls = cn("flex items-center gap-4 rounded-[10px] px-3.5 py-3", active ? "bg-hover" : "hover:bg-hover");
  if (r.libre) return <div className={cls} onMouseEnter={onHover}>{inner}</div>;
  return <Link href={`/p/${r.patientId}`} className={cls} onMouseEnter={onHover} style={{ color: "#111" }}>{inner}</Link>;
}

function PatientRow({ p, active, first, data, onHover }: { p: PatientRef; active: boolean; first: boolean; data: HomeData; onHover: () => void }) {
  const fam = data.patients.filter((x) => x.id !== p.id && x.nomUsage === p.nomUsage);
  return (
    <>
      <Link href={`/p/${p.id}`} onMouseEnter={onHover} className={cn("flex items-center gap-4 rounded-[10px] px-3 py-3.5", active ? "bg-accent-soft-2" : "hover:bg-hover")} style={{ color: "#111" }}>
        <Avatar initials={p.initials} accent={first} />
        <span className="flex flex-1 flex-col gap-[3px]"><span className={cn("text-[15px]", first && "font-medium")}>{p.nom}</span><span className="text-[13px] text-muted">{p.age} ans · né{/^(Marguerite|Léa|Inès|Sophie|Claire|Monique|Nadia|Emma|Thi|Aminata|Hélène|Josiane)/.test(p.prenom) ? "e" : ""} le {p.naissance}{p.profession ? ` · ${p.profession}` : ""}</span></span>
        {p.ins === "qualifiee" && <span className="flex items-center gap-1.5 text-xs" style={{ color: "#1F6B3A" }}><I.check />INS qualifiée</span>}
        {active && <Kbd>⏎</Kbd>}
      </Link>
      {first && fam.slice(0, 1).map((f) => (
        <Link key={f.id} href={`/p/${f.id}`} className="flex items-center gap-4 rounded-[10px] px-3 py-3.5 hover:bg-hover" style={{ color: "#111" }}>
          <Avatar initials={f.initials} />
          <span className="flex flex-1 flex-col gap-[3px]"><span className="text-[15px]">{f.nom}</span><span className="text-[13px] text-muted">{f.age} ans · même nom</span></span>
        </Link>
      ))}
    </>
  );
}
