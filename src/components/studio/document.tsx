"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PatientView, DocView } from "@/studio/types";
import { Header, Omni, Kbd, I } from "./chrome";
import { Md } from "../md";
import { cn } from "@/lib/cn";

const URG: Record<string, { label: string; cls: string }> = { immediate: { label: "immédiat", cls: "text-rec-text" }, jour: { label: "à voir aujourd'hui", cls: "text-warn" }, semaine: { label: "cette semaine", cls: "text-ink-3" }, aucune: { label: "pour info", cls: "text-muted-2" } };

/** Un document ouvert : la lecture de Locus d'abord, puis le document lui-même, puis d'où il vient. */
export function DocumentView({ v, doc, praticien }: { v: PatientView; doc: DocView; praticien: { initials: string } }) {
  const router = useRouter();
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.tagName === "INPUT") return;
      if (e.key === "ArrowLeft" && doc.prev) router.push(`/p/${v.ref.id}/documents/${doc.prev.id}`);
      if (e.key === "ArrowRight" && doc.next) router.push(`/p/${v.ref.id}/documents/${doc.next.id}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doc, v.ref.id, router]);
  const abn = doc.lignes?.filter((l) => l.flag && l.flag !== "normal").length ?? 0;

  return (
    <div className="flex min-h-dvh flex-col">
      <Header praticien={praticien} patient={{ id: v.ref.id, nom: v.ref.nom, initials: v.ref.initials, meta: v.meta }} back={`/p/${v.ref.id}/documents`} />
      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-6 px-4 pb-8 pt-8 sm:px-6 sm:pt-12">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className="k">{doc.type}</span><span className="d">{doc.date}</span><span className="d">·</span><span className="text-[13px] text-muted-2">{doc.de}</span></div>
          <h1 className="m-0 text-[22px] font-medium leading-[1.3] tracking-[-.02em] sm:text-2xl">{doc.titre}</h1>
        </div>

        {doc.lecture && (
          <section className="flex flex-col gap-2 rounded-[14px] border border-accent-line bg-accent-soft-2 px-5 py-4">
            <div className="flex items-center gap-2.5"><span className="k" style={{ color: "var(--accent)" }}>Lecture de Locus</span><span className="flex-1" /><span className={cn("text-xs", URG[doc.lecture.urgence].cls)}>{URG[doc.lecture.urgence].label}</span></div>
            <p className="m-0 text-[15px] leading-relaxed">{doc.lecture.resume}</p>
            {doc.lecture.points.length > 0 && <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-sm text-ink-2">{doc.lecture.points.map((p, i) => <li key={i}>{p}</li>)}</ul>}
            <span className="d text-[11px]">confiance {Math.round(doc.lecture.confidence * 100)} % · vérifiable en un clic sur chaque fait</span>
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
                  {l.ref && <span className="d hidden min-w-[80px] text-[11px] sm:inline">{l.ref}</span>}
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
          {doc.prev ? <Link href={`/p/${v.ref.id}/documents/${doc.prev.id}`} className="flex min-w-0 items-center gap-2 text-ink-3 hover:text-ink"><Kbd>←</Kbd><span className="truncate">{doc.prev.titre}</span></Link> : <span />}
          {doc.next ? <Link href={`/p/${v.ref.id}/documents/${doc.next.id}`} className="flex min-w-0 items-center gap-2 text-right text-ink-3 hover:text-ink"><span className="truncate">{doc.next.titre}</span><Kbd>→</Kbd></Link> : <span />}
        </nav>
      </main>
      <Omni placeholder="« Verse ces faits au dossier », « transmets au cardiologue », « explique à la patiente »…" suggestions={[{ k: "dossier", t: "Verse les faits extraits au dossier" }, { k: "courrier", t: "Transmets ce document au spécialiste avec un mot" }, { k: "mail", t: `Explique ce résultat à ${v.ref.prenom} en termes simples` }, { k: "comparer", t: "Compare avec le précédent, en tableau" }]} cta={<span className="hidden items-center gap-2 text-[13px] text-muted-2 sm:flex"><I.check />lu</span>} />
    </div>
  );
}
