"use client";
import * as React from "react";
import Link from "next/link";
import type { InboxView as IV, InboxRow, InboxKind, Urgence } from "@/studio/types";
import { Header, Omni, Avatar, Kbd, I } from "./chrome";
import { ComposeCard, useCompose } from "./compose";
import { dialogOuvert } from "./rendu";
import { cn } from "@/lib/cn";

const TITRES: Record<InboxKind, { h1: string; sous: string; vide: string }> = {
  courriers: { h1: "Courriers", sous: "Comptes rendus et lettres arrivés par MSSanté, DMP, scan. Lus par Locus avant vous.", vide: "Rien de nouveau par courrier." },
  bio: { h1: "Résultats bio", sous: "Les résultats du serveur de laboratoire, hors norme d'abord.", vide: "Aucun résultat en attente." },
  messages: { h1: "Messages", sous: "Patients, confrères, secrétariat, pharmacie — triés par urgence, la réponse déjà préparée.", vide: "Aucun message en attente." },
};
const GROUPES: { urg: Urgence[]; label: string }[] = [{ urg: ["immediate", "jour"], label: "À voir aujourd'hui" }, { urg: ["semaine"], label: "Cette semaine" }, { urg: ["aucune"], label: "Pour info" }];
const DE: Record<string, string> = { patient: "patient", confrere: "confrère", secretariat: "secrétariat", pharmacie: "pharmacie", labo: "labo", autre: "" };
const INTENTION: Record<string, string> = { renouvellement: "renouvellement", resultat: "résultat", symptome: "symptôme", administratif: "administratif", rdv: "rendez-vous", question: "question", autre: "" };

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

  // esc ferme le message ouvert avant de remonter d'un cran ; ⌘⏎ envoie la réponse du message ouvert.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (dialogOuvert()) return;
      if (e.key === "Escape" && open) { e.preventDefault(); e.stopPropagation(); setOpen(null); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && ouverte?.reponse && !composer.open) { e.preventDefault(); e.stopPropagation(); const ta = document.getElementById(`rep-${ouverte.id}`) as HTMLTextAreaElement | null; fait(ouverte.id, "envoyé", ta?.value ?? ouverte.reponse); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, ouverte, fait, composer.open]);

  return (
    <div className="flex min-h-dvh flex-col">
      <Header praticien={praticien} back="/" />
      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-6 px-4 pb-8 pt-8 sm:px-6 sm:pt-12">
        <nav aria-label="Boîtes" className="flex flex-wrap gap-1.5">
          {(["courriers", "bio", "messages"] as InboxKind[]).map((k) => (
            <Link key={k} href={`/inbox/${k}`} aria-current={k === v.kind ? "page" : undefined} className={cn("flex min-h-10 items-center gap-2 rounded-full border px-3 py-[7px] text-[13px] hover:text-ink", k === v.kind ? "border-ink bg-ink text-paper hover:text-paper" : "border-line bg-paper text-ink-2")}>
              {TITRES[k].h1}{compte(k) > 0 && <span className={cn("d text-[11px]", k === v.kind ? "text-paper" : "")} style={k !== v.kind ? { color: "var(--accent)" } : undefined}>{compte(k)}</span>}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-2xl font-medium tracking-[-.02em]">{t.h1}{nonLus.length > 0 && <span className="ml-3 text-base font-normal text-muted-2">{nonLus.length} non lu{nonLus.length > 1 ? "s" : ""}</span>}</h1>
          <p className="m-0 text-sm text-muted-2">{t.sous}</p>
        </div>
        {types.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {types.map((x) => <button key={x} type="button" onClick={() => setFiltre(x)} aria-pressed={filtre === x} className={cn("min-h-9 rounded-full border px-3 py-[6px] text-xs", filtre === x ? "border-ink bg-ink text-paper" : "border-line bg-paper text-ink-2 hover:bg-hover")}>{x === "tous" ? "Tous" : DE[x]}</button>)}
          </div>
        )}

        {nonLus.length === 0 && <div className="rounded-[14px] border border-dashed border-line px-5 py-8 text-center text-sm text-muted-2">{t.vide}</div>}
        {GROUPES.map((g) => {
          const rs = nonLus.filter((r) => g.urg.includes(r.urgence));
          if (!rs.length) return null;
          return (
            <section key={g.label} className="flex flex-col gap-1">
              <span className="k px-1 pb-1.5" style={g.label.startsWith("À voir") ? { color: "var(--warn)" } : undefined}>{g.label} · {rs.length}</span>
              {rs.map((r) => <Row key={r.id} r={r} kind={v.kind} open={open === r.id} onOpen={() => setOpen(open === r.id ? null : r.id)} onDone={(what, texte) => fait(r.id, what, texte)} />)}
            </section>
          );
        })}
        {vus.length > 0 && (
          <section className="flex flex-col gap-1">
            <span className="k px-1 pb-1.5">Déjà vus · {vus.length}</span>
            {(tousVus ? vus : vus.slice(0, 8)).map((r) => <Row key={r.id} r={r} kind={v.kind} open={open === r.id} onOpen={() => setOpen(open === r.id ? null : r.id)} onDone={(what, texte) => fait(r.id, what, texte)} muted />)}
            {vus.length > 8 && <button type="button" onClick={() => setTousVus((x) => !x)} className="mt-1 min-h-10 self-start rounded-[10px] px-3 py-2 text-sm text-ink-3 hover:bg-hover">{tousVus ? "Replier" : `Voir les ${vus.length - 8} autres`}</button>}
          </section>
        )}
        {faitsIci.length > 0 && <p className="m-0 text-xs text-muted-2">{faitsIci.length} traité{faitsIci.length > 1 ? "s" : ""} aujourd'hui sur ce poste · {faitsIci.filter((f) => f.what === "envoyé").length} envoyé{faitsIci.filter((f) => f.what === "envoyé").length > 1 ? "s" : ""}, {faitsIci.filter((f) => f.what === "classé").length} classé{faitsIci.filter((f) => f.what === "classé").length > 1 ? "s" : ""}.</p>}
      </main>
      <Omni onSubmit={(t) => composer.run({ texte: t, ecran: "inbox", boite: v.kind, patientId: ouverte?.patient.id, docId: ouverte?.id })} placeholder={ouverte ? `À propos de ${ouverte.patient.nom} : « réponds-lui que c'est normal », « rendez-vous cette semaine »…` : v.kind === "messages" ? "Ouvrez un message, puis : « réponds-lui que c'est normal », « rendez-vous cette semaine »…" : v.kind === "bio" ? "« Les créatinines en baisse ce mois », « classe tout ce qui est normal »…" : "« Résume les courriers de l'hôpital », « classe tout ce qui est pour info »…"} suggestions={ouverte ? [{ k: "répondre", t: `Réponds à ${ouverte.de.split(" (")[0]} que c'est normal, pas d'inquiétude` }, { k: "rdv", t: `Rendez-vous pour ${ouverte.patient.nom} cette semaine, 15 minutes` }, { k: "dossier", t: `Ordonnance : renouvellement pour ${ouverte.patient.nom}` }] : v.kind === "messages" ? [{ k: "ouvrir", t: "Ouvre le dossier de Claire Moreau" }, { k: "question", t: "Angine de l'enfant : quand un antibiotique ?" }] : v.kind === "bio" ? [{ k: "question", t: "LDL à 1,32 g/L sans facteur de risque : quelle cible ?" }, { k: "ouvrir", t: "Ouvre le dossier de Josiane Petit" }] : [{ k: "question", t: "Épicondylite résistante : quelle prise en charge ?" }, { k: "ouvrir", t: "Ouvre le dossier de Claire Moreau" }]}>{composer.open && <ComposeCard state={composer.state} onClose={composer.reset} onRetry={(i) => composer.run(i)} />}</Omni>
    </div>
  );
}

function Row({ r, kind, open, onOpen, onDone, muted }: { r: InboxRow; kind: InboxKind; open: boolean; onOpen: () => void; onDone: (what: "envoyé" | "classé", texte?: string) => void; muted?: boolean }) {
  const dot = r.urgence === "immediate" ? "var(--rec)" : r.urgence === "jour" ? "var(--warn-dot)" : r.urgence === "semaine" ? "var(--accent)" : "var(--gray-dot)";
  const [rep, setRep] = React.useState(r.reponse ?? "");
  React.useEffect(() => { setRep(r.reponse ?? ""); }, [r.reponse, open]);
  const head = (
    <>
      <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full" style={{ background: r.nonLu ? dot : "transparent", boxShadow: r.nonLu ? undefined : `inset 0 0 0 1.5px ${dot}` }} />
      <Avatar initials={r.patient.initials} hue={r.patient.hue} size={30} className="mt-px" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-baseline gap-x-2"><span className={cn("text-[15px]", r.nonLu && !muted && "font-medium")}>{r.patient.nom}</span><span className="text-[13px] text-muted-2">{r.de}{r.deType && DE[r.deType] && r.de !== r.patient.nom ? ` · ${DE[r.deType]}` : ""}</span></span>
        <span className={cn("text-sm", muted ? "text-muted-2" : "text-ink-2")}>{r.titre}</span>
        {r.resume && !open && <span className="line-clamp-2 text-[13px] text-muted-2 sm:truncate">{r.resume}</span>}
      </span>
      <span className="d shrink-0 text-[11px]">{r.quand}</span>
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
          {r.resume && <div className="flex flex-col gap-1 rounded-[10px] bg-accent-soft-2 px-3.5 py-2.5 text-sm"><span className="k" style={{ color: "var(--accent)" }}>Locus{r.intention && INTENTION[r.intention] ? ` · ${INTENTION[r.intention]}` : ""}</span>{r.resume}</div>}
          {r.reponse ? (
            <label className="flex flex-col gap-1 rounded-[10px] border border-line px-3.5 py-2.5 text-sm"><span className="k">Réponse préparée · modifiez-la avant d'envoyer</span><textarea id={`rep-${r.id}`} value={rep} onChange={(e) => setRep(e.target.value)} rows={Math.min(12, Math.max(4, rep.split("\n").length + 1))} className="w-full resize-y bg-transparent text-base leading-relaxed text-ink sm:text-sm" /></label>
          ) : (
            <p className="m-0 text-xs text-muted-2">Pas de réponse préparée : demandez-la dans la barre du bas (« réponds-lui que… ») ou ouvrez le dossier.</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {r.reponse && <button type="button" disabled={!rep.trim()} onClick={() => onDone("envoyé", rep)} className="flex min-h-11 items-center rounded-[10px] bg-ink px-3.5 py-2 text-sm text-paper disabled:opacity-40">Envoyer{r.deType === "patient" ? " · messagerie patient" : r.deType === "secretariat" ? " · interne" : " · MSSanté"} <Kbd dark className="ml-2">⌘⏎</Kbd></button>}
            <Link href={`/p/${r.patient.id}`} className="flex min-h-11 items-center rounded-[10px] border border-line bg-paper px-3.5 py-2 text-sm text-ink hover:bg-hover hover:text-ink">Ouvrir le dossier</Link>
            <button type="button" onClick={() => onDone("classé")} className="min-h-11 rounded-[10px] px-3 py-2 text-sm text-muted-2 hover:bg-hover">Classer sans répondre</button>
          </div>
        </div>
      )}
    </div>
  );
}
