"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import type { PatientView } from "@/studio/types";
import { SORTIES_LABEL } from "@/data/rencontres";
import { Header, Omni, CtaLink, Kbd, I, useShortcuts } from "./chrome";
import { useRencontre } from "@/store/rencontre";
import { cn } from "@/lib/cn";

/** Les actions générées : une liste de documents, une question, un bouton. */
export function ActionsView({ v, praticien }: { v: PatientView; praticien: { initials: string } }) {
  const router = useRouter();
  const r = v.rencontre;
  const { me, dispatch } = useRencontre(v.ref.id);
  const [open, setOpen] = React.useState<string | null>(null);
  useShortcuts({ cmdEnter: () => router.push(`/p/${v.ref.id}/signature`) });
  const answer = r.question ? me.answers[r.question.id] : undefined;
  const docs = r.actions.map((a) => {
    if (r.question && a.id === r.question.appliqueA) {
      const s = answer ? SORTIES_LABEL[answer] ?? answer : undefined;
      return { ...a, statut: s ? ("pret" as const) : a.statut, ligne: s ? `${a.ligne} · sorties ${s}` : a.ligne, fields: a.fields.map((f) => (f.k === r.question!.champ ? { ...f, v: s ?? "à confirmer" } : f)) };
    }
    return a;
  });
  const todo = docs.filter((d) => d.statut === "relire" || d.statut === "question").length;
  const label = (s: string) => ({ pret: "prêt", relire: "à relire", question: "1 question", attente: "en attente" }[s] ?? s);
  const color = (s: string) => (s === "pret" ? "var(--ok)" : s === "attente" ? "var(--muted-2)" : "var(--warn)");

  return (
    <div className="flex min-h-dvh flex-col">
      <Header praticien={praticien} patient={{ id: v.ref.id, nom: v.ref.nom, initials: v.ref.initials }} back={`/p/${v.ref.id}/rencontre`} />
      <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-6 px-4 pb-8 pt-8 sm:px-6 sm:pt-14">
        <h1 className="m-0 text-[22px] font-medium sm:text-[26px] tracking-[-.02em]">{docs.length} document{docs.length > 1 ? "s" : ""} prêt{docs.length > 1 ? "s" : ""}{todo ? ` · ${todo} à regarder` : ""}</h1>
        {r.question && !answer && (
          <div className="flex flex-col gap-3 rounded-[14px] bg-accent-soft-2 px-5 py-[18px]">
            <span className="text-[15px]">{r.question.texte}</span>
            <div className="flex flex-wrap gap-2">{r.question.options.map((o) => <button key={o.id} type="button" onClick={() => dispatch({ type: "answer", patientId: v.ref.id, questionId: r.question!.id, optionId: o.id })} className="rounded-full border border-accent-line bg-paper px-3.5 py-2 text-[13px] text-ink hover:border-accent">{o.label}</button>)}</div>
          </div>
        )}
        <section className="flex flex-col gap-0.5 rounded-2xl border border-line-3 bg-paper p-1.5">
          {docs.length === 0 && <div className="px-4 py-3 text-sm text-muted-2">Aucune action détectée.</div>}
          {docs.map((d) => {
            const isOpen = open === d.id;
            return (
              <div key={d.id}>
                <button type="button" onClick={() => setOpen(isOpen ? null : d.id)} aria-expanded={isOpen} className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3.5 text-left hover:bg-hover">
                  <span className="d flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-soft text-[10px] text-ink-3">{d.code}</span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5"><span className="text-[15px]">{d.titre}</span><span className="text-[13px] text-muted-2">{d.ligne}</span></span>
                  <span className="text-xs" style={{ color: color(d.statut) }}>{label(d.statut)}</span>
                  <I.chevron open={isOpen} />
                </button>
                {isOpen && (
                  <div className="flex flex-col px-4 pb-4 pt-1 md:pl-[58px]">
                    {d.fields.map((f, i) => <div key={i} className="flex gap-4 border-t border-soft py-2.5 text-sm leading-[1.45]"><span className="w-[110px] shrink-0 text-muted-2">{f.k}</span><span className="flex-1">{f.v}</span></div>)}
                    <span className="pt-2.5 text-xs" style={{ color: "var(--accent)" }}>Voir la phrase dictée · ouvrir le document</span>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </main>
      <Omni placeholder="« Ajoute un bon de transport », « passe la kiné à domicile »…" suggestions={[{ k: "ajouter", t: "Ajoute un bon de transport assis" }, { k: "modifier", t: "Passe la kiné à domicile, 10 séances" }, { k: "retirer", t: "Retire le courrier, je l'appellerai" }, { k: "ordo", t: "Ajoute du paracétamol 1 g si douleur" }]} cta={<CtaLink href={`/p/${v.ref.id}/signature`}>Signer <Kbd dark>⌘⏎</Kbd></CtaLink>} />
    </div>
  );
}

export function statutClass(s: string) { return cn(s); }
