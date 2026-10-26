"use client";
import { TriangleAlert } from "lucide-react";
import * as React from "react";
import Link from "./nav";
import { useSearchParams } from "next/navigation";
import { useRouter } from "./nav";
import type { PatientView, DocView, DocRow, InboxRow, InboxKind, Urgence } from "@/studio/types";
import { Header, Omni, Kbd, I, Avatar, useT } from "./chrome";
import { ComposeCard, useCompose } from "./compose";
import { Md } from "../md";
import { cn } from "@/lib/cn";

const TYPES: (DocRow["type"] | "Tous")[] = ["Tous", "Ordonnance", "Courrier", "Biologie", "Imagerie", "Arrêt · certif", "Consultation"];
const PLURAL: Record<string, string> = { Ordonnance: "Ordonnances", Courrier: "Courriers", Consultation: "Consultations" };
const URG_PILLS: { id: "tous" | "jour" | "semaine" | "info"; urg: Urgence[] }[] = [{ id: "tous", urg: ["immediate", "jour", "semaine", "aucune"] }, { id: "jour", urg: ["immediate", "jour"] }, { id: "semaine", urg: ["semaine"] }, { id: "info", urg: ["aucune"] }];

/* La demande part en français : le contexte de soins est français. */
const LIRE = "Lis ce document : résumé en deux phrases, points d'attention, et l'urgence (immédiat, aujourd'hui, cette semaine, pour info). Ne propose aucune action.";

/** Un document ouvert : à gauche ses voisins (du dossier ou de la boîte d'où l'on vient), à droite le document, sa provenance, et sa lecture par Locus à la demande (live, jamais pré-écrite). */
export function DocumentView(props: { v: PatientView; doc: DocView; boite?: InboxRow[]; boiteKind?: InboxKind; praticien: { initials: string } }) {
  return <React.Suspense fallback={null}><Inner {...props} /></React.Suspense>;
}

