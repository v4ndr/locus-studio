import "server-only";
import * as z from "zod/v4";
import { ANCHOR_IDS, FIELD_KEYS, fieldsFor, type AnchorId, type FieldKey } from "@/data/integration-lgc/fournier";

/**
 * Lecture des corps de requête des briques : taille bornée, puis schéma zod.
 * Tout ce qui ne colle pas au schéma répond 400 (le navigateur n'envoie
 * jamais autre chose) ; les réglages d'outil sont ensuite nettoyés par
 * `cleanSettings`, qui connaît chaque outil.
 */

/** Taille maximale d'un corps : une brique et sa question tiennent largement en 4 Ko. */
export const MAX_BODY = 4_000;

export const json = (b: unknown, status = 200) => Response.json(b, { status, headers: { "Cache-Control": "no-store" } });

const anchor = z.enum(ANCHOR_IDS).default("pv");
const fields = z.array(z.string().max(20)).max(FIELD_KEYS.length * 2).default([]);
const scalar = z.union([z.boolean(), z.string().max(20)]);

export const BlockBody = z.object({
  anchor,
  fields,
  settings: z.record(z.string().max(20), scalar).refine((o) => Object.keys(o).length <= 10).default({}),
  question: z.string().max(300).optional(),
});

/** Lit et valide le corps ; renvoie la réponse d'erreur à servir telle quelle sinon. */
export async function parse<S extends z.ZodType>(req: Request, schema: S): Promise<{ ok: true; data: z.output<S> } | { ok: false; response: Response }> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY) return { ok: false, response: json({ error: "Requête trop volumineuse." }, 413) };
  const text = await req.text().catch(() => "");
  if (text.length > MAX_BODY) return { ok: false, response: json({ error: "Requête trop volumineuse." }, 413) };
  let raw: unknown;
  try { raw = JSON.parse(text || "{}"); } catch { return { ok: false, response: json({ error: "Requête invalide." }, 400) }; }
  const r = schema.safeParse(raw);
  if (!r.success) return { ok: false, response: json({ error: "Requête invalide." }, 400) };
  return { ok: true, data: r.data };
}

/** Les champs transmis : ceux que l'ancrage autorise, plus ceux sans lesquels l'outil n'a rien à dire. */
export function fieldsOf(v: readonly string[], a: AnchorId, required: readonly FieldKey[] = []): FieldKey[] {
  const ok = fieldsFor(a);
  return FIELD_KEYS.filter((k) => ok.includes(k) && (v.includes(k) || required.includes(k)));
}
