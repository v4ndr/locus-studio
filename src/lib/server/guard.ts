import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { clerkEnabled, getStudioUserId } from "./user";
import { captureServer } from "./analytics";

/**
 * Le garde des routes live (`/api/compose`, `/api/note`, `/api/locus/*`,
 * `/api/chatbot/*`, `/api/scribe/*`, `/api/integration-lgc/*`) : tout ce qui
 * peut dépenser un appel de modèle ou des crédits Locus. Studio n'a plus de
 * scénario rejoué : tout est live, derrière un compte.
 *
 * 1. **Jeton interne.** L'en-tête `x-studio-live-token` égal à
 *    `STUDIO_LIVE_TOKEN` passe toujours (tests internes), sans quota.
 *
 * 2. **Compte.** Un utilisateur connecté (instance Clerk Studio, voir
 *    `./user.ts`) passe. Ses requêtes sont comptées par compte et par jour
 *    (`STUDIO_USER_QUOTA_PER_DAY`, 300 par défaut).
 *
 * 3. **Sans compte : 401 `auth_required`.** Le navigateur renvoie alors vers
 *    l'entrée (`src/lib/live.ts`). Exception : quand le verrou est levé
 *    (`next dev` sans Clerk, ou `STUDIO_LIVE_LOCK=0`), la route est ouverte,
 *    avec un rate limit par IP hors `next dev` (`STUDIO_RATE_LIMIT_PER_HOUR`,
 *    20). Compteurs en mémoire de l'instance, ou Upstash Redis (REST) si
 *    `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN` sont posés.
 */

export const LIVE_TOKEN_HEADER = "x-studio-live-token";
/** Code d'erreur lu par le navigateur (`src/lib/live.ts`) pour renvoyer vers l'entrée. */
export const AUTH_REQUIRED = "auth_required";

export type GuardResult =
  | { ok: true }
  | { ok: false; response: Response };

/**
 * Vrai quand une route live exige un compte. Avec Clerk, toujours ; sans
 * Clerk, en production (un build déployé sans comptes ne dépense rien).
 * `STUDIO_LIVE_LOCK=1|0` force l'un ou l'autre.
 */
export function liveLocked(): boolean {
  const force = process.env.STUDIO_LIVE_LOCK?.trim();
  if (force === "1" || force === "true") return true;
  if (force === "0" || force === "false") return false;
  if (clerkEnabled()) return true;
  const vercel = process.env.VERCEL_ENV;
  if (vercel) return vercel === "production";
  return process.env.NODE_ENV === "production";
}

/** Vrai en production et en preview (un build), faux sous `next dev`. */
function rateLimited(): boolean {
  return process.env.NODE_ENV === "production" || !!process.env.VERCEL_ENV;
}

function hasLiveToken(req: Request): boolean {
  const expected = process.env.STUDIO_LIVE_TOKEN?.trim();
  const given = req.headers.get(LIVE_TOKEN_HEADER)?.trim();
  if (!expected || !given) return false;
  // Comparaison à temps constant sur des empreintes de même longueur.
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * Vrai quand la requête vient d'une page de ce site, pas d'un formulaire ou
 * d'un `fetch` d'un autre site (`Sec-Fetch-Site`, sinon `Origin`). Sans l'un
 * ni l'autre (curl, appel serveur) : vrai, il n'y a pas de navigateur à abuser.
 */
export function sameOrigin(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return false;
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try { return !!host && new URL(origin).host === host; } catch { return false; }
}

/**
 * L'adresse du client, pour le rate limit. Le premier élément de
 * `x-forwarded-for` est écrit par le client : il ne sert que là où la
 * plateforme réécrit l'en-tête. Sur Vercel, `x-real-ip` et
 * `x-forwarded-for` sont posés par la plateforme (les valeurs du client
 * sont écrasées). Ailleurs (derrière un reverse proxy), on prend le
 * dernier maillon, celui qu'ajoute le proxy le plus proche.
 */
export function clientIp(req: Request): string {
  const xff = (req.headers.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return req.headers.get("x-real-ip")?.trim() || xff[0] || "inconnue";
  }
  return xff.at(-1) || req.headers.get("x-real-ip")?.trim() || "inconnue";
}

const intEnv = (name: string, fallback: number) => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback;
};

