import type { ComposeAction, ComposeKind } from "./contract";

/**
 * De la charge d'une action (ce que l'outil a reçu, ce que le formulaire
 * modifie) à sa ligne dans le plan : code, titre, sous-titre, destination,
 * champs. Partagé serveur / navigateur : le serveur s'en sert quand le modèle
 * appelle un outil, le navigateur quand le médecin corrige une action en
 * place — le même rendu, forcément.
 */

export const RX_LABEL: Record<string, string> = { medicament: "Ordonnance", biologie: "Ordonnance de biologie", imagerie: "Demande d'imagerie", paramedical: "Ordonnance paramédicale", transport: "Prescription de transport", dispositif: "Dispositif médical" };
export const RX_CODE: Record<string, string> = { medicament: "Rx", biologie: "BIO", imagerie: "IMG", paramedical: "K", transport: "TR", dispositif: "DM" };
export const MSG_DEST: Record<string, string> = { patient: "patient · messagerie", confrere: "MSSanté", secretariat: "interne", pharmacie: "MSSanté · pharmacie" };
export const MSG_A: Record<string, string> = { patient: "patient", confrere: "confrère", secretariat: "secrétariat", pharmacie: "pharmacie" };
export const DOS_LABEL: Record<string, string> = { antecedent: "Antécédent", "antecedent-familial": "Antécédent familial", allergie: "Allergie", traitement: "Traitement de fond" };
export const CR_TYPE: Record<string, string> = { adressage: "Adressage", certificat: "Certificat", attestation: "Attestation", "reponse-confrere": "Réponse à un confrère", "courrier-patient": "Courrier au patient" };
export const SORTIES: Record<string, string> = { non: "non autorisées", oui: "autorisées · présence obligatoire 9 h-11 h et 14 h-16 h", libres: "libres" };
const MOIS = ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];
const JOURS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
/** « Jeu 5 nov », en heure de Paris quel que soit le fuseau de l'hôte (le serveur tourne en UTC). */
export function jourFr(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "short", day: "numeric", month: "numeric" }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wd = JOURS[["dim", "lun", "mar", "mer", "jeu", "ven", "sam"].indexOf(get("weekday").slice(0, 3).toLowerCase())] ?? "";
  return `${wd} ${Number(get("day"))} ${MOIS[Number(get("month")) - 1] ?? ""}`;
}
export function heureFr(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso.slice(11, 16);
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hour12: false }).format(d).replace(/^24/, "00");
}
/** Le décalage de Paris à une date donnée (+02:00 l'été, +01:00 l'hiver), pour écrire un ISO local sans se tromper. */
export function offsetParis(ymd: string): string {
  const probe = new Date(`${ymd}T12:00:00Z`);
  const v = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", timeZoneName: "longOffset" }).formatToParts(probe).find((p) => p.type === "timeZoneName")?.value ?? "UTC+01:00";
  const m = /([+-])(\d{2}):?(\d{2})?/.exec(v);
  return m ? `${m[1]}${m[2]}:${m[3] ?? "00"}` : "+01:00";
}
/** Un instant « AAAA-MM-JJ à HH:MM, heure de Paris » en ISO. */
export function isoParis(ymd: string, hhmm: string): string { return `${ymd}T${hhmm}:00${offsetParis(ymd)}`; }

const normA = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
/** Les classes qu'un garde-fou sans ambition de LAP doit connaître : une allergie « pénicillines » croise « amoxicilline ». */
const CLASSES: Record<string, RegExp> = {
  penicilline: /p[ée]?nicillin|amoxicillin|ampicillin|augmentin|clamoxyl|oxacillin|cloxacillin|pivmecillinam|b[ée]ta-?lactamin/,
  cephalosporine: /c[ée]ph|cefixim|cefpodoxim|ceftriaxon|cefuroxim|oroken|orelox/,
  ains: /\bains\b|anti-?inflammatoire|ibuprof|k[ée]toprof|diclof|naprox|flurbiprof|c[ée]l[ée]coxib|[ée]toricoxib|piroxicam|m[ée]loxicam|advil|nurofen|voltaren|bi-?profenid|profenid/,
  aspirine: /aspirin|acide ac[ée]tylsalicyl|kardegic|aspegic/,
  sulfamide: /sulfam|cotrimox|bactrim|sulfam[ée]thoxazol/,
  macrolide: /macrolid|azithromycin|clarithromycin|[ée]rythromycin|spiramycin|josamycin|pyostacin|pristinamycin/,
  quinolone: /quinolon|ofloxacin|ciprofloxacin|l[ée]vofloxacin|norfloxacin/,
  codeine: /cod[ée]in|codoliprane|dafalgan cod/,
  morphinique: /morphin|tramadol|oxycodon|opio[iï]d|opiac/,
  iode: /\biod[ée]?\b|produit de contraste|iod[ée]e?s?\b/,
  latex: /latex/,
  curare: /curare/,
  oeuf: /\boeuf|\b[œ]uf/,
};
function classeDe(x: string): string | undefined { const n = normA(x); return Object.keys(CLASSES).find((k) => CLASSES[k].test(n)); }
/**
 * Les lignes d'ordonnance qui croisent une allergie du dossier : par classe
 * (pénicillines ↔ amoxicilline, AINS ↔ ibuprofène) ou par nom. Toutes, pas
 * seulement la première. Même code côté serveur et dans le panneau d'édition.
 */
