import Link from "next/link";
import { Header } from "@/components/studio/chrome";

/** Une page qui n'existe pas : en français, dans le thème, avec le chemin du retour. */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header praticien={{ initials: "RV" }} back="/" />
      <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="k">404</span>
        <h1 className="m-0 text-2xl font-medium tracking-[-.02em]">Cette page n'existe pas</h1>
        <p className="m-0 text-sm text-muted-2">Le dossier, le document ou la boîte que vous cherchez n'est pas là. Depuis l'accueil, ⌘K retrouve n'importe quel patient.</p>
        <Link href="/" className="mt-2 flex min-h-11 items-center rounded-[10px] bg-ink px-4 py-[9px] text-sm text-paper hover:text-paper">Retour à l'accueil</Link>
      </main>
    </div>
  );
}
