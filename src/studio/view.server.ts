import { DOSSIERS, getDossier, recordsOf, summaryOf, displayName, todayAppointments, TODAY } from "@/data";
import { DR_LAURENT } from "@/data/cabinet";
import { RENCONTRES, type Rencontre, type ActionDoc } from "@/data/rencontres";
import { RENCONTRES_SECONDAIRES } from "@/data/patients/secondaires";
import { ageAt, toPatientEhr } from "@/locus/ehr";
import { now, day } from "@/data/clock";
import { fmtTime, fmtRelative, initials } from "@/lib/format";
import type { Dossier, Proposal, LabReport, ClinicalDocument, Prescription, SickLeave, Letter, Encounter } from "@/domain/types";
import type { HomeData, PatientRef, PatientView, Note, NoteAction, Fiche, Chip, DocRow, AgendaSlot, DocView, DocLine, InboxKind, InboxRow, InboxView, Urgence } from "./types";
import { norm } from "@/lib/norm";

const PRATICIEN = { initials: `${DR_LAURENT.prenom[0]}${DR_LAURENT.nom[0]}`, nom: `Dr ${DR_LAURENT.prenom} ${DR_LAURENT.nom}` };

function fr(iso: string) { const [y, m, d] = iso.slice(0, 10).split("-"); return `${d}/${m}/${y}`; }

function ref(d: Dossier): PatientRef {
  const p = d.patient;
  const rdv = recordsOf(d, "appointment").find((a) => a.debut.startsWith(TODAY));
  return { id: p.id, nom: displayName(p), prenom: p.prenomUsuel, nomUsage: p.nomUsage, initials: initials(p.prenomUsuel, p.nomUsage), hue: p.photoHue ?? 200, age: ageAt(p.ins.dateNaissance, now()), naissance: fr(p.ins.dateNaissance), sexe: p.ins.sexe, profession: p.vie?.profession?.split(",")[0].toLowerCase(), ins: p.ins.statut, rdv: rdv ? fmtTime(rdv.debut) : undefined };
}

export function homeData(): HomeData {
  const slots = todayAppointments();
  const agenda: AgendaSlot[] = slots.map(({ appointment, dossier }) => ({ patientId: dossier.patient.id, heure: fmtTime(appointment.debut), nom: displayName(dossier.patient), motif: appointment.motif, apresMidi: Number(fmtTime(appointment.debut).slice(0, 2)) >= 12 }));
  const next = agenda.find((a) => a.heure >= "10:30") ?? agenda[0];
  if (next) next.prochain = true;
  // Le premier vrai trou de la matinée (20 min libres entre deux rendez-vous, avant 12 h), s'il y en a un.
  const mins = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
  const matin = slots.filter((s) => mins(fmtTime(s.appointment.debut)) < 12 * 60);
  for (let i = 0; i < matin.length - 1; i++) {
    const fin = mins(fmtTime(matin[i].appointment.debut)) + (matin[i].appointment.dureeMin ?? 20);
    const suivant = mins(fmtTime(matin[i + 1].appointment.debut));
    if (suivant - fin >= 20) { const h = `${String(Math.floor(fin / 60)).padStart(2, "0")}:${String(fin % 60).padStart(2, "0")}`; agenda.splice(i + 1, 0, { patientId: "", heure: h, nom: "Créneau libre", motif: `${suivant - fin} min`, libre: true, apresMidi: false }); break; }
  }
  const c = inboxCounts();
  return { praticien: PRATICIEN, agenda, patients: DOSSIERS.map(ref), courriersNonLus: c.courriers, bioNonLues: c.bio, messagesNonLus: c.messages };
}

