import { z } from "zod";
import { retrieveComplet } from "@/locus/client.server";
import { compose } from "@/locus/compose/run";
import { donneesReelles, guardLive } from "@/lib/server/guard";
import type { ComposeAction, PatientLocalPayload } from "@/locus/compose/contract";
import type { AideDecision, DecisionReponse } from "@/data/scribe/live";
import { publier, type Payload as Sources } from "@/app/api/chatbot/_lib/citations";
import { codeDe, erreur } from "../erreur";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Aide à la décision et actions, générées en direct à chaque appel depuis le
 * compte rendu relu par le médecin (dictée au micro ou enregistrée) :
 * - Locus (`retrieve`, `app_surface: "studio-scribe"`) : une vraie question
 *   clinique tirée du compte rendu (hypothèses, gravité, examens,
 *   traitement, suivi), le patient et le compte rendu en `patient_ehr`, sans
 *   orchestration. La réponse est rendue comme dans l'app B2Pro (portage du
 *   chatbot, `publier`) : Markdown entier, renvois renumérotés, sources
 *   citées, degré de confiance. Rien n'est résumé ni coupé ici ;
 * - les actions par le même composeur que le LGC natif IA (écran « note »),
 *   donc le même format (`materialize`) et le même garde-fou d'allergie.
 * Les deux en parallèle. Rien n'est stocké.
 *
 * Tout ou rien : si Locus ou le composeur échoue, la route renvoie une
 * erreur (503 injoignable, 502 échec), jamais une aide partielle ni un
 * contenu de repli. Un résultat simulé (core ou service de génération non
 * configuré) compte comme injoignable : il ne sort pas d'ici.
 */
const Input = z.object({
  note: z.string().trim().min(1).max(20_000),
  motif: z.string().trim().max(200).optional(),
  /** La ligne patient de la consultation enregistrée (« Mme …, 34 ans ») : seuls le sexe et l'âge en sont lus. */
  patient: z.string().trim().max(200).optional(),
}).strict();


