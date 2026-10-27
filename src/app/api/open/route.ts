import { NextResponse } from "next/server";
import { clerkEnabled, getStudioUserId } from "@/lib/server/user";
import { openConfigure, signerJetonOpen, suiteOpen } from "@/lib/server/passerelle-open";
import { DEFAULT_LANG, isLang } from "@/i18n/config";

export const dynamic = "force-dynamic";

/**
 * Le LGC natif IA est servi par Locus Open : un compte Studio connecté y part par un lien signé, sans le mot de
 * passe de la démo. Un visiteur repart vers l'entrée (le mur). Sans Clerk (développement local), le compte est
 * « local ».
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const lang = isLang(url.searchParams.get("lang") ?? "") ? url.searchParams.get("lang")! : DEFAULT_LANG;
  const open = openConfigure();
  if (!open) return NextResponse.redirect(new URL(`/${lang}/lgc-natif`, url.origin), 307);
  const userId = await getStudioUserId();
  if (!userId && clerkEnabled()) return NextResponse.redirect(new URL(`/${lang}`, url.origin), 307);
  const jeton = await signerJetonOpen(userId ?? "local", open.secret);
  const suite = suiteOpen(url.searchParams.get("chemin") ?? "");
  const res = NextResponse.redirect(`${open.url}/api/passerelle?${new URLSearchParams({ jeton, suite })}`, 303);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
