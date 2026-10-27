import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * La carte papier de la landing : fond `--card`, filet `--border` d'un pixel
 * tout autour (jamais de bordure colorée à gauche ou en haut), rayon 20 px,
 * pas d'ombre. `interactive` : au survol, le filet passe à l'accent et
 * l'action (`CardAction`) s'inverse.
 */
export function Card({ className, interactive, ...rest }: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return <div className={cn("flex min-w-0 flex-col rounded-[20px] border border-border bg-card text-card-foreground", interactive && "group/card transition-colors hover:border-ring", className)} {...rest} />;
}

export function CardBody({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid flex-1 content-start gap-2 p-5 pb-4", className)} {...rest} />;
}

export function CardFooter({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pb-5", className)} {...rest} />;
}

/** La tuile d'icône (la `.tileico` de la landing, en 32 px). */
export function CardIcon({ className, ...rest }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("mb-1.5 grid size-8 place-items-center rounded-[9px] bg-tile text-acc [&_svg]:size-4 dark:bg-accent dark:text-glow", className)} {...rest} />;
}

export function CardTitle({ className, ...rest }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("m-0 text-base leading-tight font-bold tracking-[-.015em]", className)} {...rest} />;
}

export function CardText({ className, ...rest }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("m-0 text-sm text-muted-foreground", className)} {...rest} />;
}

/** Le bouton d'action pleine largeur, avec la flèche ; s'inverse au survol de la carte. */
export function CardAction({ className, ...rest }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("flex min-h-9 w-full items-center justify-between gap-2 rounded-full border border-input px-4 py-2 text-sm font-semibold transition-colors group-hover/card:border-primary group-hover/card:bg-primary group-hover/card:text-primary-foreground [&_svg]:size-4", className)} {...rest} />;
}

/** Une boîte (section encadrée) avec en-tête optionnel. */
export function Box({ className, ...rest }: React.HTMLAttributes<HTMLElement>) {
  return <section className={cn("rounded-[20px] border border-border bg-card", className)} {...rest} />;
}
