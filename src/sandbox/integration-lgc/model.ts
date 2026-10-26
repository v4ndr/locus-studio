"use client";
import * as React from "react";
import { fieldsFor, patientEhr, FIELDS, FIELD_KEYS, ANCHOR_IDS, type AnchorId, type FieldKey } from "@/data/integration-lgc/fournier";
import { DISPLAY_API, DISPLAY_IDS, HOOKS, TOOLS, cleanSettings, defaultSettings, isToolId, questionControle, type DisplayId, type Settings, type ToolId } from "@/data/integration-lgc/blocks";

/** Une brique posée dans MédiCab 7 : outil, point d'injection, données, affichage. */
export interface Brick {
  id: string;
  tool: ToolId;
  anchor: AnchorId;
  fields: FieldKey[];
  settings: Settings;
  display: DisplayId;
  on: boolean;
}

/** La brique en cours d'édition dans l'assistant : outil, ancrage et affichage pas encore choisis. */
export type Draft = Omit<Brick, "id" | "on" | "tool" | "anchor" | "display"> & { tool: ToolId | null; anchor: AnchorId | null; display: DisplayId | null };

export const EXAMPLES: Brick[] = [
  { id: "b1", tool: "controle", anchor: "ordo", fields: ["age", "allergies", "ttt", "ligne", "dfg"], settings: defaultSettings("controle"), display: "inline", on: true },
  { id: "b2", tool: "synthese", anchor: "pv", fields: ["age", "sexe", "allergies", "atcd", "ttt", "bio12", "dfg"], settings: defaultSettings("synthese"), display: "widget", on: true },
];

export const emptyDraft = (): Draft => ({ tool: null, anchor: null, fields: [], settings: {}, display: null });

/** Les données transmises d'une brique : celles cochées, plus celles que l'outil exige, dans l'ordre du dossier. */
export const withRequired = (tool: ToolId, anchor: AnchorId, fields: readonly FieldKey[]): FieldKey[] =>
  FIELD_KEYS.filter((k) => fieldsFor(anchor).includes(k) && (fields.includes(k) || TOOLS[tool].required.includes(k)));

/* ---------- Persistance (localStorage, par compte en V1) ---------- */

/**
 * Pas encore de comptes : une seule clé « invité ». La PR Accès remplacera le suffixe par l'id du compte.
 * v2 : trois outils, quatre ancrages, plus de workflow ; les briques v1 ne sont pas relues.
 */
const KEY = "ls-integration-lgc:bricks:v2:invite";

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
    if (!isToolId(b.tool) || typeof b.id !== "string" || !/^b\d{1,6}$/.test(b.id) || ids.has(b.id)) continue;
    const tool = b.tool;
    const anchor = (ANCHOR_IDS as readonly unknown[]).includes(b.anchor) && TOOLS[tool].anchors.includes(b.anchor as AnchorId) ? (b.anchor as AnchorId) : null;
    const display = (DISPLAY_IDS as readonly unknown[]).includes(b.display) && TOOLS[tool].displays.includes(b.display as DisplayId) ? (b.display as DisplayId) : null;
    if (!anchor || !display) continue;
    const fields = withRequired(tool, anchor, Array.isArray(b.fields) ? (b.fields as unknown[]).filter((k): k is FieldKey => typeof k === "string" && (FIELD_KEYS as readonly string[]).includes(k)) : []);
    if (!fields.length) continue;
    out.push({ id: b.id, tool, anchor, fields, settings: cleanSettings(tool, b.settings), display, on: b.on !== false });
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

/* ---------- L'appel « API Briques (aperçu) » ---------- */

const head = (path: string) => `POST ${path}\nAuthorization: Bearer lsk_…\nX-Locus-User-Ref: <compte sandbox>\nContent-Type: application/json\n\n`;

/**
 * La requête équivalente sur la façade proposée `POST /v2/blocks` : elle
 * n'existe pas dans core. `comment` (« API Briques (aperçu) ») ouvre le
 * code, pour qu'un copier-coller ne la fasse pas passer pour une route réelle.
 * L'identifiant patient est un pseudonyme : ni nom, ni numéro de dossier.
 */
export function apiCall(b: Brick, comment: string): string {
  const data: Record<string, string> = {};
  for (const k of b.fields) data[FIELDS[k].api] = FIELDS[k].value;
  const body = { hook: HOOKS[b.anchor], context: { patient: "pseudo-7f3a91", data }, settings: b.settings, display: DISPLAY_API[b.display] };
  return `${comment}\n${head(`/v2/blocks/${TOOLS[b.tool].api}`)}${JSON.stringify(body, null, 2)}`;
}

/**
 * L'appel que la route Studio fait vraiment aujourd'hui : `POST /v2/retrieve/stream`
 * de core, avec les paramètres de `RetrieveRequest` qu'elle remplit (`query`,
 * `patient_ehr` pseudonymisé, `mode`, `app_platform`, `app_surface`).
 * `null` pour la synthèse, qui n'appelle pas core.
 */
export function coreCall(b: Brick, placeholder: string): string | null {
  if (TOOLS[b.tool].path === "dossier") return null;
  const query = b.tool === "question" ? placeholder : questionControle();
  const body = { query, patient_ehr: patientEhr(b.fields), mode: "rapide", app_platform: "web", app_surface: "studio-ehr" };
  return head("/v2/retrieve/stream").replace("Content-Type: application/json", "Content-Type: application/json\nAccept: application/x-ndjson") + JSON.stringify(body, null, 2);
}
