import "server-only";
import { getDossier, DOSSIERS, recordsOf, displayName, todayAppointments } from "@/data";
import { resolvePatient } from "./patient";
import { DR_LAURENT, CABINET } from "@/data/cabinet";
import { now, TODAY } from "@/data/clock";
import { toPatientEhr, ageAt } from "@/locus/ehr";
import { patientView, documentView, inboxView } from "@/studio/view.server";
import { fmtTime } from "@/lib/format";
import type { ComposeInput } from "./contract";

/**
 * Le contexte que le composer donne au modèle : qui parle, où l'on est,
 * ce que le dossier dit (la même projection `patient_ehr` que locus-core
 * reçoit), ce qui est déjà préparé, et le document ouvert s'il y en a un.
 * Court, structuré, sans roman.
 */

export const SYSTEM = `Tu es Locus, l'agent du cabinet de médecine générale « ${CABINET.nom} » (${CABINET.adresse}). Tu travailles pour le Dr ${DR_LAURENT.prenom} ${DR_LAURENT.nom}, médecin généraliste. Nous sommes le ${TODAY}.

Le médecin te parle depuis la ligne de commande du logiciel (⌘K). Tu ne rédiges pas de réponse : tu COMPOSES DES ACTIONS dans le logiciel, avec les outils fournis, et tu termines par une synthèse d'une à trois phrases. Le médecin valide d'un geste ; rien ne part sans sa signature.

Règles :
- Une demande d'action (ordonnance, rendez-vous, message, courrier, arrêt, ajout à la fiche, ouvrir quelque chose) = un ou plusieurs appels d'outils. Pas de prose à la place.
- La fiche du patient ne reçoit que ce qui y entre (\`inscrire_au_dossier\`) : un nouvel antécédent personnel ou familial, une allergie, un traitement de fond nouveau ou arrêté. La conclusion d'une consultation, une mesure, un résumé ne sont jamais des actions : ils restent dans la note.
- Un renouvellement d'ordonnance : les traitements actifs, 3 mois par défaut, sans mention « à renouveler » sauf si l'ordonnance précédente en portait une.
- Une question clinique = d'abord \`locus_retrieve\` (le moteur de recommandations du cabinet, sourcé HAS/ANSM/SPF/RCP), puis une synthèse courte avec renvois [n], puis les actions que la réponse implique (un contrôle biologique, un rendez-vous, une inscription au dossier) si elles sont évidentes.
- Tu t'appuies strictement sur le dossier fourni. Tu n'inventes ni fait patient, ni résultat, ni date. Ce que tu ne sais pas, tu le dis en une phrase.
- Tu respectes les allergies et intolérances du dossier. Tu signales une interaction ou une contre-indication plutôt que de la contourner en silence.
- Posologies et durées en français courant (« 1 cp matin et soir », « 3 mois »), DCI en minuscules.
- Un message au patient : simple, chaleureux, deux à quatre phrases, signé « Dr Vandepitterie ». Un courrier à un confrère : confraternel, les éléments utiles du dossier, pas de bavardage.
- Depuis l'accueil (aucun patient ouvert), identifie le patient dans la liste fournie, utilise \`ouvrir\` vers son dossier, puis compose ce qui est demandé avec son identifiant.
- Une question sur la patientèle (suivis en retard, dépistages, qui revoir) : réponds à partir de la section « Suivi diabète de la patientèle » du contexte. Liste les patients en retard (nom, dernière HbA1c, retard), puis prépare pour chacun l'ordonnance de biologie (\`proposer_ordonnance\` avec son \`patientId\`), sans \`ouvrir\` de dossier.
- Quand plusieurs outils sont nécessaires, appelle-les en parallèle dans le même tour.
- Synthèse finale : TRÈS concise. Une phrase, deux au plus, quarante mots maximum, en français, sans titre ni liste. Pas de bilan de ton analyse, pas de récapitulatif des actions (elles sont affichées à côté), pas de rappel du dossier, pas de formule de politesse. Sur une note de consultation : la conclusion clinique, rien d'autre.`;

