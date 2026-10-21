import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * Carte Noir : bordure `--border` pleine (jamais de bordure colorée à gauche
 * ou en haut), rayon `--radius + 4px`, `--shadow-sm`. `interactive` : au
 * survol, la bordure passe à `--ring` et l'action (`CardAction`) s'inverse.
 */
export function Card({ className, interactive, ...rest }: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return <div className={cn("flex min-w-0 flex-col rounded-xl border border-border bg-card text-card-foreground shadow-sm", interactive && "group/card transition-colors hover:border-ring", className)} {...rest} />;
}

export function CardBody({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid flex-1 content-start gap-2 p-5 pb-4", className)} {...rest} />;
}

export function CardFooter({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pb-5", className)} {...rest} />;
}

/** La tuile d'icône de 32 px. */
export function CardIcon({ className, ...rest }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("mb-1.5 grid size-8 place-items-center rounded-md border border-border bg-muted text-foreground [&_svg]:size-4", className)} {...rest} />;
}

export function CardTitle({ className, ...rest }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("m-0 text-base leading-tight font-semibold tracking-[-.01em]", className)} {...rest} />;
}

export function CardText({ className, ...rest }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("m-0 text-sm text-muted-foreground", className)} {...rest} />;
}

/** Le bouton d'action pleine largeur, avec la flèche ; s'inverse au survol de la carte. */
export function CardAction({ className, ...rest }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("flex min-h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3.5 py-2 text-sm font-medium shadow-xs transition-colors group-hover/card:border-primary group-hover/card:bg-primary group-hover/card:text-primary-foreground [&_svg]:size-4", className)} {...rest} />;
}

/** Une boîte (section encadrée) avec en-tête optionnel. */
export function Box({ className, ...rest }: React.HTMLAttributes<HTMLElement>) {
  return <section className={cn("rounded-xl border border-border bg-card shadow-sm", className)} {...rest} />;
}
