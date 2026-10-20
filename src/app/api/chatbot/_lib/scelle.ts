import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Un état scellé (AES-256-GCM) que le navigateur garde sans pouvoir le lire :
 * la reprise d'un formulaire d'élicitation porte le `contexte` rendu par core
 * et les clés des questions, qui ne doivent pas franchir le navigateur.
 * Sans état côté serveur : n'importe quelle instance peut rouvrir le jeton.
 *
 * Clé : `STUDIO_STATE_SECRET` (32 caractères au moins). En production, sans
 * lui, rien n'est scellé ni rouvert : le formulaire d'élicitation répond par
 * une erreur propre plutôt que de retomber sur une clé devinable. Sous
 * `next dev` seulement, la clé est dérivée de `LOCUS_API_KEY` pour essayer le
 * live sans configuration de plus.
 */

const TTL_MS = 30 * 60 * 1000;

const MIN_SECRET = 32;
let avertie = false;

function cle(): Buffer | null {
  const propre = process.env.STUDIO_STATE_SECRET?.trim();
  const dev = process.env.NODE_ENV === "development";
  const secret = propre && propre.length >= MIN_SECRET ? propre : dev ? process.env.LOCUS_API_KEY?.trim() : undefined;
  if (!secret) {
    if (!avertie) { avertie = true; console.error(`[chatbot] STUDIO_STATE_SECRET absent ou trop court (${MIN_SECRET} caractères au moins) : reprise d'élicitation désactivée`); }
    return null;
  }
  return createHash("sha256").update(`studio-chatbot-reprise:${secret}`).digest();
}

/** Vrai si un jeton peut être scellé ici (sinon, pas de formulaire d'élicitation). */
export const scellable = () => cle() !== null;

export function sceller(data: unknown): string | null {
  const k = cle();
  if (!k) return null;
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", k, iv);
  const body = Buffer.concat([c.update(JSON.stringify({ exp: Date.now() + TTL_MS, data }), "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), body]).toString("base64url");
}

export function ouvrir<T>(token: unknown): T | null {
  const k = cle();
  if (!k || typeof token !== "string" || token.length > 200_000) return null;
  try {
    const raw = Buffer.from(token, "base64url");
    if (raw.length < 29) return null;
    const d = createDecipheriv("aes-256-gcm", k, raw.subarray(0, 12));
    d.setAuthTag(raw.subarray(12, 28));
    const txt = Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString("utf8");
    const { exp, data } = JSON.parse(txt) as { exp: number; data: T };
    return exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}
