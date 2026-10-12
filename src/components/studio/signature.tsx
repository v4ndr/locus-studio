"use client";
import * as React from "react";
import Link from "next/link";
import type { PatientView } from "@/studio/types";
import { SORTIES_LABEL } from "@/data/rencontres";
import { Header, Kbd, I, useShortcuts } from "./chrome";
import { useRencontre } from "@/store/rencontre";
import { cn } from "@/lib/cn";

/** Validation et signature : la liste, l'aperçu, un bouton. Puis « Rencontre clôturée ». */
export function SignatureView({ v, praticien }: { v: PatientView; praticien: { initials: string; nom: string } }) {
  const r = v.rencontre;
  const { me, dispatch } = useRencontre(v.ref.id);
  const aSigner = r.actions.filter((a) => a.statut !== "attente" && a.destination !== "agenda");
  const attente = r.actions.filter((a) => a.statut === "attente" || a.destination === "agenda");
  const [sel, setSel] = React.useState(aSigner.find((a) => a.code === "K")?.id ?? aSigner[0]?.id);
  const cur = aSigner.find((a) => a.id === sel);
  const sorties = r.question ? SORTIES_LABEL[me.answers[r.question.id] ?? ""] : undefined;
  const sign = () => dispatch({ type: "sign", patientId: v.ref.id });
  useShortcuts({ cmdEnter: () => (me.signed ? undefined : sign()) });
  const total = aSigner.length + 1;

  if (me.signed) {
    return (
      <div className="flex min-h-dvh flex-col">
        <Header praticien={praticien} patient={{ id: v.ref.id, nom: v.ref.nom, initials: v.ref.initials, meta: "clôturée" }} back={`/p/${v.ref.id}`} />
        <main className="flex flex-1 flex-col items-center justify-center gap-[18px] px-6 py-12">
          <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-ok-soft"><I.check size={24} color="#1F6B3A" w={2.2} /></span>
          <h1 className="m-0 text-[26px] font-medium tracking-[-.02em]">Rencontre clôturée</h1>
          <p className="m-0 text-center text-[15px] text-muted">{total} documents signés et envoyés · synthèse versée au dossier · {attente.length} suivi{attente.length > 1 ? "s" : ""} programmé{attente.length > 1 ? "s" : ""}</p>
          <Link href={v.suivant ? `/p/${v.suivant.id}` : "/"} className="mt-3 flex items-center gap-2.5 rounded-xl border border-line bg-paper px-[18px] py-3 text-[15px]" style={{ color: "#111" }}>{v.suivant ? `Patient suivant · ${v.suivant.nom}` : "Retour à l'accueil"} <Kbd>⏎</Kbd></Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Header praticien={praticien} patient={{ id: v.ref.id, nom: v.ref.nom, initials: v.ref.initials, meta: "validation" }} back={`/p/${v.ref.id}/actions`} />
      <main className="mx-auto flex w-full max-w-[1240px] flex-1 flex-wrap gap-7 px-6 py-9">
        <section className="flex min-w-0 flex-[1_1_360px] flex-col gap-2">
          <span className="k px-1 pb-2">À signer · {total}</span>
          {aSigner.map((a) => (
            <button key={a.id} type="button" onClick={() => setSel(a.id)} className={cn("flex items-center gap-3.5 rounded-xl border bg-paper px-4 py-[13px] text-left text-[15px]", sel === a.id ? "border-accent-line" : "border-line-3")}>
              <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] bg-ink"><I.check size={12} color="#fff" w={3} /></span>
              <span className="flex-1">{a.titre}</span>
              <span className="text-xs text-muted-2">{a.destination}</span>
            </button>
          ))}
          <div className="flex items-center gap-3.5 rounded-xl border border-line-3 bg-paper px-4 py-[13px] text-[15px]">
            <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] bg-ink"><I.check size={12} color="#fff" w={3} /></span>
            <span className="flex-1">Synthèse de la rencontre</span><span className="text-xs text-muted-2">dossier · DMP</span>
          </div>
          {attente.length > 0 && <span className="k px-1 pb-2 pt-[18px]">En attente</span>}
          {attente.map((a) => (
            <div key={a.id} className="flex items-center gap-3.5 rounded-xl border border-dashed border-line-3 px-4 py-[13px] text-[15px]">
              <span className="h-[18px] w-[18px] shrink-0 rounded-[5px] border-[1.5px] border-gray-dot" />
              <span className="flex-1 text-muted">{a.titre}</span><span className="text-xs text-muted-2">{a.attente ?? (a.destination === "agenda" ? `programmé ${a.ligne.split(" · ")[0]}` : a.destination)}</span>
            </div>
          ))}
        </section>
        <section className="flex min-w-0 flex-[999_1_520px] justify-center py-2">
          <div className="flex w-full max-w-[560px] flex-col gap-[22px] rounded-md border border-line bg-paper px-12 py-11 text-sm leading-relaxed" style={{ boxShadow: "0 12px 32px rgba(17,17,17,.07)" }}>
            <div className="flex justify-between gap-4"><div className="flex flex-col"><b className="font-semibold">{praticien.nom}</b><span className="text-muted-2">Médecine générale · [RPPS]</span></div><span className="text-muted-2">15/10/2026</span></div>
            <div className="flex flex-col"><span>{v.ref.nom.startsWith("M") && v.ref.nom.endsWith("e") ? "Mme" : ""} {v.ref.nom}</span><span className="text-muted-2">né{v.meta.endsWith("F") ? "e" : ""} le {v.ref.naissance}</span></div>
            <div className="border-t border-line-4 pt-[18px]">
              <p className="m-0 mb-2 font-medium">{cur?.apercu?.titre ?? cur?.titre}</p>
              {(cur?.apercu?.corps ?? cur?.fields.map((f) => `${f.k} : ${f.v}`) ?? []).map((l, i) => <p key={i} className={cn("m-0", i > 0 && "mt-2.5")}>{l.replace("[SORTIES]", sorties ?? "à confirmer")}</p>)}
              {cur?.apercu?.pied && <p className="m-0 mt-2.5 text-muted-2">{cur.apercu.pied}</p>}
            </div>
            <div className="mt-auto flex justify-end"><span className="rounded-lg border-[1.5px] border-dashed border-accent-line px-4 py-2.5 text-[13px]" style={{ color: "#1A4DFF" }}>Signature e-CPS</span></div>
          </div>
        </section>
      </main>
      <div className="sticky-fade px-6 pb-6 pt-4">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-end gap-3.5">
          <span className="text-[13px] text-muted-2">Pro Santé Connect · e-CPS connectée</span>
          <button type="button" onClick={sign} className="flex items-center gap-2.5 rounded-xl bg-accent px-5 py-3 text-[15px] font-medium text-white">Signer et envoyer {total} documents <span className="kbd" style={{ background: "#3A63FF", borderColor: "#5A7CFF", color: "#fff" }}>⌘⏎</span></button>
        </div>
      </div>
    </div>
  );
}
