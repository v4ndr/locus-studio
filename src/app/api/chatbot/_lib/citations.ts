import "server-only";
import type { ChatSource, Confiance, SourceKind } from "@/sandbox/chatbot/events";

/**
 * Les citations de la colonne Locus, comme l'app B2Pro les rend : portage de
 * `@locus/core` (locus-app, `packages/core/src/citations/*`, `confidence/`),
 * recopié et non importé. Une règle citée est résolue vers SON DOCUMENT ; un
 * score ou un arbre vers sa propre page ; une rubrique de RCP vers sa
 * spécialité. Rien de ce qui sort d'ici ne porte un identifiant de règle :
 * ces fonctions en reçoivent, elles n'en rendent pas.
 *
 * Deux écarts avec l'app : les renvois sont rendus `[n]` (le rendu Markdown
 * du studio les lit tels quels) et non en liens, et les médicaments ne sont
 * pas rendus cliquables dans le texte (pas de fiche médicament ici).
 */

/* ---------- Le contrat de core, le sous-ensemble lu ici ---------- */

interface Mku { id: string; doc_id?: string | null; doc_title?: string | null; type?: string | null }
interface Doc { id: string; title?: string | null; year?: number | null; url?: string | null; source_id?: string | null; source_name?: string | null }
interface Table { id: string; caption?: string; label?: string; number?: number | null; doc_id?: string | null; doc_title?: string | null; matched_mkus?: string[] }
interface Chunk { id: string; doc_id?: string | null; doc_title?: string | null; section_title?: string | null }
interface Rcp { id: string; cis?: string; dci?: string; specialite?: string; code?: string; label?: string; url?: string | null; source_name?: string }
interface Drug { concept_id: string; dci: string; aliases?: string[]; mentions?: string[]; from_mku_ids?: string[]; reference?: { rcp_external_url?: string | null } | null }
interface Elicitation { mku_id: string; mku_key: string; type: "score" | "tree"; titre: string; url?: string | null; d_apres?: string | null; computed?: { outcome?: string | null } | null }

export interface Payload {
  answer?: string;
  mkus?: Mku[];
  docs?: Doc[];
  tables?: Table[];
  chunks?: Chunk[];
  rcp?: Rcp[];
  drugs?: Drug[];
  elicitations?: Elicitation[];
}

/* ---------- Les jetons (tokens.ts) ---------- */

