import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Bouton Noir (shadcn/ui, base neutre). `default` = contour, `primary` =
 * plein (inversé), `ghost` = sans fond, `icon` = carré 36 px.
 */
export type ButtonVariant = "default" | "primary" | "ghost";
export type ButtonSize = "md" | "sm" | "icon";

export function buttonClass({ variant = "default", size = "md", className }: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
    size === "md" && "h-9 px-4 text-sm",
    size === "sm" && "h-8 px-2.5 text-[12.5px]",
    size === "icon" && "size-9",
    variant === "default" && "border border-input bg-background text-foreground shadow-xs hover:bg-accent",
    variant === "primary" && "border border-primary bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
    variant === "ghost" && "text-foreground hover:bg-accent",
    className,
  );
}

type Common = { variant?: ButtonVariant; size?: ButtonSize };

export function Button({ variant, size, className, type = "button", ...rest }: Common & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={buttonClass({ variant, size, className })} {...rest} />;
}

export function ButtonLink({ variant, size, className, ...rest }: Common & React.ComponentProps<typeof Link>) {
  return <Link className={buttonClass({ variant, size, className })} {...rest} />;
}
