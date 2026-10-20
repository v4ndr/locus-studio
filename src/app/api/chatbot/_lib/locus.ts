import "server-only";
import { coreConfig, type CoreConfig } from "@/locus/config";
import { readNdjson } from "@/locus/ndjson";
import { stripRuleIds } from "@/locus/contract";
import { chatbot, type Lang } from "@/i18n";
import { ANSM_SOURCES, APP_SURFACE, APP_VERSION, coreParams, HAS_SOURCES, type LocusSettings } from "@/sandbox/chatbot/request";
import type { ChatEvent, ChatSource, FormAnswer, FormQuestion } from "@/sandbox/chatbot/events";
import { ouvrir, scellable, sceller } from "./scelle";

/**
 * La colonne Locus du chatbot : `POST {LOCUS_CORE_URL}/v2/retrieve/stream`,
 * rediffusé au navigateur en événements grossiers (étapes, formulaire,
 * réponse). Ne sortent jamais : la reformulation, la route, l'autorité, les
 * identifiants de règles, les sondes de délibération, le contexte de reprise.
 */


// TODO(accès) : `studio:${await getStudioUserId()}` quand src/lib/server/user.ts (PR #22) sera mergée.
const userRef = () => "studio";

interface Reprise {
  query: string;
  settings: LocusSettings;
  round: number;
  keys: string[];
  values: string[][];
  skip: string[];
  contexte: unknown;
  deduites: unknown[];
}

/* ---------- Sources HAS connues de core (cache d'une heure) ---------- */

type Known = { has: string[]; ansm: string[] };
let sourcesCache: { at: number; known: Known } | null = null;
/** Les éditeurs HAS et ANSM que core connaît vraiment (une liste `sources` inconnue de core ne retrouverait rien). */
async function knownSources(cfg: CoreConfig): Promise<Known> {
  if (sourcesCache && Date.now() - sourcesCache.at < 3_600_000) return sourcesCache.known;
  try {
    const r = await fetch(`${cfg.url}/v2/sources`, { headers: { Authorization: `Bearer ${cfg.key}` }, signal: AbortSignal.timeout(5000), cache: "no-store" });
    if (r.ok) {
      const all = ((await r.json()) as { id: string }[]).map((s) => s.id);
      const garder = (ids: string[]) => ids.filter((id) => all.includes(id));
      const known = { has: garder(HAS_SOURCES), ansm: garder(ANSM_SOURCES) };
      if (known.has.length && known.ansm.length) { sourcesCache = { at: Date.now(), known }; return known; }
    }
  } catch { /* core lent : on garde la liste par défaut */ }
  return { has: ["HAS"], ansm: ["ANSM"] };
}

/* ---------- Citations : identifiants de core → renvois numérotés ---------- */

interface Payload {
  answer?: string;
  docs?: { id: string; title?: string; year?: number; url?: string; source_id?: string }[];
  mkus?: { id: string; doc_id?: string; doc_title?: string }[];
  tables?: { id: string; doc_id?: string; doc_title?: string }[];
  rcp?: { id: string; specialite?: string; dci?: string; url?: string }[];
  orchestration?: {
    decision?: string;
    round?: number;
    form?: { key: string; question: string; options?: { label: string; value: string }[]; multiple?: boolean; skip?: { label: string; value: string }; depends_on?: { key: string; values: string[] } | null }[];
    contexte?: unknown;
    deduites?: unknown[];
  };
}

function editeur(sourceId?: string) {
  return sourceId?.startsWith("HAS") ? "HAS" : sourceId?.startsWith("ANSM") ? "ANSM" : sourceId || "HAS";
}

