"use client";
import * as React from "react";
import { cn } from "@/lib/cn";

/** Interrupteur : teal quand activé (état actif), neutre sinon. */
export function Switch({ checked, onCheckedChange, disabled, className, ...rest }: { checked: boolean; onCheckedChange: (v: boolean) => void; disabled?: boolean; className?: string } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange">) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn("relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent transition-colors disabled:opacity-50", checked ? "bg-brand" : "bg-input", className)}
      {...rest}
    >
      <span className={cn("block size-4 rounded-full bg-background shadow-xs transition-transform", checked ? "translate-x-4" : "translate-x-0.5")} />
    </button>
  );
}
