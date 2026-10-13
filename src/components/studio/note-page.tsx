"use client";
import * as React from "react";
import Link from "next/link";
import type { PatientView } from "@/studio/types";
import { Header } from "./chrome";
import { NoteEditor, NotesSession } from "./note";

/**
 * La consultation d'un patient du jeu de données : l'éditeur cumule la dictée
 * simulée (le script écrit pour ce patient), la dictée au micro et la note
 * libre ; « Générer » passe par le composer. Le scénario du design reste
 * accessible pour les patients qui en ont un.
 */
export function NoteView({ v, praticien }: { v: PatientView; praticien: { initials: string } }) {
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
        <NoteEditor patientId={v.ref.id} nom={v.ref.nom} retour={`/p/${v.ref.id}`} consultHref={`/p/${v.ref.id}/rencontre`} script={scripte ? script : undefined} motifInitial={v.rdv?.motif} />
        <NotesSession patientId={v.ref.id} />
      </main>
    </div>
  );
}
