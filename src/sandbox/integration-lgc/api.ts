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

async function post<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const r = await fetchLive(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
  const j = (await r.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!r.ok || !j) throw new Error(j?.error || String(r.status));
  return j;
}

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
