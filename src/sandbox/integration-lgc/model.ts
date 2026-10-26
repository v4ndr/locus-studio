"use client";
import * as React from "react";
import { defaultFields, fieldsFor, patientEhr, ANCHOR_IDS, type AnchorId, type FieldKey } from "@/data/integration-lgc/fournier";
import { DISPLAY_IDS, cleanSettings, defaultSettings, isToolId, questionFor, type DisplayId, type Settings, type ToolId } from "@/data/integration-lgc/blocks";
import { STEP_TYPES, cleanSteps, type StepResult, type WfStep } from "@/data/integration-lgc/workflow";

/** Une brique posée dans MédiCab 7 : déclencheur, données, outil ou workflow, affichage. */
export interface Brick {
  id: string;
  kind: "tool" | "workflow";
  anchor: AnchorId;
  fields: FieldKey[];
  tool: ToolId | null;
  settings: Settings;
  display: DisplayId;
  on: boolean;
  instruction?: string;
  steps?: WfStep[];
  /** La valeur de chaque étape sur le dossier fictif (structuration ou dernier test). */
  previews?: (Pick<StepResult, "value" | "source" | "status"> | null)[];
}

/** La brique en cours d'édition dans l'assistant : ancrage et affichage pas encore choisis. */
export type Draft = Omit<Brick, "id" | "on" | "anchor" | "display"> & { anchor: AnchorId | null; display: DisplayId | null };

export const EXAMPLES: Brick[] = [
  { id: "b1", kind: "tool", anchor: "ordo", fields: ["allergies", "ttt", "ligne"], tool: "controle", settings: defaultSettings("controle"), display: "inline", on: true },
  { id: "b2", kind: "tool", anchor: "pv", fields: ["age", "sexe", "allergies", "atcd", "ttt", "bio"], tool: "synthese", settings: defaultSettings("synthese"), display: "widget", on: false },
];

export const emptyDraft = (): Draft => ({ kind: "tool", anchor: null, fields: [], tool: null, settings: {}, display: null });
export const workflowDraft = (instruction: string): Draft => ({ kind: "workflow", anchor: "pv", fields: defaultFields("pv", true), tool: null, settings: {}, display: "banner", instruction });

/* ---------- Persistance (localStorage, par compte en V1) ---------- */

/** Pas encore de comptes : une seule clé « invité ». La PR Accès remplacera le suffixe par l'id du compte. */
const KEY = "ls-integration-lgc:bricks:v1:invite";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : undefined);
const PREVIEW_STATUS = ["done", "stopped", "skipped"] as const;

/** Les valeurs d'aperçu d'un workflow : une par étape, chaînes seulement (sinon React ne sait pas les afficher). */
function revivePreviews(raw: unknown, n: number): Brick["previews"] {
  if (!Array.isArray(raw)) return undefined;
  return Array.from({ length: n }, (_, i) => {
    const p = raw[i] as Record<string, unknown> | null | undefined;
    if (!p || typeof p !== "object") return null;
    const value = str(p.value, 300);
    const status = (PREVIEW_STATUS as readonly unknown[]).includes(p.status) ? (p.status as StepResult["status"]) : undefined;
    if (value === undefined || !status) return null;
    return { value, status, ...(str(p.source, 120) ? { source: str(p.source, 120) } : {}) };
  });
}

/**
 * Relit les briques stockées. Le localStorage peut contenir n'importe quoi
 * (ancienne version, édition à la main) : on ne garde que ce qui a la bonne
 * forme, champ par champ, et une brique invalide est ignorée sans faire
 * tomber les autres.
 */
export function revive(raw: unknown): Brick[] | null {
  if (!Array.isArray(raw)) return null;
  const out: Brick[] = [];
  const ids = new Set<string>();
  for (const r of raw.slice(0, 30)) {
    if (!r || typeof r !== "object" || Array.isArray(r)) continue;
    const b = r as Record<string, unknown>;
    const anchor = (ANCHOR_IDS as readonly unknown[]).includes(b.anchor) ? (b.anchor as AnchorId) : null;
    const display = (DISPLAY_IDS as readonly unknown[]).includes(b.display) ? (b.display as DisplayId) : null;
    if (!anchor || !display || typeof b.id !== "string" || !/^b\d{1,6}$/.test(b.id) || ids.has(b.id)) continue;
    const allowed = fieldsFor(anchor);
    const fields = Array.isArray(b.fields) ? allowed.filter((k) => (b.fields as unknown[]).includes(k)) : [];
    if (!fields.length) continue;
    if (b.kind === "workflow") {
      const steps = cleanSteps(b.steps);
      if (!steps) continue;
      out.push({ id: b.id, kind: "workflow", anchor, fields, tool: null, settings: {}, display, on: b.on !== false, instruction: str(b.instruction, 500) ?? "", steps, previews: revivePreviews(b.previews, steps.length) });
    } else if (b.kind === "tool" && isToolId(b.tool)) {
      out.push({ id: b.id, kind: "tool", anchor, fields, tool: b.tool, settings: cleanSettings(b.tool, b.settings), display, on: b.on !== false });
    } else continue;
    ids.add(b.id);
  }
  return out;
}

export function useBricks() {
  const [bricks, setBricks] = React.useState<Brick[]>(EXAMPLES);
  // Rien n'est écrit avant la relecture : sinon les exemples écraseraient un instant les briques stockées.
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const v = revive(JSON.parse(raw)); if (v) setBricks(v); }
    } catch {}
    setReady(true);
  }, []);
  React.useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(bricks)); } catch {}
  }, [bricks, ready]);
  return [bricks, setBricks] as const;
}

export const nextId = (bricks: Brick[]) => `b${bricks.reduce((m, b) => Math.max(m, Number(b.id.slice(1)) || 0), 0) + 1}`;

/* ---------- L'appel à l'API Locus ---------- */

const head = (path: string) => `POST ${path}\nAuthorization: Bearer lsk_…\nX-Locus-User-Ref: <compte sandbox>\nContent-Type: application/json\nAccept: application/x-ndjson\n\n`;

/**
 * Les appels que la route Studio fait vraiment pour cette brique : `POST
 * /v2/retrieve/stream` de core, avec les paramètres de `RetrieveRequest`
 * qu'elle remplit (`query`, `patient_ehr` pseudonymisé, `mode`,
 * `app_platform`, `app_surface`). Un appel par étape Question Locus d'un
 * workflow ; `null` quand la brique n'appelle pas core. Déclencheur et
 * affichage restent dans le logiciel : core n'a pas d'endpoint de brique.
 */
export function coreCall(b: Brick, placeholder: string): string | null {
  const queries = b.kind === "workflow"
    ? (b.steps ?? []).filter((s) => s.type === "locus_question").map((s) => s.config)
    : [(b.tool ?? "controle") === "question" ? placeholder : questionFor(b.tool ?? "controle", b.settings)];
  if (!queries.length) return null;
  const ehr = patientEhr(b.fields);
  return queries
    .map((query) => head("/v2/retrieve/stream") + JSON.stringify({ query, patient_ehr: ehr, mode: "rapide", app_platform: "web", app_surface: "studio-ehr" }, null, 2))
    .join("\n\n");
}

export { STEP_TYPES };
