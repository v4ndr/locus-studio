import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";
import { DEFAULT_LANG, LANG_COOKIE, isLang, type Lang } from "@/i18n/config";

/**
 * Le proxy (ex-middleware, Next 16) :
 * 1. Les anciennes URL du Studio (`/p/*`, `/inbox/*`, `/nouveau`, `/d/*`),
 *    déjà diffusées, redirigent en 308 vers `/[lang]/lgc-natif/…`.
 * 2. Une URL sans préfixe de langue redirige vers `/fr/…` ou `/en/…` :
 *    le cookie de la bascule FR/EN d'abord, puis `Accept-Language`, puis `fr`.
 * 3. Avec les clés de l'instance Clerk Studio, Clerk lit la session sur les
 *    pages et sur `/api/*` (le garde des routes live s'en sert, voir
 *    `src/lib/server/guard.ts`). Sans clés, Clerk n'est pas chargé et l'app
 *    tourne en visiteur.
 */

const LEGACY = /^\/(p|inbox|nouveau|d)(\/|$)/;

function langFrom(req: NextRequest): Lang {
  const c = req.cookies.get(LANG_COOKIE)?.value;
  if (isLang(c)) return c;
  const header = req.headers.get("accept-language") ?? "";
  // « fr-FR,fr;q=0.9,en;q=0.8 » : la première langue connue, par ordre de qualité.
  const prefs = header.split(",").map((part, i) => {
    const [tag, ...params] = part.trim().split(";");
    const q = Number(params.find((p) => p.trim().startsWith("q="))?.split("=")[1] ?? 1);
    return { lang: tag.trim().toLowerCase().split("-")[0], q: Number.isFinite(q) ? q : 0, i };
  }).filter((p) => p.lang && p.q > 0).sort((a, b) => b.q - a.q || a.i - b.i);
  return prefs.map((p) => p.lang).find(isLang) ?? DEFAULT_LANG;
}

function langues(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const first = pathname.split("/")[1];
  if (first === "api") return NextResponse.next();
  if (isLang(first)) return NextResponse.next();

  const url = req.nextUrl.clone();
  const lang = langFrom(req);
  if (LEGACY.test(pathname)) {
    url.pathname = `/${lang}/lgc-natif${pathname}`;
    return NextResponse.redirect(url, 308);
  }
  url.pathname = `/${lang}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url, 307);
}

const clerkOn = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() && !!process.env.CLERK_SECRET_KEY?.trim();
const avecClerk = clerkOn ? clerkMiddleware((_auth, req) => langues(req)) : null;

export function proxy(req: NextRequest, ev: NextFetchEvent) {
  return avecClerk ? avecClerk(req, ev) : langues(req);
}

export const config = {
  // Les pages (ni les fichiers de Next, ni les fichiers statiques avec une extension), et l'API pour la session Clerk.
  matcher: ["/((?!api|_next|.*\\..*).*)", "/api/(.*)"],
};
