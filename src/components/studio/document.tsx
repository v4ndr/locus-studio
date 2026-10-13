"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { PatientView, DocView, DocRow, InboxRow, InboxKind, Urgence } from "@/studio/types";
import { Header, Omni, Kbd, I, Avatar } from "./chrome";
import { ComposeCard, useCompose } from "./compose";
import { Md } from "../md";
import { cn } from "@/lib/cn";

const URG: Record<string, { label: string; cls: string }> = { immediate: { label: "immédiat", cls: "text-rec-text" }, jour: { label: "à voir aujourd'hui", cls: "text-warn" }, semaine: { label: "cette semaine", cls: "text-ink-3" }, aucune: { label: "pour info", cls: "text-muted-2" } };
const TYPES: (DocRow["type"] | "Tous")[] = ["Tous", "Ordonnance", "Courrier", "Biologie", "Imagerie", "Arrêt · certif", "Consultation"];
const PLURAL: Record<string, string> = { Ordonnance: "Ordonnances", Courrier: "Courriers", Consultation: "Consultations" };
const URG_PILLS: { id: string; label: string; urg: Urgence[] }[] = [{ id: "tous", label: "Tous", urg: ["immediate", "jour", "semaine", "aucune"] }, { id: "jour", label: "Aujourd'hui", urg: ["immediate", "jour"] }, { id: "semaine", label: "Semaine", urg: ["semaine"] }, { id: "info", label: "Info", urg: ["aucune"] }];
const BOX_LABEL: Record<InboxKind, string> = { courriers: "Courriers", bio: "Résultats bio", messages: "Messages" };

/** Un document ouvert : à gauche ses voisins (du dossier ou de la boîte d'où l'on vient), à droite la lecture de Locus, le document, sa provenance. */
export function DocumentView(props: { v: PatientView; doc: DocView; boite?: InboxRow[]; boiteKind?: InboxKind; praticien: { initials: string } }) {
  return <React.Suspense fallback={null}><Inner {...props} /></React.Suspense>;
}

