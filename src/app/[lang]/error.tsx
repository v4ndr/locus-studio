"use client";
import * as React from "react";
import Link from "next/link";
import { common, route } from "@/i18n";
import { useLang } from "@/i18n/lang";
import { PageInner } from "@/components/shell/page-inner";
import { Button, buttonClass } from "@/components/ui/button";

/** Un écran qui a planté : on propose de recharger ; les brouillons restent sur le poste. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  React.useEffect(() => { console.error(error); }, [error]);
  const lang = useLang();
  const t = common[lang];
  return (
    <PageInner className="justify-items-center py-24 text-center">
      <h1 className="m-0 text-[28px] font-extrabold tracking-[-.03em]">{t.error.title}</h1>
      <p className="m-0 max-w-[480px] text-muted-foreground">{t.error.text}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="primary" onClick={reset}>{t.error.retry}</Button>
        <Link href={route(lang, "home")} className={buttonClass()}>{t.error.home}</Link>
      </div>
    </PageInner>
  );
}
