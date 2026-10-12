import type { Intent, Mesure } from "./types";

/**
 * Le composer comprend l'intention sans modèle : un patient, une action, une
 * question, une consigne. C'est volontairement déterministe — dans le
 * produit réel, cette fonction est un appel à Locus ; ici, elle doit être
 * prévisible pour que la démo le soit.
 */
export interface PatientRef { id: string; nom: string; prenom: string; nomUsage: string }

export function norm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[’']/g, "'").trim();
}

/** Trouve un patient nommé dans le texte (« @Delacroix », « Delacroix », « Mme Delacroix », « Inès »). */
export function findPatient(text: string, patients: PatientRef[]): PatientRef | undefined {
  const t = norm(text);
  const at = t.match(/@([a-z-]+)/);
  const candidates = at ? [at[1]] : t.split(/[^a-z-]+/).filter((w) => w.length >= 3);
  let best: PatientRef | undefined;
  for (const p of patients) {
    const nom = norm(p.nomUsage), prenom = norm(p.prenom);
    if (candidates.some((w) => w === nom || (w.length >= 4 && nom.startsWith(w)))) return p;
    if (!best && candidates.some((w) => w === prenom)) best = p;
  }
  return best;
}

const MESURES: [RegExp, Mesure][] = [
  [/\b(rein|reins|dfg|creatinin|renal)/, "dfg"],
  [/\b(tension|ta|pression|hta|automesure)/, "ta"],
  [/\b(diab|hba1c|glyc|sucre)/, "hba1c"],
  [/\b(poids|imc)/, "poids"],
  [/\b(ldl|cholest|lipid|statine)/, "ldl"],
];

const ROUTINES: [RegExp, string][] = [
  [/diab|hba1c/, "hba1c"],
  [/colorectal|colon|kit|fit\b/, "crc"],
  [/grippe|vaccin/, "grippe"],
  [/renouvel|ordonnances? (dues|a faire)/, "renouv"],
  [/mammo|sein/, "mammo"],
];

export function parseIntent(raw: string, patients: PatientRef[], ctx: { patientId?: string; objetOuvert?: boolean }): Intent {
  const text = raw.trim();
  const t = norm(text);
  if (!t) return { kind: "aide" };
  const named = findPatient(text, patients);
  const pid = named?.id ?? ctx.patientId;
  const need = (pour: string): Intent => (pid ? ({ kind: "besoin-patient", pour } as Intent) : { kind: "besoin-patient", pour });

  if (/^(aide|\?|help|que sais-tu faire|quoi faire)$/.test(t)) return { kind: "aide" };
  if (/^(stop|arrete|arrete sol|pause sol|stop sol)\b/.test(t)) return { kind: "stop" };
  if (/^(reprends|reprise|continue|repars)\b/.test(t)) return { kind: "reprends" };
  if (/^consigne\s*:/.test(t)) return { kind: "consigne", texte: text.replace(/^consigne\s*:\s*/i, "") };
  if (/^(mes |les )?consignes$/.test(t)) return { kind: "consignes" };
  if (/(qu'est-ce que|qu'a|ce que) (sol|locus|tu) (a |as )?fait|sessions|travail de sol|tes sessions|ce matin, locus/.test(t)) return { kind: "sessions" };
  if (/^(ma |la |mon )?(matinee|journee|matin|apres-midi|programme)\b/.test(t) || /^qu'est-ce qui m'attend/.test(t)) return { kind: "matinee" };

  if (/^(signe|valide|ok|oui|d'accord|go|envoie)\b/.test(t)) {
    const action = /ordonnance|renouvel|prescri/.test(t) ? "ordonnance" : /courrier|lettre|certificat|adressage/.test(t) ? "courrier" : /arret|aat/.test(t) ? "arret-travail" : /message|reponse/.test(t) ? "message-patient" : undefined;
    return { kind: "signer", patientId: pid, tout: /\b(tout|toutes|tous)\b/.test(t), action };
  }
  if (/^(rejette|refuse|non|annule|laisse tomber)\b/.test(t)) return { kind: "rejeter" };
  if (ctx.objetOuvert && /^(plutot|corrige|change|retire|enleve|ajoute|mets|remplace|passe a|sans )/.test(t)) return { kind: "corriger", texte: text };

  if (/\b(consultation|demarre|on commence|elle est la|il est la|en salle)\b/.test(t) && !/cloture/.test(t)) return pid ? { kind: "consultation", patientId: pid } : need("démarrer une consultation");
  if (/\b(cloture|clôture|termine la consult|on a fini|fin de consult)\b/.test(t)) return pid ? { kind: "cloture", patientId: pid } : need("clôturer");

  for (const [re, routineId] of ROUTINES) {
    if ((/\b(en retard|pas a jour|non a jour|qui n'ont pas|qui n'a pas|sans |mes |tous mes|toutes mes|patientele|liste)/.test(t) && re.test(t)) || /^(mes|tous mes|toutes mes) /.test(t) && re.test(t)) return { kind: "table", routineId };
  }

  if (/\b(ordonnance|renouvel|prescri)/.test(t)) return pid ? { kind: "objet", patientId: pid, action: "ordonnance" } : need("préparer une ordonnance");
  if (/\b(courrier|adresse[- ]le|adresse[- ]la|lettre|certificat|adressage)/.test(t)) return pid ? { kind: "objet", patientId: pid, action: "courrier" } : need("préparer un courrier");
  if (/\b(arret|aat)\b/.test(t)) return pid ? { kind: "objet", patientId: pid, action: "arret-travail" } : need("préparer un arrêt");
  if (/\b(repond|reponse|ecris[- ]lui|ecris a|message)/.test(t)) return pid ? { kind: "objet", patientId: pid, action: /confrere|dr |docteur|medecin du travail/.test(t) ? "message-confrere" : "message-patient" } : need("répondre");
  if (/^(appelle|relance|previens|demande au|demande a|prends? (un )?rdv|prends? rendez|programme|reserve)/.test(t)) return { kind: "tache", patientId: pid, texte: text };

  if (pid && /\b(ou en est|comment va|sa |son |ses |courbe|evolution|historique)\b/.test(t)) {
    for (const [re, mesure] of MESURES) if (re.test(t)) return { kind: "courbe", patientId: pid, mesure };
  }
  if (pid && !ctx.patientId && named && norm(text).replace(/@/g, "").split(/\s+/).length <= 3 && !/\?/.test(t)) return { kind: "patient", patientId: pid };
  if (named && /^(ouvre|montre|etat|dossier|qui est)\b/.test(t)) return { kind: "patient", patientId: named.id };
  if (pid && /^(ouvre|montre|etat|dossier|qui est)\b/.test(t)) return { kind: "patient", patientId: pid };
  if (pid && /\b(a signer|a trancher|qu'est-ce qui est pret|propositions)\b/.test(t)) return { kind: "objet", patientId: pid, action: "quelconque" };

  return { kind: "locus", patientId: pid, question: text.replace(/@[\w-]+\s*/g, "").trim() || text };
}
