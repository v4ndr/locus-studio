import * as React from "react";
import { cn } from "@/lib/cn";

/** Infobulle CSS (survol et focus), sans dépendance. Le contenu reste court. */
export function Tooltip({ content, side = "top", children, className }: { content: React.ReactNode; side?: "top" | "bottom"; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("group/tt relative inline-flex", className)}>
      {children}
      <span role="tooltip" className={cn("pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground opacity-0 transition-opacity group-focus-within/tt:opacity-100 group-hover/tt:opacity-100", side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5")}>
        {content}
      </span>
    </span>
  );
}
