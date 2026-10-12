"use client";
import * as React from "react";
import Link from "next/link";
import type { InboxView as IV, InboxRow, InboxKind, Urgence } from "@/studio/types";
import { Header, Omni, Avatar, Kbd, I } from "./chrome";
import { ComposeCard, useCompose } from "./compose";
import { cn } from "@/lib/cn";

const TITRES: Record<InboxKind, { h1: string; sous: string; vide: string }> = {
  courriers: { h1: "Courriers", sous: "Comptes rendus et lettres arrivés par MSSanté, DMP, scan. Lus par Locus avant vous.", vide: "Rien de nouveau par courrier." },
  bio: { h1: "Résultats bio", sous: "Les résultats du serveur de laboratoire, hors norme d'abord.", vide: "Aucun résultat en attente." },
  messages: { h1: "Messages", sous: "Patients, confrères, secrétariat, pharmacie — triés par urgence, la réponse déjà préparée.", vide: "Aucun message en attente." },
};
const GROUPES: { urg: Urgence[]; label: string }[] = [{ urg: ["immediate", "jour"], label: "À voir aujourd'hui" }, { urg: ["semaine"], label: "Cette semaine" }, { urg: ["aucune"], label: "Pour info" }];
const DE: Record<string, string> = { patient: "patient", confrere: "confrère", secretariat: "secrétariat", pharmacie: "pharmacie", labo: "labo", autre: "" };
const INTENTION: Record<string, string> = { renouvellement: "renouvellement", resultat: "résultat", symptome: "symptôme", administratif: "administratif", rdv: "rendez-vous", question: "question", autre: "" };

