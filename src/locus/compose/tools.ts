import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { getDossier, displayName } from "@/data";
import { at } from "@/data/clock";
import { documentView } from "@/studio/view.server";
import { retrieveStream } from "@/locus/client.server";
import { fromDataset, type PatientCtx } from "./patient";
import { chargeOf, materialize, alerteAllergie } from "./materialize";
import type { ComposeAction, ComposeRef, ComposeInput } from "./contract";

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
  emit: (ev: { step: "outil"; nom: string; detail: string } | { step: "action"; action: ComposeAction }) => void;
}

const S = (props: Record<string, unknown>, required: string[]): Anthropic.Tool["input_schema"] => ({ type: "object", properties: props, required });

export const TOOLS: Anthropic.Tool[] = [
  {
    name: "locus_retrieve",
    description: "Interroge Locus (locus-core), le moteur de recommandations du cabinet : HAS, ANSM, SPF, RCP des médicaments, contextualisé par le dossier du patient ouvert. À appeler pour toute question clinique, vérification de posologie, interaction, conduite à tenir, avant de proposer. Renvoie une réponse sourcée avec des références [n].",
    input_schema: S({ question: { type: "string", description: "La question clinique, précise, en français." } }, ["question"]),
  },
  {
    name: "lire_document",
    description: "Lit le contenu complet d'un document du dossier (compte rendu, biologie, ordonnance, courrier, consultation) à partir de son identifiant, tel que listé dans le contexte.",
    input_schema: S({ docId: { type: "string" } }, ["docId"]),
  },
  {
    name: "proposer_ordonnance",
    description: "Prépare une ordonnance à signer : médicaments, biologie, imagerie, paramédical (kiné…), transport. Une ligne par item. Pour un renouvellement, reprends exactement les traitements actifs du dossier.",
    input_schema: S({
      type: { type: "string", enum: ["medicament", "biologie", "imagerie", "paramedical", "transport", "dispositif"] },
      lignes: { type: "array", items: { type: "object", properties: { libelle: { type: "string", description: "DCI + dosage, ou l'examen, ou l'acte" }, posologie: { type: "string" }, duree: { type: "string" }, renouvellement: { type: "integer", description: "Nombre de renouvellements" }, ald: { type: "boolean" } }, required: ["libelle"] } },
      justification: { type: "string", description: "Une phrase : pourquoi, sur quelle base du dossier ou de Locus." },
    }, ["type", "lignes", "justification"]),
  },
  {
    name: "proposer_rdv",
    description: "Réserve un créneau dans l'agenda du cabinet pour le patient, avec confirmation SMS. Donne le délai en jours (ex. 42 pour 6 semaines).",
    input_schema: S({ dans_jours: { type: "integer" }, duree_min: { type: "integer", description: "15, 20 ou 30" }, motif: { type: "string" }, moment: { type: "string", enum: ["matin", "apres-midi"] }, justification: { type: "string" } }, ["dans_jours", "duree_min", "motif", "justification"]),
  },
  {
    name: "proposer_message",
    description: "Rédige un message prêt à envoyer : au patient (messagerie sécurisée ou SMS), à un confrère (MSSanté), au secrétariat, à une pharmacie.",
    input_schema: S({ a: { type: "string", enum: ["patient", "confrere", "secretariat", "pharmacie"] }, nom: { type: "string", description: "Le destinataire nommé, s'il n'est pas le patient" }, objet: { type: "string" }, corps: { type: "string" }, justification: { type: "string" } }, ["a", "objet", "corps", "justification"]),
  },
  {
    name: "proposer_courrier",
    description: "Rédige un courrier à signer : adressage à un spécialiste, certificat, attestation, réponse à un confrère. Envoyé par MSSanté après signature.",
    input_schema: S({ type: { type: "string", enum: ["adressage", "certificat", "attestation", "reponse-confrere", "courrier-patient"] }, destinataire: { type: "string" }, specialite: { type: "string" }, titre: { type: "string" }, corps: { type: "string", description: "Le corps, en markdown léger, prêt à signer." }, justification: { type: "string" } }, ["type", "destinataire", "titre", "corps", "justification"]),
  },
  {
    name: "proposer_arret",
    description: "Prépare un arrêt de travail (AAT, télétransmis à la CPAM après signature).",
    input_schema: S({ jours: { type: "integer" }, sorties: { type: "string", enum: ["non", "oui", "libres"] }, temps_partiel: { type: "boolean" }, prolongation: { type: "boolean" }, motif: { type: "string", description: "Le motif médical (volet confidentiel)" }, justification: { type: "string" } }, ["jours", "sorties", "motif", "justification"]),
  },
  {
    name: "inscrire_au_dossier",
    description: "Inscrit un fait au dossier (et au DMP) : un problème, un traitement, une mesure, une allergie, une note. À utiliser pour « verser » les faits d'un document ou d'une réponse.",
    input_schema: S({ type: { type: "string", enum: ["probleme", "traitement", "mesure", "allergie", "note"] }, libelle: { type: "string" }, detail: { type: "string" }, justification: { type: "string" } }, ["type", "libelle", "justification"]),
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
  // Un patientId explicite (depuis l'accueil) l'emporte ; sinon le patient de la composition.
  const explicit = typeof input.patientId === "string" && input.patientId && input.patientId !== ctx.patient?.id ? fromDataset(input.patientId) : undefined;
  const pt = explicit ?? ctx.patient;
  const pid = pt?.id;
  const prenomNom = pt?.nom ?? "le patient";
  const push = (a: ComposeAction) => { ctx.actions.push(a); ctx.emit({ step: "action", action: a }); };
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
      if (err && !answer) return `Locus indisponible : ${err}`;
      const base = ctx.references.length;
      const refs: ComposeRef[] = docs.slice(0, 6).map((x) => ({ titre: x.title ?? "Document", editeur: x.source_name ?? "—", annee: x.year, url: x.url }));
      ctx.references.push(...refs);
      // Les renvois [n] de la réponse Locus sont renumérotés dans l'espace du plan.
      const renum = answer.replace(/\[(\d+)\]/g, (_, n) => `[${Number(n) + base}]`);
      return `${renum.slice(0, 3500)}\n\nRéférences :\n${refs.map((r, i) => `[${base + i + 1}] ${r.titre} — ${r.editeur}${r.annee ? ` (${r.annee})` : ""}`).join("\n")}`;
    }
    case "lire_document": {
      if (!pid || pt?.local) return "Aucun document lisible pour ce patient.";
      const doc = documentView(pid, s(input.docId));
      if (!doc) return "Document introuvable.";
      ctx.emit({ step: "outil", nom: "dossier", detail: `Je lis « ${doc.titre} »` });
      return [`${doc.type} · ${doc.date} · ${doc.titre} · ${doc.de}`, doc.lecture ? `Lecture Locus : ${doc.lecture.resume}` : "", doc.lignes?.map((l) => `- ${l.k} : ${l.v ?? ""}${l.flag && l.flag !== "normal" ? ` (${l.flag})` : ""}`).join("\n") ?? "", doc.note?.map((n) => `${n.k} : ${n.v}`).join("\n") ?? "", doc.corps ?? ""].filter(Boolean).join("\n");
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
    case "inscrire_au_dossier": {
      const c = chargeOf("dossier", input);
      if (!c) return "Inscription impossible.";
      push({ id: nid(), ...materialize(c, prenomNom) });
      return "Inscription préparée.";
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
      return `Ouvert : ${titre}${ctx.patient ? ` (patientId=${ctx.patient.id})` : ""}.`;
    }
    default:
      return `Outil inconnu : ${name}`;
  }
}