function fr(iso: string) { const [y, m, d] = iso.slice(0, 10).split("-"); return `${d}/${m}/${y}`; }

const JOUR = 86_400_000;

/**
 * La requête de population que le LGC sait faire : les diabétiques et leur
 * dernière HbA1c, contre l'intervalle HAS (3 mois, 6 mois si équilibré).
 */
function suiviDiabete(): string {
  const ref = now().getTime();
  const rows = DOSSIERS.flatMap((d) => {
    const diab = recordsOf(d, "problem").some((p) => p.categorie !== "familial" && (/^E1[0-4]/.test(p.cim10 ?? "") || /diab[eè]te/i.test(p.libelle)));
    if (!diab) return [];
    const mesures = recordsOf(d, "lab").flatMap((l) => l.resultats.filter((r) => r.loinc === "4548-4" || /hba1c/i.test(r.libelle)).map((r) => ({ le: l.prelevementLe, valeur: r.valeur }))).sort((a, b) => b.le.localeCompare(a.le));
    const der = mesures[0];
    const p = d.patient;
    const qui = `${p.id} · ${displayName(p)} · ${ageAt(p.ins.dateNaissance, now())} ans`;
    if (!der) return [`- ${qui} · aucune HbA1c au dossier · EN RETARD`];
    const v = typeof der.valeur === "number" ? der.valeur : Number(String(der.valeur).replace(",", "."));
    const stable = Number.isFinite(v) && v <= 7;
    const mois = stable ? 6 : 3;
    const jours = Math.floor((ref - new Date(der.le).getTime()) / JOUR);
    const retard = jours - Math.round(mois * 30.4);
    return [`- ${qui} · dernière HbA1c ${String(v).replace(".", ",")} % le ${fr(der.le)} (il y a ${jours} j) · intervalle ${mois} mois${stable ? " (équilibré)" : ""} · ${retard > 0 ? `EN RETARD de ${retard} j` : `à jour, prochaine dans ${-retard} j`}`];
  });
  return `## Suivi diabète de la patientèle (id · nom · âge · dernière HbA1c · intervalle HAS · statut)\n${rows.length ? rows.join("\n") : "- aucun patient diabétique"}`;
}

