import "server-only";
import { ANCHOR_IDS, FIELD_KEYS, fieldsFor, type AnchorId, type FieldKey } from "@/data/integration-lgc/fournier";

/** Lecture prudente des corps de requête des briques : tout ce qui n'est pas connu est ignoré. */

export async function body(req: Request): Promise<Record<string, unknown>> {
  const b = await req.json().catch(() => null);
  return b && typeof b === "object" && !Array.isArray(b) ? (b as Record<string, unknown>) : {};
}

export const anchorOf = (v: unknown): AnchorId => (typeof v === "string" && (ANCHOR_IDS as readonly string[]).includes(v) ? (v as AnchorId) : "pv");

/** Les champs transmis : seulement ceux que l'ancrage autorise. */
export function fieldsOf(v: unknown, a: AnchorId): FieldKey[] {
  if (!Array.isArray(v)) return [];
  const ok = fieldsFor(a);
  return FIELD_KEYS.filter((k) => v.includes(k) && ok.includes(k));
}

export const json = (b: unknown, status = 200) => Response.json(b, { status, headers: { "Cache-Control": "no-store" } });