function Inner({ v, doc, boite, boiteKind, praticien }: { v: PatientView; doc: DocView; boite?: InboxRow[]; boiteKind?: InboxKind; praticien: { initials: string } }) {
  const router = useRouter();
  const { t: d, L } = useT();
  const BOX_LABEL: Record<InboxKind, string> = { courriers: d.inbox.titles.courriers.h1, bio: d.inbox.titles.bio.h1, messages: d.inbox.titles.messages.h1 };
  const PILL_LABEL = { tous: d.doc.all, jour: d.doc.today, semaine: d.doc.week, info: d.doc.info };
  const sp = useSearchParams();
  // Le contexte s'applique après l'hydratation : la page est prérendue sans paramètres.
  const [from, setFrom] = React.useState<string>("dossier");
  const [type, setType] = React.useState<string>("Tous");
  const [urg, setUrg] = React.useState<string>("tous");
  const [listOpen, setListOpen] = React.useState(false);
  const composer = useCompose();
  const fromUrl = sp.get("from"); const typeUrl = sp.get("type");
  React.useEffect(() => { if (fromUrl) setFrom(fromUrl); if (typeUrl) setType(typeUrl); }, [fromUrl, typeUrl]);

  const inBox = (from === "courriers" || from === "bio") && !!boite && boiteKind === from;
  const q = inBox ? `?from=${from}` : `?from=dossier${type !== "Tous" ? `&type=${encodeURIComponent(type)}` : ""}`;
  const hrefOf = (docId: string, patientId = v.ref.id) => `/p/${patientId}/documents/${docId}${q}`;
  // La liste de gauche : les voisins, dans le même ordre et avec les mêmes tris que l'écran d'origine.
  const rowsDossier = v.documents.filter((r) => type === "Tous" || r.type === type);
  const rowsBoite = (boite ?? []).filter((r) => URG_PILLS.find((p) => p.id === urg)!.urg.includes(r.urgence));
  const ids = inBox ? rowsBoite.map((r) => r.id) : rowsDossier.map((r) => r.id);
  const pidOf = (docId: string) => (inBox ? rowsBoite.find((r) => r.id === docId)?.patient.id : undefined) ?? v.ref.id;
  const at = ids.indexOf(doc.id);
  const prevId = at > 0 ? ids[at - 1] : undefined;
  const nextId = at >= 0 && at < ids.length - 1 ? ids[at + 1] : undefined;
  const prevRow = inBox ? rowsBoite[at - 1] : rowsDossier[at - 1];
  const nextRow = inBox ? rowsBoite[at + 1] : rowsDossier[at + 1];
  const back = inBox ? `/inbox/${from}` : `/p/${v.ref.id}/documents?type=${encodeURIComponent(type)}`;

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.tagName === "INPUT") return;
      if (e.key === "ArrowLeft" && prevId) router.push(hrefOf(prevId, pidOf(prevId)));
      if (e.key === "ArrowRight" && nextId) router.push(hrefOf(nextId, pidOf(nextId)));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  const abn = doc.lignes?.filter((l) => l.flag && l.flag !== "normal").length ?? 0;

  const sidebar = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1"><span className="k">{inBox ? BOX_LABEL[from as InboxKind] : d.doc.recordOf(v.ref.nom)}</span><span className="d">{ids.length}</span></div>
      <div className="flex flex-wrap gap-1">
        {inBox
          ? URG_PILLS.map((p) => <Pill key={p.id} on={urg === p.id} onClick={() => setUrg(p.id)}>{PILL_LABEL[p.id]}</Pill>)
          : TYPES.filter((t) => t === "Tous" || v.documents.some((r) => r.type === t)).map((t) => <Pill key={t} on={type === t} onClick={() => setType(t)}>{L(PLURAL[t] ?? t)}</Pill>)}
      </div>
      <nav aria-label={d.doc.others} className="flex max-h-[calc(100dvh-220px)] flex-col gap-0.5 overflow-y-auto pr-1">
        {inBox
          ? rowsBoite.map((r) => (
            <Link key={r.id} href={hrefOf(r.id, r.patient.id)} aria-current={r.id === doc.id ? "page" : undefined} onClick={() => setListOpen(false)} className={cn("flex items-start gap-2.5 rounded-[10px] px-2.5 py-2 text-ink hover:text-ink", r.id === doc.id ? "bg-agent-soft-2" : "hover:bg-hover")}>
              <Avatar initials={r.patient.initials} hue={r.patient.hue} size={24} className="mt-px text-[10px]" />
              <span className="flex min-w-0 flex-1 flex-col"><span className={cn("truncate text-[13px]", r.nonLu && "font-medium")}>{r.patient.nom}</span><span className="truncate text-xs text-dim-2">{r.titre}</span></span>
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: r.nonLu ? (r.urgence === "jour" || r.urgence === "immediate" ? "var(--warn-dot)" : r.urgence === "semaine" ? "var(--agent)" : "var(--gray-dot)") : "transparent" }} />
            </Link>
          ))
          : rowsDossier.map((r) => (
            <Link key={r.id} href={hrefOf(r.id)} aria-current={r.id === doc.id ? "page" : undefined} onClick={() => setListOpen(false)} className={cn("flex flex-col rounded-[10px] px-2.5 py-2 text-ink hover:text-ink", r.id === doc.id ? "bg-agent-soft-2" : "hover:bg-hover")}>
              <span className="flex items-baseline gap-2"><span className="d text-[11px]">{r.date}</span><span className="text-xs text-dim-2">{L(r.type)}</span></span>
              <span className="truncate text-[13px]">{r.titre}</span>
            </Link>
          ))}
        {ids.length === 0 && <span className="px-2.5 py-2 text-xs text-dim-2">{d.doc.nothing}</span>}
      </nav>
    </div>
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <Header praticien={praticien} patient={{ id: v.ref.id, nom: v.ref.nom, initials: v.ref.initials, meta: v.meta }} back={back} />
      <div className="mx-auto flex w-full max-w-[1180px] flex-1 gap-8 px-4 pb-8 pt-6 sm:px-6 lg:pt-10">
        <aside className="sticky top-6 hidden w-[272px] shrink-0 self-start lg:block">{sidebar}</aside>
        <main className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="lg:hidden">
            <button type="button" onClick={() => setListOpen((o) => !o)} aria-expanded={listOpen} className="flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-[7px] text-[13px] text-ink"><I.chevron open={listOpen} color="currentColor" />{inBox ? BOX_LABEL[from as InboxKind] : d.doc.record} · {ids.length}</button>
            {listOpen && <div className="card mt-3 p-3">{sidebar}</div>}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className="k">{L(doc.type)}</span><span className="d">{doc.date}</span><span className="d">·</span><span className="text-[13px] text-dim-2">{doc.de}</span></div>
            <h1 className="m-0 text-[22px] font-medium leading-[1.3] tracking-[-.02em] sm:text-2xl">{doc.titre}</h1>
          </div>

          <div><button type="button" onClick={() => composer.run({ texte: LIRE, patientId: v.ref.id, ecran: "document", docId: doc.id })} disabled={composer.state.busy} className="flex min-h-10 items-center gap-2 rounded-full border border-line bg-paper px-3.5 py-[8px] text-sm text-ink hover:bg-hover disabled:opacity-40"><span className="h-2 w-2 rounded-full" style={{ background: "var(--agent)" }} />{d.doc.read}</button></div>

          {doc.lignes && (
            <section className="card overflow-hidden">
              <div className="flex items-center gap-3 border-b border-line-4 px-5 py-3"><span className="k">{L(doc.lignesTitre)}</span><span className="flex-1" />{abn > 0 && <span className="text-xs text-warn">{d.doc.outOfRange(abn)}</span>}</div>
              {doc.lignes.map((l, i) => (
                <div key={i} className={cn("flex flex-col gap-1 px-5 py-3 text-sm sm:flex-row sm:items-baseline sm:gap-4", i > 0 && "border-t border-line-4")}>
                  <span className={cn("flex-1", l.flag && l.flag !== "normal" && "font-medium")}>{l.k}{l.alerte && <span className="ml-2 text-xs text-warn"><TriangleAlert size={16} aria-hidden="true" className="mr-1 inline-block shrink-0 align-[-3px]" />{l.alerte}</span>}</span>
                  <span className="flex items-baseline gap-3 sm:justify-end">
                    {l.v && <span className={cn("d text-[13px]", l.flag === "critique" ? "text-rec-text" : l.flag === "haut" || l.flag === "bas" ? "text-warn" : "text-ink")}>{l.v}{l.flag === "haut" ? " ↑" : l.flag === "bas" ? " ↓" : l.flag === "critique" ? " ‼" : ""}</span>}
                    {l.ref && <span className="d min-w-[80px] text-[11px]">{d.doc.ref} {l.ref}</span>}
                    {l.precedent && <span className="d min-w-[92px] text-[11px]">{d.doc.prev} {l.precedent}</span>}
                  </span>
                </div>
              ))}
            </section>
          )}

          {doc.note && (
            <section className="card flex flex-col px-5 py-2">
              {doc.note.map((n, i) => <div key={i} className={cn("flex flex-col gap-1 py-3 text-sm leading-relaxed sm:flex-row sm:gap-4", i > 0 && "border-t border-line-4")}><span className="w-[130px] shrink-0 text-dim-2">{L(n.k)}</span><span className="flex-1">{n.v}</span></div>)}
            </section>
          )}

          {doc.corps && (
            <section className="card px-5 py-5 sm:px-7 sm:py-6">
              <Md text={doc.corps} />
            </section>
          )}

          <section className="flex flex-col">
            <span className="k px-1 pb-2">{d.doc.provenance}</span>
            {doc.meta.map((m, i) => <div key={i} className={cn("flex gap-4 border-t border-line-4 px-1 py-2.5 text-sm", i === doc.meta.length - 1 && "border-b")}><span className="w-[110px] shrink-0 text-dim-2">{L(m.k)}</span><span className="flex-1">{L(m.v)}</span></div>)}
          </section>

          <nav aria-label={d.doc.neighbours} className="flex items-center justify-between gap-3 text-sm">
            {prevRow ? <Link href={hrefOf(prevRow.id, pidOf(prevRow.id))} className="flex min-w-0 items-center gap-2 text-ink-3 hover:text-ink"><Kbd>←</Kbd><span className="truncate">{"patient" in prevRow ? `${prevRow.patient.nom} · ${prevRow.titre}` : prevRow.titre}</span></Link> : <span />}
            {nextRow ? <Link href={hrefOf(nextRow.id, pidOf(nextRow.id))} className="flex min-w-0 items-center gap-2 text-right text-ink-3 hover:text-ink"><span className="truncate">{"patient" in nextRow ? `${nextRow.patient.nom} · ${nextRow.titre}` : nextRow.titre}</span><Kbd>→</Kbd></Link> : <span />}
          </nav>
        </main>
      </div>
      <Omni placeholder={d.doc.placeholder} maxWidth={1180 - 48} onSubmit={(t) => composer.run({ texte: t, patientId: v.ref.id, ecran: "document", docId: doc.id })} suggestions={[{ k: d.keys.fiche, t: "Ajoute à la fiche ce que ce document révèle (allergie, antécédent)" }, { k: d.keys.courrier, t: "Transmets ce document au spécialiste avec un mot" }, { k: d.keys.mail, t: `Explique ce résultat à ${v.ref.prenom} en termes simples` }, { k: d.keys.comparer, t: "Compare avec le précédent, en tableau" }]}>{composer.open && <ComposeCard state={composer.state} onClose={composer.reset} onRetry={(i) => composer.run(i)} />}</Omni>
    </div>
  );
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={on} className={cn("rounded-full border px-2.5 py-[5px] text-xs", on ? "border-ink bg-ink text-paper" : "border-line bg-paper text-ink-2 hover:bg-hover")}>{children}</button>;
}