/* ---------- Rate limit : fenêtre fixe d'une heure ---------- */

const WINDOW_S = 3600;
const memoire = new Map<string, { n: number; reset: number }>();

function incrMemoire(key: string, nowS: number, windowS = WINDOW_S): number {
  const cur = memoire.get(key);
  if (!cur || cur.reset <= nowS) {
    memoire.set(key, { n: 1, reset: nowS + windowS });
    // Ménage paresseux : la carte ne grossit pas indéfiniment sur une instance chaude.
    if (memoire.size > 5_000) for (const [k, v] of memoire) if (v.reset <= nowS) memoire.delete(k);
    return 1;
  }
  cur.n += 1;
  return cur.n;
}

async function incrUpstash(key: string, windowS = WINDOW_S): Promise<number | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim().replace(/\/$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([["INCR", key], ["EXPIRE", key, String(windowS), "NX"]]),
      signal: AbortSignal.timeout(1500),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const out = (await res.json()) as { result?: unknown }[];
    const n = Number(out?.[0]?.result);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null; // Redis injoignable : on retombe sur le compteur de l'instance.
  }
}

/** Compte une requête ; renvoie le nombre de requêtes de la fenêtre courante. */
export async function hit(bucket: string, id: string, windowS = WINDOW_S): Promise<{ n: number; resetS: number }> {
  const nowS = Math.floor(Date.now() / 1000);
  const fenetre = Math.floor(nowS / windowS);
  const key = `studio:rl:${bucket}:${id}:${fenetre}`;
  const n = (await incrUpstash(key, windowS)) ?? incrMemoire(key, nowS, windowS);
  return { n, resetS: (fenetre + 1) * windowS - nowS };
}

