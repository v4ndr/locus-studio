import type { Dossier, Patient, Problem, Medication, Encounter, Appointment, LivingSummary, Screening, Measure, LabReport, ClinicalDocument, Prescription, Proposal, Briefing, Vaccination, Allergy, Message, LabFlag, DocumentType, ProposalAction, MeasureType } from "@/domain/types";
import { rec, P, journal, LOCUS, SYS } from "../build";
import { at, day } from "../clock";
import type { Rencontre, ActionDoc, Question } from "../rencontres";
import { SEEDS } from "./seeds";

/**
 * Les patients « secondaires » : décrits dans `seeds.ts` avec un format
 * riche (antécédents, documents avec texte, biologies, consultations,
 * propositions, briefing, dictée), dépliés ici en dossiers complets.
 * Même profondeur que les patients écrits à la main.
 */
export interface Seed {
  id: string; nom: string; prenom: string; nomNaissance?: string; sexe: "M" | "F"; naissance: string; lieu: string; hue: number;
  profession?: string; situation?: string; canal?: Patient["contact"]["canalPrefere"];
  ald?: { code: string; libelle: string };
  antecedents: { libelle: string; cim10?: string; chronique?: boolean; categorie?: Problem["categorie"]; depuis?: string; note?: string; apparente?: string }[];
  allergies?: { substance: string; reaction?: string; type?: Allergy["type"] }[];
  traitements: { dci: string; dosage?: string; posologie: string; renouveleIlYa: number; dureeJours: number; debut?: string; type?: Medication["type"]; prescripteur?: string }[];
  mesures?: { type: MeasureType; valeur: number; valeur2?: number; unite: string; ilYa: number }[];
  labs?: { ilYa: number; labo: string; resultats: { loinc?: string; libelle: string; valeur: number | string; unite?: string; refMin?: number; refMax?: number; flag: LabFlag }[]; lecture?: string; nonLu?: boolean; urgence?: "immediate" | "jour" | "semaine" | "aucune" }[];
  documents?: { ilYa: number; type: DocumentType; titre: string; auteur: string; canal?: ClinicalDocument["canal"]; texte: string; lecture?: string; nonLu?: boolean; urgence?: "immediate" | "jour" | "semaine" | "aucune" }[];
  consultations: { ilYa: number; motif: string; histoire?: string; examen?: string; conclusion: string; conduite: string; codes?: string[]; type?: Encounter["type"] }[];
  prescriptions?: { ilYa: number; type: Prescription["type"]; lignes: { libelle: string; posologie?: string; duree?: string }[] }[];
  depistages?: { programme: Screening["programme"]; etat: Screening["etat"]; dernierIlYa?: number }[];
  vaccins?: { valences: string[]; date: string; rappel?: string; nom?: string }[];
  rdv?: { heure: string; duree: number; motif: string; type?: Appointment["type"] };
  briefing: { synthese: string; echeances: string[]; questions: string[]; depuis?: string[] };
  proposals: { action: ProposalAction; titre: string; justification: string; charge?: Proposal["charge"]; autonomie?: 0 | 1 | 2 }[];
  rencontre?: { paragraphes: Rencontre["paragraphes"]; actions: ActionDoc[]; question?: Question; synthese: string; codes: string[] };
  messages?: { de: { type: Message["de"]["type"]; nom: string }; canal?: Message["canal"]; heure: string; ilYa?: number; objet: string; corps: string; triage?: Message["triage"]; /** La réponse que Locus a préparée, à signer. */ reponse?: string }[];
  resume: string;
}

export const RENCONTRES_SECONDAIRES: Record<string, Rencontre> = {};

