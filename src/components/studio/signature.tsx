"use client";
import * as React from "react";
import Link from "next/link";
import type { PatientView } from "@/studio/types";
import { useRouter, useSearchParams } from "next/navigation";
import { Header, Kbd, I, useShortcuts } from "./chrome";
import { DR_LAURENT } from "@/data/cabinet";
import { TODAY } from "@/data/clock";
import { useRencontre } from "@/store/rencontre";
import { cn } from "@/lib/cn";

/** Validation et signature : la liste, l'aperçu, un bouton. Puis « Rencontre clôturée ». */
export function SignatureView(props: { v: PatientView; praticien: { initials: string; nom: string } }) {
  return <React.Suspense fallback={null}><SignatureInner {...props} /></React.Suspense>;
}

function SignatureInner({ v, praticien }: { v: PatientView; praticien: { initials: string; nom: string } }) {
  const r = v.rencontre;
  const docParam = useSearchParams().get("doc");
  const router = useRouter();
  const { me, dispatch } = useRencontre(v.ref.id);
  const aSigner = r.actions.filter((a) => a.statut !== "attente" && a.destination !== "agenda");
  const attente = r.actions.filter((a) => a.statut === "attente" || a.destination === "agenda");
  // La question posée à l'écran précédent : tant qu'elle est sans réponse, le document concerné n'est pas signable.
  const answer = r.question ? me.answers[r.question.id] : undefined;
  const reponse = r.question && answer ? r.question.options.find((o) => o.id === answer)?.label ?? answer : undefined;
  const bloque = !!r.question && !answer && aSigner.some((a) => a.id === r.question!.appliqueA);
  const [sel, setSel] = React.useState(aSigner.find((a) => a.statut !== "pret")?.id ?? aSigner[0]?.id);
  React.useEffect(() => { if (docParam && aSigner.some((a) => a.id === docParam)) setSel(docParam); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [docParam]);
  const cur = aSigner.find((a) => a.id === sel);
  const sign = () => { if (!bloque && aSigner.length) dispatch({ type: "sign", patientId: v.ref.id }); };
  useShortcuts({ cmdEnter: () => (me.signed ? undefined : sign()) });
  const total = aSigner.length + 1;
  const suivantRef = React.useRef<HTMLAnchorElement>(null);
  const suivantHref = v.suivant ? `/p/${v.suivant.id}` : "/";
  React.useEffect(() => {
    if (!me.signed) return;
    suivantRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Enter" && !e.metaKey && !e.ctrlKey && !(e.target as HTMLElement | null)?.closest("input, textarea, a, button")) { e.preventDefault(); router.push(suivantHref); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [me.signed, router, suivantHref]);
  const champ = (texte: string) => texte.replace("[SORTIES]", reponse?.toLowerCase() ?? "à confirmer").replace(/à confirmer/, reponse ?? "à confirmer");

  if (me.signed) {
    return (
      <div className="flex min-h-dvh flex-col">
        <Header praticien={praticien} patient={{ id: v.ref.id, nom: v.ref.nom, initials: v.ref.initials, meta: "clôturée" }} back={`/p/${v.ref.id}`} />
        <main className="flex flex-1 flex-col items-center justify-center gap-[18px] px-6 py-12">
          <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-ok-soft"><I.check size={24} color="var(--ok)" w={2.2} /></span>
          <h1 className="m-0 text-[26px] font-medium tracking-[-.02em]">Rencontre clôturée</h1>
          <p className="m-0 text-center text-[15px] text-muted">{total} document{total > 1 ? "s" : ""} signé{total > 1 ? "s" : ""} et envoyé{total > 1 ? "s" : ""} · synthèse versée au dossier · {attente.length} suivi{attente.length > 1 ? "s" : ""} programmé{attente.length > 1 ? "s" : ""}</p>
          <Link ref={suivantRef} href={suivantHref} className="mt-3 flex min-h-11 items-center gap-2.5 rounded-xl border border-line bg-paper px-[18px] py-3 text-[15px] text-ink hover:text-ink">{v.suivant ? `Patient suivant · ${v.suivant.nom}` : "Retour à l'accueil"} <Kbd>⏎</Kbd></Link>
          <button type="button" onClick={() => dispatch({ type: "reopen", patientId: v.ref.id })} className="min-h-10 text-xs text-muted-2 hover:text-ink">Rouvrir la rencontre (rejouer le scénario)</button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Header praticien={praticien} patient={{ id: v.ref.id, nom: v.ref.nom, initials: v.ref.initials, meta: "validation" }} back={`/p/${v.ref.id}/actions`} />
      <main className="mx-auto flex w-full max-w-[1240px] flex-1 flex-wrap gap-7 px-4 py-6 sm:px-6 sm:py-9">
        <section className="flex min-w-0 flex-[1_1_360px] flex-col gap-2">
          {bloque && r.question && (
            <div className="mb-2 flex flex-col gap-3 rounded-[14px] bg-accent-soft-2 px-5 py-[18px]" role="alert">
              <span className="text-[15px]">{r.question.texte}</span>
              <div className="flex flex-wrap gap-2">{r.question.options.map((o) => <button key={o.id} type="button" onClick={() => dispatch({ type: "answer", patientId: v.ref.id, questionId: r.question!.id, optionId: o.id })} className="min-h-10 rounded-full border border-accent-line bg-paper px-3.5 py-2 text-[13px] text-ink hover:bg-hover">{o.label}</button>)}</div>
              <span className="text-xs text-muted-2">Sans réponse, le document concerné ne part pas.</span>
            </div>
          )}
          <span className="k px-1 pb-2">À signer · {total}</span>
          {aSigner.map((a) => {
            const enQuestion = bloque && a.id === r.question?.appliqueA;
            return (
            <button key={a.id} type="button" onClick={() => setSel(a.id)} aria-pressed={sel === a.id} className={cn("flex min-h-12 items-center gap-3.5 rounded-xl border bg-paper px-4 py-[13px] text-left text-[15px]", sel === a.id ? "border-accent-line" : "border-line-3")}>
              <span className={cn("flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px]", enQuestion ? "border-[1.5px] border-warn-dot" : "bg-ink")}>{!enQuestion && <I.check size={12} color="var(--paper)" w={3} />}</span>
              <span className="flex-1">{a.titre}</span>
              <span className={cn("text-xs", enQuestion ? "text-warn" : "text-muted-2")}>{enQuestion ? "question sans réponse" : a.destination}</span>
            </button>
          ); })}
          {aSigner.length === 0 && <div className="rounded-xl border border-dashed border-line-3 px-4 py-4 text-sm text-muted-2">Rien à signer : cette rencontre n'a produit aucun document.</div>}
          <div className="flex items-center gap-3.5 rounded-xl border border-line-3 bg-paper px-4 py-[13px] text-[15px]">
            <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] bg-ink"><I.check size={12} color="var(--paper)" w={3} /></span>
            <span className="flex-1">Synthèse de la rencontre</span><span className="text-xs text-muted-2">dossier · DMP</span>
          </div>
          {attente.length > 0 && <span className="k px-1 pb-2 pt-[18px]">En attente</span>}
          {attente.map((a) => (
            <div key={a.id} className="flex items-center gap-3.5 rounded-xl border border-dashed border-line-3 px-4 py-[13px] text-[15px]">
              <span className="h-[18px] w-[18px] shrink-0 rounded-[5px] border-[1.5px] border-gray-dot" />
              <span className="flex-1 text-muted">{a.titre}</span><span className="text-xs text-muted-2">{a.attente ?? (a.destination === "agenda" ? (/\d/.test(a.ligne.split(" · ")[0]) ? `programmé ${a.ligne.split(" · ")[0]}` : "à programmer") : a.destination)}</span>
            </div>
          ))}
        </section>
        <section className="flex min-w-0 flex-[999_1_520px] justify-center py-2">
          <div className="flex w-full max-w-[560px] flex-col gap-[22px] rounded-md border border-line bg-paper px-6 py-7 text-sm leading-relaxed sm:px-12 sm:py-11" style={{ boxShadow: "var(--shadow)" }}>
            <div className="flex justify-between gap-4"><div className="flex flex-col"><b className="font-semibold">{praticien.nom}</b><span className="text-muted-2">{DR_LAURENT.specialite} · RPPS {DR_LAURENT.rpps}</span></div><span className="text-muted-2">{TODAY.split("-").reverse().join("/")}</span></div>
            <div className="flex flex-col"><span>{v.ref.sexe === "F" || (!v.ref.sexe && v.meta.endsWith("F")) ? "Mme" : "M."} {v.ref.nom}</span><span className="text-muted-2">né{v.meta.endsWith("F") ? "e" : ""} le {v.ref.naissance}</span></div>
            <div className="border-t border-line-4 pt-[18px]">
              <p className="m-0 mb-2 font-medium">{cur?.apercu?.titre ?? cur?.titre}</p>
              {(cur?.apercu?.corps ?? cur?.fields.map((f) => `${f.k} : ${f.v}`) ?? []).map((l, i) => <p key={i} className={cn("m-0", i > 0 && "mt-2.5")}>{champ(l)}</p>)}
              {cur?.apercu?.pied && <p className="m-0 mt-2.5 text-muted-2">{cur.apercu.pied}</p>}
            </div>
            <div className="mt-auto flex justify-end"><span className="rounded-lg border-[1.5px] border-dashed border-accent-line px-4 py-2.5 text-[13px]" style={{ color: "var(--accent)" }}>Signature e-CPS</span></div>
          </div>
        </section>
      </main>
      <div className="sticky-fade px-4 pb-5 pt-4 sm:px-6 sm:pb-6">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-end gap-3.5">
          <span className="rounded-full bg-bg px-2 py-1 text-[13px] text-muted-2">Pro Santé Connect · e-CPS connectée</span>
          <button type="button" onClick={sign} disabled={bloque || aSigner.length === 0} title={bloque ? "Répondez d'abord à la question" : undefined} className="btn-accent flex min-h-11 items-center gap-2.5 rounded-xl px-4 py-3 text-[15px] font-medium disabled:opacity-50 sm:px-5">Signer et envoyer {total} document{total > 1 ? "s" : ""} <span className="kbd kbd-on-accent">⌘⏎</span></button>
        </div>
      </div>
    </div>
  );
}
