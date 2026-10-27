"use client";
import * as React from "react";
import Link from "./nav";
import type { InboxView as IV, InboxRow, InboxKind, Urgence } from "@/studio/types";
import { Header, Omni, Avatar, I, useT } from "./chrome";
import { ComposeCard, useCompose } from "./compose";
import { dialogOuvert } from "./rendu";
import { cn } from "@/lib/cn";

const GROUPES: { urg: Urgence[]; id: "today" | "week" | "info" }[] = [{ urg: ["immediate", "jour"], id: "today" }, { urg: ["semaine"], id: "week" }, { urg: ["aucune"], id: "info" }];

/* Ce qui a été traité dans la session (envoyé, classé) : par boîte, le temps de la journée, sur ce poste. */
type Fait = { what: "envoyé" | "classé"; box: InboxKind; le: string; texte?: string };
const FAITS_KEY = "locus-studio-inbox-faits";
function readFaits(): Record<string, Fait> { try { const v = JSON.parse(sessionStorage.getItem(FAITS_KEY) ?? "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; } }
function writeFaits(f: Record<string, Fait>) { try { sessionStorage.setItem(FAITS_KEY, JSON.stringify(f)); } catch {} }

/** Les trois boîtes : un tri automatique, une ligne par chose, rien d'autre. */
export function InboxView({ v, praticien }: { v: IV; praticien: { initials: string } }) {
  const [filtre, setFiltre] = React.useState<string>("tous");
  const [open, setOpen] = React.useState<string | null>(null);
  const [faits, setFaits] = React.useState<Record<string, Fait>>({});
  const [tousVus, setTousVus] = React.useState(false);
  const composer = useCompose();
  const { t: d } = useT();
  const TITRES = d.inbox.titles;
  const DE = d.inbox.from;
  const t = TITRES[v.kind];
  React.useEffect(() => { setFaits(readFaits()); }, []);
  const fait = React.useCallback((id: string, what: Fait["what"], texte?: string) => { setFaits((f) => { const n = { ...f, [id]: { what, box: v.kind, le: new Date().toISOString(), texte } }; writeFaits(n); return n; }); setOpen(null); }, [v.kind]);
  const rows = v.rows.filter((r) => filtre === "tous" || r.deType === filtre).filter((r) => !faits[r.id]);
  const nonLus = rows.filter((r) => r.nonLu);
  const vus = rows.filter((r) => !r.nonLu);
  const types = v.kind === "messages" ? ["tous", "patient", "confrere", "secretariat", "pharmacie"] : [];
  // Les compteurs des pastilles suivent ce qui a été traité ici.
  const traites = (k: InboxKind) => Object.values(faits).filter((f) => f.box === k).length;
  const compte = (k: InboxKind) => Math.max(0, v.counts[k] - traites(k));
  const ouverte = open ? v.rows.find((r) => r.id === open) : undefined;
  const faitsIci = Object.values(faits).filter((f) => f.box === v.kind);

  // esc ferme le message ouvert avant de remonter d'un cran.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (dialogOuvert()) return;
      if (e.key === "Escape" && open) { e.preventDefault(); e.stopPropagation(); setOpen(null); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);
  /* La réponse se rédige à la demande, live : le composer reçoit le message ouvert en contexte. */
  const rediger = (r: InboxRow) => composer.run({ texte: `Propose une réponse à ce message de ${r.de}.`, ecran: "inbox", boite: v.kind, patientId: r.patient.id, docId: r.id });
  // Sans tri live, pas de groupes d'urgence inventés : seule la biologie se trie (sur les drapeaux du laboratoire).
  const trie = nonLus.some((r) => r.urgence !== "aucune");

  return (
    <div className="flex min-h-dvh flex-col">
      <Header praticien={praticien} back="/" />
      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-6 px-4 pb-8 pt-8 sm:px-6 sm:pt-12">
        <nav aria-label={d.inbox.boxes} className="flex flex-wrap gap-1.5">
          {(["courriers", "bio", "messages"] as InboxKind[]).map((k) => (
            <Link key={k} href={`/inbox/${k}`} aria-current={k === v.kind ? "page" : undefined} className={cn("flex min-h-10 items-center gap-2 rounded-full border px-3 py-[7px] text-[13px] hover:text-ink", k === v.kind ? "border-ink bg-ink text-paper hover:text-paper" : "border-line bg-paper text-ink-2")}>
              {TITRES[k].h1}{compte(k) > 0 && <span className={cn("d text-[11px]", k === v.kind ? "text-paper" : "")} style={k !== v.kind ? { color: "var(--agent)" } : undefined}>{compte(k)}</span>}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[28px] font-extrabold tracking-[-.03em]">{t.h1}{nonLus.length > 0 && <span className="ml-3 text-base font-normal text-dim-2">{d.inbox.unread(nonLus.length)}</span>}</h1>
          <p className="m-0 text-sm text-dim-2">{t.sous}</p>
        </div>
        {types.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {types.map((x) => <button key={x} type="button" onClick={() => setFiltre(x)} aria-pressed={filtre === x} className={cn("min-h-9 rounded-full border px-3 py-[6px] text-xs", filtre === x ? "border-ink bg-ink text-paper" : "border-line bg-paper text-ink-2 hover:bg-hover")}>{x === "tous" ? d.inbox.all : DE[x]}</button>)}
          </div>
        )}

        {nonLus.length === 0 && <div className="rounded-[14px] border border-dashed border-line px-5 py-8 text-center text-sm text-dim-2">{t.vide}</div>}
        {!trie && nonLus.length > 0 && (
          <section className="flex flex-col gap-1">
            <span className="k px-1 pb-1.5">{d.inbox.unreadHead} · {nonLus.length}</span>
            {nonLus.map((r) => <Row key={r.id} r={r} kind={v.kind} open={open === r.id} onOpen={() => setOpen(open === r.id ? null : r.id)} onDone={(what) => fait(r.id, what)} onDraft={() => rediger(r)} busy={composer.state.busy} />)}
          </section>
        )}
        {trie && GROUPES.map((g) => {
          const rs = nonLus.filter((r) => g.urg.includes(r.urgence));
          if (!rs.length) return null;
          return (
            <section key={g.id} className="flex flex-col gap-1">
              <span className="k px-1 pb-1.5" style={g.id === "today" ? { color: "var(--warn)" } : undefined}>{d.inbox.groups[g.id]} · {rs.length}</span>
              {rs.map((r) => <Row key={r.id} r={r} kind={v.kind} open={open === r.id} onOpen={() => setOpen(open === r.id ? null : r.id)} onDone={(what) => fait(r.id, what)} onDraft={() => rediger(r)} busy={composer.state.busy} />)}
            </section>
          );
        })}
        {vus.length > 0 && (
          <section className="flex flex-col gap-1">
            <span className="k px-1 pb-1.5">{d.inbox.seen} · {vus.length}</span>
            {(tousVus ? vus : vus.slice(0, 8)).map((r) => <Row key={r.id} r={r} kind={v.kind} open={open === r.id} onOpen={() => setOpen(open === r.id ? null : r.id)} onDone={(what) => fait(r.id, what)} onDraft={() => rediger(r)} busy={composer.state.busy} muted />)}
            {vus.length > 8 && <button type="button" onClick={() => setTousVus((x) => !x)} className="mt-1 min-h-10 self-start rounded-[10px] px-3 py-2 text-sm text-ink-3 hover:bg-hover">{tousVus ? d.collapse : d.inbox.seeMore(vus.length - 8)}</button>}
          </section>
        )}
        {faitsIci.length > 0 && <p className="m-0 text-xs text-dim-2">{d.inbox.treated(faitsIci.length, faitsIci.filter((f) => f.what === "envoyé").length, faitsIci.filter((f) => f.what === "classé").length)}</p>}
      </main>
      <Omni onSubmit={(t) => composer.run({ texte: t, ecran: "inbox", boite: v.kind, patientId: ouverte?.patient.id, docId: ouverte?.id })} placeholder={ouverte ? d.inbox.phAbout(ouverte.patient.nom) : v.kind === "messages" ? d.inbox.phMessages : v.kind === "bio" ? d.inbox.phBio : d.inbox.phLetters} suggestions={ouverte ? [{ k: d.keys.repondre, t: `Réponds à ${ouverte.de.split(" (")[0]} que c'est normal, pas d'inquiétude` }, { k: d.keys.rdv, t: `Rendez-vous pour ${ouverte.patient.nom} cette semaine, 15 minutes` }, { k: d.keys.dossier, t: `Ordonnance : renouvellement pour ${ouverte.patient.nom}` }] : v.kind === "messages" ? [{ k: d.keys.ouvrir, t: "Ouvre le dossier de Claire Moreau" }, { k: d.keys.question, t: "Angine de l'enfant : quand un antibiotique ?" }] : v.kind === "bio" ? [{ k: d.keys.question, t: "LDL à 1,32 g/L sans facteur de risque : quelle cible ?" }, { k: d.keys.ouvrir, t: "Ouvre le dossier de Josiane Petit" }] : [{ k: d.keys.question, t: "Épicondylite résistante : quelle prise en charge ?" }, { k: d.keys.ouvrir, t: "Ouvre le dossier de Claire Moreau" }]}>{composer.open && <ComposeCard state={composer.state} onClose={composer.reset} onRetry={(i) => composer.run(i)} />}</Omni>
    </div>
  );
}

function Row({ r, kind, open, onOpen, onDone, onDraft, busy, muted }: { r: InboxRow; kind: InboxKind; open: boolean; onOpen: () => void; onDone: (what: "classé") => void; /** Demander la réponse au composer. */ onDraft: () => void; busy?: boolean; muted?: boolean }) {
  const { t: d, L } = useT();
  const DE = d.inbox.from;
  const dot = r.urgence === "immediate" ? "var(--rec)" : r.urgence === "jour" ? "var(--warn-dot)" : r.urgence === "semaine" ? "var(--agent)" : "var(--gray-dot)";
  const head = (
    <>
      <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full" style={{ background: r.nonLu ? dot : "transparent", boxShadow: r.nonLu ? undefined : `inset 0 0 0 1.5px ${dot}` }} />
      <Avatar initials={r.patient.initials} hue={r.patient.hue} size={30} className="mt-px" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-baseline gap-x-2"><span className={cn("text-[15px]", r.nonLu && !muted && "font-medium")}>{r.patient.nom}</span><span className="text-[13px] text-dim-2">{r.de}{r.deType && DE[r.deType] && r.de !== r.patient.nom ? ` · ${DE[r.deType]}` : ""}</span></span>
        <span className={cn("text-sm", muted ? "text-dim-2" : "text-ink-2")}>{L(r.titre)}</span>
        {r.resume && !open && <span className="line-clamp-2 text-[13px] text-dim-2 sm:truncate">{r.resume}</span>}
      </span>
      <span className="d shrink-0 text-[11px]">{L(r.quand)}</span>
    </>
  );
  const cls = cn("flex min-h-12 w-full items-start gap-3 rounded-[12px] px-3 py-3 text-left text-ink hover:bg-hover hover:text-ink");
  if (kind !== "messages" && r.href) return <Link href={`${r.href}?from=${kind}`} className={cls}>{head}<I.chevron /></Link>;
  return (
    <div className={cn("rounded-[12px]", open && "bg-paper ring-1 ring-line")}>
      <button type="button" onClick={onOpen} aria-expanded={open} className={cls}>{head}<I.chevron open={open} /></button>
      {open && (
        <div className="flex flex-col gap-3 px-3 pb-3 sm:pl-[68px]">
          <p className="m-0 whitespace-pre-line text-sm leading-relaxed">{r.corps}</p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={onDraft} disabled={busy} className="flex min-h-11 items-center rounded-[10px] bg-ink px-3.5 py-2 text-sm text-paper disabled:opacity-40">{d.inbox.draft}</button>
            <Link href={`/p/${r.patient.id}`} className="flex min-h-11 items-center rounded-[10px] border border-line bg-paper px-3.5 py-2 text-sm text-ink hover:bg-hover hover:text-ink">{d.openRecord}</Link>
            <button type="button" onClick={() => onDone("classé")} className="min-h-11 rounded-[10px] px-3 py-2 text-sm text-dim-2 hover:bg-hover">{d.inbox.file}</button>
          </div>
        </div>
      )}
    </div>
  );
}