export function renumeroter(p: Payload, lang: Lang): { markdown: string; sources: ChatSource[] } {
  const docs = new Map((p.docs ?? []).map((d) => [String(d.id), d]));
  const sources: ChatSource[] = [];
  const index = new Map<string, number>();
  const ref = (key: string, label: string, url?: string) => {
    let n = index.get(key);
    if (!n) { n = sources.length + 1; index.set(key, n); sources.push({ n, label, url }); }
    return n;
  };
  const docRef = (docId?: string, fallbackTitle?: string) => {
    if (!docId) return null;
    const d = docs.get(String(docId));
    const title = d?.title ?? fallbackTitle;
    if (!title) return null;
    return ref(`doc:${docId}`, `${editeur(d?.source_id)} · ${title}${d?.year ? `, ${d.year}` : ""}`, d?.url);
  };
  const mkus = new Map((p.mkus ?? []).map((m) => [m.id, m]));
  const tables = new Map((p.tables ?? []).map((t) => [t.id, t]));
  const rcps = new Map((p.rcp ?? []).map((r) => [r.id, r]));
  const rcpLabel = lang === "en" ? "SmPC" : "RCP";

  let md = p.answer ?? "";
  // Règles citées « (hex16, hex16) » : remplacées par le document qui les porte.
  md = md.replace(/\s?\(((?:[0-9a-f]{16})(?:,\s*[0-9a-f]{16})*)\)/g, (_m, ids: string) => {
    const ns = ids.split(/,\s*/).map((id) => { const m = mkus.get(id); return m ? docRef(m.doc_id, m.doc_title) : null; }).filter((n): n is number => !!n);
    return ns.length ? " " + [...new Set(ns)].map((n) => `[${n}]`).join("") : "";
  });
  // Renvois entre crochets : [rcp:…], [table:…], [doc_id].
  md = md.replace(/\s?\[([^\]\s]{1,80})\]/g, (whole, tok: string) => {
    if (/^\d+$/.test(tok) && !docs.has(tok)) return whole; // déjà un renvoi numéroté
    let n: number | null = null;
    if (tok.startsWith("rcp:")) {
      const r = rcps.get(tok.slice(4));
      if (r) n = ref(`rcp:${r.specialite ?? r.dci}`, `ANSM · ${rcpLabel} ${r.specialite ?? r.dci ?? ""}`.trim(), r.url);
    } else if (tok.startsWith("table:")) {
      const t = tables.get(tok.slice(6));
      n = t ? docRef(t.doc_id, t.doc_title) : null;
    } else if (docs.has(tok)) {
      n = docRef(tok);
    } else {
      return whole;
    }
    return n ? ` [${n}]` : "";
  });
  md = md.replace(/(\[\d+\])\s+(?=\[\d+\])/g, "$1");
  // Renumérotation dans l'ordre de première citation ; les sources jamais citées tombent.
  const ordre = new Map<number, number>();
  for (const m of md.matchAll(/\[(\d+)\]/g)) { const n = Number(m[1]); if (n <= sources.length && !ordre.has(n)) ordre.set(n, ordre.size + 1); }
  md = md.replace(/\[(\d+)\]/g, (w, n: string) => (ordre.has(Number(n)) ? `[${ordre.get(Number(n))}]` : w));
  const cites = [...ordre.entries()].map(([ancien, n]) => ({ ...sources[ancien - 1], n }));
  return { markdown: stripRuleIds(md).trim(), sources: cites };
}

/* ---------- Le flux ---------- */

export interface LocusInput {
  lang: Lang;
  query?: string;
  settings?: LocusSettings;
  reprise?: { token: string; answers: FormAnswer[] };
}

