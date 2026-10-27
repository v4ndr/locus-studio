import { cn } from "@/lib/cn";
import { LocusMarkMotion } from "./locus-mark-motion";

/**
 * Le loader Locus : la marque qui se bâtit disque après disque, la boucle des
 * étapes de pensée de la bêta (`locus-build`). C'est le seul signe « Locus
 * travaille » du Studio, à la couleur de Locus (`--brand`) et assez grand pour
 * se voir. Une attente qui n'est pas Locus prend `PlainLoader`, neutre et fade.
 *
 * - `inline` : 22 px dans une ligne (une étiquette, un état), libellé à côté ;
 * - `card` : 48 px en tête d'un bloc, libellé en 15 px ;
 * - `full` : 120 px au centre d'une zone vide.
 *
 * Sous `prefers-reduced-motion`, la marque reste entière et fixe ; le libellé
 * dit l'attente.
 */
export type LocusLoaderSize = "inline" | "card" | "full";

const PX: Record<LocusLoaderSize, number> = { inline: 22, card: 48, full: 120 };

export function LocusLoader({ size = "inline", label, px, className }: { size?: LocusLoaderSize; label?: React.ReactNode; px?: number; className?: string }) {
  const mark = <LocusMarkMotion size={px ?? PX[size]} className="shrink-0 text-brand" />;
  if (size === "inline") {
    return <span role="status" className={cn("inline-flex items-center gap-2", className)}>{mark}{label && <span className="font-medium text-foreground">{label}</span>}</span>;
  }
  if (size === "card") {
    return (
      <div role="status" className={cn("flex items-center gap-4 py-1", className)}>
        {mark}
        {label && <span className="text-[15px] font-semibold leading-snug tracking-[-.01em] text-foreground">{label}</span>}
      </div>
    );
  }
  return (
    <div role="status" className={cn("grid place-items-center content-center gap-5 py-12 text-center", className)}>
      {mark}
      {label && <span className="text-base font-semibold tracking-[-.01em] text-foreground">{label}</span>}
    </div>
  );
}

/** L'attente d'une réponse qui n'est pas Locus : trois lignes fades, sans marque ni compteur. */
export function PlainLoader({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("flex flex-col gap-2.5 py-1 opacity-55", className)}>
      <span className="h-2.5 w-11/12 animate-pulse-soft rounded-full bg-muted" />
      <span className="h-2.5 w-4/5 animate-pulse-soft rounded-full bg-muted" />
      <span className="h-2.5 w-3/5 animate-pulse-soft rounded-full bg-muted" />
    </div>
  );
}
