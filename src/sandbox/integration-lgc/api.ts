"use client";
import { fetchLive } from "@/lib/live";
import { TOOLS, type LocusOut } from "@/data/integration-lgc/blocks";
import type { Brick } from "./model";

/**
 * Les appels du navigateur vers les routes de la zone. Tous passent par
 * `fetchLive` et calculent à chaque fois : il n'y a pas de sortie de
 * repli. Un échec remonte en `ApiError`, que la carte affiche avec
 * « Réessayer ».
 */

/** Une erreur de route : le statut et le code suffisent au navigateur pour afficher un message dans la langue de l'UI. */
export class ApiError extends Error {
  constructor(readonly status: number, readonly code?: string) { super(`HTTP ${status}`); }
}

async function post<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  let r: Response;
  try {
    r = await fetchLive(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
  } catch {
    throw new ApiError(0); // le serveur Studio lui-même est injoignable
  }
  const j = (await r.json().catch(() => null)) as (T & { code?: string }) | null;
  if (!r.ok || !j) throw new ApiError(r.status, j?.code);
  return j;
}

export interface ErrorCopy { realData: string; quota: string; unconfigured: string; error: string }

/**
 * Le message à afficher pour une erreur de route : données réelles refusées
 * (422), quota atteint (429), Locus non configuré (503), ou Locus qui
 * n'a pas répondu.
 */
export function errorText(e: unknown, t: ErrorCopy): string {
  if (!(e instanceof ApiError)) return t.error;
  if (e.status === 422) return t.realData;
  if (e.status === 429) return t.quota;
  if (e.code === "core_unconfigured") return t.unconfigured;
  return t.error;
}

export function blockOutput(b: Brick, question?: string, signal?: AbortSignal) {
  const api = TOOLS[question ? "question" : b.tool].api;
  return post<{ output: LocusOut }>(`/api/integration-lgc/blocks/${api}`, { anchor: b.anchor, fields: b.fields, settings: b.settings, question }, signal);
}
