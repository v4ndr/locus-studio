import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { getDossier, displayName } from "@/data";
import { at } from "@/data/clock";
import { documentView } from "@/studio/view.server";
import { retrieveStream } from "@/locus/client.server";
import { fromDataset, planPatient, type PatientCtx } from "./patient";
import { chargeOf, materialize, alerteAllergie } from "./materialize";
import { interrogerPatientele, type Programme, type Sujet } from "./patientele";
import type { ComposeAction, ComposeRef, ComposeInput, Tableau } from "./contract";

/**
 * Les outils du composer : les ACTIONS du LGC, typées sur le domaine, et
 * Locus (locus-core) comme un outil parmi elles. Chaque appel d'un outil
 * « proposer_* » produit une ComposeAction — la même chose qu'une Proposal,
 * à valider d'un geste. Rien n'est écrit ni envoyé ici.
 */

export interface ToolCtx {
  input: ComposeInput;
  actions: ComposeAction[];
  references: ComposeRef[];
  locus: number;
  /** Le patient résolu pendant la composition (depuis l'accueil, `ouvrir` le fixe). */
  patient?: PatientCtx;
  /** Vrai dès qu'un appel à Locus a échoué pendant la composition. */
  locusEnPanne?: boolean;
  /** Les requêtes sur la patientèle déjà calculées (une par sujet), montrées telles quelles. */
  tableaux: Tableau[];
  emit: (ev: { step: "outil"; nom: string; detail: string } | { step: "action"; action: ComposeAction } | { step: "tableau"; tableau: Tableau }) => void;
}

/** Un tableau de plus au plan, sans doublon (la requête faite avant le modèle, puis redemandée par lui). */
export function ajouteTableau(ctx: ToolCtx, t: Tableau) {
  const i = ctx.tableaux.findIndex((x) => x.id === t.id);
  if (i >= 0) { ctx.tableaux[i] = t; return; }
  ctx.tableaux.push(t); ctx.emit({ step: "tableau", tableau: t });
}

const S = (props: Record<string, unknown>, required: string[]): Anthropic.Tool["input_schema"] => ({ type: "object", properties: props, required });
/** Chaque action peut viser un autre patient que celui ouvert : une requête sur la patientèle prépare pour plusieurs. */
const PID = { patientId: { type: "string", description: "Le patient concerné, quand ce n'est pas le patient ouvert (requête sur la patientèle, demande depuis l'accueil)." } };