/** Les trois boîtes : un tri automatique, une ligne par chose, rien d'autre. */
export function InboxView({ v, praticien }: { v: IV; praticien: { initials: string } }) {
  const [filtre, setFiltre] = React.useState<string>("tous");
  const [open, setOpen] = React.useState<string | null>(null);
  const [faits, setFaits] = React.useState<Record<string, string>>({});
  const composer = useCompose();
  const t = TITRES[v.kind];
  const rows = v.rows.filter((r) => filtre === "tous" || r.deType === filtre).filter((r) => !faits[r.id]);
  const nonLus = rows.filter((r) => r.nonLu);
  const vus = rows.filter((r) => !r.nonLu);
  const types = v.kind === "messages" ? ["tous", "patient", "confrere", "secretariat", "pharmacie"] : [];

  return (
    <div className="flex min-h-dvh flex-col">
      <Header praticien={praticien} back="/" />
      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-6 px-4 pb-8 pt-8 sm:px-6 sm:pt-12">
        <nav aria-label="Boîtes" className="flex flex-wrap gap-1.5">
          {(["courriers", "bio", "messages"] as InboxKind[]).map((k) => (
            <Link key={k} href={`/inbox/${k}`} aria-current={k === v.kind ? "page" : undefined} className={cn("flex items-center gap-2 rounded-full border px-3 py-[7px] text-[13px] hover:text-ink", k === v.kind ? "border-ink bg-ink text-paper hover:text-paper" : "border-line bg-paper text-ink-2")}>
              {TITRES[k].h1}{v.counts[k] > 0 && <span className={cn("d text-[11px]", k === v.kind ? "text-paper/70" : "")} style={k !== v.kind ? { color: "var(--accent)" } : undefined}>{v.counts[k]}</span>}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-2xl font-medium tracking-[-.02em]">{t.h1}{nonLus.length > 0 && <span className="ml-3 text-base font-normal text-muted-2">{nonLus.length} non lu{nonLus.length > 1 ? "s" : ""}</span>}</h1>
          <p className="m-0 text-sm text-muted-2">{t.sous}</p>
        </div>
        {types.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {types.map((x) => <button key={x} type="button" onClick={() => setFiltre(x)} aria-pressed={filtre === x} className={cn("rounded-full border px-3 py-[6px] text-xs", filtre === x ? "border-ink bg-ink text-paper" : "border-line bg-paper text-ink-2 hover:bg-hover")}>{x === "tous" ? "Tous" : DE[x]}</button>)}
          </div>
        )}

        {nonLus.length === 0 && <div className="rounded-[14px] border border-dashed border-line px-5 py-8 text-center text-sm text-muted-2">{t.vide}</div>}
        {GROUPES.map((g) => {
          const rs = nonLus.filter((r) => g.urg.includes(r.urgence));
          if (!rs.length) return null;
          return (
            <section key={g.label} className="flex flex-col gap-1">
              <span className={cn("k px-1 pb-1.5", g.label.startsWith("À voir") && "text-warn")} style={g.label.startsWith("À voir") ? { color: "var(--warn)" } : undefined}>{g.label} · {rs.length}</span>
              {rs.map((r) => <Row key={r.id} r={r} kind={v.kind} open={open === r.id} onOpen={() => setOpen(open === r.id ? null : r.id)} onDone={(what) => setFaits((f) => ({ ...f, [r.id]: what }))} />)}
            </section>
          );
        })}
        {vus.length > 0 && (
          <section className="flex flex-col gap-1">
            <span className="k px-1 pb-1.5">Déjà vus · {vus.length}</span>
            {vus.slice(0, 8).map((r) => <Row key={r.id} r={r} kind={v.kind} open={open === r.id} onOpen={() => setOpen(open === r.id ? null : r.id)} onDone={(what) => setFaits((f) => ({ ...f, [r.id]: what }))} muted />)}
          </section>
        )}
        {Object.keys(faits).length > 0 && <p className="m-0 text-xs text-muted-2">{Object.keys(faits).length} traité{Object.keys(faits).length > 1 ? "s" : ""} cette session · tout est au journal.</p>}
      </main>
      <Omni onSubmit={(t) => composer.run({ texte: t, ecran: "inbox", boite: v.kind })} placeholder={v.kind === "messages" ? "« Réponds à tous les renouvellements simples », « appelle Mme Fontaine »…" : v.kind === "bio" ? "« Les créatinines en baisse ce mois », « classe tout ce qui est normal »…" : "« Résume les courriers de l'hôpital », « classe tout ce qui est pour info »…"} suggestions={v.kind === "messages" ? [{ k: "répondre", t: "Réponds à tous les renouvellements simples, je signe en bloc" }, { k: "appeler", t: "Programme un appel à Mme Fontaine entre deux patients" }, { k: "trier", t: "Montre-moi seulement ce qui demande une décision médicale" }] : v.kind === "bio" ? [{ k: "trier", t: "Classe tout ce qui est normal et préviens les patients" }, { k: "chercher", t: "Les créatinines en baisse ce mois-ci" }, { k: "suivre", t: "Programme les contrôles prévus par les plans de suivi" }] : [{ k: "résumer", t: "Résume les courriers de l'hôpital en une ligne chacun" }, { k: "trier", t: "Classe tout ce qui est pour info, verse les faits au dossier" }, { k: "répondre", t: "Accuse réception aux confrères qui attendent une réponse" }]}>{composer.open && <ComposeCard state={composer.state} onClose={composer.reset} />}</Omni>
    </div>
  );
}

function Row({ r, kind, open, onOpen, onDone, muted }: { r: InboxRow; kind: InboxKind; open: boolean; onOpen: () => void; onDone: (what: string) => void; muted?: boolean }) {
  const dot = r.urgence === "immediate" ? "var(--rec)" : r.urgence === "jour" ? "var(--warn-dot)" : r.urgence === "semaine" ? "var(--accent)" : "var(--gray-dot)";
  const head = (
    <>
      <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full" style={{ background: r.nonLu ? dot : "transparent", boxShadow: r.nonLu ? undefined : `inset 0 0 0 1.5px ${dot}` }} />
      <Avatar initials={r.patient.initials} hue={r.patient.hue} size={30} className="mt-px" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-baseline gap-x-2"><span className={cn("text-[15px]", r.nonLu && !muted && "font-medium")}>{r.patient.nom}</span><span className="text-[13px] text-muted-2">{r.de}{r.deType && DE[r.deType] ? ` · ${DE[r.deType]}` : ""}</span></span>
        <span className={cn("text-sm", muted ? "text-muted-2" : "text-ink-2")}>{r.titre}</span>
        {r.resume && !open && <span className="truncate text-[13px] text-muted-2">{r.resume}</span>}
      </span>
      <span className="d shrink-0 text-[11px]">{r.quand}</span>
    </>
  );
  const cls = cn("flex w-full items-start gap-3 rounded-[12px] px-3 py-3 text-left text-ink hover:bg-hover hover:text-ink");
  if (kind !== "messages" && r.href) return <Link href={`${r.href}?from=${kind}`} className={cls}>{head}<I.chevron /></Link>;
  return (
    <div className={cn("rounded-[12px]", open && "bg-paper ring-1 ring-line")}>
      <button type="button" onClick={onOpen} aria-expanded={open} className={cls}>{head}<I.chevron open={open} /></button>
      {open && (
        <div className="flex flex-col gap-3 px-3 pb-3 sm:pl-[68px]">
          <p className="m-0 whitespace-pre-line text-sm leading-relaxed">{r.corps}</p>
          {r.resume && <div className="flex flex-col gap-1 rounded-[10px] bg-accent-soft-2 px-3.5 py-2.5 text-sm"><span className="k" style={{ color: "var(--accent)" }}>Locus{r.intention && INTENTION[r.intention] ? ` · ${INTENTION[r.intention]}` : ""}</span>{r.resume}</div>}
          {r.reponse && <div className="flex flex-col gap-1 rounded-[10px] border border-line px-3.5 py-2.5 text-sm"><span className="k">Réponse préparée</span><span className="whitespace-pre-line leading-relaxed">{r.reponse}</span></div>}
          <div className="flex flex-wrap items-center gap-2">
            {r.reponse && <button type="button" onClick={() => onDone("envoyé")} className="rounded-[10px] bg-ink px-3.5 py-2 text-sm text-paper">Envoyer <Kbd dark className="ml-1">⌘⏎</Kbd></button>}
            <Link href={`/p/${r.patient.id}`} className="rounded-[10px] border border-line bg-paper px-3.5 py-2 text-sm text-ink hover:bg-hover hover:text-ink">Ouvrir le dossier</Link>
            <button type="button" onClick={() => onDone("classé")} className="rounded-[10px] px-3 py-2 text-sm text-muted-2 hover:bg-hover">Classer</button>
          </div>
        </div>
      )}
    </div>
  );
}