const HEX16 = /[0-9a-f]{16}/g;
const RCP_PREFIX = "rcp:";
const TABLE_PREFIX = "table:";
/** `(mku…)`, `[doc_id]`, `TABLE [doc_id]`, `(doc_id)`, et un id de règle nu. */
const TOKEN = /\(\s*(?:[0-9a-f]{16}[\s,;]*)+\)|(?:(TABLE)\s*)?\[([^\][<>]{1,80})\]|\(\s*([A-Za-z0-9][\w.\-]{0,60})\s*\)|[0-9a-f]{16}/g;
const TABLE_WORD = /\b(?:tableaux?|tables?)\s*(?:n\s*[°ºo]?\s*)?(\d{1,2})?\s*[^\w<>]{0,4}$/i;
const CODE_WRAPPED = /`([^`\n]*(?:\((?:[0-9a-f]{16}[\s,;]*)+\)|\(\s*\d{3,}\s*\)|\[[^\]\n`]{1,80}\])[^`\n]*)`/g;
const NESTED = /\[((?:[^[\]]*\[[^[\]]*\][^[\]]*)+)\]/g;
const FENCE_WRAPPED = /^[ \t]*(?:```|~~~)[^\n]*\n([\s\S]*?)^[ \t]*(?:```|~~~)[ \t]*$/gm;
const FENCE_TOKEN = /[0-9a-f]{16}|[[(]\s*\d{3,}\s*[\])]/;
const PAREN_PREFIXED = /\(\s*((?:table|rcp):[0-9A-Za-z_-]{1,64})\s*\)/g;
const DOC_ID = /^\d{3,}$/;
const LETTER = "0-9A-Za-zÀ-ÖØ-öø-ÿ";

/** La réponse ramenée aux formes que `TOKEN` sait lire ; la même pour l'analyse et la réécriture. */
function normaliser(answer: string): string {
  return answer
    .replace(FENCE_WRAPPED, (whole, body: string) => (FENCE_TOKEN.test(body) ? body : whole))
    .replace(PAREN_PREFIXED, "[$1]")
    .replace(CODE_WRAPPED, "$1")
    .replace(NESTED, "$1");
}

function tableHint(src: string, index: number): { table: boolean; ordinal: number | null } {
  const m = TABLE_WORD.exec(src.slice(Math.max(0, index - 60), index));
  return m ? { table: true, ordinal: m[1] ? Number(m[1]) : null } : { table: false, ordinal: null };
}
const tableAlias = (docId: string, ordinal: number | null) => (ordinal == null ? `TABLE:${docId}` : `TABLE:${docId}#${ordinal}`);

/** Un id de règle recopié de travers : le plus long préfixe qui ne désigne qu'un id connu. */
function recover(cited: string, known: string[]): string | null {
  for (let len = 14; len >= 8; len--) {
    const hits = known.filter((k) => k.startsWith(cited.slice(0, len)));
    if (hits.length === 1) return hits[0];
    if (hits.length > 1) return null;
  }
  return null;
}
function recoverDocParen(word: string, hasDoc: (id: string) => boolean): string | null {
  const m = word.match(/^[A-Za-z]{1,3}(\d[\w.\-]*)$/);
  return m && hasDoc(m[1]) ? m[1] : null;
}
const reEsc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const namedIn = (text: string, surfaces: string[]) => surfaces.some((s) => !!s && new RegExp(`(?<![${LETTER}])${reEsc(s)}(?![${LETTER}])`, "i").test(text));
const short = (s: string, n = 110) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/* ---------- L'analyse (analyze.ts) ---------- */

type Kind = SourceKind | "unknown";
interface Citation { n: number; kind: Kind; id: string; label: string; inline: boolean }

interface Analysis {
  refs: Map<string, Citation>;
  order: Citation[];
  unresolved: number;
  /** Par renvoi de RCP, les rubriques réellement citées sous lui (« 4.2 Posologie · 4.4 Mises en garde »). */
  rubriques: Map<string, string[]>;
  tracedCount: number;
  citedRules: number;
}

function analyser(p: Payload): Analysis {
  const answer = normaliser(p.answer ?? "");
  const mkus = p.mkus ?? [], tables = p.tables ?? [], chunks = p.chunks ?? [];
  const mkuById = new Map(mkus.map((m) => [m.id, m]));
  const tableById = new Map(tables.map((t) => [t.id, t]));
  const chunkById = new Map(chunks.map((c) => [c.id, c]));
  const rcpById = new Map((p.rcp ?? []).map((x) => [x.id, x]));
  const docMeta = new Map((p.docs ?? []).map((x) => [x.id, x]));
  const docTitle = new Map<string, string>();
  for (const x of [...mkus, ...chunks, ...tables]) if (x.doc_id) docTitle.set(x.doc_id, docMeta.get(x.doc_id)?.title || x.doc_title || x.doc_id);
  for (const [id, meta] of docMeta) if (!docTitle.has(id)) docTitle.set(id, meta.title || id);
  const tableLabel = (t: Table) => short(t.label || t.caption || t.doc_title || "Tableau");

  const refs = new Map<string, Citation>();
  const order: Citation[] = [];
  // Un renvoi mort ne consomme pas de numéro : la suite visible ne saute pas.
  let seq = 0;
  let dead = 0;
  let unresolved = 0;
  const rubriques = new Map<string, string[]>();
  const add = (id: string, kind: Kind, label: string, inline: boolean, alias?: string): Citation => {
    let r = refs.get(id);
    if (!r) { r = { n: kind === "unknown" ? 0 : ++seq, kind, id, label, inline }; refs.set(id, r); order.push(r); }
    else if (inline) r.inline = true;
    if (alias && alias !== id) refs.set(alias, r);
    return r;
  };
  /* Un renvoi mort reste compté (il plafonne la confiance), mais son identifiant ne sort pas. */
  const mort = (cited: string) => {
    unresolved++;
    const r = add(cited, "unknown", "", true);
    if (r.id === cited) r.id = `mort-${++dead}`;
  };

  const logiqueParMku = new Map((p.elicitations ?? []).map((e) => [e.mku_id, e]));
  /* Une règle citée entre par son document, sauf une unité logique (score, arbre) : elle se cite elle-même, par sa clé. */
  const addRule = (mkuId: string, cited: string): boolean => {
    const logique = logiqueParMku.get(mkuId);
    if (logique?.mku_key) { add(logique.mku_key, logique.type === "tree" ? "tree" : "score", short(logique.titre), true, cited); return true; }
    const docId = mkuById.get(mkuId)?.doc_id;
    if (!docId) return false;
    add(docId, "doc", docTitle.get(docId) || docId, true, cited);
    refs.set(mkuId, refs.get(docId)!);
    return true;
  };

  const known = [...mkuById.keys(), ...tableById.keys(), ...chunkById.keys()];

  // 1. Ce que la réponse cite, dans l'ordre de lecture.
  for (const m of answer.matchAll(TOKEN)) {
    const bracketKey = (m[2] || "").trim();
    // Les jetons préfixés avant le scan hexadécimal : un id de rubrique (sha256) y serait déchiqueté.
    if (bracketKey.startsWith(TABLE_PREFIX)) {
      const cited = bracketKey.slice(TABLE_PREFIX.length).trim();
      const hit = tableById.get(cited) ?? (cited.length >= 6 ? tables.find((t) => t.id.startsWith(cited)) : undefined);
      if (hit) refs.set(bracketKey, add(hit.id, "table", tableLabel(hit), true, bracketKey));
      else mort(bracketKey);
      continue;
    }
    if (bracketKey.startsWith(RCP_PREFIX)) {
      const cited = bracketKey.slice(RCP_PREFIX.length).trim();
      const hit = rcpById.get(cited) ?? (p.rcp ?? []).find((x) => x.id.startsWith(cited));
      if (hit) {
        // Deux rubriques d'une même spécialité partagent un seul renvoi : celui de sa page publique.
        const groupId = hit.cis ? `${RCP_PREFIX}cis:${hit.cis}` : `${RCP_PREFIX}${hit.id}`;
        const nom = (hit.specialite || "").trim(), dci = (hit.dci || "").trim();
        const label = short(nom && dci && !nom.toLowerCase().includes(dci.toLowerCase()) ? `${dci} — ${nom}` : nom || dci || "RCP");
        refs.set(bracketKey, add(groupId, "rcp", label, true, bracketKey));
        const rub = `${hit.code ?? ""} ${hit.label ?? ""}`.trim();
        const sous = rubriques.get(groupId) ?? [];
        if (rub && !sous.includes(rub)) sous.push(rub);
        rubriques.set(groupId, sous);
      } else mort(bracketKey);
      continue;
    }
    const hexes = m[0].match(HEX16);
    if (hexes) {
      for (const cited of hexes) {
        const id = known.includes(cited) ? cited : recover(cited, known);
        const from = id && id !== cited ? cited : undefined;
        if (id) {
          if (mkuById.has(id) && addRule(id, cited)) continue;
          const t = tableById.get(id);
          if (t) { add(id, "table", tableLabel(t), true, from); continue; }
          const c = chunkById.get(id);
          if (c) { add(id, "chunk", short(c.section_title || c.doc_title || "Extrait"), true, from); continue; }
        }
        mort(cited);
      }
      continue;
    }
    const paren = (m[3] || "").trim();
    if (paren) {
      if (docTitle.has(paren)) add(paren, "doc", docTitle.get(paren)!, true);
      else {
        const rec = recoverDocParen(paren, (id) => docTitle.has(id));
        if (rec) add(rec, "doc", docTitle.get(rec)!, true, paren);
      }
      continue; // parenthèse de prose : on n'y touche pas
    }
    const key = bracketKey;
    const hint = tableHint(answer, m.index ?? 0);
    if (m[1] || hint.table) {
      const hits = tables.filter((t) => t.doc_id === key);
      const chosen = hint.ordinal == null ? (hits.length === 1 ? hits[0] : null) : hits.find((t) => t.number === hint.ordinal) ?? null;
      if (chosen) { add(chosen.id, "table", tableLabel(chosen), true, tableAlias(key, hint.ordinal)); continue; }
      if (m[1] && !hits.length && !docTitle.has(key)) { unresolved++; add(tableAlias(key, hint.ordinal), "unknown", "", true); continue; }
    }
    if (docTitle.has(key)) { add(key, "doc", docTitle.get(key)!, true); continue; }
    // Un renvoi de document que le retrieving n'a pas rendu : seulement sur la forme d'un id de document.
    if (DOC_ID.test(key)) { unresolved++; add(key, "unknown", "", true); }
  }

  // 2. Ce que ces citations entraînent, et uniquement cela : le reste du pool a été retrouvé, pas utilisé.
  const citedDocs = new Set(order.filter((r) => r.kind === "doc").map((r) => r.id));
  const citedMkuIds = new Set(mkus.filter((m) => refs.has(m.id)).map((m) => m.id));
  for (const t of tables) {
    if (refs.has(t.id)) continue;
    if ((t.matched_mkus ?? []).some((id) => citedMkuIds.has(id)) || (t.doc_id && citedDocs.has(t.doc_id))) add(t.id, "table", tableLabel(t), false);
  }
  for (const c of chunks) {
    if (!refs.has(c.id) && c.doc_id && citedDocs.has(c.doc_id)) add(c.id, "chunk", short(c.section_title || c.doc_title || "Extrait"), false);
  }
  for (const g of p.drugs ?? []) {
    const via = (g.from_mku_ids ?? []).some((id) => citedMkuIds.has(id) || citedDocs.has(mkuById.get(id)?.doc_id ?? ""));
    if (via || namedIn(answer, g.mentions?.length ? g.mentions : [g.dci, ...(g.aliases ?? [])])) add(g.concept_id, "drug", g.dci, false);
  }
  // Les documents d'où viennent une règle, une table ou un extrait cités : c'est le document qu'on va vérifier.
  for (const m of mkus) if (citedMkuIds.has(m.id) && m.doc_id && !refs.has(m.doc_id)) add(m.doc_id, "doc", docTitle.get(m.doc_id) || m.doc_id, false);
  for (const x of [...tables, ...chunks]) if (x.doc_id && refs.get(x.id)?.inline && !refs.has(x.doc_id)) add(x.doc_id, "doc", docTitle.get(x.doc_id) || x.doc_id, false);

  return {
    refs,
    order,
    unresolved,
    rubriques,
    tracedCount: order.filter((r) => r.inline && r.kind !== "unknown").length,
    citedRules: citedMkuIds.size,
  };
}

/* ---------- La réécriture (markdown.ts) ---------- */

/** Le repère d'un renvoi mort, le temps de la substitution : il s'efface avec l'espace qui le précède. */
const MARQUE = "\u0000";
const pill = (c: Citation) => (c.kind === "unknown" ? MARQUE : `[${c.n}]`);

function reecrire(answer: string, a: Analysis): string {
  const src = normaliser(answer);
  const out = src.replace(TOKEN, (whole: string, tableWord: string | undefined, bracket: string | undefined, paren: string | undefined, offset: number) => {
    const key = (bracket || "").trim();
    if (key.startsWith(TABLE_PREFIX) || key.startsWith(RCP_PREFIX)) { const c = a.refs.get(key); return c ? pill(c) : whole; }
    const hexes = whole.match(HEX16);
    if (hexes) {
      const pills = hexes.map((h) => a.refs.get(h)).filter((c): c is Citation => !!c).map(pill);
      // Un id de règle n'est jamais rendu en clair, même introuvable.
      return pills.length ? [...new Set(pills)].join("") : MARQUE;
    }
    if (paren) { const c = a.refs.get(paren.trim()); return c ? pill(c) : whole; }
    const hint = tableHint(src, offset);
    const c = tableWord || hint.table ? a.refs.get(tableAlias(key, hint.ordinal)) ?? a.refs.get(tableAlias(key, null)) ?? a.refs.get(key) : a.refs.get(key);
    return c ? pill(c) : whole;
  });
  return dedoublonner(out.replace(/[ \t]*\(\s*\u0000\s*\)/g, "").replace(/[ \t]*\u0000/g, ""))
    .replace(/(\[\d+\])\s+(?=\[\d+\])/g, "$1");
}

/** Une même source citée deux fois dans le même bloc ne prend qu'un renvoi ; d'un bloc à l'autre, on la répète. */
function dedoublonner(md: string): string {
  let fenced = false;
  let seen = new Set<string>();
  return md.split("\n").map((line) => {
    if (/^\s*(?:```|~~~)/.test(line)) { fenced = !fenced; seen = new Set(); return line; }
    if (fenced) return line;
    if (!line.trim() || /^\s*(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|>|\||-{3,}\s*$)/.test(line)) seen = new Set();
    return line.replace(/(\s*)\[(\d+)\]/g, (whole, lead: string, n: string) => {
      if (!seen.has(n)) { seen.add(n); return whole; }
      return lead.includes(" ") ? lead : "";
    });
  }).join("\n");
}

/* ---------- Le degré de confiance (confidence/index.ts) ---------- */

/**
 * Cinq crans, un escalier : la réponse cite ses sources, tous ses renvois
 * mènent à une source retrouvée, elle est riche en références précises, et
 * entièrement appuyée par plusieurs sources. Mesure l'ANCRAGE, pas la
 * justesse médicale.
 */
function confiance(md: string, a: Analysis): Confiance {
  const blocs = md.split(/\n\s*\n/).map((b) => b.trim()).filter((b) => b && !/^(?:#{1,6}\s|(?:-{3,}|\*{3,}|_{3,})$)/.test(b));
  const dense = blocs.length ? blocs.filter((b) => /\[\d+\]/.test(b)).length / blocs.length : 0;
  const tracee = a.tracedCount > 0;
  const honnete = tracee && a.unresolved === 0;
  const riche = honnete && dense >= 0.66 && a.citedRules > 0;
  const multiple = riche && dense >= 0.9 && a.tracedCount >= 2;
  const ok = [tracee, honnete, riche, multiple];
  return { level: 1 + ok.filter(Boolean).length, ok };
}

/* ---------- Ce qui part vers le navigateur ---------- */

const plat = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * La réponse publique : le texte renuméroté, toutes les sources que la réponse
 * mobilise (documents de chaque éditeur, tableaux, extraits, RCP, médicaments,
 * scores et arbres), et le degré de confiance.
 */
export function publier(p: Payload): { markdown: string; sources: ChatSource[]; confidence: Confiance } {
  const a = analyser(p);
  const markdown = reecrire(p.answer ?? "", a)
    // Filet de sécurité : aucun identifiant de règle ne franchit le navigateur, quelle que soit sa forme.
    .replace(/\s?\((?:[0-9a-f]{16})(?:,\s*[0-9a-f]{16})*\)/g, "")
    .replace(/[0-9a-f]{16,}/g, "")
    .trim();

  const docs = new Map((p.docs ?? []).map((d) => [d.id, d]));
  const tables = new Map((p.tables ?? []).map((t) => [t.id, t]));
  const chunks = new Map((p.chunks ?? []).map((c) => [c.id, c]));
  const rcps = p.rcp ?? [];
  const drugs = new Map((p.drugs ?? []).map((g) => [g.concept_id, g]));
  const logiques = new Map((p.elicitations ?? []).map((e) => [e.mku_key, e]));
  const editeur = (d?: Doc) => d?.source_name?.trim() || d?.source_id?.trim() || undefined;
  /* Un score ou un arbre n'a pas de document dans la payload : son éditeur se lit sur sa page, nommé comme celui
     des documents quand l'adresse le désigne (recomedicales.fr → RecoMédicales), sinon par l'adresse. */
  const connus = [...new Set((p.docs ?? []).map((d) => editeur(d)).filter((x): x is string => !!x))];
  const hote = (url?: string | null) => {
    let h: string;
    try { h = url ? new URL(url).hostname.replace(/^www\./, "") : ""; } catch { return undefined; }
    return h ? connus.find((e) => plat(e).length >= 3 && plat(h).includes(plat(e))) ?? h : undefined;
  };

  const sources: ChatSource[] = [];
  for (const c of a.order) {
    if (c.kind === "unknown") continue;
    // Un document dont core n'a rendu ni titre ni métadonnées : rien à montrer qu'un identifiant.
    if (c.kind === "doc" && !docs.has(c.id) && c.label === c.id) continue;
    const s: ChatSource = { n: c.n, kind: c.kind, label: c.label, cited: c.inline };
    if (c.kind === "doc") {
      const d = docs.get(c.id);
      Object.assign(s, { publisher: editeur(d), url: d?.url ?? undefined, detail: d?.year ? String(d.year) : undefined });
    } else if (c.kind === "table" || c.kind === "chunk") {
      const x = c.kind === "table" ? tables.get(c.id) : chunks.get(c.id);
      const d = x?.doc_id ? docs.get(x.doc_id) : undefined;
      Object.assign(s, { publisher: editeur(d), url: d?.url ?? undefined, detail: d?.title ?? x?.doc_title ?? undefined });
    } else if (c.kind === "rcp") {
      const x = rcps.find((r) => (r.cis ? `${RCP_PREFIX}cis:${r.cis}` : `${RCP_PREFIX}${r.id}`) === c.id);
      Object.assign(s, { publisher: x?.source_name?.trim() || "ANSM", url: x?.url ?? undefined, detail: a.rubriques.get(c.id)?.join(" · ") || undefined });
    } else if (c.kind === "drug") {
      Object.assign(s, { publisher: "ANSM", url: drugs.get(c.id)?.reference?.rcp_external_url ?? undefined });
    } else {
      const e = logiques.get(c.id);
      Object.assign(s, { publisher: hote(e?.url), url: e?.url ?? undefined, detail: e?.computed?.outcome ?? e?.d_apres ?? undefined });
    }
    sources.push(s);
  }
  // Les scores et arbres que core a retenus pour la question, cités ou non : l'app B2Pro les montre sous la réponse.
  let n = sources.reduce((m, s) => Math.max(m, s.n), 0);
  for (const e of p.elicitations ?? []) {
    if (!e.mku_key || a.refs.has(e.mku_key)) continue;
    sources.push({ n: ++n, kind: e.type === "tree" ? "tree" : "score", label: short(e.titre), cited: false, publisher: hote(e.url), url: e.url ?? undefined, detail: e.computed?.outcome ?? e.d_apres ?? undefined });
  }
  return { markdown, sources, confidence: confiance(markdown, a) };
}
