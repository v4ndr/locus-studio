import type { ComposeAction, ComposeKind } from "./contract";

/**
 * De la charge d'une action (ce que l'outil a reçu, ce que le formulaire
 * modifie) à sa ligne dans le plan : code, titre, sous-titre, destination,
 * champs. Partagé serveur / navigateur : le serveur s'en sert quand Claude
 * appelle un outil, le navigateur quand le médecin corrige une action en
 * place — le même rendu, forcément.
 */

export const RX_LABEL: Record<string, string> = { medicament: "Ordonnance", biologie: "Ordonnance de biologie", imagerie: "Demande d'imagerie", paramedical: "Ordonnance paramédicale", transport: "Prescription de transport", dispositif: "Dispositif médical" };
export const RX_CODE: Record<string, string> = { medicament: "Rx", biologie: "BIO", imagerie: "IMG", paramedical: "K", transport: "TR", dispositif: "DM" };
export const MSG_DEST: Record<string, string> = { patient: "patient · messagerie", confrere: "MSSanté", secretariat: "interne", pharmacie: "MSSanté · pharmacie" };
export const MSG_A: Record<string, string> = { patient: "patient", confrere: "confrère", secretariat: "secrétariat", pharmacie: "pharmacie" };
export const DOS_LABEL: Record<string, string> = { probleme: "Problème", traitement: "Traitement", mesure: "Mesure", allergie: "Allergie", note: "Note" };
export const CR_TYPE: Record<string, string> = { adressage: "Adressage", certificat: "Certificat", attestation: "Attestation", "reponse-confrere": "Réponse à un confrère", "courrier-patient": "Courrier au patient" };
export const SORTIES: Record<string, string> = { non: "non autorisées", oui: "autorisées 10h–12h, 16h–18h", libres: "libres" };
const MOIS = ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];
export function jourFr(iso: string) { const d = new Date(iso); return `${["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"][d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`; }
export function heureFr(iso: string) { return iso.slice(11, 16); }
const s = (v: unknown) => (typeof v === "string" ? v : v === undefined || v === null ? "" : String(v));
const n = (v: unknown, d: number) => (Number.isFinite(Number(v)) && v !== "" && v !== null && v !== undefined ? Number(v) : d);

export interface RxLigne { libelle: string; posologie?: string; duree?: string; renouvellement?: number; ald?: boolean }

/** Les charges, telles que les outils les reçoivent et que les formulaires les éditent. */
export type Charge =
  | { kind: "ordonnance"; type: string; lignes: RxLigne[]; justification?: string }
  | { kind: "rdv"; debut: string; duree_min: number; motif: string; justification?: string; dans_jours?: number; moment?: string }
  | { kind: "message"; a: string; nom?: string; objet: string; corps: string; justification?: string }
  | { kind: "courrier"; type: string; destinataire: string; specialite?: string; titre: string; corps: string; justification?: string }
  | { kind: "arret"; jours: number; sorties: string; temps_partiel?: boolean; prolongation?: boolean; motif: string; justification?: string }
  | { kind: "dossier"; type: string; libelle: string; detail?: string; justification?: string };

/** Lit une charge brute (JSON de l'outil) dans sa forme typée. */
export function chargeOf(kind: ComposeKind, raw: Record<string, unknown> | undefined): Charge | null {
  const c = raw ?? {};
  switch (kind) {
    case "ordonnance": return { kind, type: s(c.type) || "medicament", lignes: (Array.isArray(c.lignes) ? c.lignes : []).map((l: Record<string, unknown>) => ({ libelle: s(l.libelle), posologie: s(l.posologie) || undefined, duree: s(l.duree) || undefined, renouvellement: l.renouvellement ? n(l.renouvellement, 0) : undefined, ald: !!l.ald })), justification: s(c.justification) || undefined };
    case "rdv": return { kind, debut: s(c.debut), duree_min: n(c.duree_min, 20), motif: s(c.motif), justification: s(c.justification) || undefined, dans_jours: c.dans_jours ? n(c.dans_jours, 7) : undefined, moment: s(c.moment) || undefined };
    case "message": return { kind, a: s(c.a) || "patient", nom: s(c.nom) || undefined, objet: s(c.objet), corps: s(c.corps), justification: s(c.justification) || undefined };
    case "courrier": return { kind, type: s(c.type) || "adressage", destinataire: s(c.destinataire), specialite: s(c.specialite) || undefined, titre: s(c.titre), corps: s(c.corps), justification: s(c.justification) || undefined };
    case "arret": return { kind, jours: n(c.jours, 3), sorties: s(c.sorties) || "non", temps_partiel: !!c.temps_partiel, prolongation: !!c.prolongation, motif: s(c.motif), justification: s(c.justification) || undefined };
    case "dossier": return { kind, type: s(c.type) || "note", libelle: s(c.libelle), detail: s(c.detail) || undefined, justification: s(c.justification) || undefined };
    default: return null;
  }
}

