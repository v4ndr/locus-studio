import "server-only";
import { coreConfig } from "@/locus/config";
import { locusUserRef } from "@/lib/server/user";
import { readNdjson } from "@/locus/ndjson";
import { chatbot, type Lang } from "@/i18n";
import { APP_SURFACE, APP_VERSION, coreParams, type LocusSettings } from "@/sandbox/chatbot/request";
import type { ChatEvent, FormAnswer, FormQuestion } from "@/sandbox/chatbot/events";
import { publier, type Payload as Sources } from "./citations";
import { ouvrir, scellable, sceller } from "./scelle";

/**
 * La colonne Locus du chatbot : `POST {LOCUS_CORE_URL}/v2/retrieve/stream`,
 * rediffusé au navigateur en événements grossiers (étapes, formulaire,
 * réponse). Ne sortent jamais : la reformulation, la route, l'autorité, les
 * identifiants de règles, les sondes de délibération, le contexte de reprise.
 */

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

/* ---------- La payload de `done` ---------- */

type DependsOn = { key: string; values?: string[] };
interface Payload extends Sources {
  orchestration?: {
    decision?: string;
    round?: number;
    form?: { key: string; question?: string; label?: string; options?: { label: string; value: string }[]; multiple?: boolean; skip?: { label: string; value: string }; depends_on?: DependsOn | null; depends_any?: DependsOn[] }[];
    contexte?: unknown;
    deduites?: unknown[];
    non_renseignes?: string[];
  };
}

/** Une clé de pas (`q_91`) ou un identifiant n'est pas une phrase : ce qui reste conditionnel ne se dit qu'en clair. */
const lisibles = (xs?: string[]) => [...new Set((xs ?? []).map((x) => (x || "").trim()).filter((x) => x && !/^[\w-]*_[\w-]*$/.test(x) && !/[0-9a-f]{16}/.test(x)))];

/** Le délai d'un appel : un peu sous `maxDuration` (300 s, comme B2Pro), pour que la colonne dise le délai au lieu d'être coupée. */
const DELAI_MS = 290_000;

/* ---------- Le flux ---------- */

export interface LocusInput {
  lang: Lang;
  query?: string;
  settings?: LocusSettings;
  reprise?: { token: string; answers: FormAnswer[] };
  /** L'annulation du navigateur : couper la colonne coupe l'appel à core. */
  signal?: AbortSignal;
}