export const TOOLS: Anthropic.Tool[] = [
  {
    name: "locus_retrieve",
    description: "Interroge Locus (locus-core), le moteur de recommandations du cabinet : HAS, ANSM, SPF, RCP des médicaments, contextualisé par le dossier du patient ouvert. À appeler pour toute question clinique, vérification de posologie, interaction, conduite à tenir, avant de proposer. Renvoie une réponse sourcée avec des références [n].",
    input_schema: S({ question: { type: "string", description: "La question clinique, précise, en français." } }, ["question"]),
  },
  {
    name: "interroger_patientele",
    description: "Requête sur TOUTE la patientèle, calculée par le logiciel sur les dossiers : dépistages organisés des cancers (colorectal, sein, col de l'utérus ; âge, sexe, antécédents, dernier test, échéance) ou suivi du diabète (dernière HbA1c contre l'intervalle HAS). Le tableau est montré au médecin. À appeler pour toute question sur « ma patientèle », « mes patients », « qui est en retard », d'où qu'elle vienne.",
    input_schema: S({ sujet: { type: "string", enum: ["depistages", "diabete", "tout"] }, programme: { type: "string", enum: ["colorectal", "sein", "col-uterus"], description: "Dépistages : un seul programme, si la question le précise." } }, ["sujet"]),
  },
  {
    name: "lire_document",
    description: "Lit le contenu complet d'un document du dossier (compte rendu, biologie, ordonnance, courrier, consultation) à partir de son identifiant, tel que listé dans le contexte.",
    input_schema: S({ docId: { type: "string" } }, ["docId"]),
  },
  {
    name: "proposer_ordonnance",
    description: "Prépare une ordonnance à signer : médicaments, biologie, imagerie, paramédical (kiné…), dispositif. Un transport sanitaire passe par proposer_transport. Une ordonnance par nature (jamais un médicament et un examen sur la même). Une ligne par item. Pour un renouvellement, reprends exactement les traitements actifs du dossier, QSP 3 mois par défaut, sans renouvellement (sauf si l'ordonnance précédente en portait un).",
    input_schema: S({
      ...PID,
      type: { type: "string", enum: ["medicament", "biologie", "imagerie", "paramedical", "dispositif"] },
      lignes: { type: "array", items: { type: "object", properties: { libelle: { type: "string", description: "DCI + dosage, ou l'examen, ou l'acte" }, posologie: { type: "string", description: "Médicaments seulement" }, duree: { type: "string", description: "Médicaments seulement, « 3 mois » par défaut pour un renouvellement" }, renouvellement: { type: "integer", description: "Nombre de renouvellements, seulement si l'ordonnance précédente en portait" }, ald: { type: "boolean" } }, required: ["libelle"] } },
      indication: { type: "string", description: "Pour un examen ou un acte : le renseignement clinique, une ligne." },
      justification: { type: "string", description: "Une phrase : pourquoi, sur quelle base du dossier ou de Locus." },
    }, ["type", "lignes", "justification"]),
  },
  {
    name: "proposer_rdv",
    description: "Réserve un créneau dans l'agenda du cabinet pour le patient, avec confirmation SMS. Donne le délai en jours (ex. 42 pour 6 semaines).",
    input_schema: S({ ...PID, dans_jours: { type: "integer" }, duree_min: { type: "integer", description: "15, 20 ou 30" }, motif: { type: "string" }, moment: { type: "string", enum: ["matin", "apres-midi"] }, justification: { type: "string" } }, ["dans_jours", "duree_min", "motif", "justification"]),
  },
  {
    name: "proposer_message",
    description: "Rédige un message prêt à envoyer : au patient (messagerie sécurisée ou SMS), à un confrère (MSSanté), au secrétariat, à une pharmacie.",
    input_schema: S({ ...PID, a: { type: "string", enum: ["patient", "confrere", "secretariat", "pharmacie"] }, nom: { type: "string", description: "Le destinataire nommé, s'il n'est pas le patient" }, objet: { type: "string" }, corps: { type: "string" }, justification: { type: "string" } }, ["a", "objet", "corps", "justification"]),
  },
  {
    name: "proposer_courrier",
    description: "Rédige un courrier à signer : adressage à un spécialiste, certificat, attestation, réponse à un confrère. Envoyé par MSSanté après signature.",
    input_schema: S({ ...PID, type: { type: "string", enum: ["adressage", "certificat", "attestation", "reponse-confrere", "courrier-patient"] }, destinataire: { type: "string" }, specialite: { type: "string" }, titre: { type: "string" }, corps: { type: "string", description: "Le corps, en markdown léger, prêt à signer." }, justification: { type: "string" } }, ["type", "destinataire", "titre", "corps", "justification"]),
  },
  {
    name: "proposer_arret",
    description: "Prépare un arrêt de travail (AAT, télétransmis à la CPAM après signature).",
    input_schema: S({ jours: { type: "integer" }, sorties: { type: "string", enum: ["non", "oui", "libres"] }, temps_partiel: { type: "boolean" }, prolongation: { type: "boolean" }, motif: { type: "string", description: "Le motif médical (volet confidentiel)" }, justification: { type: "string" } }, ["jours", "sorties", "motif", "justification"]),
  },
  {
    name: "proposer_transport",
    description: "Prépare une prescription médicale de transport (le bon de transport, cerfa n° 11574*04) à signer : situation de prise en charge, mode de transport adapté à l'état de santé et à l'autonomie, trajet, éléments médicaux qui justifient le déplacement. Remise au patient après signature.",
    input_schema: S({
      ...PID,
      situation: { type: "array", items: { type: "string", enum: ["hospitalisation", "ald-exoneree", "ald-non-exoneree", "at-mp"] }, description: "hospitalisation : entrée ou sortie d'hospitalisation (complète, partielle, ambulatoire, y compris chimiothérapie, radiothérapie, hémodialyse) ; ald-exoneree / ald-non-exoneree : transport en lien avec une ALD avec déficience ou incapacité ; at-mp : accident du travail ou maladie professionnelle. Seulement ce que le dossier ou la demande porte." },
      date_atmp: { type: "string", description: "AAAA-MM-JJ, pour at-mp" },
      mode: { type: "string", enum: ["ambulance", "assis-professionnalise", "vehicule-personnel", "transport-en-commun"], description: "assis-professionnalise : VSL ou taxi conventionné." },
      ambulance_motifs: { type: "array", items: { type: "string", enum: ["allonge", "surveillance", "oxygene", "brancardage", "asepsie"] }, description: "Ambulance seulement : ce qui la justifie." },
      transport_partage: { type: "boolean", description: "Transport assis : l'état du patient permet un transport partagé." },
      accompagnant: { type: "boolean", description: "Véhicule personnel ou transport en commun : une personne accompagnante est nécessaire." },
      depart: { type: "string", enum: ["domicile", "autre", "structure"] },
      depart_lieu: { type: "string", description: "L'adresse ou la structure de départ, si ce n'est pas le domicile." },
      arrivee: { type: "string", enum: ["domicile", "autre", "structure"] },
      arrivee_lieu: { type: "string", description: "La structure de soins (nom, ville) ou l'adresse d'arrivée." },
      aller_retour: { type: "boolean" },
      iteratifs: { type: "integer", description: "Nombre de transports itératifs (séances), s'il y en a." },
      urgence: { type: "string", enum: ["non", "samu", "autre"] },
      urgence_precision: { type: "string" },
      elements_medicaux: { type: "string", description: "La nature de l'examen ou des soins qui justifient le déplacement, et ce qui justifie le mode de transport (une à trois lignes)." },
      justification: { type: "string" },
    }, ["mode", "depart", "arrivee", "aller_retour", "elements_medicaux", "justification"]),
  },
  {
    name: "inscrire_au_dossier",
    description: "Ajoute une ligne à la FICHE du patient, uniquement ce qui y entre : un nouvel antécédent personnel, un antécédent familial, une allergie ou intolérance, un traitement de fond nouveau ou arrêté. Jamais pour une conclusion de consultation, une mesure, un résumé ou une note : cela n'est pas une action à valider.",
    input_schema: S({ ...PID, type: { type: "string", enum: ["antecedent", "antecedent-familial", "allergie", "traitement"] }, libelle: { type: "string", description: "La ligne telle qu'elle apparaîtra dans la fiche" }, detail: { type: "string" }, justification: { type: "string" } }, ["type", "libelle", "justification"]),
  },
  {
    name: "ouvrir",
    description: "Ouvre un écran du logiciel : le dossier d'un patient, un document, la liste des documents d'un patient (avec un type), une boîte de réception (courriers, bio, messages), une fiche du dossier, ou la saisie de rencontre. Depuis l'accueil, l'utiliser pour désigner le patient avant les autres actions.",
    input_schema: S({ cible: { type: "string", enum: ["patient", "document", "documents", "boite", "fiche", "rencontre"] }, patientId: { type: "string" }, docId: { type: "string" }, type: { type: "string", enum: ["Ordonnance", "Courrier", "Biologie", "Imagerie", "Arrêt · certif", "Consultation"] }, boite: { type: "string", enum: ["courriers", "bio", "messages"] }, section: { type: "string", enum: ["antecedents", "allergies", "traitements", "suivis", "depistages"] } }, ["cible"]),
  },
];

