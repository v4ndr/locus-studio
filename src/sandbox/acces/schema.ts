import { z } from "zod";

/**
 * Le formulaire de demande d'accès, partagé entre le navigateur et le BFF
 * (`/api/acces/demande`). Les bornes suivent le contrat de core
 * `POST /v2/access-requests` : un champ hors bornes y reçoit un 422, autant
 * le refuser ici avec un message lisible.
 */

export const ORG_TYPES = ["editeur_logiciel", "plateforme_telesante", "etablissement", "assureur_mutuelle", "pharma_medtech", "institution", "autre"] as const;
export type OrgType = (typeof ORG_TYPES)[number];

export const COUNTRIES = ["FR", "BE", "CH", "CA", "LU", "GB", "DE", "US", "autre"] as const;
export type Country = (typeof COUNTRIES)[number];

/** Version du texte de consentement envoyée à core ; à changer avec le texte. */
export const CONSENT_VERSION = "studio-2026-10-20";

/** Messageries grand public : la maquette et la spec §2.1, plus quelques alias courants. */
const PERSO = /@(gmail|googlemail|yahoo|ymail|hotmail|outlook|live|msn|icloud|me|aol|gmx|proton|protonmail|orange|free|sfr|laposte|wanadoo)\./i;
export const emailPerso = (email: string) => PERSO.test(email.trim());

/** Un champ court : ni lien, ni chevron, ni caractère de contrôle (règle de core). */
// eslint-disable-next-line no-control-regex
const INTERDIT = /https?:\/\/|www\.|[<>]|[\u0000-\u001f\u007f]/i;
export const texteCourtValide = (v: string) => !INTERDIT.test(v);

const court = (max: number) => z.string().trim().min(1).max(max).refine(texteCourtValide);

export const DemandeSchema = z.object({
  email: z.string().trim().min(6).max(254).email().refine((v) => !emailPerso(v), { message: "perso" }),
  full_name: court(120),
  organisation: court(160),
  org_type: z.enum(ORG_TYPES),
  job_title: court(120),
  country: z.enum(COUNTRIES),
  // La note peut contenir des retours à la ligne ; ni chevrons ni autres caractères de contrôle.
  // eslint-disable-next-line no-control-regex
  note: z.string().trim().max(2000).refine((v) => !/[<>]|[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v)).optional(),
  consent: z.literal(true),
  locale: z.enum(["fr", "en"]).default("fr"),
}).strict();

export type Demande = z.infer<typeof DemandeSchema>;

/** Les codes d'erreur que le BFF renvoie au navigateur, traduits par `acces[lang].errors`. */
export type DemandeErreur = "invalid" | "perso" | "rate_limited" | "ip_limited" | "unavailable" | "not_configured";
export type DemandeReponse = { ok: true; simulated?: boolean } | { ok: false; code: DemandeErreur; field?: keyof Demande };