function Inner({ v, doc, boite, boiteKind, praticien }: { v: PatientView; doc: DocView; boite?: InboxRow[]; boiteKind?: InboxKind; praticien: { initials: string } }) {
  const router = useRouter();
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
      <div className="flex items-center gap-2 px-1"><span className="k">{inBox ? BOX_LABEL[from as InboxKind] : `Dossier · ${v.ref.nom}`}</span><span className="d">{ids.length}</span></div>
      <div className="flex flex-wrap gap-1">
        {inBox
          ? URG_PILLS.map((p) => <Pill key={p.id} on={urg === p.id} onClick={() => setUrg(p.id)}>{p.label}</Pill>)
          : TYPES.filter((t) => t === "Tous" || v.documents.some((r) => r.type === t)).map((t) => <Pill key={t} on={type === t} onClick={() => setType(t)}>{PLURAL[t] ?? t}</Pill>)}
      </div>
      <nav aria-label="Autres documents" className="flex max-h-[calc(100dvh-220px)] flex-col gap-0.5 overflow-y-auto pr-1">
        {inBox
          ? rowsBoite.map((r) => (
            <Link key={r.id} href={hrefOf(r.id, r.patient.id)} aria-current={r.id === doc.id ? "page" : undefined} onClick={() => setListOpen(false)} className={cn("flex items-start gap-2.5 rounded-[10px] px-2.5 py-2 text-ink hover:text-ink", r.id === doc.id ? "bg-accent-soft-2" : "hover:bg-hover")}>
              <Avatar initials={r.patient.initials} hue={r.patient.hue} size={24} className="mt-px text-[10px]" />
              <span className="flex min-w-0 flex-1 flex-col"><span className={cn("truncate text-[13px]", r.nonLu && "font-medium")}>{r.patient.nom}</span><span className="truncate text-xs text-muted-2">{r.titre}</span></span>
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: r.nonLu ? (r.urgence === "jour" || r.urgence === "immediate" ? "var(--warn-dot)" : r.urgence === "semaine" ? "var(--accent)" : "var(--gray-dot)") : "transparent" }} />
            </Link>
          ))
          : rowsDossier.map((r) => (
            <Link key={r.id} href={hrefOf(r.id)} aria-current={r.id === doc.id ? "page" : undefined} onClick={() => setListOpen(false)} className={cn("flex flex-col rounded-[10px] px-2.5 py-2 text-ink hover:text-ink", r.id === doc.id ? "bg-accent-soft-2" : "hover:bg-hover")}>
              <span className="flex items-baseline gap-2"><span className="d text-[11px]">{r.date}</span><span className="text-xs text-muted-2">{r.type}</span></span>
              <span className="truncate text-[13px]">{r.titre}</span>
            </Link>
          ))}
        {ids.length === 0 && <span className="px-2.5 py-2 text-xs text-muted-2">Rien dans ce tri.</span>}
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
            <button type="button" onClick={() => setListOpen((o) => !o)} aria-expanded={listOpen} className="flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-[7px] text-[13px] text-ink"><I.chevron open={listOpen} color="currentColor" />{inBox ? BOX_LABEL[from as InboxKind] : "Dossier"} · {ids.length}</button>
            {listOpen && <div className="card mt-3 p-3">{sidebar}</div>}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className="k">{doc.type}</span><span className="d">{doc.date}</span><span className="d">·</span><span className="text-[13px] text-muted-2">{doc.de}</span></div>
            <h1 className="m-0 text-[22px] font-medium leading-[1.3] tracking-[-.02em] sm:text-2xl">{doc.titre}</h1>
          </div>

          {doc.lecture && (
            <section className="flex flex-col gap-2 rounded-[14px] border border-accent-line bg-accent-soft-2 px-5 py-4">
              <div className="flex items-center gap-2.5"><span className="k" style={{ color: "var(--accent)" }}>Lecture de Locus</span><span className="flex-1" /><span className={cn("text-xs", URG[doc.lecture.urgence].cls)}>{URG[doc.lecture.urgence].label}</span></div>
              <p className="m-0 text-[15px] leading-relaxed">{doc.lecture.resume}</p>
              {doc.lecture.points.length > 0 && <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-sm text-ink-2">{doc.lecture.points.map((p, i) => <li key={i}>{p}</li>)}</ul>}
              <span className="d text-[11px]">confiance {Math.round(doc.lecture.confidence * 100)} % · le document complet est en dessous</span>
            </section>
          )}

          {doc.lignes && (
            <section className="card overflow-hidden">
              <div className="flex items-center gap-3 border-b border-line-4 px-5 py-3"><span className="k">{doc.lignesTitre}</span><span className="flex-1" />{abn > 0 && <span className="text-xs text-warn">{abn} hors norme</span>}</div>
              {doc.lignes.map((l, i) => (
                <div key={i} className={cn("flex flex-col gap-1 px-5 py-3 text-sm sm:flex-row sm:items-baseline sm:gap-4", i > 0 && "border-t border-line-4")}>
                  <span className={cn("flex-1", l.flag && l.flag !== "normal" && "font-medium")}>{l.k}{l.alerte && <span className="ml-2 text-xs text-warn">⚠ {l.alerte}</span>}</span>
                  <span className="flex items-baseline gap-3 sm:justify-end">
                    {l.v && <span className={cn("d text-[13px]", l.flag === "critique" ? "text-rec-text" : l.flag === "haut" || l.flag === "bas" ? "text-warn" : "text-ink")}>{l.v}{l.flag === "haut" ? " ↑" : l.flag === "bas" ? " ↓" : l.flag === "critique" ? " ‼" : ""}</span>}
                    {l.ref && <span className="d min-w-[80px] text-[11px]">norme {l.ref}</span>}
                    {l.precedent && <span className="d min-w-[92px] text-[11px]">préc. {l.precedent}</span>}
                  </span>
                </div>
              ))}
            </section>
          )}

          {doc.note && (
            <section className="card flex flex-col px-5 py-2">
              {doc.note.map((n, i) => <div key={i} className={cn("flex flex-col gap-1 py-3 text-sm leading-relaxed sm:flex-row sm:gap-4", i > 0 && "border-t border-line-4")}><span className="w-[130px] shrink-0 text-muted-2">{n.k}</span><span className="flex-1">{n.v}</span></div>)}
            </section>
          )}

          {doc.corps && (
            <section className="card px-5 py-5 sm:px-7 sm:py-6">
              <Md text={doc.corps} />
            </section>
          )}

          <section className="flex flex-col">
            <span className="k px-1 pb-2">Provenance</span>
            {doc.meta.map((m, i) => <div key={i} className={cn("flex gap-4 border-t border-line-4 px-1 py-2.5 text-sm", i === doc.meta.length - 1 && "border-b")}><span className="w-[110px] shrink-0 text-muted-2">{m.k}</span><span className="flex-1">{m.v}</span></div>)}
          </section>

          <nav aria-label="Documents voisins" className="flex items-center justify-between gap-3 text-sm">
            {prevRow ? <Link href={hrefOf(prevRow.id, pidOf(prevRow.id))} className="flex min-w-0 items-center gap-2 text-ink-3 hover:text-ink"><Kbd>←</Kbd><span className="truncate">{"patient" in prevRow ? `${prevRow.patient.nom} · ${prevRow.titre}` : prevRow.titre}</span></Link> : <span />}
            {nextRow ? <Link href={hrefOf(nextRow.id, pidOf(nextRow.id))} className="flex min-w-0 items-center gap-2 text-right text-ink-3 hover:text-ink"><span className="truncate">{"patient" in nextRow ? `${nextRow.patient.nom} · ${nextRow.titre}` : nextRow.titre}</span><Kbd>→</Kbd></Link> : <span />}
          </nav>
        </main>
      </div>
      <Omni placeholder="« Transmets au cardiologue », « explique à la patiente », « ajoute l'allergie à la fiche »…" maxWidth={1180 - 48} onSubmit={(t) => composer.run({ texte: t, patientId: v.ref.id, ecran: "document", docId: doc.id })} suggestions={[{ k: "fiche", t: "Ajoute à la fiche ce que ce document révèle (allergie, antécédent)" }, { k: "courrier", t: "Transmets ce document au spécialiste avec un mot" }, { k: "mail", t: `Explique ce résultat à ${v.ref.prenom} en termes simples` }, { k: "comparer", t: "Compare avec le précédent, en tableau" }]}>{composer.open && <ComposeCard state={composer.state} onClose={composer.reset} />}</Omni>
    </div>
  );
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={on} className={cn("rounded-full border px-2.5 py-[5px] text-xs", on ? "border-ink bg-ink text-paper" : "border-line bg-paper text-ink-2 hover:bg-hover")}>{children}</button>;
}
