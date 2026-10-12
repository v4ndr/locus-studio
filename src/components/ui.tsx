"use client";
import * as React from "react";
import { cn } from "@/lib/cn";

/* Les primitives du studio — volontairement peu nombreuses. */

export function Button({ className, variant = "default", size = "md", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "outline" | "ghost" | "agent" | "danger" | "success"; size?: "sm" | "md" | "icon" }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap",
        size === "sm" && "h-7 px-2.5 text-xs",
        size === "md" && "h-9 px-3.5 text-sm",
        size === "icon" && "h-8 w-8",
        variant === "default" && "bg-primary text-primary-foreground hover:bg-primary/90",
        variant === "outline" && "border bg-card hover:bg-muted",
        variant === "ghost" && "hover:bg-muted",
        variant === "agent" && "bg-agent text-agent-foreground hover:bg-agent/90",
        variant === "danger" && "border border-destructive/40 text-destructive hover:bg-destructive/10",
        variant === "success" && "bg-success text-white hover:bg-success/90",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({ className, tone = "muted", children }: { className?: string; tone?: "muted" | "primary" | "agent" | "success" | "warning" | "danger" | "outline"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-micro font-medium leading-4",
        tone === "muted" && "bg-muted text-muted-foreground",
        tone === "primary" && "bg-accent text-accent-foreground",
        tone === "agent" && "bg-agent-soft text-agent",
        tone === "success" && "bg-success/12 text-success",
        tone === "warning" && "bg-warning/15 text-warning",
        tone === "danger" && "bg-destructive/10 text-destructive",
        tone === "outline" && "border text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Card({ className, children, agent }: { className?: string; children: React.ReactNode; agent?: boolean }) {
  return <div className={cn("rounded-lg border border-border/70 bg-card text-card-foreground", agent && "agent-glow border-transparent", className)}>{children}</div>;
}

export function SectionTitle({ children, right, className }: { children: React.ReactNode; right?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-2 mb-2", className)}>
      <h3 className="text-micro uppercase tracking-wider text-muted-foreground font-semibold">{children}</h3>
      {right}
    </div>
  );
}

export function Avatar({ hue = 200, initials, size = "md", className }: { hue?: number; initials: string; size?: "sm" | "md" | "lg"; className?: string }) {
  return (
    <div
      className={cn("shrink-0 rounded-full flex items-center justify-center font-semibold select-none", size === "sm" && "h-7 w-7 text-micro", size === "md" && "h-9 w-9 text-xs", size === "lg" && "h-14 w-14 text-base", className)}
      style={{ background: `oklch(0.9 0.06 ${hue})`, color: `oklch(0.38 0.1 ${hue})` }}
    >
      {initials}
    </div>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="inline-flex h-5 items-center rounded border bg-muted px-1.5 font-mono text-micro text-muted-foreground">{children}</kbd>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{children}</div>;
}

export function Dot({ tone }: { tone: "agent" | "success" | "warning" | "danger" | "muted" | "primary" }) {
  return <span className={cn("inline-block h-2 w-2 rounded-full", tone === "agent" && "bg-agent", tone === "success" && "bg-success", tone === "warning" && "bg-warning", tone === "danger" && "bg-destructive", tone === "muted" && "bg-muted-foreground/40", tone === "primary" && "bg-primary")} />;
}
