import type { ChatSource, Confiance } from "./events";

/**
 * Les écarts à regarder entre les deux réponses, une fois les deux terminées.
 * Tout est calculé sur ce que les colonnes ont réellement reçu (texte, sources,
 * degré de confiance, précisions demandées, conditions) : un écart qui n'est
 * pas dans les réponses n'est pas affiché. Rien n'est inventé, rien n'est
 * tiré d'un scénario.
 */

export type EcartKey = "editeurs" | "medicament" | "instruments" | "confiance" | "precisions" | "conditions" | "renvois";

/** Combien d'affirmations, et combien sans renvoi vers une source. */
export interface Renvois { total: number; sans: number }

export type Ecart =
  | { k: "editeurs"; locus: string[]; rag: string[] }
  | { k: "medicament"; rcp: string[]; drug: string[]; rag: number }
  | { k: "instruments"; tree: string[]; score: string[]; rag: number }
  | { k: "confiance"; c: Confiance }
  | { k: "precisions"; n: number }
  | { k: "conditions"; items: string[] }
  | { k: "renvois"; locus: Renvois; rag: Renvois };

export interface ReponseLocus { text: string; sources: ChatSource[]; confidence?: Confiance; conditional: string[]; precisions: number }
export interface ReponseRag { text: string; sources: ChatSource[] }

const editeurs = (xs: ChatSource[]) => [...new Set(xs.map((s) => s.publisher?.trim()).filter((x): x is string => !!x))];
const deNature = (xs: ChatSource[], ...k: ChatSource["kind"][]) => [...new Set(xs.filter((s) => k.includes(s.kind)).map((s) => s.label))];

/**
 * Les affirmations d'une réponse markdown : chaque phrase d'un paragraphe ou
 * d'une puce, hors titres, tableaux et phrases d'introduction (« … : »).
 * Un renvoi posé après le point (« … courte. [1] ») revient à sa phrase.
 */
export function renvois(md: string): Renvois {
  const unites: string[] = [];
  for (const brut of md.replace(/\r/g, "").split("\n")) {
    const l = brut.trim();
    if (!l || /^#{1,6}\s/.test(l) || l.startsWith("|") || /^(?:-{3,}|\*{3,}|_{3,})$/.test(l)) continue;
    const corps = l.replace(/^(?:[-*+•]|\d+[.)])\s+/, "").replace(/^>\s*/, "");
    const phrases = corps.split(/(?<=[.!?…])\s+(?=[«"(A-ZÀ-ÖØ-Þ[])/);
    for (const p of phrases) {
      // Les renvois en tête de phrase appartiennent à la phrase d'avant.
      const tete = p.match(/^(?:\[\d+\]\s*)+/);
      if (tete && unites.length) { unites[unites.length - 1] += ` ${tete[0].trim()}`; }
      const reste = tete ? p.slice(tete[0].length) : p;
      if (reste.trim()) unites.push(reste.trim());
    }
  }
  const affirmations = unites.filter((u) => {
    const nu = u.replace(/\[\d+\]/g, "").replace(/[*_`]/g, "").trim();
    return nu.length >= 20 && !/:$/.test(nu);
  });
  return { total: affirmations.length, sans: affirmations.filter((u) => !/\[\d+\]/.test(u)).length };
}

/** Les écarts, dans l'ordre où ils se regardent : d'où vient la réponse, puis comment elle a été construite, puis ce qu'elle dit d'elle-même. */
export function ecarts(locus: ReponseLocus, rag: ReponseRag): Ecart[] {
  const out: Ecart[] = [];

  const eL = editeurs(locus.sources), eR = editeurs(rag.sources);
  if (eL.length > eR.length) out.push({ k: "editeurs", locus: eL, rag: eR });

  const rcp = deNature(locus.sources, "rcp"), drug = deNature(locus.sources, "drug");
  const ragMed = rag.sources.filter((s) => s.kind === "rcp" || s.kind === "drug").length;
  if (rcp.length + drug.length > ragMed) out.push({ k: "medicament", rcp, drug, rag: ragMed });

  const tree = deNature(locus.sources, "tree"), score = deNature(locus.sources, "score");
  const ragInst = rag.sources.filter((s) => s.kind === "tree" || s.kind === "score").length;
  if (tree.length + score.length > ragInst) out.push({ k: "instruments", tree, score, rag: ragInst });

  if (locus.precisions > 0) out.push({ k: "precisions", n: locus.precisions });
  if (locus.conditional.length) out.push({ k: "conditions", items: locus.conditional });
  if (locus.confidence) out.push({ k: "confiance", c: locus.confidence });

  // Seulement quand le RAG simple laisse plus d'affirmations sans source que Locus, en proportion.
  const rL = renvois(locus.text), rR = renvois(rag.text);
  const part = (r: Renvois) => (r.total ? r.sans / r.total : 0);
  if (rR.sans > 0 && part(rR) > part(rL)) out.push({ k: "renvois", locus: rL, rag: rR });

  return out;
}