/** La ligne du plan, depuis la charge. `prenomNom` : le patient, pour les sous-titres. */
export function materialize(charge: Charge, prenomNom: string, alerte?: string): Pick<ComposeAction, "kind" | "code" | "titre" | "ligne" | "destination" | "statut" | "fields" | "justification" | "charge"> {
  const { kind } = charge;
  const rest = { justification: charge.justification, charge: { ...charge } as unknown as Record<string, unknown> };
  switch (kind) {
    case "ordonnance": {
      const fields = charge.lignes.map((l) => ({ k: l.libelle, v: [l.posologie, l.duree, l.renouvellement ? `renouvelable ${l.renouvellement}×` : undefined, l.ald ? "ALD" : undefined].filter(Boolean).join(" · ") }));
      return { kind, code: RX_CODE[charge.type] ?? "Rx", titre: `${RX_LABEL[charge.type] ?? "Ordonnance"} · ${charge.lignes.map((l) => l.libelle).join(", ")}`, ligne: `${prenomNom} · ${charge.lignes.length} ligne${charge.lignes.length > 1 ? "s" : ""}${alerte ? ` · ⚠ allergie au dossier : ${alerte}` : ""}`, destination: "patient · e-ordo", statut: "relire", fields, ...rest };
    }
    case "rdv": {
      const quand = charge.debut ? `${jourFr(charge.debut)} · ${heureFr(charge.debut)}` : "à planifier";
      return { kind, code: "RV", titre: `${quand} · ${charge.duree_min} min`, ligne: `${charge.motif} · ${prenomNom} · SMS de confirmation`, destination: "agenda", statut: "pret", fields: [{ k: "Quand", v: quand }, { k: "Durée", v: `${charge.duree_min} min` }, { k: "Motif", v: charge.motif }], ...rest };
    }
    case "message": {
      const nom = charge.nom || (charge.a === "patient" ? prenomNom : MSG_A[charge.a] ?? charge.a);
      return { kind, code: "MSG", titre: `À ${nom} · ${charge.objet}`, ligne: charge.corps.slice(0, 110) + (charge.corps.length > 110 ? "…" : ""), destination: MSG_DEST[charge.a] ?? "messagerie", statut: "pret", fields: [{ k: "À", v: nom }, { k: "Objet", v: charge.objet }, { k: "Message", v: charge.corps }], ...rest };
    }
    case "courrier":
      return { kind, code: "CR", titre: charge.titre, ligne: `À ${charge.destinataire}${charge.specialite ? ` · ${charge.specialite}` : ""} · MSSanté`, destination: "MSSanté", statut: "relire", fields: [{ k: "Destinataire", v: `${charge.destinataire}${charge.specialite ? ` · ${charge.specialite}` : ""}` }, { k: "Corps", v: charge.corps }], ...rest };
    case "arret":
      return { kind, code: "AT", titre: `${charge.prolongation ? "Prolongation d'arrêt" : "Arrêt de travail"} · ${charge.jours} jour${charge.jours > 1 ? "s" : ""}`, ligne: `${prenomNom} · sorties ${SORTIES[charge.sorties] ?? charge.sorties}${charge.temps_partiel ? " · temps partiel" : ""}`, destination: "CPAM · télétransmis", statut: "relire", fields: [{ k: "Durée", v: `${charge.jours} jours` }, { k: "Sorties", v: SORTIES[charge.sorties] ?? charge.sorties }, { k: "Motif", v: charge.motif }], ...rest };
    case "dossier":
      return { kind, code: "DOS", titre: `${DOS_LABEL[charge.type] ?? "Dossier"} · ${charge.libelle}`, ligne: charge.detail || "inscrit au dossier et partagé au DMP", destination: "dossier · DMP", statut: "pret", fields: [{ k: "Libellé", v: charge.libelle }, ...(charge.detail ? [{ k: "Détail", v: charge.detail }] : [])], ...rest };
  }
}
