"use client";
import * as React from "react";
import { defaultFields, FIELD_KEYS, FIELDS, ANCHOR_IDS, type AnchorId, type FieldKey } from "@/data/integration-lgc/fournier";
import { DISPLAY_API, DISPLAY_IDS, HOOKS, TOOLS, cleanSettings, defaultSettings, isToolId, type DisplayId, type Settings, type ToolId } from "@/data/integration-lgc/blocks";
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

function revive(raw: unknown): Brick[] | null {
  if (!Array.isArray(raw)) return null;
  const out: Brick[] = [];
  for (const r of raw.slice(0, 30)) {
    if (!r || typeof r !== "object") continue;
    const b = r as Record<string, unknown>;
    const anchor = (ANCHOR_IDS as readonly string[]).includes(b.anchor as string) ? (b.anchor as AnchorId) : null;
    const display = (DISPLAY_IDS as readonly string[]).includes(b.display as string) ? (b.display as DisplayId) : null;
    if (!anchor || !display || typeof b.id !== "string") continue;
    const fields = Array.isArray(b.fields) ? FIELD_KEYS.filter((k) => (b.fields as unknown[]).includes(k)) : [];
    if (b.kind === "workflow") {
      const steps = cleanSteps(b.steps);
      if (!steps) continue;
      out.push({ id: b.id, kind: "workflow", anchor, fields, tool: null, settings: {}, display, on: b.on !== false, instruction: typeof b.instruction === "string" ? b.instruction.slice(0, 500) : "", steps, previews: Array.isArray(b.previews) ? (b.previews as Brick["previews"]) : undefined });
    } else if (isToolId(b.tool)) {
      out.push({ id: b.id, kind: "tool", anchor, fields, tool: b.tool, settings: cleanSettings(b.tool, b.settings), display, on: b.on !== false });
    }
  }
  return out;
}

export function useBricks() {
  const [bricks, setBricks] = React.useState<Brick[]>(EXAMPLES);
  const loaded = React.useRef(false);
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const v = revive(JSON.parse(raw)); if (v) setBricks(v); }
    } catch {}
    loaded.current = true;
  }, []);
  React.useEffect(() => {
    if (!loaded.current) return;
    try { localStorage.setItem(KEY, JSON.stringify(bricks)); } catch {}
  }, [bricks]);
  return [bricks, setBricks] as const;
}

export const nextId = (bricks: Brick[]) => `b${bricks.reduce((m, b) => Math.max(m, Number(b.id.slice(1)) || 0), 0) + 1}`;

/* ---------- L'appel « API Briques (aperçu) » ---------- */

/** La requête équivalente sur la façade proposée `POST /v2/blocks` : elle n'existe pas dans core. */
export function apiCall(b: Brick): string {
  const data: Record<string, string> = {};
  for (const k of b.fields) data[FIELDS[k].api] = FIELDS[k].value;
  const context = { patient: "sandbox-gilles-fournier", data };
  const head = (path: string) => `POST ${path}\nAuthorization: Bearer lsk_…\nX-Locus-User-Ref: <compte sandbox>\nContent-Type: application/json\n\n`;
  if (b.kind === "workflow") {
    const body = { hook: HOOKS[b.anchor], context, instruction: b.instruction ?? "", steps: (b.steps ?? []).map((s) => ({ type: s.type, config: s.config, ...(s.action ? { action: s.action } : {}) })), display: DISPLAY_API[b.display] };
    return head("/v2/blocks") + JSON.stringify(body, null, 2);
  }
  const t = b.tool ?? "controle";
  const body = { hook: HOOKS[b.anchor], context, settings: b.settings, display: DISPLAY_API[b.display] };
  return head(`/v2/blocks/${TOOLS[t].api}`) + JSON.stringify(body, null, 2);
}

export { STEP_TYPES };
