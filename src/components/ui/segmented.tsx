"use client";
import * as React from "react";
import { cn } from "@/lib/cn";

/** Groupe segmenté (bascules thème et langue de la sidebar). */
export function Segmented<T extends string>({ label, value, options, onChange, className }: { label: string; value: T; options: { value: T; label: React.ReactNode; aria?: string }[]; onChange: (v: T) => void; className?: string }) {
  return (
    <span role="group" aria-label={label} className={cn("inline-flex gap-0.5 rounded-md bg-muted p-[3px]", className)}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} aria-label={o.aria} onClick={() => onChange(o.value)} className={cn("flex h-[26px] items-center gap-1 rounded-[6px] px-[9px] font-mono text-[11.5px] font-medium [&_svg]:size-3.5", value === o.value ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground")}>
          {o.label}
        </button>
      ))}
    </span>
  );
}
