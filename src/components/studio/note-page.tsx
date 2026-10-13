"use client";
import * as React from "react";
import Link from "next/link";
import type { PatientView } from "@/studio/types";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Header } from "./chrome";
import { NoteEditor, NotesSession, readNotes } from "./note";
import type { NoteLocal } from "@/store/cabinet";

/**
 * La consultation d'un patient du jeu de données : l'éditeur cumule la dictée
 * simulée (le script écrit pour ce patient), la dictée au micro et la note
 * libre ; « Générer » passe par le composer. Le scénario du design reste
 * accessible pour les patients qui en ont un.
 */
export function NoteView(props: { v: PatientView; praticien: { initials: string } }) {
  return <React.Suspense fallback={null}><Inner {...props} /></React.Suspense>;
}

function Inner({ v, praticien }: { v: PatientView; praticien: { initials: string } }) {
  const sp = useSearchParams();
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
        <div className="flex flex-wrap items-center gap-3">
          <span className="k">Consultation{v.rdv ? ` · ${v.rdv.motif}` : ""}</span>
          <span className="flex-1" />
          {scripte && <Link href={`/p/${v.ref.id}/actions`} className="text-xs text-muted-2 hover:text-ink">Scénario du design →</Link>}
        </div>
        {lu && modifie && !base && <div className="rounded-[10px] bg-soft px-3.5 py-2.5 text-sm">Cette note n'est plus sur ce poste. <button type="button" onClick={() => router.replace(pathname)} className="underline">Nouvelle consultation</button></div>}
        {lu && (!modifie || base) && <NoteEditor key={base?.id ?? "nouvelle"} patientId={v.ref.id} nom={v.ref.nom} retour={`/p/${v.ref.id}`} consultHref={`/p/${v.ref.id}/rencontre`} script={scripte ? script : undefined} motifInitial={v.rdv?.motif} base={base} patient={patient} onSaved={() => setVersion((x) => x + 1)} onAnnuler={() => router.replace(pathname)} />}
        <NotesSession patientId={v.ref.id} patient={patient} version={version} />
      </main>
    </div>
  );
}