export function buildContext(input: ComposeInput): { contexte: string; patientEhr?: string } {
  const lines: string[] = [];
  const pt = resolvePatient(input);
  const d = pt && !pt.local ? getDossier(pt.id) : undefined;
  const ehr = pt?.ehr;

  if (pt?.local) {
    lines.push(`## Patient ouvert (dossier créé au cabinet, sans carte Vitale)\nid: ${pt.id} · ${pt.nom} · ${pt.age} ans · ${pt.sexe}`);
    lines.push(`## Dossier (patient_ehr)\n${pt.ehr}`);
    if (pt.meds.length) lines.push(`## Traitements actifs (pour un renouvellement)\n${pt.meds.map((m) => `- ${m.dci}${m.dosage ? " " + m.dosage : ""} · ${m.posologie}`).join("\n")}`);
  }
  if (d) {
    const p = d.patient;
    lines.push(`## Patient ouvert\nid: ${p.id} · ${displayName(p)} · ${ageAt(p.ins.dateNaissance, now())} ans · ${p.ins.sexe} · né(e) le ${fr(p.ins.dateNaissance)}${p.vie?.profession ? ` · ${p.vie.profession}` : ""}`);
    lines.push(`## Dossier (patient_ehr)\n${ehr}`);
    const v = patientView(p.id);
    if (v) {
      if (v.rdv) lines.push(`## Rendez-vous du jour\n${v.rdv.heure} · ${v.rdv.motif}`);
      if (v.prose) lines.push(`## Synthèse de Locus avant la rencontre\n${v.prose.replace(/==|\*\*/g, "")}`);
      if (v.aNoter.length) lines.push(`## À noter\n${v.aNoter.map((n) => `- ${n.texte} (${n.tag})`).join("\n")}`);
      if (v.chips.length) lines.push(`## Déjà préparé par Locus (propositions en attente)\n${v.chips.map((c) => `- ${c.label} — ${c.title}`).join("\n")}`);
      const docs = v.documents.slice(0, 12);
      if (docs.length) lines.push(`## Documents récents (id · date · type · titre · émetteur)\n${docs.map((r) => `- ${r.id} · ${r.date} · ${r.type} · ${r.titre} · ${r.de}`).join("\n")}`);
      const meds = recordsOf(d, "medication").filter((m) => m.status === "actif");
      if (meds.length) lines.push(`## Traitements actifs (pour un renouvellement)\n${meds.map((m) => `- ${m.dci}${m.dosage ? " " + m.dosage : ""} · ${m.posologie} · ${m.type}${m.dernierRenouvellement ? ` · dernier renouvellement ${fr(m.dernierRenouvellement)}` : ""}`).join("\n")}`);
    }
  }

  if (input.ecran === "document" && input.patientId && input.docId) {
    const doc = documentView(input.patientId, input.docId);
    if (doc) {
      // Le document brut seulement : la lecture, c'est le modèle qui la fait, ici et maintenant.
      const body = [doc.lignes ? doc.lignes.map((l) => `- ${l.k} : ${l.v ?? ""}${l.flag && l.flag !== "normal" ? ` (${l.flag})` : ""}${l.ref ? ` [norme ${l.ref}]` : ""}${l.precedent ? ` [précédent ${l.precedent}]` : ""}`).join("\n") : "", doc.note ? doc.note.map((n) => `${n.k} : ${n.v}`).join("\n") : "", doc.corps ?? ""].filter(Boolean).join("\n");
      lines.push(`## Document ouvert\nid: ${doc.id} · ${doc.type} · ${doc.date} · ${doc.titre} · ${doc.de}\n${body}`);
    }
  }

  if (input.ecran === "home" || !pt) {
    const slots = todayAppointments();
    lines.push(`## Agenda du jour\n${slots.map((s) => `- ${fmtTime(s.appointment.debut)} · ${s.dossier.patient.id} · ${displayName(s.dossier.patient)} · ${s.appointment.motif}`).join("\n")}`);
    lines.push(suiviDiabete());
    lines.push(`## Patientèle (id · nom · naissance)\n${DOSSIERS.map((x) => `- ${x.patient.id} · ${displayName(x.patient)} · ${fr(x.patient.ins.dateNaissance)}`).join("\n")}`);
  }

  if (input.ecran === "inbox" && input.boite) {
    const box = inboxView(input.boite);
    lines.push(`## Boîte « ${input.boite} » (non lus d'abord ; patientId · de · objet · urgence · résumé)\n${box.rows.slice(0, 14).map((r) => `- ${r.id} · ${r.patient.id} · ${r.patient.nom} · ${r.de} · ${r.titre} · ${r.urgence}${r.nonLu ? " · non lu" : ""}${r.resume ? ` · ${r.resume}` : ""}`).join("\n")}`);
    // Le message ouvert, en entier : c'est à lui qu'une réponse répond.
    const ouvert = input.docId ? box.rows.find((r) => r.id === input.docId) : undefined;
    if (ouvert?.corps) lines.push(`## Message ouvert\nid: ${ouvert.id} · de ${ouvert.de} · patient ${ouvert.patient.id}\n${ouvert.corps}`);
  }

  lines.push(`## Écran\n${input.ecran === "note" ? "note de consultation (le médecin vient de la saisir ; décline-la en actions)" : input.ecran}`);
  return { contexte: lines.join("\n\n"), patientEhr: ehr };
}
