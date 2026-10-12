"use client";
import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { PatientView, DocRow } from "@/studio/types";
import { Header, Omni, I } from "./chrome";
import { norm } from "@/lib/norm";
import { cn } from "@/lib/cn";

const LABELS: (DocRow["type"] | "Tous")[] = ["Tous", "Ordonnance", "Courrier", "Biologie", "Imagerie", "Arrêt · certif", "Consultation"];
const PLURAL: Record<string, string> = { Ordonnance: "Ordonnances", Courrier: "Courriers", Consultation: "Consultations" };

export function DocumentsView({ v, praticien }: { v: PatientView; praticien: { initials: string } }) {
  return <React.Suspense fallback={null}><Inner v={v} praticien={praticien} /></React.Suspense>;
}

function Inner({ v, praticien }: { v: PatientView; praticien: { initials: string } }) {
  const sp = useSearchParams();
  const [type, setType] = React.useState<string>(sp.get("type") ?? "Tous");
  const [q, setQ] = React.useState("");
  const rows = v.documents.filter((r) => (type === "Tous" || r.type === type) && (!q || norm(`${r.titre} ${r.de} ${r.type}`).includes(norm(q))));
  return (
    <div className="flex min-h-dvh flex-col">
      <Header praticien={praticien} patient={{ id: v.ref.id, nom: v.ref.nom, initials: v.ref.initials, meta: v.meta }} />
      <main className="mx-auto flex w-full max-w-[1040px] flex-1 flex-col gap-5 px-6 pb-8 pt-10">
        <div className="flex items-center gap-3">
          <Link href={`/p/${v.ref.id}`} aria-label="Retour au dossier" className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-paper"><I.back /></Link>
          <h1 className="m-0 text-2xl font-medium tracking-[-.02em]">Documents</h1>
          <span className="d">{rows.length} sur {v.documents.length}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex flex-[1_1_280px] items-center gap-2.5 rounded-[10px] border border-line bg-paper px-3.5 py-[9px]">
            <I.search size={15} />
            <label htmlFor="s" className="sr-only">Rechercher</label>
            <input id="s" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher dans le contenu, l'émetteur, un médicament…" className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted-3" />
          </div>
          <span className="rounded-full border border-line bg-paper px-3 py-[7px] text-[13px] text-ink-2">Depuis : tout</span>
          <span className="rounded-full border border-line bg-paper px-3 py-[7px] text-[13px] text-ink-2">Émetteur : tous</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {LABELS.map((l) => { const on = l === type; return <button key={l} type="button" onClick={() => setType(l)} aria-pressed={on} className={cn("rounded-full border px-3 py-[7px] text-[13px]", on ? "border-ink bg-ink text-white" : "border-line bg-paper text-ink-2")}>{PLURAL[l] ?? l}</button>; })}
        </div>
        <div className="overflow-x-auto rounded-[14px] border border-line-3 bg-paper">
          <div className="min-w-[640px]">
            <div className="tr"><span className="k">Date</span><span className="k">Type</span><span className="k">Document</span><span className="k">Émetteur</span><span /></div>
            {rows.map((r) => <div key={r.id} className="tr border-t border-soft hover:bg-bg"><span className="d">{r.date}</span><span className="text-[13px] text-ink-3">{r.type}</span><span className="min-w-0 truncate">{r.titre}</span><span className="text-[13px] text-muted-2">{r.de}</span><I.chevron /></div>)}
            {rows.length === 0 && <div className="tr border-t border-soft text-sm text-muted-2">Aucun document.</div>}
          </div>
        </div>
      </main>
      <Omni placeholder="« Toutes les TSH depuis 2020 », « renvoie le CR du scanner au kiné »…" />
    </div>
  );
}
