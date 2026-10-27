"use client";
import * as React from "react";
import { cn } from "@/lib/cn";

/** Groupe segmenté en pilule, comme la bascule FR/EN de la landing (thème, langue). */
export function Segmented<T extends string>({ label, value, options, onChange, className }: { label: string; value: T; options: { value: T; label: React.ReactNode; aria?: string }[]; onChange: (v: T) => void; className?: string }) {
  return (
    <span role="group" aria-label={label} className={cn("inline-flex gap-0.5 rounded-full border border-border p-[3px]", className)}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} aria-label={o.aria} onClick={() => onChange(o.value)} className={cn("flex h-[26px] items-center gap-1 rounded-full px-[10px] font-mono text-[11.5px] font-medium [&_svg]:size-3.5", value === o.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
          {o.label}
        </button>
      ))}
    </span>
  );
}
