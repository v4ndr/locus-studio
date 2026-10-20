import { z } from "zod";
import { retrieveStream } from "@/locus/client.server";
import { compose } from "@/locus/compose/run";
import { donneesReelles, guardLive } from "@/lib/server/guard";
import type { PublicRetrieve } from "@/locus/contract";
import type { ComposeAction, PatientLocalPayload } from "@/locus/compose/contract";
import type { CarteAide } from "@/data/scribe/consultations";
import type { DecisionReponse } from "@/data/scribe/live";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Aide à la décision et actions de la consultation en direct, depuis le
 * compte rendu relu par le médecin :
 * - Locus (`retrieve`, `app_surface: "studio-scribe"`) avec le compte rendu
 *   en `patient_ehr`, sans orchestration ;
 * - les actions par le même composeur que le LGC natif IA (écran « note »),
 *   donc le même format (`materialize`) et le même garde-fou d'allergie.
 * Les deux en parallèle. Rien n'est stocké.
 */
const Input = z.object({
  note: z.string().trim().min(1).max(20_000),
  motif: z.string().trim().max(200).optional(),
}).strict();

const QUESTION = "Au vu de ce compte rendu de consultation de médecine générale, quelle conduite à tenir diagnostique et thérapeutique ? Signale toute contre-indication.";

const sansMd = (s: string) => s.replace(/\[[^\]]{1,80}\]/g, "").replace(/[*_#>`]/g, "").replace(/\s+/g, " ").trim();
const phrases = (s: string) => sansMd(s).split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter((x) => x.length > 3);
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const coupe = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).replace(/\s+\S*$/, "")}…` : s);

function carte(p: PublicRetrieve, alerte: string | undefined, titreDefaut: string): CarteAide | null {
  const court = phrases(p.answerShort || "");
  const long = p.answer.split(/\n+/).map(sansMd).filter((l) => l.length > 3);
  if (!court.length && !long.length) return null;
  const tete = court[0] ?? phrases(p.answer)[0] ?? titreDefaut;
  const vus = new Set<string>();
  const sources: string[] = [];
  for (const d of p.docs) {
    const lib = coupe([d.source_name, d.title].filter(Boolean).join(" · "), 56);
    if (lib && !vus.has(lib)) { vus.add(lib); sources.push(lib); }
    if (sources.length >= 4) break;
  }
  return {
    titre: coupe(tete, 220),
    detail: coupe(court.slice(1).join(" "), 420),
    alerte,
    sources,
    pourquoi: long.filter((l) => l !== tete).slice(0, 6).map((l) => coupe(l, 320)),
  };
}

/**
 * Le patient de la consultation en direct n'a pas de dossier : un patient
 * fictif local, avec ce que le compte rendu dit de son âge, de son sexe et
 * de ses allergies (le garde-fou d'allergie du composeur en dépend).
 */
const PATIENT_ID = "loc_scribe";
function patientFictif(note: string): PatientLocalPayload {
  const n = norm(note);
  const age = Number(/\b(\d{1,3})\s*ans\b/.exec(n)?.[1] ?? 45);
  const annee = new Date().getFullYear() - (age > 0 && age < 120 ? age : 45);
  const allergies = note.split(/\n+/).filter((l) => /allerg/i.test(l)).map((l) => l.replace(/^[^:]*allergi[^:]*:\s*/i, "").trim()).filter((l) => l && !/^(aucune?|pas d)/i.test(l)).slice(0, 5);
  return {
    id: PATIENT_ID, nomUsage: "Fictif", prenomUsuel: "Patient", naissance: `${annee}-01-01`,
    sexe: /\b(patiente|madame|mme|enceinte)\b/.test(n) ? "F" : "M",
    antecedents: [], allergies: allergies.map((a) => a.slice(0, 300)), traitements: [], notes: [],
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
  const { note, motif } = parsed.data;
  const reel = donneesReelles(`${note}\n${motif ?? ""}`);
  if (reel) return Response.json({ error: reel, code: "donnees_reelles" }, { status: 422 });

  const sim = g.replay ? { mode: "simulation" as const, url: "" } : undefined;
  const locus = (async () => {
    let fin: PublicRetrieve | null = null;
    for await (const ev of retrieveStream({ query: QUESTION, patient_ehr: note, orchestrate: false, mode: "rapide", app_surface: "studio-scribe" }, sim)) {
      if (ev.step === "done") fin = ev.payload;
    }
    return fin;
  })();
  const plan = (async () => {
    let actions: ComposeAction[] = [];
    for await (const ev of compose({ texte: "", ecran: "note", note, motif, patientId: PATIENT_ID, patient: patientFictif(note) }, { replay: g.replay })) {
      if (ev.step === "done") actions = ev.plan.actions;
    }
    return actions;
  })();

  try {
    const [p, acts] = await Promise.all([locus, plan]);
    const retenues = acts.filter((a) => a.kind !== "naviguer");
    const alerte = retenues.map((a) => a.alerte).filter(Boolean).join(" ; ") || undefined;
    const c = p ? carte(p, alerte ? `Allergie : ${alerte}` : undefined, "Recommandation") : null;
    const lignes = retenues.map(ligne).slice(0, 12);
    if (c && p) {
      // « Retenir » fait remonter l'action dont un terme précis (molécule, examen) figure dans la recommandation.
      const rep = norm(p.answer);
      const i = lignes.findIndex((l) => norm(l).split(/[^a-z0-9-]+/).some((w) => w.length >= 7 && rep.includes(w)));
      if (i >= 0) c.action = i;
    }
    const body: DecisionReponse = { aide: c ? [c] : [], actions: lignes };
    return Response.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[scribe/decision]", e);
    return Response.json({ error: "L'aide à la décision n'a pas abouti. Réessayez." }, { status: 502 });
  }
}
