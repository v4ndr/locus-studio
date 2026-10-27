"use client";
import Link from "next/link";
import { common, route } from "@/i18n";
import { useLang } from "@/i18n/lang";
import { PageInner } from "@/components/shell/page-inner";
import { buttonClass } from "@/components/ui/button";

/** Une page qui n'existe pas, dans la coque, avec le chemin du retour. */
export default function NotFound() {
  const lang = useLang();
  const t = common[lang];
  return (
    <PageInner className="justify-items-center py-24 text-center">
      <span className="font-mono text-xs text-muted-foreground">{t.notFound.code}</span>
      <h1 className="m-0 text-[28px] font-extrabold tracking-[-.03em]">{t.notFound.title}</h1>
      <Link href={route(lang, "home")} className={buttonClass({ variant: "primary" })}>{t.notFound.back}</Link>
    </PageInner>
  );
}
