import { after } from "next/server";
import { DemandeSchema, CONSENT_VERSION, type Demande, type DemandeErreur, type DemandeReponse } from "@/sandbox/acces/schema";
import { clientIp, hit } from "@/lib/server/guard";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Le BFF de la demande d'accès Studio (spec §2.1).
 *
 * Navigateur → ici → core `POST /v2/access-requests` avec la clé studio
 * (`LOCUS_API_KEY`), qui ne quitte jamais le serveur. Les erreurs de core
 * deviennent des codes courts (`DemandeErreur`) que l'écran traduit ; rien
 * de core (URL, détail, pile) ne sort.
 *
 * - Rate limit par IP (même compteur que le garde des routes live) :
 *   `STUDIO_ACCESS_RATE_LIMIT_PER_HOUR`, 10 par défaut.
 * - Sans `LOCUS_API_KEY` : succès simulé en `next dev` et en preview, erreur
 *   `not_configured` en production.
 * - Après un 201, si `DWIGHT_WEBHOOK_URL` est posé, Dwight est prévenu
 *   (core ne le fait pas) ; un échec de Dwight n'échoue pas la demande.
 */

const json = (body: DemandeReponse, status: number, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
const refus = (code: DemandeErreur, status: number, field?: keyof Demande, headers?: Record<string, string>) =>
  json({ ok: false, code, ...(field ? { field } : {}) }, status, headers);

function production(): boolean {
  const vercel = process.env.VERCEL_ENV;
  if (vercel) return vercel === "production";
  return process.env.NODE_ENV === "production";
}

const intEnv = (name: string, fallback: number) => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback;
};

const CHAMPS = new Set<keyof Demande>(["email", "full_name", "organisation", "org_type", "job_title", "country", "note", "consent", "locale"]);

/** Le champ fautif d'un 422 de core, quand il est lisible (`detail.field`, ou `loc` FastAPI). */
function champ(detail: unknown): keyof Demande | undefined {
  const brut = Array.isArray(detail)
    ? (detail[0] as { loc?: unknown[] } | undefined)?.loc?.at(-1)
    : (detail as { field?: unknown } | null)?.field;
  return typeof brut === "string" && CHAMPS.has(brut as keyof Demande) ? (brut as keyof Demande) : undefined;
}

async function prevenirDwight(d: Demande, id: string | null) {
  const url = process.env.DWIGHT_WEBHOOK_URL?.trim();
  if (!url) return;
  const secret = process.env.DWIGHT_WEBHOOK_SECRET?.trim();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(secret ? { Authorization: `Bearer ${secret}` } : {}) },
      body: JSON.stringify({
        event: "access_request.created",
        product: "studio",
        id,
        email: d.email,
        full_name: d.full_name,
        organisation: d.organisation,
        org_type: d.org_type,
        job_title: d.job_title,
        country: d.country,
        note: d.note || null,
        locale: d.locale,
        created_at: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!res.ok) console.error("[acces] Dwight", res.status);
  } catch (e) {
    console.error("[acces] Dwight injoignable", e instanceof Error ? e.message : e);
  }
}

export async function POST(req: Request) {
  const max = intEnv("STUDIO_ACCESS_RATE_LIMIT_PER_HOUR", 10);
  if (max > 0) {
    const { n, resetS } = await hit("acces", clientIp(req));
    if (n > max) return refus("ip_limited", 429, undefined, { "Retry-After": String(resetS) });
  }
  if (Number(req.headers.get("content-length") ?? 0) > 16_000) return refus("invalid", 413);

  let raw: unknown;
  try { raw = await req.json(); } catch { return refus("invalid", 400); }
  const parsed = DemandeSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path[0] as keyof Demande | undefined;
    if (field === "email" && issue?.message === "perso") return refus("perso", 422, "email");
    return refus("invalid", 422, field && CHAMPS.has(field) ? field : undefined);
  }
  const d = parsed.data;

  const base = (process.env.LOCUS_CORE_URL ?? "").trim().replace(/\/$/, "");
  const key = process.env.LOCUS_API_KEY?.trim();
  if (!base || !key) {
    if (production()) {
      console.error("[acces] LOCUS_CORE_URL ou LOCUS_API_KEY absente : demande refusée en production");
      return refus("not_configured", 503);
    }
    // Dev et preview sans clé : l'écran se teste de bout en bout, rien n'est envoyé.
    return json({ ok: true, simulated: true }, 200);
  }

  let res: Response;
  try {
    res = await fetch(`${base}/v2/access-requests`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        product: "studio",
        email: d.email,
        full_name: d.full_name,
        organisation: d.organisation,
        org_type: d.org_type,
        job_title: d.job_title,
        country: d.country,
        ...(d.note ? { note: d.note } : {}),
        consent: true,
        consent_version: CONSENT_VERSION,
        locale: d.locale,
      }),
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
  } catch (e) {
    console.error("[acces] core injoignable", e instanceof Error ? e.message : e);
    return refus("unavailable", 502);
  }

  const out = (await res.json().catch(() => null)) as { id?: unknown; detail?: unknown } | null;
  if (res.status === 201 || res.status === 200) {
    const id = typeof out?.id === "string" || typeof out?.id === "number" ? String(out.id) : null;
    after(() => prevenirDwight(d, id));
    return json({ ok: true }, 201);
  }

  const detail = out?.detail;
  const code = (detail as { code?: unknown } | null)?.code;
  if (res.status === 422) {
    if (code === "EMAIL_NOT_PROFESSIONAL") return refus("perso", 422, "email");
    console.error("[acces] core 422", JSON.stringify(detail).slice(0, 300));
    return refus("invalid", 422, champ(detail));
  }
  if (res.status === 429) return refus("rate_limited", 429);
  // 401 (clé), 404 (droit access_requests absent), 503 (fermé ou indisponible), le reste : la configuration, pas le visiteur.
  console.error("[acces] core", res.status, typeof code === "string" ? code : "");
  return refus("unavailable", 503);
}
