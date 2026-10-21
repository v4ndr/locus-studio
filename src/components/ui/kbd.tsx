import * as React from "react";
import { cn } from "@/lib/cn";

/** Raccourci clavier, en Geist Mono. */
export function Kbd({ className, ...rest }: React.HTMLAttributes<HTMLElement>) {
  return <kbd className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-[4px] bg-muted px-1 font-mono text-[11px] font-medium text-muted-foreground", className)} {...rest} />;
}
