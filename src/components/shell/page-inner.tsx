import * as React from "react";
import { cn } from "@/lib/cn";

/** La colonne standard de la zone principale : 1120 px, sous la bande des pilules flottantes. */
export function PageInner({ className, ...rest }: React.HTMLAttributes<HTMLElement>) {
  return <main className={cn("mx-auto grid w-full max-w-[1120px] gap-9 px-4 pb-8 pt-4 min-[821px]:px-10 min-[821px]:pb-10 min-[821px]:pt-8", className)} {...rest} />;
}

/** L'en-tête de page : le titre de la landing (800, serré) et les actions à droite. */
export function PageHead({ title, children }: { title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <h1 className="m-0 flex-1 text-[30px] font-extrabold leading-[1.08] tracking-[-.03em] min-[821px]:text-[38px]">{title}</h1>
      {children}
    </div>
  );
}
