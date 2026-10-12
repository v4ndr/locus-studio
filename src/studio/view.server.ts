import { DOSSIERS, getDossier, recordsOf, summaryOf, displayName, todayAppointments, inbox, TODAY } from "@/data";
import { DR_LAURENT } from "@/data/cabinet";
import { RENCONTRES, type Rencontre, type ActionDoc } from "@/data/rencontres";
import { ageAt, toPatientEhr } from "@/locus/ehr";
import { now, day } from "@/data/clock";
import { fmtTime, initials } from "@/lib/format";
import type { Dossier, Proposal } from "@/domain/types";
import type { HomeData, PatientRef, PatientView, Note, Fiche, Chip, DocRow, AgendaSlot } from "./types";

const PRATICIEN = { initials: `${DR_LAURENT.prenom[0]}${DR_LAURENT.nom[0]}`, nom: `Dr ${DR_LAURENT.prenom} ${DR_LAURENT.nom}` };

function fr(iso: string) { const [y, m, d] = iso.slice(0, 10).split("-"); return `${d}/${m}/${y}`; }

function ref(d: Dossier): PatientRef {
  const p = d.patient;
  const rdv = recordsOf(d, "appointment").find((a) => a.debut.startsWith(TODAY));
  return { id: p.id, nom: displayName(p), prenom: p.prenomUsuel, nomUsage: p.nomUsage, initials: initials(p.prenomUsuel, p.nomUsage), hue: p.photoHue ?? 200, age: ageAt(p.ins.dateNaissance, now()), naissance: fr(p.ins.dateNaissance), profession: p.vie?.profession?.split(",")[0].toLowerCase(), ins: p.ins.statut, rdv: rdv ? fmtTime(rdv.debut) : undefined };
}

export function homeData(): HomeData {
  const slots = todayAppointments();
  const agenda: AgendaSlot[] = slots.map(({ appointment, dossier }) => ({ patientId: dossier.patient.id, heure: fmtTime(appointment.debut), nom: displayName(dossier.patient), motif: appointment.motif, apresMidi: Number(fmtTime(appointment.debut).slice(0, 2)) >= 12 }));
  const next = agenda.find((a) => a.heure >= "10:30") ?? agenda[0];
  if (next) next.prochain = true;
  agenda.splice(agenda.findIndex((a) => a.heure > "11:10") < 0 ? agenda.length : agenda.findIndex((a) => a.heure > "11:10"), 0, { patientId: "", heure: "11:30", nom: "Créneau libre", motif: "—", libre: true, apresMidi: false });
  const box = inbox();
  return { praticien: PRATICIEN, agenda, patients: DOSSIERS.map(ref), courriersNonLus: box.filter((i) => i.kind !== "lab").length, bioNonLues: box.filter((i) => i.kind === "lab").length };
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

  const aNoter: Note[] = [];
  for (const x of proposals.filter((x) => x.action === "signaler").slice(0, 2)) aNoter.push({ dot: "accent", texte: x.titre, tag: "nouveau" });
  for (const e of briefing?.echeances.slice(0, 2) ?? []) aNoter.push({ dot: "warn", texte: e.libelle.replace(/ — .*$/, ""), tag: "dû" });
  for (const a of allergies.slice(0, 1)) aNoter.push({ dot: "gray", texte: `${a.substance}${a.reaction ? ` · ${a.reaction.toLowerCase()}` : ""}`, tag: "à savoir" });
  if (aNoter.length === 0 && sum?.enCeMoment[0]) aNoter.push({ dot: "gray", texte: sum.enCeMoment[0], tag: "à savoir" });

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
  for (const x of proposals) { const c = chipOf(x); if (c && chips.length < 3) chips.push(c); }

  const rows: DocRow[] = [
    ...docs.map((x) => ({ id: x.id, date: fr(x.dateDocument), type: (x.type === "cr-imagerie" ? "Imagerie" : "Courrier") as DocRow["type"], titre: x.titre, de: x.auteur?.split(",")[0] ?? x.canal })),
    ...labs.map((x) => ({ id: x.id, date: fr(x.prelevementLe), type: "Biologie" as const, titre: x.resultats.map((r) => r.libelle).slice(0, 4).join(", ") + (x.resultats.length > 4 ? "…" : ""), de: "Laboratoire" })),
    ...rx.map((x) => ({ id: x.id, date: fr(x.date), type: "Ordonnance" as const, titre: x.lignes.map((l) => l.libelle).join(" · "), de: PRATICIEN.nom })),
    ...sl.map((x) => ({ id: x.id, date: fr(x.du), type: "Arrêt · certif" as const, titre: x.prolongation ? "Prolongation d'arrêt de travail" : "Arrêt de travail initial", de: PRATICIEN.nom })),
    ...letters.map((x) => ({ id: x.id, date: fr(x.date), type: "Courrier" as const, titre: x.titre, de: PRATICIEN.nom })),
    ...encs.map((x) => ({ id: x.id, date: fr(x.date), type: "Consultation" as const, titre: x.note.motifs.join(", "), de: PRATICIEN.nom })),
  ].sort((a, b) => b.date.split("/").reverse().join("").localeCompare(a.date.split("/").reverse().join("")));

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
    rencontre: RENCONTRES[id] ?? rencontreGenerique(d, proposals, appt?.motif),
    documents: rows,
    suivant: nxt ? { id: nxt.dossier.patient.id, nom: displayName(nxt.dossier.patient) } : undefined,
    ehr: toPatientEhr(d, now()),
  };
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
function jourFr(iso: string) { const d = new Date(iso); const j = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"][d.getDay()]; return `${j} ${d.getDate()} ${["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"][d.getMonth()]}`; }

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
