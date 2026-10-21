"use client";
import * as React from "react";
import Link from "./nav";
import { useSearchParams, usePathname } from "next/navigation";
import { useRouter } from "./nav";
import type { PatientView, DocRow } from "@/studio/types";
import { Header, Omni, I, useT } from "./chrome";
import { ComposeCard, useCompose } from "./compose";
import { norm } from "@/lib/norm";
import { cn } from "@/lib/cn";

const LABELS: (DocRow["type"] | "Tous")[] = ["Tous", "Ordonnance", "Courrier", "Biologie", "Imagerie", "Arrêt · certif", "Consultation"];
const PLURAL: Record<string, string> = { Ordonnance: "Ordonnances", Courrier: "Courriers", Consultation: "Consultations" };

export function DocumentsView({ v, praticien }: { v: PatientView; praticien: { initials: string } }) {
  return <React.Suspense fallback={null}><Inner v={v} praticien={praticien} /></React.Suspense>;
}

function Inner({ v, praticien }: { v: PatientView; praticien: { initials: string } }) {
  const sp = useSearchParams();
  const { t: d, L } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const composer = useCompose();
  // Prérendu statique : le filtre de l'URL s'applique après l'hydratation, pour ne pas diverger du HTML servi.
  const [type, setTypeState] = React.useState<string>("Tous");
  const fromUrl = sp.get("type");
  React.useEffect(() => { setTypeState(fromUrl ?? "Tous"); }, [fromUrl]);
  // Le filtre vit dans l'URL, toujours explicite (« ?type=Tous » compris) : le routeur client de Next réutilise sinon, pour le chemin nu, l'entrée en cache de la première visite et son filtre.
  const hrefType = (t: string) => `${pathname}?type=${encodeURIComponent(t)}`;
  void router;
  const [q, setQ] = React.useState("");
  const rows = v.documents.filter((r) => (type === "Tous" || r.type === type) && (!q || norm(`${r.titre} ${r.de} ${r.type} ${r.texte ?? ""}`).includes(norm(q))));
  return (
    <div className="flex min-h-dvh flex-col">
      <Header praticien={praticien} patient={{ id: v.ref.id, nom: v.ref.nom, initials: v.ref.initials, meta: v.meta }} back={`/p/${v.ref.id}`} />
      <main className="mx-auto flex w-full max-w-[1040px] flex-1 flex-col gap-5 px-4 pb-8 pt-8 sm:px-6 sm:pt-10">
        <div className="flex items-center gap-3">
          <h1 className="m-0 text-2xl font-medium tracking-[-.02em]">{d.docs.all}</h1>
          <span className="d">{d.docs.of(rows.length, v.documents.length)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex flex-[1_1_280px] items-center gap-2.5 rounded-[10px] border border-line bg-paper px-3.5 py-[9px] focus-within:border-ring">
            <I.search size={15} />
            <label htmlFor="s" className="sr-only">{d.docs.search}</label>
            <input id="s" name="locus-filtre" value={q} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" onChange={(e) => setQ(e.target.value)} placeholder={d.docs.placeholder} className="min-h-8 min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-dim-3 sm:text-sm focus-visible:shadow-none" />
          </div>
          <span className="hidden text-[13px] text-dim-2 sm:inline">{d.docs.hint}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {LABELS.map((l) => { const on = l === type; return <Link key={l} href={hrefType(l)} replace scroll={false} onClick={() => setTypeState(l)} aria-current={on ? "true" : undefined} className={cn("flex min-h-9 items-center rounded-full border px-3 py-[7px] text-[13px] hover:text-ink", on ? "border-ink bg-ink text-paper hover:text-paper" : "border-line bg-paper text-ink-2")}>{L(PLURAL[l] ?? l)}</Link>; })}
        </div>
        <div className="rounded-[14px] border border-line-3 bg-paper">
          <div className="tr tr-head"><span className="k">{d.docs.date}</span><span className="k">{d.docs.type}</span><span className="k">{d.docs.document}</span><span className="k">{d.docs.from}</span><span /></div>
          {rows.map((r, i) => <Link key={r.id} href={`/p/${v.ref.id}/documents/${r.id}?from=dossier${type !== "Tous" ? `&type=${encodeURIComponent(type)}` : ""}`} className={cn("tr text-ink hover:bg-bg hover:text-ink", i > 0 && "border-t border-soft")}><span className="d">{r.date}</span><span className="text-[13px] text-ink-3">{L(r.type)}</span><span className="min-w-0 truncate">{r.titre}</span><span className="truncate text-[13px] text-dim-2">{r.de}</span><I.chevron /></Link>)}
          {rows.length === 0 && <div className="px-4 py-3 text-sm text-dim-2">{d.docs.none}</div>}
        </div>
      </main>
      <Omni placeholder={d.docs.omni} onSubmit={(t) => composer.run({ texte: t, patientId: v.ref.id, ecran: "documents" })} suggestions={[{ k: d.keys.chercher, t: "Toutes les TSH depuis 2020, en courbe" }, { k: d.keys.envoyer, t: "Renvoie le compte rendu du scanner au kiné" }, { k: d.keys.resumer, t: "Résume les courriers du cardiologue en trois lignes" }, { k: d.keys.dmp, t: "Partage la dernière ordonnance sur Mon espace santé" }]}>{composer.open && <ComposeCard state={composer.state} onClose={composer.reset} />}</Omni>
    </div>
  );
}
