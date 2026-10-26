"use client";
import * as React from "react";
import type { PatientView } from "@/studio/types";
import { useSearchParams, usePathname } from "next/navigation";
import { useRouter } from "./nav";
import { Header, useT } from "./chrome";
import { NoteEditor, NotesSession, readNotes } from "./note";
import type { NoteLocal } from "@/store/cabinet";

/**
 * La consultation d'un patient du jeu de données : l'éditeur cumule le script
 * de consultation (le texte fictif écrit pour ce patient, une entrée), la
 * dictée au micro et la note libre ; la synthèse et « Générer » sont live.
 */
export function NoteView(props: { v: PatientView; praticien: { initials: string } }) {
  return <React.Suspense fallback={null}><Inner {...props} /></React.Suspense>;
}

function Inner({ v, praticien }: { v: PatientView; praticien: { initials: string } }) {
  const sp = useSearchParams();
  const { t: d } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const modifie = sp.get("modifie");
  const [base, setBase] = React.useState<NoteLocal | undefined>(undefined);
  const [lu, setLu] = React.useState(false);
  const [version, setVersion] = React.useState(0);
  React.useEffect(() => { setBase(modifie ? readNotes(v.ref.id).find((n) => n.id === modifie) : undefined); setLu(true); }, [modifie, v.ref.id]);
  const patient = { nom: v.ref.nom, naissance: v.ref.naissance, age: v.ref.age, sexe: (v.meta.endsWith("F") ? "F" : "M") as "F" | "M", allergies: v.dossier.allergies.map((a) => a.k).filter((k) => !/^aucune/i.test(k)) };
  const script = v.rencontre.paragraphes.filter((p) => !p.muted).map((p) => p.texte).join("\n\n");
  const scripte = v.rencontre.actions.length > 0 && !/non scriptée/.test(v.rencontre.paragraphes[1]?.texte ?? "");
  return (
    <div className="flex min-h-dvh flex-col">
      <Header praticien={praticien} patient={{ id: v.ref.id, nom: v.ref.nom, initials: v.ref.initials, meta: v.rdv?.heure ?? v.meta }} back={`/p/${v.ref.id}`} />
      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-6 px-4 pb-8 pt-6 sm:px-6 sm:pt-10">
        <span className="k">{d.consult.title}{v.rdv ? ` · ${v.rdv.motif}` : ""}</span>
        {lu && modifie && !base && <div className="rounded-[10px] bg-soft px-3.5 py-2.5 text-sm">{d.consult.gone} <button type="button" onClick={() => router.replace(pathname)} className="underline">{d.newConsult}</button></div>}
        {lu && (!modifie || base) && <NoteEditor key={base?.id ?? "nouvelle"} patientId={v.ref.id} nom={v.ref.nom} retour={`/p/${v.ref.id}`} consultHref={`/p/${v.ref.id}/rencontre`} script={scripte ? script : undefined} motifInitial={v.rdv?.motif} base={base} patient={patient} onSaved={() => setVersion((x) => x + 1)} onAnnuler={() => router.replace(pathname)} />}
        <NotesSession patientId={v.ref.id} patient={patient} version={version} />
      </main>
    </div>
  );
}