/** Un jour ouvré à N jours : on décale le week-end au lundi. */
function creneau(dans: number, moment?: string) { let n = Math.max(1, dans); for (;;) { const d = new Date(at("09:00", n)); const wd = d.getDay(); if (wd === 0) n += 1; else if (wd === 6) n += 2; else break; } return at(moment === "apres-midi" ? "14:30" : "09:30", n); }

/** Un identifiant sans compteur de module : deux instances (ou deux plans) ne se marchent pas dessus. */
const nid = () => `c${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 7)}`;

export async function executeTool(name: string, input: Record<string, unknown>, ctx: ToolCtx): Promise<string> {
  // Un patientId explicite (depuis l'accueil, une requête sur la patientèle) l'emporte ; sinon le patient de la composition.
  const demande = typeof input.patientId === "string" && input.patientId && input.patientId !== ctx.patient?.id ? input.patientId : undefined;
  const explicit = demande ? fromDataset(demande) : undefined;
  // Un identifiant inconnu ne retombe jamais en silence sur le patient ouvert : l'action irait au mauvais dossier.
  if (demande && !explicit && name !== "interroger_patientele" && name !== "locus_retrieve") return `Patient inconnu : ${demande}. Reprends l'identifiant exact de la liste (pat_…).`;
  const pt = explicit ?? ctx.patient;
  const pid = pt?.id;
  const prenomNom = pt?.nom ?? "le patient";
  // Une action pour un autre patient que celui du plan porte son patient : l'en-tête du document est le sien.
  const push = (a: ComposeAction) => { const b = explicit ? { ...a, patient: planPatient(explicit) } : a; ctx.actions.push(b); ctx.emit({ step: "action", action: b }); };
  const s = (v: unknown) => (typeof v === "string" ? v : v === undefined || v === null ? "" : String(v));

  switch (name) {
    case "locus_retrieve": {
      ctx.locus += 1;
      ctx.emit({ step: "outil", nom: "locus", detail: s(input.question) });
      let answer = ""; let docs: { title?: string; source_name?: string; year?: number; url?: string }[] = []; let err = "";
      for await (const ev of retrieveStream({ query: s(input.question), patient_ehr: pt?.ehr, mode: "rapide" })) {
        if (ev.step === "reflexion") ctx.emit({ step: "outil", nom: "locus", detail: ev.titre });
        else if (ev.step === "done") { answer = ev.payload.answer; docs = ev.payload.docs; }
        else if (ev.step === "answer" && !answer) answer = ev.answer;
        else if (ev.step === "error") err = ev.detail;
      }
      if (err && !answer) { ctx.locusEnPanne = true; return `Locus n'a pas répondu (${err}). Ne réponds pas à la question clinique de mémoire : dis en une phrase au médecin que Locus est indisponible et qu'il peut réessayer.`; }
      const base = ctx.references.length;
      const refs: ComposeRef[] = docs.slice(0, 8).map((x) => ({ titre: x.title ?? "Document", editeur: x.source_name ?? "—", annee: x.year, url: x.url }));
      ctx.references.push(...refs);
      // Les renvois [n] de la réponse Locus sont renumérotés dans l'espace du plan ; un renvoi vers une source non gardée est retiré plutôt que de pointer sur une autre.
      const renum = answer.replace(/\[(\d+)\]/g, (_, n) => (Number(n) >= 1 && Number(n) <= refs.length ? `[${Number(n) + base}]` : ""));
      return `${renum.slice(0, 3500)}\n\nRéférences :\n${refs.map((r, i) => `[${base + i + 1}] ${r.titre} — ${r.editeur}${r.annee ? ` (${r.annee})` : ""}`).join("\n")}`;
    }
    case "interroger_patientele": {
      const sujet = (["depistages", "diabete", "tout"].includes(s(input.sujet)) ? s(input.sujet) : "tout") as Sujet;
      const programme = (["colorectal", "sein", "col-uterus"].includes(s(input.programme)) ? s(input.programme) : undefined) as Programme | undefined;
      ctx.emit({ step: "outil", nom: "patientele", detail: "Je calcule sur la patientèle" });
      const r = interrogerPatientele(sujet, programme);
      for (const t of r.tableaux) ajouteTableau(ctx, t);
      return `${r.texte}\n\nCe tableau est affiché au médecin tel quel.`;
    }
    case "lire_document": {
      if (!pid || pt?.local) return "Aucun document lisible pour ce patient.";
      const doc = documentView(pid, s(input.docId));
      if (!doc) return "Document introuvable.";
      ctx.emit({ step: "outil", nom: "dossier", detail: `Je lis « ${doc.titre} »` });
      return [`${doc.type} · ${doc.date} · ${doc.titre} · ${doc.de}`, doc.lignes?.map((l) => `- ${l.k} : ${l.v ?? ""}${l.flag && l.flag !== "normal" ? ` (${l.flag})` : ""}`).join("\n") ?? "", doc.note?.map((n) => `${n.k} : ${n.v}`).join("\n") ?? "", doc.corps ?? ""].filter(Boolean).join("\n");
    }
    case "proposer_ordonnance": {
      const c = chargeOf("ordonnance", input);
      if (!c || c.kind !== "ordonnance" || !c.lignes.filter((l) => l.libelle.trim()).length) return "Aucune ligne : rien à préparer.";
      // Garde-fou allergies, par classe et par nom, sur toutes les lignes : on ne bloque pas, on signale dans l'action, et l'alerte suit le document.
      const alerte = alerteAllergie(c.lignes, pt?.allergies);
      push({ id: nid(), ...materialize(c, prenomNom, alerte) });
      return `Ordonnance préparée (${c.lignes.length} ligne(s))${alerte ? `. ATTENTION, allergie au dossier : ${alerte}` : ""}.`;
    }
    case "proposer_rdv": {
      const dj = Number(input.dans_jours);
      const iso = creneau(Number.isFinite(dj) ? dj : 7, s(input.moment));
      const c = chargeOf("rdv", { ...input, debut: iso });
      if (!c) return "Rendez-vous impossible.";
      push({ id: nid(), ...materialize(c, prenomNom) });
      return `Créneau libre trouvé : ${iso.slice(0, 10)} ${iso.slice(11, 16)}.`;
    }
    case "proposer_message": {
      const c = chargeOf("message", input);
      if (!c) return "Message impossible.";
      push({ id: nid(), ...materialize(c, prenomNom) });
      return "Message rédigé.";
    }
    case "proposer_courrier": {
      const c = chargeOf("courrier", input);
      if (!c) return "Courrier impossible.";
      push({ id: nid(), ...materialize(c, prenomNom) });
      return "Courrier rédigé.";
    }
    case "proposer_arret": {
      const c = chargeOf("arret", input);
      if (!c) return "Arrêt impossible.";
      push({ id: nid(), ...materialize(c, prenomNom) });
      return "Arrêt préparé.";
    }
    case "proposer_transport": {
      const c = chargeOf("transport", input);
      if (!c || c.kind !== "transport") return "Transport impossible.";
      push({ id: nid(), ...materialize(c, prenomNom) });
      return "Prescription de transport préparée.";
    }
    case "inscrire_au_dossier": {
      const c = chargeOf("dossier", input);
      if (!c || c.kind !== "dossier" || !["antecedent", "antecedent-familial", "allergie", "traitement"].includes(c.type)) return "Rien à ajouter à la fiche : seuls un antécédent, une allergie ou un traitement de fond y entrent.";
      push({ id: nid(), ...materialize(c, prenomNom) });
      return "Ajout à la fiche préparé.";
    }
    case "ouvrir": {
      const cible = s(input.cible);
      let href = "/"; let titre = "Accueil";
      const p = pt && !pt.local && pid ? getDossier(pid) : undefined;
      if (cible === "patient" && pt) { href = pt.href; titre = `Dossier de ${pt.nom}`; ctx.patient = pt; }
      else if (cible === "document" && p && input.docId) { href = `/p/${p.patient.id}/documents/${s(input.docId)}?from=dossier`; titre = `Document ${s(input.docId)}`; }
      else if (cible === "documents" && p) { href = `/p/${p.patient.id}/documents${input.type ? `?type=${encodeURIComponent(s(input.type))}` : ""}`; titre = `${s(input.type) || "Tout"} · ${displayName(p.patient)}`; }
      else if (cible === "boite") { href = `/inbox/${s(input.boite) || "courriers"}`; titre = { courriers: "Courriers", bio: "Résultats bio", messages: "Messages" }[s(input.boite)] ?? "Courriers"; }
      else if (cible === "fiche" && p) { href = `/p/${p.patient.id}#fiche-${s(input.section) || "antecedents"}`; titre = `Fiche ${s(input.section) || "antécédents"} · ${displayName(p.patient)}`; }
      else if (cible === "rencontre" && p) { href = `/p/${p.patient.id}/rencontre`; titre = `Rencontre · ${displayName(p.patient)}`; }
      else return "Cible introuvable : précise le patient (patientId) ou le document (docId).";
      push({ id: nid(), kind: "naviguer", code: "→", titre, ligne: href, destination: "écran", statut: "pret", fields: [], href });
      // Depuis l'accueil, le modèle n'a pas encore ce dossier sous les yeux : on le lui donne, pour qu'un renouvellement reprenne les vrais traitements et pas un souvenir.
      if (cible === "patient" && pt) return `Ouvert : ${titre} (patientId=${pt.id}).\n\nDossier (patient_ehr) :\n${pt.ehr}\n\nTraitements actifs (pour un renouvellement) :\n${pt.meds.length ? pt.meds.map((m) => `- ${m.dci}${m.dosage ? " " + m.dosage : ""} · ${m.posologie}${m.chronique ? "" : " · ponctuel"}`).join("\n") : "- aucun"}`;
      return `Ouvert : ${titre}${ctx.patient ? ` (patientId=${ctx.patient.id})` : ""}.`;
    }
    default:
      return `Outil inconnu : ${name}`;
  }
}
