import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * Chip / badge. `chip` : puce de carte (bordure, 12 px). `pill` : métadonnée
 * en Geist Mono. `active` : seul usage du teal, pour un état actif.
 */
export function Badge({ variant = "chip", className, ...rest }: React.HTMLAttributes<HTMLSpanElement> & { variant?: "chip" | "pill" | "active" | "secondary" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap",
        variant === "chip" && "rounded-full border border-border px-2 py-0.5 text-xs font-medium text-foreground",
        variant === "pill" && "rounded-full border border-input px-[7px] py-px font-mono text-[11px] font-medium text-muted-foreground",
        variant === "active" && "rounded-full border border-brand/40 bg-brand-soft px-[7px] py-px font-mono text-[11px] font-medium text-brand",
        variant === "secondary" && "rounded-md border border-border bg-secondary px-[7px] text-[11px] font-medium text-secondary-foreground",
        className,
      )}
      {...rest}
    />
  );
}

/** La pastille de statut : teal quand actif, neutre sinon. */
export function StatusDot({ active = true, className }: { active?: boolean; className?: string }) {
  return <i aria-hidden="true" className={cn("block size-1.5 shrink-0 rounded-full", active ? "bg-brand" : "bg-ring", className)} />;
}