function build(s: Seed): Dossier {
  const id = s.id;
  const matricule = `${s.sexe === "M" ? 1 : 2} ${s.naissance.slice(2, 4)} ${s.naissance.slice(5, 7)} ${s.lieu.slice(0, 2)} ${s.lieu.slice(2)} ${String(100 + (id.length * 37) % 900)} ${String(10 + (id.length * 13) % 89)}`;
  const last = s.consultations[0]?.ilYa ?? 100;
  const patient = rec("patient", id, P.systeme("insi"), {
    ins: { matricule, oid: "1.2.250.1.213.1.4.8", nomNaissance: (s.nomNaissance ?? s.nom).toUpperCase(), prenoms: s.prenom.toUpperCase(), sexe: s.sexe, dateNaissance: s.naissance, lieuNaissance: s.lieu, statut: "qualifiee", verifieeLe: day(-last) },
    nomUsage: s.nom, prenomUsuel: s.prenom, photoHue: s.hue,
    contact: { telephone: "06 00 00 00 00", canalPrefere: s.canal ?? "messagerie" },
    couverture: { regime: "general", ald: s.ald ? [{ ...s.ald, depuis: day(-800) }] : undefined, medecinTraitant: { rpps: "10003456789", nom: "Dr Romain Vandepitterie", declareLe: day(-1500) }, droitsVerifiesLe: day(-last) },
    vie: { profession: s.profession, situation: s.situation },
    consentement: { monEspaceSante: true, dmpAlimentation: true, messagerieAgent: "logistique" },
  }, { id, at: at("10:00", -1500) });

  const problems = s.antecedents.map((a) => rec("problem", id, P.medecin(day(-last)), { libelle: a.libelle, categorie: a.categorie ?? (a.apparente ? "familial" : "medical"), cim10: a.cim10, depuis: a.depuis, evolution: a.chronique ? "chronique" : "antecedent", enAvant: true, note: a.note, apparente: a.apparente }, { at: at("10:00", -last - 300) }));
  const allergies = (s.allergies ?? []).map((a) => rec("allergy", id, P.medecin(day(-last)), { substance: a.substance, type: a.type ?? "medicamenteuse", reaction: a.reaction, severite: "moderee", certitude: "confirmee" }, { at: at("10:00", -last - 300) }));
  const meds = s.traitements.map((m) => rec("medication", id, P.medecin(day(-m.renouveleIlYa)), { dci: m.dci, dosage: m.dosage, posologie: m.posologie, type: m.type ?? "chronique", debut: m.debut, dernierRenouvellement: day(-m.renouveleIlYa), dureeRenouvellementJours: m.dureeJours, ald: !!s.ald, prescripteur: m.prescripteur }, { at: at("10:00", -m.renouveleIlYa) }));
  const measures = (s.mesures ?? []).map((m) => rec("measure", id, P.medecin(day(-m.ilYa)), { type: m.type, valeur: m.valeur, valeur2: m.valeur2, unite: m.unite, date: day(-m.ilYa), contexte: "cabinet" }, { at: at("10:00", -m.ilYa) }));
  const labs = (s.labs ?? []).map((l) => rec("lab", id, P.import("hprim"), { laboratoire: l.labo, prelevementLe: day(-l.ilYa), recuLe: at("09:00", -l.ilYa + 1), vuLe: l.nonLu ? undefined : at("10:00", -l.ilYa + 2), resultats: l.resultats, lecture: l.lecture ? { resume: l.lecture, faitsExtraits: [], pointsAttention: [], urgence: l.urgence ?? (l.nonLu && l.resultats.some((r) => r.flag === "critique") ? "jour" : l.nonLu && l.resultats.some((r) => r.flag !== "normal") ? "semaine" : "aucune"), confidence: 0.93 } : undefined }, { at: at("09:00", -l.ilYa + 1) }));
  const docs = (s.documents ?? []).map((d) => rec("document", id, P.import(d.canal ?? "mssante"), { type: d.type, titre: d.titre, auteur: d.auteur, dateDocument: day(-d.ilYa), recuLe: at("16:00", -d.ilYa), canal: d.canal ?? "mssante", format: "pdf", texte: d.texte, vuLe: d.nonLu ? undefined : at("10:00", -d.ilYa + 1), lecture: d.lecture ? { resume: d.lecture, faitsExtraits: [], pointsAttention: [], urgence: d.urgence ?? (d.nonLu && !/\b(normal|normale|sans anomalie|rassurant|pas de|rien)\b/i.test(d.lecture) ? "semaine" : "aucune"), confidence: 0.92 } : undefined }, { at: at("16:00", -d.ilYa) }));
  const encs = s.consultations.map((c) => rec("encounter", id, P.medecin(day(-c.ilYa)), { type: c.type ?? "cabinet", date: at("10:00", -c.ilYa), dureeMin: 18, praticien: "pr_laurent", note: { motifs: [c.motif], histoire: c.histoire, examen: c.examen, conclusion: c.conclusion, conduite: c.conduite }, codes: (c.codes ?? []).map((x) => ({ systeme: "drc" as const, code: x.toUpperCase(), libelle: x })), actes: [{ code: "G", libelle: "Consultation", montant: 30 }], facturation: { mode: "fse", tiersPayant: s.ald ? "amo" : "aucun", transmiseLe: at("10:20", -c.ilYa) } }, { at: at("10:00", -c.ilYa) }));
  const rx = (s.prescriptions ?? []).map((p) => rec("prescription", id, P.medecin(day(-p.ilYa)), { type: p.type, date: day(-p.ilYa), lignes: p.lignes, signature: { par: "pr_laurent", le: at("10:15", -p.ilYa) }, ordonnanceNumerique: { id: `ON-${id.slice(4, 8).toUpperCase()}-${String(p.ilYa).padStart(4, "0")}-AB12-CD34`, transmiseLe: at("10:15", -p.ilYa) } }, { at: at("10:15", -p.ilYa) }));
  const screenings = (s.depistages ?? []).map((d) => rec("screening", id, P.systeme("depistage"), { programme: d.programme, libelle: { colorectal: "Dépistage colorectal", sein: "Mammographie", "col-uterus": "Col · HPV", autre: "Autre" }[d.programme], etat: d.etat, dernierLe: d.dernierIlYa ? day(-d.dernierIlYa) : undefined }));
  const vaccins = (s.vaccins ?? []).map((v) => rec("vaccination", id, P.medecin(v.date), { valences: v.valences, nomCommercial: v.nom, date: v.date, rappelPrevu: v.rappel }, { at: `${v.date}T10:00:00+02:00` }));
  const appt = s.rdv ? rec("appointment", id, P.systeme("agenda"), { debut: at(s.rdv.heure), dureeMin: s.rdv.duree, type: s.rdv.type ?? "cabinet", motif: s.rdv.motif, praticien: "pr_laurent", etat: "prevu", prisPar: "patient", preparationId: `${id}.briefing.1` }, { at: at("10:00", -7) }) : undefined;
  const proposals = s.proposals.map((p, i) => rec("proposal", id, P.agent(0.9), { action: p.action, titre: p.titre, justification: p.justification, charge: p.charge, declencheur: { type: "praticien", libelle: "Préparé avant la rencontre" }, autonomie: p.autonomie ?? (p.action === "signaler" ? 0 : 1), etat: "a-valider", agent: "locus" }, { status: "propose", at: at(`07:${String(30 + i).padStart(2, "0")}`) }));
  const briefing = rec("briefing", id, P.agent(0.9), { appointmentId: appt?.id ?? "", synthese: s.briefing.synthese, depuisDerniereFois: s.briefing.depuis ?? [], echeances: s.briefing.echeances.map((e) => ({ libelle: e })), questions: s.briefing.questions, propositionsIds: proposals.map((p) => p.id) }, { id: `${id}.briefing.1`, status: "propose", at: at("07:45") });
  const summary = rec("summary", id, P.agentValide(0.9, day(-last)), { enUneLigne: s.resume, synthese: s.resume, enCeMoment: s.briefing.echeances.slice(0, 3), derniereValidation: day(-last) }, { at: at("10:00", -last) });
  const msgs = (s.messages ?? []).flatMap((m, i) => {
    const date = at(m.heure, -(m.ilYa ?? 0));
    const threadId = `th_${id}_${i}`;
    // La réponse préparée par Locus : un message de l'agent dans le même fil, proposé, que le triage désigne.
    const rep = m.reponse ? rec("message", id, P.agent(0.9), { canal: m.canal ?? (m.de.type === "patient" ? "patient" : m.de.type === "confrere" ? "mssante" : "interne"), threadId, de: { type: "agent", nom: "Locus, pour le Dr Vandepitterie" }, a: [{ type: (m.de.type === "patient" || m.de.type === "confrere" || m.de.type === "secretariat" ? m.de.type : "praticien") as "patient" | "confrere" | "secretariat" | "praticien", nom: m.de.nom }], date: at("07:50"), objet: `Re: ${m.objet}`, corps: m.reponse }, { status: "propose", at: at("07:50") }) : undefined;
    const msg = rec("message", id, m.de.type === "patient" ? P.patient() : P.import(m.canal ?? "mssante"), { canal: m.canal ?? (m.de.type === "patient" ? "patient" : m.de.type === "confrere" ? "mssante" : "interne"), threadId, de: { type: m.de.type, nom: m.de.nom }, a: [{ type: "praticien", nom: "Dr Vandepitterie" }], date, objet: m.objet, corps: m.corps, triage: m.triage ? { ...m.triage, reponseProposeeId: rep?.id } : undefined }, { at: date });
    return rep ? [msg, rep] : [msg];
  });

  if (s.rencontre) RENCONTRES_SECONDAIRES[id] = { patientId: id, motif: s.rdv?.motif ?? "Consultation", paragraphes: s.rencontre.paragraphes, actions: s.rencontre.actions, question: s.rencontre.question, synthese: s.rencontre.synthese, codes: s.rencontre.codes, acte: { code: "G", montant: 30, tiersPayant: !!s.ald } };

  return {
    patient,
    records: [...problems, ...allergies, ...meds, ...measures, ...labs, ...docs, ...encs, ...rx, ...screenings, ...vaccins, ...(appt ? [appt] : []), ...proposals, briefing, summary, ...msgs],
    journal: [
      ...docs.filter((d) => !d.vuLe).map((d) => journal(id, d.recuLe, SYS("MSSanté"), "document.receive", d.titre, d.id)),
      ...labs.filter((l) => !l.vuLe).map((l) => journal(id, l.recuLe, SYS("Serveur de résultats"), "lab.receive", `Biologie ${l.laboratoire}`, l.id)),
      journal(id, at("07:45"), LOCUS, "briefing.create", "Briefing préparé", briefing.id),
    ],
  };
}

export const dossiersSecondaires: Dossier[] = SEEDS.map(build);