export function patientView(id: string): PatientView | undefined {
  const d = getDossier(id);
  if (!d) return undefined;
  const p = d.patient;
  const r = ref(d);
  const sum = summaryOf(d);
  const appt = recordsOf(d, "appointment").find((a) => a.debut.startsWith(TODAY));
  const briefing = appt?.preparationId ? recordsOf(d, "briefing").find((b) => b.id === appt.preparationId) : undefined;
  const proposals = recordsOf(d, "proposal").filter((x) => x.etat === "a-valider");
  const problems = recordsOf(d, "problem").filter((x) => x.status === "actif" || x.status === "propose");
  const allergies = recordsOf(d, "allergy");
  const meds = recordsOf(d, "medication").filter((m) => m.status === "actif");
  const docs = recordsOf(d, "document");
  const labs = recordsOf(d, "lab");
  const rx = recordsOf(d, "prescription");
  const sl = recordsOf(d, "sick-leave");
  const letters = recordsOf(d, "letter");
  const encs = recordsOf(d, "encounter");


  const yr = (iso?: string) => iso?.slice(0, 4);
  const antecedents: Fiche[] = problems.filter((x) => (x.categorie === "medical" && x.evolution !== "chronique") || x.categorie === "chirurgical" || x.categorie === "gyneco-obstetrical").map((x) => ({ k: x.libelle, v: yr(x.depuis) }));
  const fam = problems.filter((x) => x.categorie === "familial").map((x) => `${x.apparente ?? ""} : ${x.libelle.toLowerCase()}`).join(" · ");
  const chron = problems.filter((x) => x.evolution === "chronique" && x.categorie !== "mode-de-vie");
  for (const x of chron.filter((x) => !x.note)) antecedents.push({ k: x.libelle, v: yr(x.depuis) });
  const modeDeVie: Fiche[] = [];
  if (p.vie?.profession) modeDeVie.push({ k: "Métier", v: p.vie.profession });
  for (const x of problems.filter((x) => x.categorie === "mode-de-vie")) modeDeVie.push({ k: /tabac|fum/i.test(x.libelle) ? "Tabac" : /alcool/i.test(x.libelle) ? "Alcool" : "Activité", v: x.libelle });
  if (p.vie?.situation) modeDeVie.push({ k: "Famille", v: p.vie.situation });
  const traitements: Fiche[] = meds.map((m) => ({ k: `${cap(m.dci)}${m.dosage ? " " + m.dosage : ""} · ${m.posologie.replace(/^1 cp /, "1/")}`, v: m.debut ? `depuis ${yr(m.debut)}` : m.dernierRenouvellement ? m.dernierRenouvellement.slice(5, 7) + "/" + yr(m.dernierRenouvellement) : undefined }));
  const suivis: Fiche[] = chron.filter((x) => x.note).map((x) => ({ k: x.libelle, v: x.note }));
  const depistages: Fiche[] = [
    ...recordsOf(d, "screening").map((s) => ({ k: s.libelle.replace(/ \(.*\)/, ""), v: s.etat === "non-eligible" ? yr(s.prochainLe) : s.etat === "en-retard" ? "en retard" : s.etat === "a-proposer" ? "à proposer" : yr(s.dernierLe), muted: s.etat === "non-eligible" })),
    ...recordsOf(d, "vaccination").slice(0, 3).map((v) => ({ k: `${v.valences.join(" · ")}${v.rappelPrevu && v.rappelPrevu < TODAY ? " · rappel" : ""}`, v: v.rappelPrevu && v.rappelPrevu < TODAY ? "dû" : yr(v.date) })),
  ];

  const chips: Chip[] = [];
  const chipOf = (x: Proposal): Chip | null => {
    const c = x.charge as Record<string, unknown> | undefined;
    switch (x.action) {
      case "rdv": return { id: x.id, label: x.titre, tool: "agenda · créer", title: c && "debut" in c ? `${jourFr(String(c.debut))} · ${fmtTime(String(c.debut))} · ${c.dureeMin} min` : x.titre, body: x.justification, cta: "Réserver", proposal: x };
      case "message-patient": return { id: x.id, label: x.titre, tool: "messagerie · envoyer", title: `À ${p.prenomUsuel} ${p.nomUsage}${c && "objet" in c ? ` · ${c.objet}` : ""}`, body: c && "corps" in c ? String(c.corps) : x.justification, cta: "Envoyer", proposal: x };
      case "ordonnance": return { id: x.id, label: x.titre, tool: "ordonnance · rédiger", title: c && "lignes" in c ? (c.lignes as { libelle: string; duree?: string }[]).map((l) => `${cap(l.libelle.toLowerCase())}${l.duree ? ` · ${l.duree}` : ""}`).join(" · ") : x.titre, body: x.justification, cta: "Signer", proposal: x };
      case "courrier": return { id: x.id, label: x.titre, tool: "courrier · rédiger", title: c && "titre" in c ? String(c.titre) : x.titre, body: x.justification, cta: "Signer", proposal: x };
      case "arret-travail": return { id: x.id, label: x.titre, tool: "arrêt · AAT", title: x.titre, body: x.justification, cta: "Signer", proposal: x };
      default: return null;
    }
  };
  for (const x of proposals) { const c = chipOf(x); if (c) chips.push(c); }

  const rows: DocRow[] = [
    ...docs.map((x) => ({ id: x.id, date: fr(x.dateDocument), type: (x.type === "cr-imagerie" ? "Imagerie" : "Courrier") as DocRow["type"], titre: x.titre, de: x.auteur?.split(",")[0] ?? x.canal })),
    ...labs.map((x) => ({ id: x.id, date: fr(x.prelevementLe), type: "Biologie" as const, titre: x.resultats.map((r) => r.libelle).slice(0, 4).join(", ") + (x.resultats.length > 4 ? "…" : ""), de: "Laboratoire" })),
    ...rx.map((x) => ({ id: x.id, date: fr(x.date), type: "Ordonnance" as const, titre: x.lignes.map((l) => l.libelle).join(" · "), de: PRATICIEN.nom })),
    ...sl.map((x) => ({ id: x.id, date: fr(x.du), type: "Arrêt · certif" as const, titre: x.prolongation ? "Prolongation d'arrêt de travail" : "Arrêt de travail initial", de: PRATICIEN.nom })),
    ...letters.map((x) => ({ id: x.id, date: fr(x.date), type: "Courrier" as const, titre: x.titre, de: PRATICIEN.nom })),
    ...encs.map((x) => ({ id: x.id, date: fr(x.date), type: "Consultation" as const, titre: x.note.motifs.join(", "), de: PRATICIEN.nom })),
  ].sort((a, b) => b.date.split("/").reverse().join("").localeCompare(a.date.split("/").reverse().join("")));

  /* « À noter » : chaque ligne sait où elle mène. */
  const STOP = new Set(["rappel", "renouvellement", "renouveler", "bilan", "prise", "sang", "dans", "pour", "avec", "mail", "semaine", "semaines", "mois", "jours", "controle", "resultat", "resultats", "patient", "patiente", "demande", "compte", "rendu", "courrier", "avant", "apres", "depuis", "vers", "faire", "voir"]);
  const words = (t: string) => new Set(norm(t).split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !STOP.has(w)));
  const overlap = (a: string, b: string) => { const A = words(a), B = words(b); let n = 0; for (const w of A) if (B.has(w)) n++; return n; };
  const recent = rows.filter((r) => r.type === "Courrier" || r.type === "Imagerie" || r.type === "Biologie");
  const docHref = (docId: string) => `/p/${id}/documents/${docId}?from=dossier`;
  const sourceOf = (x: Proposal): NoteAction => {
    const rid = x.declencheur.recordId ?? x.provenance.derivedFrom?.find((r) => rows.some((row) => row.id === r));
    if (rid && rows.some((r) => r.id === rid)) return { type: "doc", href: docHref(rid) };
    const best = recent.map((r) => ({ r, n: overlap(`${x.titre} ${x.justification}`, `${r.titre} ${r.type}`) })).sort((a, b) => b.n - a.n)[0];
    if (best && best.n >= 1) return { type: "doc", href: docHref(best.r.id) };
    return { type: "ask", texte: x.titre };
  };
  const chipFor = (libelle: string): Chip | undefined => chips.map((c) => ({ c, n: overlap(libelle, `${c.label} ${c.title}`) })).filter((x) => x.n >= 1).sort((a, b) => b.n - a.n)[0]?.c;
  const aNoter: Note[] = [];
  for (const x of proposals.filter((x) => x.action === "signaler").slice(0, 2)) aNoter.push({ dot: "accent", texte: x.titre, tag: "nouveau", action: sourceOf(x) });
  for (const e of briefing?.echeances.slice(0, 2) ?? []) {
    const lib = e.libelle.replace(/ — .*$/, "");
    const c = chipFor(lib);
    aNoter.push({ dot: "warn", texte: lib, tag: "dû", action: c ? { type: "cmd", chipId: c.id } : /vaccin|rappel|dtp|dtca|grippe|covid|depist|mammo|hpv|frottis|fit|colorectal/i.test(lib) ? { type: "fiche", section: "depistages" } : { type: "ask", texte: `${lib} : que faut-il préparer ?` } });
  }
  for (const a of allergies.slice(0, 1)) aNoter.push({ dot: "gray", texte: `${a.substance}${a.reaction ? ` · ${a.reaction.toLowerCase()}` : ""}`, tag: "à savoir", action: { type: "fiche", section: "allergies" } });
  if (aNoter.length === 0 && sum?.enCeMoment[0]) aNoter.push({ dot: "gray", texte: sum.enCeMoment[0], tag: "à savoir", action: { type: "fiche", section: "suivis" } });

  const slots = todayAppointments();
  const i = slots.findIndex((s) => s.dossier.patient.id === id);
  const nxt = i >= 0 ? slots[i + 1] : undefined;

  return {
    ref: r,
    meta: `${r.age} a · ${p.ins.sexe}`,
    rdv: appt ? { heure: fmtTime(appt.debut), motif: appt.motif } : undefined,
    prose: briefing?.synthese ?? sum?.enUneLigne ?? "",
    aNoter,
    counts: { documents: rows.length, ordonnances: rx.length, biologie: labs.length, imagerie: docs.filter((x) => x.type === "cr-imagerie").length },
    dossier: { antecedents, familiaux: fam || undefined, allergies: allergies.length ? allergies.map((a) => ({ k: a.substance, v: a.reaction?.match(/\d{2}\/\d{4}/)?.[0] })) : [{ k: "Aucune allergie médicamenteuse connue" }], modeDeVie, traitements, suivis, depistages },
    chips,
    rencontre: RENCONTRES[id] ?? RENCONTRES_SECONDAIRES[id] ?? rencontreGenerique(d, proposals, appt?.motif),
    documents: rows,
    suivant: nxt ? { id: nxt.dossier.patient.id, nom: displayName(nxt.dossier.patient) } : undefined,
    ehr: toPatientEhr(d, now()),
  };
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
function jourFr(iso: string) { const d = new Date(iso); const j = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"][d.getDay()]; return `${j} ${d.getDate()} ${["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"][d.getMonth()]}`; }

/* ------------------------------------------------------------------ */
/* Un document ouvert                                                    */
/* ------------------------------------------------------------------ */

const DOC_TYPE: Record<string, string> = { "cr-imagerie": "Compte rendu d'imagerie", "cr-hospitalisation": "Compte rendu d'hospitalisation", "cr-specialiste": "Compte rendu de spécialiste", "cr-operatoire": "Compte rendu opératoire", "lettre": "Courrier", "certificat": "Certificat", "resultat": "Résultat", "autre": "Document" };
const RX_TYPE: Record<string, string> = { medicament: "Ordonnance", biologie: "Ordonnance de biologie", imagerie: "Ordonnance d'imagerie", paramedical: "Ordonnance paramédicale", transport: "Prescription de transport", dispositif: "Dispositif médical" };
const CANAL: Record<string, string> = { mssante: "MSSanté", dmp: "Mon espace santé · DMP", scan: "scan", patient: "apporté par le patient", papier: "papier", fax: "fax", hprim: "HPRIM" };

function lectureOf(l?: { resume: string; pointsAttention: string[]; urgence: "aucune" | "semaine" | "jour" | "immediate"; confidence: number }) {
  return l ? { resume: l.resume, points: l.pointsAttention, urgence: l.urgence, confidence: l.confidence } : undefined;
}

/** Le contenu d'un document du dossier, quel que soit son type d'enregistrement. */
export function documentView(id: string, docId: string): DocView | undefined {
  const d = getDossier(id);
  if (!d) return undefined;
  const v = patientView(id);
  if (!v) return undefined;
  const rows = v.documents;
  const i = rows.findIndex((r) => r.id === docId);
  if (i < 0) return undefined;
  const row = rows[i];
  const rec = d.records.find((r) => r.id === docId);
  if (!rec) return undefined;
  const nav = { prev: rows[i - 1] ? { id: rows[i - 1].id, titre: rows[i - 1].titre } : undefined, next: rows[i + 1] ? { id: rows[i + 1].id, titre: rows[i + 1].titre } : undefined };
  const base = { id: docId, patientId: id, source: rec.kind as DocView["source"], type: row.type, titre: row.titre, date: row.date, de: row.de, ...nav };
  const sig = (s?: { par: string; le: string }) => (s ? [{ k: "Signé", v: `${fr(s.le)} · e-CPS` }] : [{ k: "Signature", v: "non signée" }]);
  switch (rec.kind) {
    case "document": {
      const x = rec as ClinicalDocument;
      return { ...base, titre: x.titre, de: x.auteur ?? CANAL[x.canal] ?? x.canal, meta: [{ k: "Type", v: DOC_TYPE[x.type] ?? x.type }, { k: "Daté du", v: fr(x.dateDocument) }, { k: "Reçu le", v: `${fr(x.recuLe)} · ${CANAL[x.canal] ?? x.canal}` }, { k: "Format", v: `${x.format.toUpperCase()}${x.pages ? ` · ${x.pages} p.` : ""}` }, { k: "Lu", v: x.vuLe ? fr(x.vuLe) : "pas encore" }], lecture: lectureOf(x.lecture), corps: x.texte };
    }
    case "lab": {
      const x = rec as LabReport;
      const lignes: DocLine[] = x.resultats.map((r) => ({ k: r.libelle, v: `${typeof r.valeur === "number" ? String(r.valeur).replace(".", ",") : r.valeur}${r.unite ? ` ${r.unite}` : ""}`, flag: r.flag, ref: r.refMin !== undefined || r.refMax !== undefined ? `${r.refMin ?? "<"}${r.refMin !== undefined && r.refMax !== undefined ? " – " : " "}${r.refMax ?? ""}`.trim() : undefined, precedent: r.precedent ? `${String(r.precedent.valeur).replace(".", ",")} (${fr(r.precedent.date).slice(3)})` : undefined }));
      return { ...base, titre: `Biologie · ${x.laboratoire}`, de: x.laboratoire, meta: [{ k: "Prélevé le", v: fr(x.prelevementLe) }, { k: "Reçu le", v: `${fr(x.recuLe)} · HPRIM` }, { k: "Lu", v: x.vuLe ? fr(x.vuLe) : "pas encore" }, { k: "Résultats", v: `${x.resultats.length} · ${x.resultats.filter((r) => r.flag !== "normal").length} hors norme` }], lecture: lectureOf(x.lecture), lignes, lignesTitre: "Résultats" };
    }
    case "prescription": {
      const x = rec as Prescription;
      const lignes: DocLine[] = x.lignes.map((l) => ({ k: l.libelle, v: [l.posologie, l.duree, l.quantite, l.renouvellement ? `renouvelable ${l.renouvellement}×` : undefined, l.ald ? "ALD" : undefined, l.nonSubstituable ? `non substituable (${l.nonSubstituable})` : undefined].filter(Boolean).join(" · "), alerte: l.alertes?.map((a) => a.message).join(" · ") }));
      return { ...base, titre: RX_TYPE[x.type] ?? "Ordonnance", meta: [{ k: "Date", v: fr(x.date) }, ...sig(x.signature), { k: "Transmission", v: x.ordonnanceNumerique ? `ordonnance numérique ${x.ordonnanceNumerique.id}${x.ordonnanceNumerique.dispenseeLe ? ` · dispensée le ${fr(x.ordonnanceNumerique.dispenseeLe)}` : ""}` : "papier" }, { k: "DMP", v: x.partageeLe ? `partagée le ${fr(x.partageeLe)}` : "non partagée" }], lignes, lignesTitre: x.type === "medicament" ? "Traitements" : "Prescription", corps: x.mention };
    }
    case "sick-leave": {
      const x = rec as SickLeave;
      const jours = Math.round((new Date(x.au).getTime() - new Date(x.du).getTime()) / 86_400_000) + 1;
      return { ...base, meta: [{ k: "Du", v: fr(x.du) }, { k: "Au", v: `${fr(x.au)} · ${jours} j` }, { k: "Temps partiel", v: x.tempsPartiel ? "oui" : "non" }, { k: "Sorties", v: x.sortiesAutorisees === "libres" ? "libres" : x.sortiesAutorisees === "oui" ? "autorisées 10h–12h, 16h–18h" : "non autorisées" }, { k: "Télétransmis", v: x.teletransmis ? `${fr(x.teletransmis.le)} · AAT ${x.teletransmis.numero}` : "non" }], corps: `Motif médical (volet confidentiel) : ${x.motif}.` };
    }
    case "letter": {
      const x = rec as Letter;
      return { ...base, titre: x.titre, meta: [{ k: "Destinataire", v: `${x.destinataire.nom}${x.destinataire.specialite ? ` · ${x.destinataire.specialite}` : ""}` }, { k: "Date", v: fr(x.date) }, ...sig(x.signature), { k: "Envoi", v: x.envoi ? `${CANAL[x.envoi.canal] ?? x.envoi.canal} · ${fr(x.envoi.le)}${x.envoi.accuse ? " · accusé reçu" : ""}` : "non envoyé" }], corps: x.corps };
    }
    case "encounter": {
      const x = rec as Encounter;
      const n = x.note;
      const note = [["Motif", n.motifs.join(", ")], ["Histoire", n.histoire], ["Examen", n.examen], ["Conclusion", n.conclusion], ["Conduite à tenir", n.conduite], ["Codes", x.codes.map((c) => `${c.code} ${c.libelle}`).join(" · ")], ["Actes", x.actes.map((a) => `${a.code} · ${a.montant} €${a.majorations?.length ? ` (${a.majorations.join(", ")})` : ""}`).join(" · ")]].filter((p): p is [string, string] => !!p[1]).map(([k, v]) => ({ k, v }));
      return { ...base, titre: `Consultation · ${n.motifs.join(", ")}`, meta: [{ k: "Date", v: fr(x.date) }, { k: "Type", v: { cabinet: "au cabinet", teleconsultation: "téléconsultation", visite: "visite à domicile", telephone: "téléphone", messagerie: "messagerie" }[x.type] ?? x.type }, ...(x.dureeMin ? [{ k: "Durée", v: `${x.dureeMin} min` }] : []), { k: "Facturation", v: x.facturation ? "FSE télétransmise" : "—" }], note };
    }
    default:
      return undefined;
  }
}

/* ------------------------------------------------------------------ */
/* Les trois boîtes                                                      */
/* ------------------------------------------------------------------ */

const URG: Record<Urgence, number> = { immediate: 0, jour: 1, semaine: 2, aucune: 3 };

function inboxRows(kind: InboxKind): InboxRow[] {
  const out: InboxRow[] = [];
  const horizon = day(-30);
  for (const d of DOSSIERS) {
    const r = ref(d);
    if (kind === "courriers") {
      for (const x of recordsOf(d, "document")) if (x.recuLe >= horizon) out.push({ id: x.id, href: `/p/${d.patient.id}/documents/${x.id}`, patient: r, de: x.auteur?.split(",")[0] ?? CANAL[x.canal] ?? x.canal, deType: /\b(Dr|Pr|Docteur)\b/.test(x.auteur ?? "") ? "confrere" : /labo/i.test(x.auteur ?? "") ? "labo" : /secr[ée]tariat/i.test(x.auteur ?? "") ? "secretariat" : "autre", titre: x.titre, resume: x.lecture?.resume ?? x.texte.slice(0, 160), urgence: x.lecture?.urgence ?? "aucune", quand: fmtRelative(x.recuLe), at: x.recuLe, nonLu: !x.vuLe });
    } else if (kind === "bio") {
      for (const x of recordsOf(d, "lab")) if (x.recuLe >= horizon) { const ab = x.resultats.filter((y) => y.flag !== "normal"); out.push({ id: x.id, href: `/p/${d.patient.id}/documents/${x.id}`, patient: r, de: x.laboratoire, deType: "labo", titre: ab.length ? ab.map((y) => `${y.libelle} ${typeof y.valeur === "number" ? String(y.valeur).replace(".", ",") : y.valeur}${y.unite ? " " + y.unite : ""}`).slice(0, 3).join(" · ") : `${x.resultats.length} résultats, tous normaux`, resume: x.lecture?.resume, urgence: x.lecture?.urgence ?? (ab.some((y) => y.flag === "critique") ? "jour" : ab.length ? "semaine" : "aucune"), quand: fmtRelative(x.recuLe), at: x.recuLe, nonLu: !x.vuLe }); }
    } else {
      const msgs = recordsOf(d, "message");
      for (const x of msgs) {
        if (x.de.type === "agent" || x.de.type === "praticien" || x.de.type === "systeme" || x.date < horizon) continue;
        const rep = x.triage?.reponseProposeeId ? msgs.find((m) => m.id === x.triage!.reponseProposeeId) : undefined;
        // Sans réponse rédigée dans le fil : la proposition de message en attente, s'il y en a une pour ce dossier.
        const prop = rep ? undefined : recordsOf(d, "proposal").find((p) => p.etat === "a-valider" && p.declencheur.type === "message" && (!p.declencheur.recordId || p.declencheur.recordId === x.id) && (x.de.type === "confrere" ? p.action === "message-confrere" : p.action === "message-patient"));
        const corpsProp = prop && prop.charge && "corps" in prop.charge ? String(prop.charge.corps) : undefined;
        out.push({ id: x.id, patient: r, de: x.de.nom, deType: x.de.type === "labo" ? "labo" : x.de.type === "patient" || x.de.type === "confrere" || x.de.type === "secretariat" || x.de.type === "pharmacie" ? x.de.type : "autre", titre: x.objet ?? x.corps.slice(0, 60), resume: x.triage?.resume, corps: x.corps, reponse: rep?.corps ?? corpsProp, urgence: x.triage?.urgence ?? "aucune", intention: x.triage?.intention, quand: fmtRelative(x.date), at: x.date, nonLu: !x.luLe });
      }
    }
  }
  return out.sort((a, b) => (a.nonLu === b.nonLu ? URG[a.urgence] - URG[b.urgence] || b.at.localeCompare(a.at) : a.nonLu ? -1 : 1));
}

export function inboxCounts(): Record<InboxKind, number> {
  return { courriers: inboxRows("courriers").filter((x) => x.nonLu).length, bio: inboxRows("bio").filter((x) => x.nonLu).length, messages: inboxRows("messages").filter((x) => x.nonLu).length };
}

export function inboxView(kind: InboxKind): InboxView {
  return { kind, rows: inboxRows(kind), counts: inboxCounts() };
}

const CODE: Record<string, string> = { ordonnance: "Rx", courrier: "CR", "arret-travail": "AT", "message-patient": "MSG", "message-confrere": "CR", rdv: "RV", rappel: "RV", codage: "COD", "creer-enregistrement": "DOS", "modifier-enregistrement": "DOS", signaler: "!", facturation: "FSE", "alimenter-dmp": "DMP" };
const DEST: Record<string, string> = { ordonnance: "patiente · e-ordo", courrier: "MSSanté", "arret-travail": "CPAM · télétransmis", "message-patient": "patiente · messagerie", "message-confrere": "MSSanté", rdv: "agenda", rappel: "agenda", codage: "FSE", "creer-enregistrement": "dossier · DMP", "modifier-enregistrement": "dossier", signaler: "—", facturation: "CPAM", "alimenter-dmp": "DMP" };

/** Les patients sans rencontre écrite : la dictée est courte, les documents viennent des propositions. */
function rencontreGenerique(d: Dossier, proposals: Proposal[], motif?: string): Rencontre {
  const p = d.patient;
  const briefing = recordsOf(d, "briefing")[0];
  const actions: ActionDoc[] = proposals.filter((x) => x.action !== "signaler").map((x) => {
    const c = (x.charge ?? {}) as Record<string, unknown>;
    const fields = x.action === "ordonnance" && Array.isArray(c.lignes) ? (c.lignes as { libelle: string; posologie?: string; duree?: string }[]).map((l) => ({ k: l.libelle, v: [l.posologie, l.duree].filter(Boolean).join(" · ") })) : [{ k: "Justification", v: x.justification.replace(/\[\d+\]/g, "") }];
    return { id: x.id, code: CODE[x.action] ?? "DOC", titre: x.titre, ligne: x.declencheur.libelle, statut: x.action === "ordonnance" || x.action === "arret-travail" ? "relire" : "pret", destination: DEST[x.action] ?? "dossier", fields, apercu: { titre: x.titre, corps: fields.map((f) => `${f.k} : ${f.v}`), pied: DEST[x.action] } };
  });
  return {
    patientId: p.id,
    motif: motif ?? "Consultation",
    paragraphes: [
      { texte: briefing ? briefing.synthese : `${p.prenomUsuel} ${p.nomUsage}, ${ageAt(p.ins.dateNaissance, now())} ans.` },
      { texte: "(Dictée non scriptée dans le jeu de données : les actions ci-dessous viennent de ce que Locus avait préparé avant la rencontre.)", muted: true },
    ],
    actions,
    synthese: briefing?.synthese ?? "",
    codes: [],
    acte: { code: "G", montant: 30, tiersPayant: !!p.couverture.ald?.length },
  };
}

export { day };
