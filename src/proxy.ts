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
 *    tourne en local, sans mur.
 * 4. Le mur : seules l'entrée (`/[lang]`) et l'accès (`/[lang]/acces`) sont
 *    publiques. Toute autre page renvoie un visiteur vers l'entrée ; un compte
 *    connecté qui arrive sur l'entrée part vers la console. Le mur suit Clerk,
 *    `STUDIO_WALL=1|0` le force (sans Clerk, `1` ferme tout : pour tester).
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

/** Les pages ouvertes sans compte : l'entrée et l'accès (formulaire, connexion, retour d'invitation). */
const PUBLIQUES = new Set(["", "acces"]);

function mur(req: NextRequest, lang: Lang, connecte: boolean) {
  const page = req.nextUrl.pathname.split("/")[2] ?? "";
  const url = req.nextUrl.clone();
  url.search = "";
  if (!connecte && !PUBLIQUES.has(page)) { url.pathname = `/${lang}`; return NextResponse.redirect(url, 307); }
  // Un lien d'invitation ouvert déjà connecté garde sa page : le jeton peut viser un autre compte.
  if (connecte && PUBLIQUES.has(page) && !req.nextUrl.searchParams.has("__clerk_ticket")) { url.pathname = `/${lang}/console`; return NextResponse.redirect(url, 307); }
  return NextResponse.next();
}

function langues(req: NextRequest, connecte: boolean | null) {
  const { pathname } = req.nextUrl;
  const first = pathname.split("/")[1];
  if (first === "api") return NextResponse.next();
  if (isLang(first)) return connecte === null ? NextResponse.next() : mur(req, first, connecte);

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
const forceMur = process.env.STUDIO_WALL?.trim();
const murActif = forceMur === "1" ? true : forceMur === "0" ? false : clerkOn;
const avecClerk = clerkOn
  ? clerkMiddleware(async (auth, req) => langues(req, murActif ? !!(await auth()).userId : null))
  : null;

export function proxy(req: NextRequest, ev: NextFetchEvent) {
  return avecClerk ? avecClerk(req, ev) : langues(req, murActif ? false : null);
}

export const config = {
  // Les pages (ni les fichiers de Next, ni les fichiers statiques avec une extension), et l'API pour la session Clerk.
  matcher: ["/((?!api|_next|.*\\..*).*)", "/api/(.*)"],
};