export function alerteAllergie(lignes: { libelle: string }[], allergies: string[] | undefined): string | undefined {
  if (!allergies?.length) return undefined;
  const hits: string[] = [];
  for (const l of lignes) {
    const lib = normA(l.libelle); if (!lib.trim()) continue;
    const cl = classeDe(lib);
    for (const a of allergies) {
      const an = normA(a); const mot = an.split(/[ (,;:·]/)[0];
      const ca = classeDe(an);
      const parNom = mot.length >= 4 && lib.includes(mot);
      const parClasse = !!cl && cl === ca;
      if (parNom || parClasse) { hits.push(`${l.libelle.trim()} ↔ ${a.trim()}`); break; }
    }
  }
  return hits.length ? hits.join(" ; ") : undefined;
}
const s = (v: unknown) => (typeof v === "string" ? v : v === undefined || v === null ? "" : String(v));
const n = (v: unknown, d: number) => (Number.isFinite(Number(v)) && v !== "" && v !== null && v !== undefined ? Number(v) : d);

export interface RxLigne { libelle: string; posologie?: string; duree?: string; renouvellement?: number; ald?: boolean }

/** Les charges, telles que les outils les reçoivent et que les formulaires les éditent. */
export type Charge =
  | { kind: "ordonnance"; type: string; lignes: RxLigne[]; justification?: string; alerte?: string; /** Examens et actes : le renseignement clinique. */ indication?: string }
  | { kind: "rdv"; debut: string; duree_min: number; motif: string; justification?: string; dans_jours?: number; moment?: string }
  | { kind: "message"; a: string; nom?: string; objet: string; corps: string; justification?: string }
  | { kind: "courrier"; type: string; destinataire: string; specialite?: string; titre: string; corps: string; justification?: string }
  | { kind: "arret"; jours: number; sorties: string; temps_partiel?: boolean; prolongation?: boolean; motif: string; justification?: string }
  | { kind: "dossier"; type: string; libelle: string; detail?: string; justification?: string };

/** Lit une charge brute (JSON de l'outil) dans sa forme typée. */
export function chargeOf(kind: ComposeKind, raw: Record<string, unknown> | undefined): Charge | null {
  const c = raw ?? {};
  switch (kind) {
    case "ordonnance": return { kind, type: s(c.type) || "medicament", lignes: (Array.isArray(c.lignes) ? c.lignes : []).filter((l) => l && typeof l === "object").map((l: Record<string, unknown>) => ({ libelle: s(l.libelle), posologie: s(l.posologie) || undefined, duree: s(l.duree) || undefined, renouvellement: l.renouvellement ? n(l.renouvellement, 0) : undefined, ald: !!l.ald })), justification: s(c.justification) || undefined, alerte: s(c.alerte) || undefined, indication: s(c.indication) || undefined };
    case "rdv": return { kind, debut: s(c.debut), duree_min: n(c.duree_min, 20), motif: s(c.motif), justification: s(c.justification) || undefined, dans_jours: c.dans_jours ? n(c.dans_jours, 7) : undefined, moment: s(c.moment) || undefined };
    case "message": return { kind, a: s(c.a) || "patient", nom: s(c.nom) || undefined, objet: s(c.objet), corps: s(c.corps), justification: s(c.justification) || undefined };
    case "courrier": return { kind, type: s(c.type) || "adressage", destinataire: s(c.destinataire), specialite: s(c.specialite) || undefined, titre: s(c.titre), corps: s(c.corps), justification: s(c.justification) || undefined };
    case "arret": return { kind, jours: Math.max(1, Math.round(n(c.jours, 3))), sorties: ["non", "oui", "libres"].includes(s(c.sorties)) ? s(c.sorties) : "oui", temps_partiel: !!c.temps_partiel, prolongation: !!c.prolongation, motif: s(c.motif), justification: s(c.justification) || undefined };
    case "dossier": return { kind, type: s(c.type) || "antecedent", libelle: s(c.libelle), detail: s(c.detail) || undefined, justification: s(c.justification) || undefined };
    default: return null;
  }
}

/** La ligne du plan, depuis la charge. `prenomNom` : le patient, pour les sous-titres. */
export function materialize(charge: Charge, prenomNom: string, alerteParam?: string): Pick<ComposeAction, "kind" | "code" | "titre" | "ligne" | "destination" | "statut" | "fields" | "justification" | "charge" | "alerte"> {
  const { kind } = charge;
  const alerte = kind === "ordonnance" ? alerteParam ?? charge.alerte : undefined;
  const rest = { justification: charge.justification, charge: { ...charge, ...(kind === "ordonnance" ? { alerte } : {}) } as unknown as Record<string, unknown> };
  switch (kind) {
    case "ordonnance": {
      const lignes = charge.lignes.filter((l) => l.libelle.trim());
      const med = charge.type === "medicament";
      const fields = [...lignes.map((l) => ({ k: l.libelle, v: med ? [l.posologie, l.duree, l.renouvellement ? `à renouveler ${l.renouvellement} fois` : undefined, l.ald ? "ALD" : undefined].filter(Boolean).join(" · ") : l.ald ? "ALD" : "" })), ...(charge.indication ? [{ k: "Indication", v: charge.indication }] : [])];
      return { kind, code: RX_CODE[charge.type] ?? "Rx", titre: `${RX_LABEL[charge.type] ?? "Ordonnance"} · ${lignes.map((l) => l.libelle).join(", ") || "sans ligne"}`, ligne: `${prenomNom} · ${lignes.length} ligne${lignes.length > 1 ? "s" : ""}`, destination: "patient · e-ordo", statut: "relire", fields, alerte, ...rest };
    }
    case "rdv": {
      const quand = charge.debut ? `${jourFr(charge.debut)} · ${heureFr(charge.debut)}` : "à planifier";
      return { kind, code: "RV", titre: `${quand} · ${charge.duree_min} min`, ligne: `${charge.motif} · ${prenomNom} · SMS de confirmation`, destination: "agenda", statut: "pret", fields: [{ k: "Quand", v: quand }, { k: "Durée", v: `${charge.duree_min} min` }, { k: "Motif", v: charge.motif }], ...rest };
    }
    case "message": {
      const nom = charge.nom || (charge.a === "patient" ? prenomNom : MSG_A[charge.a] ?? charge.a);
      return { kind, code: "MSG", titre: `À ${nom} · ${charge.objet}`, ligne: charge.corps.slice(0, 110) + (charge.corps.length > 110 ? "…" : ""), destination: MSG_DEST[charge.a] ?? "messagerie", statut: "pret", fields: [{ k: "À", v: nom }, { k: "Objet", v: charge.objet }, { k: "Message", v: charge.corps }], ...rest };
    }
    case "courrier": {
      // Un certificat ou une attestation est remis au patient ; un adressage ou une réponse part par MSSanté.
      const remis = ["certificat", "attestation", "courrier-patient"].includes(charge.type);
      return { kind, code: "CR", titre: charge.titre, ligne: `À ${charge.destinataire}${charge.specialite && charge.specialite !== charge.destinataire && !charge.destinataire.includes(charge.specialite) ? ` · ${charge.specialite}` : ""} · ${remis ? "remis au patient" : "MSSanté"}`, destination: remis ? "patient · remis" : "MSSanté", statut: "relire", fields: [{ k: "Destinataire", v: `${charge.destinataire}${charge.specialite && !charge.destinataire.includes(charge.specialite) ? ` · ${charge.specialite}` : ""}` }, { k: "Corps", v: charge.corps }], ...rest };
    }
    case "arret":
      return { kind, code: "AT", titre: `${charge.prolongation ? "Prolongation d'arrêt" : "Arrêt de travail"} · ${charge.jours} jour${charge.jours > 1 ? "s" : ""}`, ligne: `${prenomNom} · sorties ${SORTIES[charge.sorties] ?? charge.sorties}${charge.temps_partiel ? " · temps partiel" : ""}`, destination: "CPAM · télétransmis", statut: "relire", fields: [{ k: "Durée", v: `${charge.jours} jours` }, { k: "Sorties", v: SORTIES[charge.sorties] ?? charge.sorties }, { k: "Motif", v: charge.motif }], ...rest };
    case "dossier":
      return { kind, code: "FI", titre: `Ajouter au dossier · ${charge.libelle}`, ligne: `${DOS_LABEL[charge.type] ?? "Fiche"}${charge.detail ? ` · ${charge.detail}` : ""}`, destination: "fiche", statut: "pret", fields: [{ k: "Rubrique", v: DOS_LABEL[charge.type] ?? charge.type }, { k: "Ligne", v: charge.libelle }, ...(charge.detail ? [{ k: "Détail", v: charge.detail }] : [])], ...rest };
  }
}