export async function* locusStream(input: LocusInput): AsyncGenerator<ChatEvent> {
  const cfg = coreConfig();
  const { lang } = input;
  const t = chatbot[lang];
  if (cfg.mode !== "core") { yield { t: "error", detail: t.live.locusOff, code: "unconfigured" }; return; }

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
        // Passée (ou rien de coché) : `skipped` seul, comme B2Pro ; la réponse sera conditionnelle sur ce point.
        return a.skipped || !values.length ? { key: r.keys[a.i], skipped: true } : { key: r.keys[a.i], values };
      });
    extra = { slot_answers: [...slot_answers, ...(r.deduites ?? [])], elicitation_round: r.round + 1, ...(r.contexte ? { contexte: r.contexte } : {}) };
    yield { t: "step", text: t.steps.reprise };
  } else {
    query = input.query ?? "";
    settings = input.settings!;
    // Sans clé de scellement, un formulaire ne pourrait pas être repris : l'orchestration tourne alors sans formulaire.
    if (settings.elic && !scellable()) {
      console.warn("[chatbot/locus] élicitation demandée sans STUDIO_STATE_SECRET : orchestration sans formulaire");
      settings = { ...settings, elic: false, desamb: true };
    }
  }

  const body = {
    query,
    ...coreParams(settings),
    ...extra,
    app_surface: APP_SURFACE,
    app_platform: "web",
    app_version: APP_VERSION,
    ...(process.env.VERCEL_GIT_COMMIT_SHA ? { app_build: process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 12) } : {}),
  };
  const delai = AbortSignal.timeout(DELAI_MS);

  let res: Response;
  try {
    res = await fetch(`${cfg.url}/v2/retrieve/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/x-ndjson", Authorization: `Bearer ${cfg.key}`, "X-Locus-User-Ref": await locusUserRef() },
      body: JSON.stringify(body),
      // Une redirection n'est jamais suivie : une page de connexion servie en 200 passerait pour un flux muet.
      redirect: "manual",
      signal: input.signal ? AbortSignal.any([input.signal, delai]) : delai,
    });
  } catch (e) {
    if (input.signal?.aborted) return;
    console.error("[chatbot/locus] injoignable", e);
    yield estTimeout(e) ? { t: "error", detail: t.live.timeout, code: "timeout" } : { t: "error", detail: t.live.unavailable };
    return;
  }
  if (!res.ok || !res.body || res.type === "opaqueredirect") {
    const txt = (await res.text().catch(() => "")).slice(0, 300);
    console.error("[chatbot/locus]", res.status, res.headers.get("location") ?? "", txt);
    // 402 CREDITS_EXHAUSTED : le compte de la clé n'a plus de crédit. Le détail de core ne sort pas.
    if (res.status === 402 || txt.includes("CREDITS_EXHAUSTED")) { yield { t: "error", detail: t.live.credits, code: "credits" }; return; }
    yield { t: "error", detail: t.live.unavailable, code: `http_${res.status}` };
    return;
  }
  const ctype = res.headers.get("content-type") ?? "";
  if (!/ndjson|\bjson\b|event-stream|text\/plain/i.test(ctype)) {
    console.error("[chatbot/locus] réponse illisible comme NDJSON :", ctype, (await res.text().catch(() => "")).slice(0, 200));
    yield { t: "error", detail: t.live.unavailable, code: "not_ndjson" };
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
          // Le détail de core peut nommer un fournisseur ou un modèle : il reste dans les journaux, avec son code.
          console.error("[chatbot/locus] erreur de flux", JSON.stringify({ code: ev.code ?? null, detail: ev.detail ?? null, known_sources: ev.known_sources ?? undefined, ...coreParams(settings), reprise: !!input.reprise }));
          yield { t: "error", detail: t.live.unavailable, code: typeof ev.code === "string" ? ev.code : "core_error" };
          return;
        case "done": {
          const p = (ev.payload ?? {}) as Payload;
          const o = p.orchestration;
          if (o?.decision === "elicit" && o.form?.length) {
            const keys = o.form.map((q) => q.key);
            const values = o.form.map((q) => (q.options ?? []).map((x) => x.value));
            const reprise: Reprise = { query, settings, round: o.round ?? 0, keys, values, skip: o.form.map((q) => q.skip?.value ?? "__passer__"), contexte: o.contexte ?? null, deduites: o.deduites ?? [] };
            const token = sceller(reprise);
            if (!token) { yield { t: "error", detail: t.live.unavailable, code: "scelle" }; return; }
            // Les branches qui mènent à une question, en indices du formulaire : `depends_any` prime sur `depends_on`.
            const branche = (d: DependsOn) => {
              const i = keys.indexOf(d.key);
              return i < 0 ? null : { i, values: (d.values ?? []).map((v) => String(values[i].indexOf(v))).filter((v) => v !== "-1") };
            };
            const questions: FormQuestion[] = o.form.map((q, i) => {
              const deps = (q.depends_any?.length ? q.depends_any : q.depends_on ? [q.depends_on] : []).map(branche).filter((d): d is { i: number; values: string[] } => !!d);
              return {
                i,
                question: q.question || q.label || "",
                options: (q.options ?? []).map((x, j) => ({ v: String(j), label: x.label })),
                multiple: !!q.multiple,
                skip: q.skip?.label ?? t.locus.skip,
                dependsOn: deps.length ? deps : undefined,
              };
            });
            yield { t: "form", token, questions };
            return;
          }
          const pub = publier(p);
          if (!pub.markdown) {
            console.error("[chatbot/locus] ligne done sans réponse", JSON.stringify({ decision: o?.decision ?? null, form: o?.form?.length ?? 0 }));
            yield { t: "error", detail: t.live.unavailable, code: "empty_answer" };
            return;
          }
          yield { t: "answer", ...pub, conditional: lisibles(o?.non_renseignes) };
          return;
        }
        default:
          /* route, query_maker, logic, deliberation_*, decide… : détail de pipeline, ne sort pas. */
          break;
      }
    }
  } catch (e) {
    if (input.signal?.aborted) return;
    console.error("[chatbot/locus] flux interrompu", e);
    if (estTimeout(e)) { yield { t: "error", detail: t.live.timeout, code: "timeout" }; return; }
  }
  if (input.signal?.aborted) return;
  // Flux coupé avant la ligne `done` (NDJSON tronqué, connexion perdue).
  console.error("[chatbot/locus] flux terminé sans ligne done");
  yield { t: "error", detail: t.live.unavailable, code: "truncated" };
}

const estTimeout = (e: unknown) => e instanceof Error && (e.name === "TimeoutError" || (e.cause instanceof Error && e.cause.name === "TimeoutError"));