export async function* locusStream(input: LocusInput): AsyncGenerator<ChatEvent> {
  const cfg = coreConfig();
  const { lang } = input;
  const t = chatbot[lang];
  if (cfg.mode !== "core") { yield { t: "replay" }; return; }

  let query: string;
  let settings: LocusSettings;
  let extra: Record<string, unknown> = {};
  if (input.reprise) {
    const r = ouvrir<Reprise>(input.reprise.token);
    if (!r) { yield { t: "error", detail: t.live.error, code: "reprise" }; return; }
    query = r.query;
    settings = r.settings;
    const slot_answers = input.reprise.answers
      .filter((a) => Number.isInteger(a.i) && a.i >= 0 && a.i < r.keys.length)
      .map((a) => {
        const vals = r.values[a.i] ?? [];
        const values = a.skipped ? [] : (a.values ?? []).map((v) => vals[Number(v)]).filter((v): v is string => typeof v === "string");
        return a.skipped || !values.length ? { key: r.keys[a.i], values: [r.skip[a.i]].filter(Boolean), skipped: true } : { key: r.keys[a.i], values };
      });
    extra = { slot_answers: [...slot_answers, ...(r.deduites ?? [])], elicitation_round: r.round + 1, contexte: r.contexte ?? undefined };
    yield { t: "step", text: t.steps.reprise };
  } else {
    query = input.query ?? "";
    settings = input.settings!;
    // Sans clé de scellement, un formulaire ne pourrait pas être repris : refus avant toute dépense chez core.
    if (settings.elic && !scellable()) { yield { t: "error", detail: t.live.elicOff, code: "elic_off" }; return; }
  }

  const body = {
    query,
    ...coreParams(settings, await knownSources(cfg)),
    ...extra,
    app_surface: APP_SURFACE,
    app_platform: "web",
    app_version: APP_VERSION,
    ...(process.env.VERCEL_GIT_COMMIT_SHA ? { app_build: process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 12) } : {}),
  };

  let res: Response;
  try {
    res = await fetch(`${cfg.url}/v2/retrieve/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/x-ndjson", Authorization: `Bearer ${cfg.key}`, "X-Locus-User-Ref": userRef() },
      body: JSON.stringify(body),
      redirect: "manual",
      signal: AbortSignal.timeout(55_000),
    });
  } catch (e) {
    console.error("[chatbot/locus] injoignable", e);
    yield { t: "error", detail: estTimeout(e) ? t.live.timeout : t.live.unavailable, code: estTimeout(e) ? "timeout" : undefined };
    return;
  }
  if (!res.ok || !res.body) {
    const txt = (await res.text().catch(() => "")).slice(0, 300);
    console.error("[chatbot/locus]", res.status, txt);
    // 402 CREDITS_EXHAUSTED : le compte de la clé n'a plus de crédit. Le détail de core ne sort pas.
    if (res.status === 402 || txt.includes("CREDITS_EXHAUSTED")) { yield { t: "error", detail: t.live.credits, code: "credits" }; return; }
    yield { t: "error", detail: t.live.unavailable };
    return;
  }

  try {
    for await (const ev of readNdjson<{ step: string; [k: string]: unknown }>(res.body)) {
      switch (ev.step) {
        case "progress": {
          const label = (t.steps as Record<string, unknown>)[String(ev.etape)];
          if (typeof label === "string") yield { t: "step", text: label };
          break;
        }
        case "retrieval":
          if (Number(ev.docs) > 0) yield { t: "step", text: t.steps.retrieval(Number(ev.docs)) };
          break;
        case "rcp":
          if (Number(ev.rubriques) > 0) yield { t: "step", text: t.steps.rcp(Number(ev.rubriques)) };
          break;
        case "reflexion":
          if (typeof ev.titre === "string" && ev.titre.trim()) yield { t: "step", text: ev.titre.trim() };
          break;
        case "answer":
          yield { t: "step", text: t.steps.redaction };
          break;
        case "error":
          console.error("[chatbot/locus] erreur de flux", ev.detail);
          yield { t: "error", detail: t.live.unavailable };
          return;
        case "done": {
          const p = (ev.payload ?? {}) as Payload;
          const o = p.orchestration;
          if (o?.decision === "elicit" && o.form?.length) {
            const keys = o.form.map((q) => q.key);
            const values = o.form.map((q) => (q.options ?? []).map((x) => x.value));
            const reprise: Reprise = { query, settings, round: o.round ?? 0, keys, values, skip: o.form.map((q) => q.skip?.value ?? "__passer__"), contexte: o.contexte ?? null, deduites: o.deduites ?? [] };
            const token = sceller(reprise);
            if (!token) { yield { t: "error", detail: t.live.unavailable }; return; }
            const questions: FormQuestion[] = o.form.map((q, i) => {
              const dep = q.depends_on ? keys.indexOf(q.depends_on.key) : -1;
              return {
                i,
                question: q.question,
                options: (q.options ?? []).map((x, j) => ({ v: String(j), label: x.label })),
                multiple: !!q.multiple,
                skip: q.skip?.label ?? t.locus.skip,
                dependsOn: dep >= 0 ? { i: dep, values: (q.depends_on!.values ?? []).map((v) => String(values[dep].indexOf(v))).filter((v) => v !== "-1") } : undefined,
              };
            });
            yield { t: "form", token, questions };
          } else {
            yield { t: "answer", ...renumeroter(p, lang) };
          }
          return;
        }
        default:
          /* route, query_maker, logic, deliberation_*, decide… : détail de pipeline, ne sort pas. */
          break;
      }
    }
  } catch (e) {
    console.error("[chatbot/locus] flux interrompu", e);
    if (estTimeout(e)) { yield { t: "error", detail: t.live.timeout, code: "timeout" }; return; }
  }
  // Flux coupé avant la ligne `done` (NDJSON tronqué, connexion perdue).
  yield { t: "error", detail: t.live.unavailable };
}

const estTimeout = (e: unknown) => e instanceof Error && (e.name === "TimeoutError" || (e.cause instanceof Error && e.cause.name === "TimeoutError"));
