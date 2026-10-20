"use client";
import { fetchLive } from "@/lib/live";
import { TOOLS, type LocusOut } from "@/data/integration-lgc/blocks";
import type { RunResult, StepResult, WfStep } from "@/data/integration-lgc/workflow";
import type { Brick } from "./model";

/**
 * Les appels du navigateur vers les routes de la zone. Tous passent par
 * `fetchLive` : si le serveur ferme le direct (403), ils repartent en
 * scénario rejoué. `via` dit lequel a répondu.
 */

export type Via = "live" | "replay";

/** Une erreur de route : le statut suffit au navigateur pour afficher un message dans la langue de l'UI. */
export class ApiError extends Error {
  constructor(readonly status: number) { super(`HTTP ${status}`); }
}

async function post<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const r = await fetchLive(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
  const j = (await r.json().catch(() => null)) as T | null;
  if (!r.ok || !j) throw new ApiError(r.status);
  return j;
}

/** Le message à afficher pour une erreur de route : données réelles refusées (422), ou indisponibilité. */
export const errorText = (e: unknown, t: { realData: string; error: string }) => (e instanceof ApiError && e.status === 422 ? t.realData : t.error);

export function blockOutput(b: Brick, question?: string, signal?: AbortSignal) {
  const api = TOOLS[question ? "question" : b.tool ?? "controle"].api;
  return post<{ output: LocusOut; via: Via }>(`/api/integration-lgc/blocks/${api}`, { anchor: b.anchor, fields: b.fields, settings: b.settings, question }, signal);
}

export function runWorkflow(steps: WfStep[], b: Pick<Brick, "anchor" | "fields">, variant: "fournier" | "non-diabetique" = "fournier", signal?: AbortSignal) {
  return post<RunResult & { via: Via }>("/api/integration-lgc/workflow/run", { steps, anchor: b.anchor, fields: b.fields, variant }, signal);
}

export function structureWorkflow(instruction: string, lang: "fr" | "en") {
  return post<{ steps: WfStep[]; preview: Pick<StepResult, "value" | "source" | "status">[]; via: Via }>("/api/integration-lgc/workflow/structure", { instruction, lang });
}
