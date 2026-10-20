import * as React from "react";
import { cn } from "@/lib/cn";

const champ = "w-full min-w-0 rounded-md border border-input bg-field px-3 text-sm text-foreground shadow-xs placeholder:text-muted-foreground focus:border-ring focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--ring)_50%,transparent)] disabled:opacity-50";

export function Input({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(champ, "h-9", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(champ, "min-h-20 resize-y py-2 leading-normal", className)} {...rest} />;
}

export function Select({ className, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(champ, "h-9 px-2 [&_option]:bg-popover [&_option]:text-foreground", className)} {...rest} />;
}

/** Un champ avec son libellé (14 px, 500) ; `optional` affiche une mention discrète. */
export function Field({ label, optional, error, className, children }: { label: React.ReactNode; optional?: React.ReactNode; error?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn("grid gap-2 text-sm font-medium", className)}>
      <span>{label}{optional && <span className="font-normal text-muted-foreground"> {optional}</span>}</span>
      {children}
      {error && <span className="text-[12.5px] font-normal text-destructive">{error}</span>}
    </label>
  );
}