const json = (body: unknown, status: number, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

/** L'outil appelé, lu dans le chemin : `/api/chatbot/rag` → `chatbot/rag`. Les segments dynamiques (`[brick]`, `[cis]`) restent tels quels. */
export function outilDe(req: Request): string {
  try { return new URL(req.url).pathname.replace(/^\/api\//, ""); } catch { return "inconnu"; }
}

/** À appeler en tête de chaque route live. `ok: false` → renvoyer `response` tel quel. */
export async function guardLive(req: Request): Promise<GuardResult> {
  if (hasLiveToken(req)) return { ok: true };
  // La session (cookie Clerk) ne compte que pour une requête de ce site : une page tierce ne dépense pas le quota d'un compte.
  const userId = sameOrigin(req) ? await getStudioUserId() : null;
  const res = await decider(req, userId);
  // Chaque appel live, admis ou refusé, est compté (PostHog), sous le compte quand il y en a un.
  const issue = res.ok ? "ok" : res.code;
  captureServer("studio_live_call", userId ? `studio:${userId}` : "studio:visiteur", {
    outil: outilDe(req),
    issue,
    connecte: !!userId,
    ...(userId ? {} : { $process_person_profile: false }),
  });
  return res.ok ? { ok: true } : { ok: false, response: res.response };
}

async function decider(req: Request, userId: string | null): Promise<{ ok: true } | { ok: false; code: string; response: Response }> {
  if (userId) {
    const max = intEnv("STUDIO_USER_QUOTA_PER_DAY", 300);
    if (rateLimited() && max > 0) {
      const { n, resetS } = await hit("user", userId, 86_400);
      if (n > max) {
        return { ok: false, code: "quota_exceeded", response: json({ error: "Quota du jour atteint pour ce compte. Il se renouvelle demain ; pour l'augmenter, écrivez à l'équipe Locus.", code: "quota_exceeded" }, 429, { "Retry-After": String(resetS) }) };
      }
    }
    return { ok: true };
  }
  if (liveLocked()) {
    return { ok: false, code: AUTH_REQUIRED, response: json({ error: "Connectez-vous pour utiliser Studio.", code: AUTH_REQUIRED }, 401) };
  }
  if (rateLimited()) {
    const max = intEnv("STUDIO_RATE_LIMIT_PER_HOUR", 20);
    if (max > 0) {
      const { n, resetS } = await hit("live", clientIp(req));
      if (n > max) {
        return { ok: false, code: "rate_limited", response: json({ error: "Trop de demandes depuis cette adresse. Réessayez dans une heure.", code: "rate_limited" }, 429, { "Retry-After": String(resetS) }) };
      }
    }
  }
  return { ok: true };
}

/* ---------- Unités logiques autorisées ---------- */

/** Les `mku_key` que Studio a le droit de relayer vers `/v2/logic/compute`. Extensible par `STUDIO_MKU_ALLOWLIST` (liste séparée par des virgules). */
const MKU_PAR_DEFAUT = ["score:cha2ds2vasc", "score:cha2ds2va", "score:hasbled", "score:findrisc", "score:score2"];

export function mkuAutorisee(key: unknown): key is string {
  if (typeof key !== "string" || key.length > 80) return false;
  const extra = (process.env.STUDIO_MKU_ALLOWLIST ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return MKU_PAR_DEFAUT.includes(key) || extra.includes(key);
}

/* ---------- Données réelles ---------- */

/**
 * Un NIR (numéro de sécurité sociale) : 13 chiffres, plus 2 de clé, espaces
 * ou points tolérés. Sexe 1/2 (7/8 provisoires), mois 01-12 ou 20-99 (cas
 * spéciaux), département 01-99 / 2A / 2B. La clé n'est pas vérifiée : un
 * NIR mal recopié reste un NIR.
 */
const NIR = /(?<![\dA-Za-z])[12378][\s.]?\d{2}[\s.]?(\d{2})[\s.]?(\d{2}|2[AB])[\s.]?\d{3}[\s.]?\d{3}(?:[\s.]?\d{2})?(?![\dA-Za-z])/gi;

function nirPlausible(m: RegExpExecArray): boolean {
  const mois = Number(m[1]);
  return ((mois >= 1 && mois <= 12) || mois >= 20) && m[2] !== "00";
}

const MOIS = "janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[ûu]t|septembre|octobre|novembre|d[ée]cembre";
const DATE_COMPLETE = `(?:\\d{1,2}[\\/.\\-]\\d{1,2}[\\/.\\-](?:19|20)\\d{2}|\\d{1,2}(?:er)?\\s+(?:${MOIS})\\s+(?:19|20)\\d{2}|(?:19|20)\\d{2}-\\d{2}-\\d{2})`;
/** Une date complète précédée, à quelques mots près, d'un marqueur de naissance. */
// Pas de `\\b` : il ignore les lettres accentuées (« né le » n'aurait pas de frontière après « é »).
const NAISSANCE = new RegExp(`(?<![\\p{L}\\d])(?:n[ée]e?|naissance|ddn|date de naiss\\.?)(?![\\p{L}\\d])[^.\\n]{0,24}?${DATE_COMPLETE}`, "iu");

/**
 * Repère un identifiant réel dans un texte libre. Renvoie la raison du refus,
 * ou `null`. Les patients du sandbox sont fictifs : un NIR ou une date de
 * naissance complète dans une dictée est le signe d'un vrai dossier.
 */
export function donneesReelles(texte: string): string | null {
  NIR.lastIndex = 0;
  for (let m = NIR.exec(texte); m; m = NIR.exec(texte)) if (nirPlausible(m)) return "Le texte contient un numéro de sécurité sociale. N'utilisez pas de données réelles de patients.";
  if (NAISSANCE.test(texte)) return "Le texte contient une date de naissance complète. N'utilisez pas de données réelles de patients.";
  return null;
}
