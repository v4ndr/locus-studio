import * as React from "react";
import { cn } from "@/lib/cn";

/** Code en ligne, en Geist Mono. */
export function C({ className, ...rest }: React.HTMLAttributes<HTMLElement>) {
  return <code className={cn("rounded-[4px] bg-muted px-1 py-px font-mono text-[.86em] text-foreground [overflow-wrap:anywhere]", className)} {...rest} />;
}

/** Un texte de dictionnaire où les segments entre accents graves sont du code. */
export function Rich({ text }: { text: string }) {
  const parts = text.split("`");
  return <>{parts.map((p, i) => (i % 2 ? <C key={i}>{p}</C> : <React.Fragment key={i}>{p}</React.Fragment>))}</>;
}

/** Titre de section (15 px), ancrable. */
export function SectionTitle({ id, children, extra }: { id?: string; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <h2 id={id} className="m-0 flex scroll-mt-20 flex-wrap items-center gap-2 text-[15px] font-semibold tracking-[-.01em]">
      {children}{extra}
    </h2>
  );
}
