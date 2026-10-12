import "server-only";
import { DOSSIERS, getDossier, displayName, recordsOf } from "@/data";
import { executeTool, type ToolCtx } from "./tools";
import { norm } from "@/lib/norm";
import type { ComposeEvent, ComposeInput, ComposePlan } from "./contract";

/**
 * Le composer à sec : sans modèle, des règles lisent la demande et appellent
 * les MÊMES outils que Claude appellerait. Le plan a la même forme ; seule
 * la compréhension est plus courte. Dès que ANTHROPIC_API_KEY est posée,
 * tout ceci est ignoré.
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function trouvePatient(texte: string): string | undefined {
  const t = norm(texte);
  let best: { id: string; n: number } | undefined;
  for (const d of DOSSIERS) {
    const nom = norm(d.patient.nomUsage), prenom = norm(d.patient.prenomUsuel);
    const n = (t.includes(nom) ? 2 : 0) + (t.includes(prenom) ? 1 : 0);
    if (n > (best?.n ?? 0)) best = { id: d.patient.id, n };
  }
  return best && best.n >= 2 ? best.id : undefined;
}

function delaiJours(t: string): number | undefined {
  // Le délai qui suit « dans », « revoir », « d'ici » prime sur une durée d'ordonnance (« pour 3 mois »).
  const m = t.match(/(?:dans|revoir|d ici|a)\s*(\d+)\s*(j|jour|jours|sem|semaine|semaines|mois)/) ?? t.match(/(\d+)\s*(j|jour|jours|sem|semaine|semaines|mois)/);
  if (!m) return /demain/.test(t) ? 1 : /mois/.test(t) ? 30 : undefined;
  const n = Number(m[1]);
  return /^sem/.test(m[2]) ? n * 7 : m[2] === "mois" ? n * 30 : n;
}

export async function* simulateCompose(input: ComposeInput): AsyncGenerator<ComposeEvent> {
  const queue: ComposeEvent[] = [];
  const ctx: ToolCtx = { input, actions: [], references: [], locus: 0, patientId: input.patientId, emit: (ev) => queue.push(ev) };
  const flush = function* () { while (queue.length) yield queue.shift()!; };
  const call = async (name: string, arg: Record<string, unknown>) => executeTool(name, arg, ctx);
  const t = norm(input.texte);
  const phrases: string[] = [];

  yield { step: "reflexion", titre: "Je lis le dossier et la demande" };
  await sleep(300);

  // Depuis l'accueil : le patient nommé devient le contexte.
  if (!ctx.patientId) {
    const pid = trouvePatient(input.texte);
    if (pid) { yield { step: "reflexion", titre: "J'ouvre le dossier" }; await call("ouvrir", { cible: "patient", patientId: pid }); yield* flush(); }
  }
  const d = ctx.patientId ? getDossier(ctx.patientId) : undefined;
  const prenom = d?.patient.prenomUsuel ?? "";
  const meds = d ? recordsOf(d, "medication").filter((m) => m.status === "actif" && m.type === "chronique") : [];
  const duree = /(\d+)\s*mois/.exec(t)?.[1] ?? "3";

  // Ordonnance : renouvellement des chroniques, ou une ligne lue dans la demande.
  if (/ordo|renouvel|prescri/.test(t) && d) {
    yield { step: "reflexion", titre: "Je rédige l'ordonnance" }; await sleep(350);
    const nommes = meds.filter((m) => t.includes(norm(m.dci).slice(0, 6)));
    const lignes = (nommes.length ? nommes : /renouvel/.test(t) ? meds : []).map((m) => ({ libelle: `${m.dci}${m.dosage ? " " + m.dosage : ""}`, posologie: m.posologie, duree: `${duree} mois` }));
    if (!lignes.length) {
      const m = /(parac[ée]tamol|ibuprof[èe]ne|amoxicilline|dolip?rane)\s*(\d+\s*(?:mg|g))?/.exec(t);
      lignes.push(m ? { libelle: `${m[1]}${m[2] ? " " + m[2] : ""}`, posologie: /si douleur|si besoin/.test(t) ? "1 prise si douleur, max 3/j" : "1 prise matin et soir", duree: /(\d+)\s*(j|jour)/.test(t) ? `${/(\d+)\s*(j|jour)/.exec(t)![1]} jours` : "5 jours" } : { libelle: input.texte.replace(/^(ordo(nnance)?|prescri[st]?)\s*:?\s*/i, ""), posologie: "à préciser", duree: `${duree} mois` });
    }
    await call("proposer_ordonnance", { type: /kin[ée]|s[ée]ance/.test(t) ? "paramedical" : /bio|nfs|tsh|cr[ée]at|hba1c/.test(t) ? "biologie" : /scanner|irm|radio|[ée]cho/.test(t) ? "imagerie" : "medicament", lignes, justification: nommes.length || /renouvel/.test(t) ? "Renouvellement des traitements de fond, sans changement." : "Rédigée depuis la demande ; à relire avant signature." });
    yield* flush();
    phrases.push(`Ordonnance prête${/renouvel/.test(t) ? " : renouvellement sans changement" : ""}.`);
  }
  // Rendez-vous.
  if (/rdv|rendez|revoir|controle dans|recontr/.test(t) && d) {
    yield { step: "reflexion", titre: "Je cherche un créneau" }; await sleep(300);
    await call("proposer_rdv", { dans_jours: delaiJours(t) ?? 42, duree_min: /(\d+)\s*min/.test(t) ? Number(/(\d+)\s*min/.exec(t)![1]) : 20, moment: /matin/.test(t) ? "matin" : /apr/.test(t) ? "apres-midi" : undefined, motif: /suivi|contr/.test(t) ? "Consultation de suivi" : "Consultation", justification: "Créneau libre le plus proche du délai demandé ; SMS de confirmation." });
    yield* flush();
    phrases.push("Créneau réservé, SMS préparé.");
  }
  // Message au patient (ou autre).
  if (/mail|message|sms|previens|explique|rassur|reponds/.test(t) && d) {
    yield { step: "reflexion", titre: "Je rédige le message" }; await sleep(350);
    const lab = recordsOf(d, "lab").sort((a, b) => b.prelevementLe.localeCompare(a.prelevementLe))[0];
    const normaux = lab && lab.resultats.every((r) => r.flag === "normal");
    const a = /pharmac/.test(t) ? "pharmacie" : /confr|cardio|neuro|gyn|pneumo|special/.test(t) ? "confrere" : /secret/.test(t) ? "secretariat" : "patient";
    const corps = a === "patient"
      ? `Bonjour ${prenom}, ${normaux ? "vos derniers résultats sont rassurants, tout est dans la norme" : "j'ai bien reçu vos résultats et je les ai regardés"}. ${/rdv|rendez|prochain/.test(t) ? "On en reparle au prochain rendez-vous." : "N'hésitez pas à m'écrire si vous avez une question."} Bien à vous, Dr Vandepitterie`
      : a === "pharmacie" ? `Bonjour, vous pouvez délivrer en dépannage ; l'ordonnance renouvelée vous arrive par MSSanté. Merci. Dr Vandepitterie` : `Cher confrère, je vous adresse ${displayName(d.patient)} pour avis. Les éléments du dossier suivent. Bien confraternellement, Dr Vandepitterie`;
    await call("proposer_message", { a, objet: normaux ? "Vos résultats" : /rappel/.test(t) ? "Rappel" : "Message du cabinet", corps, justification: normaux ? "Dernière biologie sans anomalie." : "Rédigé depuis la demande." });
    yield* flush();
    phrases.push("Message rédigé.");
  }
  // Courrier.
  if (/courrier|adresse|lettre|avis/.test(t) && d && !/mail|message/.test(t)) {
    yield { step: "reflexion", titre: "Je rédige le courrier" }; await sleep(350);
    const spe = /cardio/.test(t) ? "cardiologie" : /neuro/.test(t) ? "neurologie" : /gyn/.test(t) ? "gynécologie" : /rhumat/.test(t) ? "rhumatologie" : /pneumo/.test(t) ? "pneumologie" : /dermat/.test(t) ? "dermatologie" : "spécialiste";
    const motif = input.texte.replace(/.*(?:pour|:)\s*/i, "");
    await call("proposer_courrier", { type: "adressage", destinataire: `Dr — ${spe}`, specialite: spe, titre: `Adressage en ${spe}`, corps: `Cher confrère,\n\nJe vous adresse ${displayName(d.patient)} pour ${motif}.\n\nAntécédents et traitements : voir la synthèse jointe.\n\nBien confraternellement,\nDr Vandepitterie`, justification: "Adressage demandé ; les éléments du dossier sont joints." });
    yield* flush();
    phrases.push(`Courrier d'adressage en ${spe} rédigé.`);
  }
  // Arrêt de travail.
  if (/arret|aat/.test(t) && d) {
    yield { step: "reflexion", titre: "Je prépare l'arrêt" }; await sleep(300);
    await call("proposer_arret", { jours: delaiJours(t) ?? 5, sorties: /libre/.test(t) ? "libres" : /autoris/.test(t) ? "oui" : "non", prolongation: /prolong/.test(t), motif: recordsOf(d, "problem").find((p) => p.enAvant && p.evolution === "chronique")?.libelle ?? "Motif à préciser", justification: "Durée et sorties telles que dictées." });
    yield* flush();
    phrases.push("Arrêt préparé, à relire.");
  }
  // Verser au dossier.
  if (/verse|inscri|au dossier/.test(t) && d) {
    yield { step: "reflexion", titre: "J'inscris au dossier" }; await sleep(300);
    const doc = recordsOf(d, "document").sort((a, b) => b.recuLe.localeCompare(a.recuLe))[0];
    await call("inscrire_au_dossier", { type: "note", libelle: doc ? `Faits extraits : ${doc.titre}` : "Note", detail: doc?.lecture?.resume ?? "", justification: "Lecture du document par Locus, versée au dossier." });
    yield* flush();
    phrases.push("Faits inscrits au dossier.");
  }
  // Ouvrir une boîte, les documents.
  if (/courrier(s)? non lus|arrive ce matin|boite|reception/.test(t) && !ctx.actions.length) { await call("ouvrir", { cible: "boite", boite: /bio|result/.test(t) ? "bio" : /message/.test(t) ? "messages" : "courriers" }); yield* flush(); }
  if (/hors norme|resultats? bio/.test(t) && !ctx.actions.length) { await call("ouvrir", { cible: "boite", boite: "bio" }); yield* flush(); }
  if (/message|pharmacie/.test(t) && !d && !ctx.actions.length) { await call("ouvrir", { cible: "boite", boite: "messages" }); yield* flush(); }
  if (/(toutes? les|les) (tsh|creat|hba1c|ldl|bio)/.test(t) && d && !ctx.actions.length) { await call("ouvrir", { cible: "documents", patientId: d.patient.id, type: "Biologie" }); yield* flush(); }

  // Une question : Locus répond, et la réponse devient une synthèse (plus un contrôle si elle en implique un).
  if (!ctx.actions.filter((a) => a.kind !== "naviguer").length && (/\?|quel|quelle|combien|pourquoi|comment|faut-il|dernier|derniere|evolution|conduite|cible|dose/.test(t) || ctx.actions.length === 0)) {
    yield { step: "reflexion", titre: "Je consulte Locus" };
    const out = await call("locus_retrieve", { question: input.texte });
    yield* flush();
    const first = out.split("\n").find((l) => l.trim() && !/^#/.test(l)) ?? out.split("\n")[0];
    phrases.push((out.split("\n")[0].replace(/^#\s*/, "") + (first && first !== out.split("\n")[0] ? " " + first : "")).slice(0, 420));
    if (/controle|surveill|dans 3 mois|6 mois|bilan/i.test(out) && d && /bio|hba1c|tsh|creat|ldl/.test(norm(out))) {
      await call("proposer_ordonnance", { type: "biologie", lignes: [{ libelle: /hba1c/i.test(out) ? "HbA1c, créatinine, DFG, microalbuminurie" : /tsh/i.test(out) ? "TSH" : "Bilan biologique de suivi", duree: "à faire dans 3 mois" }], justification: "Contrôle que la recommandation implique [1]." });
      yield* flush();
    }
  }

  const plan: ComposePlan = { synthese: phrases.join(" ") || "Prêt à valider.", actions: ctx.actions, references: ctx.references, via: "simulation", locus: ctx.locus };
  yield { step: "done", plan };
}