/** L'erreur d'un flux (Locus ou composeur), déjà journalisée par son client. */
class EchecFlux extends Error {
  constructor(readonly code: "indisponible" | "echec") { super(code); }
}

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Le patient en clair : sexe et âge, lus dans la ligne patient puis, à défaut, dans le compte rendu. */
interface Profil { sexe: "F" | "M" | null; age: number | null; allergies: string[] }
function profil(note: string, patient?: string): Profil {
  const p = norm(patient ?? ""), n = norm(note);
  const sexe = /^(mme|madame)\b/.test(p) ? "F" : /^(m\.|monsieur)\s/.test(p) ? "M"
    : /\b(patiente|madame|mme|enceinte)\b/.test(n) ? "F" : /\b(patient|monsieur)\b/.test(n) ? "M" : null;
  const a = Number(/\b(\d{1,3})\s*ans\b/.exec(p)?.[1] ?? /\b(\d{1,3})\s*ans\b/.exec(n)?.[1] ?? NaN);
  // « allergie à la pénicilline », « allergique aux AINS », « Allergies : … » ; jamais « aucune allergie ».
  const allergies = [...new Set([...note.matchAll(/(?<!(?:pas d'|aucune |sans )\s?)allergi(?:e|que)s?\s*(?:connues?\s*)?(?::|à l'|à la|au|aux|à)\s*([^;,.()\n]{2,80})/gi)]
    .map((m) => m[1]!.trim()).filter((a) => !/^(aucune?|pas d|non|ras)\b/i.test(a)))].slice(0, 5);
  return { sexe, age: a > 0 && a < 120 ? a : null, allergies };
}
const quiEst = (x: Profil) => [x.sexe === "F" ? "femme" : x.sexe === "M" ? "homme" : "", x.age ? `${x.age} ans` : ""].filter(Boolean).join(", ");

/** La valeur d'une rubrique du compte rendu (« Conclusion : … »), s'il en a une. */
const rubrique = (note: string, re: RegExp) => note.split(/\n+/).map((l) => /^([^:]{2,40}):\s*(.+)$/.exec(l.trim())).find((m) => m && re.test(norm(m[1]!)))?.[2]?.trim();

/**
 * La question posée à Locus : celle que le médecin se pose en fin de
 * consultation, sur CE patient et CE compte rendu, et non une demande
 * générique. Le dossier (patient, compte rendu) part en `patient_ehr`.
 */
function question(note: string, motif: string | undefined, x: Profil): string {
  const conclusion = rubrique(note, /conclusion|diagnostic|hypothese|impression/);
  const chez = x.sexe ? `chez ${x.sexe === "F" ? "une femme" : "un homme"}${x.age ? ` de ${x.age} ans` : ""}` : x.age ? `chez un patient de ${x.age} ans` : "";
  const cible = [motif && `pour ${motif.toLowerCase()}`, chez].filter(Boolean).join(" ");
  return [
    `Consultation de médecine générale${cible ? ` ${cible}` : ""}${conclusion ? `. Conclusion du médecin : ${conclusion}` : ""}.`,
    "À partir du compte rendu joint, quelle conduite à tenir ? Précise :",
    "1. les hypothèses diagnostiques à retenir et celles à éliminer ;",
    "2. les signes de gravité à rechercher, qui changeraient la prise en charge ;",
    "3. les examens complémentaires utiles, ou leur absence d'indication ;",
    "4. le traitement recommandé (molécule, posologie, durée), compte tenu des allergies, contre-indications et interactions ;",
    "5. le suivi : réévaluation, critères pour reconsulter.",
    "Signale tout écart entre la conduite à tenir du compte rendu et les recommandations.",
  ].join("\n");
}

/** Le dossier envoyé à Locus : le patient, puis le compte rendu relu, tel quel. */
function dossier(note: string, x: Profil): string {
  const qui = quiEst(x);
  return [
    qui && `Patient : ${qui}.`,
    x.allergies.length ? `Allergies : ${x.allergies.join(", ")}.` : "",
    "Compte rendu de consultation (médecine générale), relu par le médecin :",
    note,
  ].filter(Boolean).join("\n");
}

/**
 * Le patient de la consultation en direct n'a pas de dossier : un patient
 * fictif local, avec ce que le compte rendu dit de son âge, de son sexe et
 * de ses allergies (le garde-fou d'allergie du composeur en dépend).
 */
const PATIENT_ID = "loc_scribe";
function patientFictif(x: Profil): PatientLocalPayload {
  const annee = new Date().getFullYear() - (x.age ?? 45);
  return {
    id: PATIENT_ID, nomUsage: "Fictif", prenomUsuel: "Patient", naissance: `${annee}-01-01`,
    sexe: x.sexe ?? "M",
    antecedents: [], allergies: x.allergies.map((a) => a.slice(0, 300)), traitements: [], notes: [],
  };
}

/** Une action composée → la ligne à valider : titre, puis le détail utile d'une ordonnance. */
function ligne(a: ComposeAction): string {
  if (a.kind === "ordonnance") {
    const det = a.fields.map((f) => (f.v ? `${f.k} : ${f.v}` : f.k)).join(" ; ");
    return det ? `${a.titre.split(" · ")[0]} : ${det}` : a.titre;
  }
  const brut = a.kind === "rdv" ? `Rendez-vous · ${a.titre} · ${a.ligne}` : a.kind === "message" ? `${a.titre} · ${a.ligne}` : a.titre;
  return brut.replace(/\s·\s(?:Patient Fictif|Fictif Patient)\b/g, "").replace(/\b(?:Patient Fictif|Fictif Patient)\b/g, "le patient");
}

export async function POST(req: Request) {
  const g = await guardLive(req);
  if (!g.ok) return g.response;
  let raw: unknown;
  try { raw = await req.json(); } catch { return Response.json({ error: "Corps illisible : JSON attendu." }, { status: 400 }); }
  const parsed = Input.safeParse(raw);
  if (!parsed.success) return Response.json({ error: "Compte rendu manquant ou trop long." }, { status: 400 });
  const { note, motif, patient } = parsed.data;
  const reel = donneesReelles(`${note}\n${motif ?? ""}\n${patient ?? ""}`);
  if (reel) return Response.json({ error: reel, code: "donnees_reelles" }, { status: 422 });
  const x = profil(note, patient);

  // Chaque branche lève à la première erreur de son flux : Promise.all rejette alors l'ensemble.
  const locus = (async () => {
    const fin = await retrieveComplet({ query: question(note, motif, x), patient_ehr: dossier(note, x), orchestrate: false, mode: "rapide", app_surface: "studio-scribe" });
    // Une réponse simulée (core non configuré) n'est pas une réponse de Locus.
    if (!fin) throw new EchecFlux("indisponible");
    return publier(fin as unknown as Sources);
  })();
  const plan = (async () => {
    let actions: ComposeAction[] | null = null;
    for await (const ev of compose({ texte: "", ecran: "note", note, motif, patientId: PATIENT_ID, patient: patientFictif(x) })) {
      if (ev.step === "error") throw new EchecFlux("echec");
      if (ev.step === "done") actions = ev.plan.actions;
    }
    if (!actions) throw new EchecFlux("echec");
    return actions;
  })();

  try {
    const [pub, acts] = await Promise.all([locus, plan]);
    const retenues = acts.filter((a) => a.kind !== "naviguer");
    const alerte = retenues.map((a) => a.alerte).filter(Boolean).join(" ; ") || undefined;
    const lignes = retenues.map(ligne).slice(0, 12);
    // Seules les sources que la réponse cite : le reste du pool a été retrouvé, pas utilisé.
    const aide: AideDecision | null = pub.markdown
      ? { markdown: pub.markdown, sources: pub.sources.filter((s) => s.cited), confidence: pub.confidence, alerte: alerte ? `Allergie : ${alerte}` : undefined }
      : null;
    // Une action est liée à la recommandation quand un terme précis (molécule, examen) y figure.
    const rep = norm(pub.markdown);
    const liees = aide ? lignes.flatMap((l, i) => (norm(l).split(/[^a-z0-9-]+/).some((w) => w.length >= 7 && rep.includes(w)) ? [i] : [])) : [];
    const body: DecisionReponse = { aide, actions: lignes, liees };
    return Response.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    // L'autre branche continue seule : on la laisse finir sans bruit.
    locus.catch(() => {}); plan.catch(() => {});
    if (e instanceof EchecFlux) return erreur(e.code);
    console.error("[scribe/decision]", e instanceof Error ? e.message : e);
    return erreur(codeDe(e));
  }
}
