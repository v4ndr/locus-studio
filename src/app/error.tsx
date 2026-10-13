"use client";
import * as React from "react";
import Link from "next/link";

/** Un écran qui a planté : on le dit en français, on propose de recharger, rien n'est perdu (les brouillons sont sur le poste). */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="k">Erreur</span>
      <h1 className="m-0 text-2xl font-medium tracking-[-.02em]">Cet écran n'a pas pu s'afficher</h1>
      <p className="m-0 max-w-[480px] text-sm text-muted-2">Vos brouillons et dossiers locaux restent sur ce poste. Rechargez l'écran ; si cela se reproduit, exportez le cabinet local depuis l'accueil et signalez le problème.</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={reset} className="min-h-11 rounded-[10px] bg-ink px-4 py-[9px] text-sm text-paper">Recharger l'écran</button>
        <Link href="/" className="flex min-h-11 items-center rounded-[10px] border border-line bg-paper px-4 py-[9px] text-sm text-ink hover:text-ink">Accueil</Link>
      </div>
    </div>
  );
}
