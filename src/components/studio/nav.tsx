"use client";
import * as React from "react";
import NextLink from "next/link";
import { useRouter as useNextRouter } from "next/navigation";
import { useLang } from "@/i18n/lang";
import { route } from "@/i18n/routes";
import type { Lang } from "@/i18n/config";

/**
 * Le Studio historique (LGC natif IA) a été écrit à la racine : `/`, `/p/…`,
 * `/inbox/…`, `/d/…`, `/nouveau`. Il vit désormais sous `/[lang]/lgc-natif`.
 * Plutôt que de réécrire chaque lien (y compris ceux que le serveur et le
 * composer renvoient), `Link` et `useRouter` d'ici traduisent ces chemins.
 * Un chemin déjà préfixé (`/fr/…`) passe tel quel.
 */
const RACINE = /^\/(p|inbox|d|nouveau)(?=\/|$|\?|#)/;

export function studioHref(lang: Lang, href: string): string {
  if (href === "/" || /^\/[?#]/.test(href)) return route(lang, "lgcNatif", href.slice(1));
  if (RACINE.test(href)) return route(lang, "lgcNatif", href);
  return href;
}

export function useStudioHref() {
  const lang = useLang();
  return React.useCallback((href: string) => studioHref(lang, href), [lang]);
}

type LinkProps = React.ComponentProps<typeof NextLink>;

export default function Link({ href, ...rest }: LinkProps) {
  const lang = useLang();
  return <NextLink href={typeof href === "string" ? studioHref(lang, href) : href} {...rest} />;
}

export function useRouter() {
  const r = useNextRouter();
  const lang = useLang();
  return React.useMemo(() => ({
    ...r,
    push: (href: string, opts?: Parameters<typeof r.push>[1]) => r.push(studioHref(lang, href), opts),
    replace: (href: string, opts?: Parameters<typeof r.replace>[1]) => r.replace(studioHref(lang, href), opts),
    prefetch: (href: string, opts?: Parameters<typeof r.prefetch>[1]) => r.prefetch(studioHref(lang, href), opts),
  }), [r, lang]);
}
