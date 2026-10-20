import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { common, route, type Lang } from "@/i18n";
import { PageHead, PageInner } from "@/components/shell/page-inner";
import { buttonClass } from "@/components/ui/button";
import { Box } from "@/components/ui/card";

/** Page d'attente d'une zone du sandbox : son titre et « bientôt », sans plus. */
export function ComingSoon({ lang, title }: { lang: Lang; title: string }) {
  const c = common[lang];
  return (
    <PageInner>
      <PageHead title={title} />
      <Box className="grid justify-items-start gap-2 px-6 py-5">
        <h2 className="m-0 text-[15px] font-semibold tracking-[-.01em]">{c.soon.title}</h2>
        <p className="m-0 text-muted-foreground">{c.soon.text}</p>
        <Link href={route(lang, "home")} className={buttonClass({ size: "sm", className: "mt-2" })}><ArrowLeft aria-hidden="true" />{c.soon.back}</Link>
      </Box>
    </PageInner>
  );
}
