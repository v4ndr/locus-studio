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
  // Prérendu statique : le filtre de l'URL s'applique après l'hydratation, pour ne pas diverger du HTML servi.
  const [type, setType] = React.useState<string>("Tous");
  const fromUrl = sp.get("type");
  React.useEffect(() => { if (fromUrl) setType(fromUrl); }, [fromUrl]);
  const [q, setQ] = React.useState("");
  const rows = v.documents.filter((r) => (type === "Tous" || r.type === type) && (!q || norm(`${r.titre} ${r.de} ${r.type}`).includes(norm(q))));
  return (
    <div className="flex min-h-dvh flex-col">
      <Header praticien={praticien} patient={{ id: v.ref.id, nom: v.ref.nom, initials: v.ref.initials, meta: v.meta }} />
      <main className="mx-auto flex w-full max-w-[1040px] flex-1 flex-col gap-5 px-4 pb-8 pt-8 sm:px-6 sm:pt-10">
        <div className="flex items-center gap-3">
          <h1 className="m-0 text-2xl font-medium tracking-[-.02em]">Tout</h1>
          <span className="d">{rows.length} sur {v.documents.length}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex flex-[1_1_280px] items-center gap-2.5 rounded-[10px] border border-line bg-paper px-3.5 py-[9px]">
            <I.search size={15} />
            <label htmlFor="s" className="sr-only">Rechercher</label>
            <input id="s" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher dans le contenu, l'émetteur, un médicament…" className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted-3" />
          </div>
          <span className="hidden rounded-full border border-line bg-paper px-3 py-[7px] text-[13px] text-ink-2 sm:inline">Depuis : tout</span>
          <span className="hidden rounded-full border border-line bg-paper px-3 py-[7px] text-[13px] text-ink-2 sm:inline">Émetteur : tous</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {LABELS.map((l) => { const on = l === type; return <button key={l} type="button" onClick={() => setType(l)} aria-pressed={on} className={cn("rounded-full border px-3 py-[7px] text-[13px]", on ? "border-ink bg-ink text-paper" : "border-line bg-paper text-ink-2")}>{PLURAL[l] ?? l}</button>; })}
        </div>
        <div className="rounded-[14px] border border-line-3 bg-paper">
          <div className="tr tr-head"><span className="k">Date</span><span className="k">Type</span><span className="k">Document</span><span className="k">Émetteur</span><span /></div>
          {rows.map((r, i) => <Link key={r.id} href={`/p/${v.ref.id}/documents/${r.id}?from=dossier${type !== "Tous" ? `&type=${encodeURIComponent(type)}` : ""}`} className={cn("tr text-ink hover:bg-bg hover:text-ink", i > 0 && "border-t border-soft")}><span className="d">{r.date}</span><span className="text-[13px] text-ink-3">{r.type}</span><span className="min-w-0 truncate">{r.titre}</span><span className="truncate text-[13px] text-muted-2">{r.de}</span><I.chevron /></Link>)}
          {rows.length === 0 && <div className="px-4 py-3 text-sm text-muted-2">Aucun document.</div>}
        </div>
      </main>
      <Omni placeholder="« Toutes les TSH depuis 2020 », « renvoie le CR du scanner au kiné »…" suggestions={[{ k: "chercher", t: "Toutes les TSH depuis 2020, en courbe" }, { k: "envoyer", t: "Renvoie le compte rendu du scanner au kiné" }, { k: "résumer", t: "Résume les courriers du cardiologue en trois lignes" }, { k: "dmp", t: "Partage la dernière ordonnance sur Mon espace santé" }]} />
    </div>
  );
}
