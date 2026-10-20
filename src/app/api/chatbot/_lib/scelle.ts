import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Un état scellé (AES-256-GCM) que le navigateur garde sans pouvoir le lire :
 * la reprise d'un formulaire d'élicitation porte le `contexte` rendu par core
 * et les clés des questions, qui ne doivent pas franchir le navigateur.
 * Sans état côté serveur : n'importe quelle instance peut rouvrir le jeton.
 *
 * Clé : `STUDIO_STATE_SECRET`, sinon dérivée de `LOCUS_API_KEY` (déjà un
 * secret serveur, et sans clé il n'y a pas de live).
 */

const TTL_MS = 30 * 60 * 1000;

function cle(): Buffer | null {
  const secret = process.env.STUDIO_STATE_SECRET?.trim() || process.env.LOCUS_API_KEY?.trim();
  if (!secret) return null;
  return createHash("sha256").update(`studio-chatbot-reprise:${secret}`).digest();
}

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
    const d = createDecipheriv("aes-256-gcm", k, raw.subarray(0, 12));
    d.setAuthTag(raw.subarray(12, 28));
    const txt = Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString("utf8");
    const { exp, data } = JSON.parse(txt) as { exp: number; data: T };
    return exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}
