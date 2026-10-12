"use client";
import * as React from "react";
import type { PatientView } from "@/studio/types";
import { Header } from "./chrome";
import { NoteEditor } from "./note";

/** La note libre pour un patient du jeu de données : même éditeur, même composer, chrono compris. */
export function NoteView({ v, praticien }: { v: PatientView; praticien: { initials: string } }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header praticien={praticien} patient={{ id: v.ref.id, nom: v.ref.nom, initials: v.ref.initials, meta: v.meta }} back={`/p/${v.ref.id}`} />
      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-5 px-4 pb-8 pt-8 sm:px-6 sm:pt-12">
        <NoteEditor patientId={v.ref.id} nom={v.ref.nom} retour={`/p/${v.ref.id}`} />
      </main>
    </div>
  );
}
