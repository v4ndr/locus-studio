import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Ce que le médecin lit quand le modèle ne compose pas. Studio n'a pas de
 * repli à règles : une panne se dit, avec de quoi réessayer. Ni nom de
 * modèle ni fournisseur dans le message — « le modèle », c'est tout.
 */

export interface ErreurLive { status: number; code: string; message: string }

/** Vrai quand le serveur a de quoi appeler le modèle (ANTHROPIC_API_KEY). */
export const modeleConfigure = () => !!process.env.ANTHROPIC_API_KEY?.trim();

export const MODELE_ABSENT: ErreurLive = { status: 503, code: "modele_absent", message: "Le modèle n'est pas branché sur ce serveur : rien n'a été composé. Prévenez l'équipe Locus." };

export function erreurModele(e: unknown): ErreurLive {
  if (e instanceof Anthropic.APIConnectionError) return { status: 503, code: "modele_injoignable", message: "Le modèle est injoignable pour l'instant. Réessayez dans un moment." };
  if (e instanceof Anthropic.APIError) {
    if (e.status === 429) return { status: 429, code: "modele_quota", message: "Trop de demandes envoyées au modèle en ce moment. Réessayez dans une minute." };
    if (e.status === 401 || e.status === 403) return { status: 503, code: "modele_refuse", message: "Le modèle refuse la clé de ce serveur : rien n'a été composé. Prévenez l'équipe Locus." };
    if (e.status === 529 || (e.status ?? 0) >= 500) return { status: 503, code: "modele_surcharge", message: "Le modèle est surchargé ou en panne. Réessayez dans un moment." };
  }
  return { status: 502, code: "modele_erreur", message: "Le modèle n'a pas répondu correctement. Réessayez." };
}
