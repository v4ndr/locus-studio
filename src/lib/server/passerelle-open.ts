import "server-only";

/**
 * La passerelle vers Locus Open, référence du LGC natif IA depuis le 27/10/2026 : un compte Studio connecté y
 * entre sans le mot de passe de la démo. On signe un jeton court que Open vérifie (`/api/passerelle`, voir
 * locus-open `apps/web/src/lib/passerelle.ts`) : `base64url(charge).base64url(HMAC-SHA256(charge))`, avec le
 * secret partagé `LOCUS_OPEN_PASSERELLE_SECRET`. La charge : `sub` (le compte Clerk), `exp` (une minute) et
 * `jti` (usage unique). Sans `LOCUS_OPEN_URL` ni secret, la passerelle est éteinte et le LGC natif IA du Studio
 * reste servi.
 */
export function openConfigure(): { url: string; secret: string } | null {
  const url = process.env.LOCUS_OPEN_URL?.trim().replace(/\/+$/, "");
  const secret = process.env.LOCUS_OPEN_PASSERELLE_SECRET?.trim();
  return url && /^https?:\/\//.test(url) && secret && secret.length >= 32 ? { url, secret } : null;
}

const b64url = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function signerJetonOpen(sub: string, secret: string, maintenantS = Math.floor(Date.now() / 1000)): Promise<string> {
  const charge = { sub, exp: maintenantS + 60, jti: crypto.randomUUID() };
  const corps = b64url(new TextEncoder().encode(JSON.stringify(charge)));
  const cle = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", cle, new TextEncoder().encode(corps)));
  return `${corps}.${b64url(sig)}`;
}

/**
 * L'écran d'Open qui répond à une adresse de l'ancien LGC natif IA du Studio (`/[lang]/lgc-natif/…`) :
 * les dossiers, les boîtes et la création de patient existent aussi dans Open ; le reste mène à l'accueil.
 */
export function suiteOpen(reste: string): string {
  const m = reste.match(/^\/(p\/[A-Za-z0-9_-]{1,60}(?:\/(?:rencontre|documents(?:\/[A-Za-z0-9_.-]{1,80})?))?|inbox(?:\/(?:courriers|bio|messages))?)\/?$/);
  if (m) return `/${m[1]}`;
  if (/^\/nouveau\/?$/.test(reste)) return "/patients/nouveau";
  return "/";
}
