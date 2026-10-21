/**
 * Construit l'index du « RAG simple » du chatbot sourcé (spec §4) à partir
 * d'un dossier de recommandations HAS fourni localement. Ne télécharge rien.
 *
 *   MISTRAL_API_KEY=… CHATBOT_RAG_EMBED_MODEL=… node --experimental-strip-types scripts/chatbot-index.ts <dossier> [--out src/data/chatbot/index-has.json]
 *   (ou : pnpm chatbot:index <dossier>)
 *
 * Entrée : des fichiers `.txt` ou `.md` (un document par fichier), et des
 * `.pdf` si `pdftotext` (poppler) est installé. Métadonnées facultatives dans
 * `<dossier>/sources.json` : `{ "<nom de fichier>": { "title": "…", "url": "…", "year": 2019 } }`.
 * À défaut, le titre est la première ligne `# …` du fichier, ou son nom.
 *
 * Sortie : un JSON (`IndexFile` de `src/app/api/chatbot/_lib/rag.ts`) avec,
 * par bloc d'environ 800 tokens, le texte et son vecteur quantifié en int8
 * (base64, une échelle par vecteur) : quelques Mo pour quelques centaines de
 * documents. Le servir depuis le dépôt (`src/data/chatbot/index-has.json`) ou
 * depuis un stockage (`CHATBOT_INDEX_URL`, Vercel Blob par exemple).
 */
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

const API = "https://api.mistral.ai/v1";
/** Le modèle de plongement épinglé par la spec (§4), le même que celui de la route. */
const MODEL = process.env.CHATBOT_RAG_EMBED_MODEL?.trim() || "mistral-embed";
/** ~800 tokens : environ 3 200 caractères de français. */
const CHUNK_CHARS = 3200;
const OVERLAP_CHARS = 300;
const BATCH = 32;

interface Meta { title?: string; url?: string; year?: number }

function args() {
  const a = process.argv.slice(2);
  const dir = a.find((x) => !x.startsWith("--"));
  const i = a.indexOf("--out");
  const out = i >= 0 ? a[i + 1] : "src/data/chatbot/index-has.json";
  if (!dir) {
    console.error("Usage : node --experimental-strip-types scripts/chatbot-index.ts <dossier de textes HAS> [--out fichier.json]");
    process.exit(1);
  }
  return { dir, out };
}

async function lire(file: string): Promise<string | null> {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".txt" || ext === ".md") return readFile(file, "utf8");
  if (ext === ".pdf") {
    try {
      return execFileSync("pdftotext", ["-layout", "-enc", "UTF-8", file, "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    } catch {
      console.warn(`  ignoré (pdftotext indisponible ou PDF illisible) : ${path.basename(file)}`);
      return null;
    }
  }
  return null;
}

function nettoyer(t: string) {
  return t.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

/** Découpe par paragraphes, en blocs d'environ CHUNK_CHARS, avec un recouvrement. */
function decouper(texte: string): string[] {
  const paras = texte.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  let cur = "";
  for (const p of paras) {
    if (p.length > CHUNK_CHARS) {
      if (cur) { out.push(cur); cur = ""; }
      for (let i = 0; i < p.length; i += CHUNK_CHARS - OVERLAP_CHARS) out.push(p.slice(i, i + CHUNK_CHARS));
      continue;
    }
    if (cur && cur.length + p.length + 2 > CHUNK_CHARS) {
      out.push(cur);
      cur = cur.slice(-OVERLAP_CHARS).replace(/^\S*\s/, "") + "\n\n" + p;
    } else {
      cur = cur ? `${cur}\n\n${p}` : p;
    }
  }
  if (cur.trim()) out.push(cur);
  return out.filter((c) => c.trim().length > 80);
}

async function plonger(textes: string[], key: string): Promise<number[][]> {
  for (let essai = 0; ; essai++) {
    const r = await fetch(`${API}/embeddings`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, input: textes }),
    });
    if (r.ok) return ((await r.json()) as { data: { embedding: number[] }[] }).data.map((d) => d.embedding);
    if ((r.status === 429 || r.status >= 500) && essai < 5) {
      const ms = 2000 * 2 ** essai;
      console.warn(`  ${r.status}, nouvel essai dans ${ms / 1000} s`);
      await new Promise((ok) => setTimeout(ok, ms));
      continue;
    }
    throw new Error(`embeddings ${r.status} : ${(await r.text()).slice(0, 300)}`);
  }
}

/** Quantification int8 symétrique, une échelle par vecteur. */
function quantifier(v: number[]): { e: string; s: number } {
  const max = v.reduce((m, x) => Math.max(m, Math.abs(x)), 0) || 1;
  const s = max / 127;
  const q = Int8Array.from(v, (x) => Math.max(-127, Math.min(127, Math.round(x / s))));
  return { e: Buffer.from(q.buffer).toString("base64"), s: Number(s.toPrecision(6)) };
}

async function main() {
  const { dir, out } = args();
  const key = process.env.MISTRAL_API_KEY?.trim();
  if (!key || !MODEL) { console.error("MISTRAL_API_KEY manquante (voir .env.example)."); process.exit(1); }

  let metas: Record<string, Meta> = {};
  try { metas = JSON.parse(await readFile(path.join(dir, "sources.json"), "utf8")); } catch { /* facultatif */ }

  const fichiers = (await readdir(dir)).filter((f) => /\.(txt|md|pdf)$/i.test(f)).sort();
  if (!fichiers.length) { console.error(`Aucun fichier .txt, .md ou .pdf dans ${dir}.`); process.exit(1); }

  const docs: { t: string; u?: string; y?: number }[] = [];
  const blocs: { d: number; x: string }[] = [];
  for (const f of fichiers) {
    const brut = await lire(path.join(dir, f));
    if (!brut) continue;
    const texte = nettoyer(brut);
    const m = metas[f] ?? {};
    const h1 = texte.match(/^#\s+(.+)$/m)?.[1]?.trim();
    const titre = m.title ?? h1 ?? f.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
    const d = docs.push({ t: titre, ...(m.url ? { u: m.url } : {}), ...(m.year ? { y: m.year } : {}) }) - 1;
    const morceaux = decouper(texte);
    for (const x of morceaux) blocs.push({ d, x });
    console.log(`${f} : ${morceaux.length} blocs`);
  }
  if (!blocs.length) { console.error("Aucun bloc à indexer."); process.exit(1); }

  const chunks: { d: number; x: string; e: string; s: number }[] = [];
  let dim = 0;
  for (let i = 0; i < blocs.length; i += BATCH) {
    const lot = blocs.slice(i, i + BATCH);
    const vecs = await plonger(lot.map((b) => b.x), key);
    vecs.forEach((v, j) => { dim = v.length; chunks.push({ ...lot[j], ...quantifier(v) }); });
    process.stdout.write(`\r${Math.min(i + BATCH, blocs.length)}/${blocs.length} blocs plongés`);
  }
  process.stdout.write("\n");

  await mkdir(path.dirname(out), { recursive: true });
  const json = JSON.stringify({ v: 1, dim, docs, chunks });
  await writeFile(out, json);
  console.log(`${out} : ${docs.length} documents, ${chunks.length} blocs, ${(json.length / 1e6).toFixed(1)} Mo`);
}

main().catch((e) => { console.error(e); process.exit(1); });
