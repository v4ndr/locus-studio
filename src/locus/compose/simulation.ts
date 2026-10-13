import "server-only";
import { DOSSIERS } from "@/data";
import { executeTool, type ToolCtx } from "./tools";
import { resolvePatient, fromDataset } from "./patient";
import { norm } from "@/lib/norm";
import type { ComposeEvent, ComposeInput, ComposePlan } from "./contract";

/**
 * Le composer à sec : sans modèle, des règles lisent la demande et appellent
 * les MÊMES outils que Claude appellerait. Le plan a la même forme ; seule
 * la compréhension est plus courte. Dès que ANTHROPIC_API_KEY est posée,
 * tout ceci est ignoré.
 *
 * Les règles lisent d'abord la CONDUITE À TENIR d'une note structurée (ce
 * qui est prescrit), jamais l'anamnèse (ce que le patient a pris) ; elles
 * respectent les négations (« pas de courrier », « sorties non autorisées »)
 * et les frontières de mots (« coordonnées » n'est pas une ordonnance).
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Le patient nommé dans la demande ; `ambigu` si deux dossiers se valent (homonymes). */
function trouvePatient(texte: string): { id?: string; ambigu?: boolean } {
  const t = norm(texte);
  const scores = DOSSIERS.map((d) => { const nom = norm(d.patient.nomUsage), prenom = norm(d.patient.prenomUsuel); return { id: d.patient.id, n: (new RegExp(`\\b${nom}\\b`).test(t) ? 2 : 0) + (new RegExp(`\\b${prenom}\\b`).test(t) ? 1 : 0) }; }).filter((x) => x.n >= 2).sort((a, b) => b.n - a.n);
  if (!scores.length) return {};
  if (scores.length > 1 && scores[0].n === scores[1].n) return { ambigu: true };
  return { id: scores[0].id };
}

/** Un délai « dans 3 semaines », « revoir à 6 mois », « d'ici 10 jours » — jamais « il y a 3 jours » ni « depuis 2 jours ». */
function delaiJours(t: string): number | undefined {
  const m = /(?:dans|revoir(?: a| dans)?|d ici|a revoir(?: a| dans)?|controle (?:a|dans)|sous)\s+(?:un |une |1 )?(\d+)?\s*(j\b|jour|jours|sem\b|semaine|semaines|mois)/.exec(t);
  if (!m) return /\bdemain\b/.test(t) ? 1 : undefined;
  const n = m[1] ? Number(m[1]) : 1;
  return /^sem/.test(m[2]) ? n * 7 : m[2] === "mois" ? n * 30 : n;
}

/** La note découpée : la conclusion (ce qu'elle établit), la conduite à tenir (ce qu'elle prescrit), le motif. */
function sections(note: string) {
  const grab = (re: RegExp) => { const m = re.exec(note); return m ? m[1].trim() : undefined; };
  const concl = grab(/(?:^|\n)\s*(?:conclusion|diagnostic|synth[eè]se|impression)\s*:?\s*([\s\S]*?)(?=\n\s*(?:conduite|cat\b|plan|traitement|prescription|ordonnance|examen|histoire|motif|suivi)\s*:|\n\s*$|$)/i)?.split("\n")[0];
  const cat = grab(/(?:^|\n)\s*(?:conduite [àa] tenir|cat|plan|traitement|prescription|ordonnance|proposition)\s*:?\s*([\s\S]*?)(?=\n\s*(?:conclusion|diagnostic|examen|histoire|motif|synth[eè]se)\s*:|$)/i);
  const motif = grab(/(?:^|\n)\s*motif\s*:?\s*([^\n]+)/i);
  const structuree = !!(concl || cat);
  return { concl, cat, motif, structuree, prescriptif: cat ?? note };
}

const DRUGS = /\b(parac[ée]tamol|dolip?rane|dafalgan|efferalgan|ibuprof[èe]ne|advil|nurofen|k[ée]toprof[èe]ne|diclof[ée]nac|naprox[èe]ne|amoxicilline|augmentin|c[ée]fixime|azithromycine|clarithromycine|pristinamycine|ofloxacine|ciprofloxacine|fosfomycine|nitrofuranto[iï]ne|pr[ée]dnisolone|prednisone|cortico[iï]des?|om[ée]prazole|[ée]som[ée]prazole|pantoprazole|tramadol|cod[ée]ine|l[ée]vothyrox(?:ine)?|metformine|ramipril|p[ée]rindopril|amlodipine|atorvastatine|rosuvastatine|simvastatine|bisoprolol|salbutamol|ventoline|acide folique|fer|vitamine d|cholecalcif[ée]rol|desloratadine|cetirizine|phloroglucinol|spasfon|dompéridone|m[ée]toclopramide|lop[ée]ramide|smecta|diosmectite|sertraline|escitalopram|paroxetine|alprazolam|zolpidem|hydroxyzine|amorolfine|[ée]conazole|fluconazole|aciclovir|valaciclovir|vaccin [a-zé]+|dtp|revaxis|bo?ostrixtetra)\b\s*(\d+(?:[.,]\d+)?\s*(?:mg|g|µg|mcg|ui)(?:\s*\/\s*kg)?)?/gi;
const SPECIALITES: [RegExp, string][] = [[/rhumat/, "rhumatologie"], [/cardio/, "cardiologie"], [/neurol/, "neurologie"], [/gyn[ée]co/, "gynécologie"], [/pneumo/, "pneumologie"], [/dermat/, "dermatologie"], [/psychiatr/, "psychiatrie"], [/psycholog/, "psychologie"], [/\borl\b|oto/, "ORL"], [/ophtalm/, "ophtalmologie"], [/endocrin|diab[ée]to/, "endocrinologie"], [/gastro|h[ée]pato/, "gastro-entérologie"], [/\burolog/, "urologie"], [/orthop|chirurg/, "chirurgie orthopédique"], [/p[ée]diatr/, "pédiatrie"], [/n[ée]phro/, "néphrologie"], [/h[ée]mato/, "hématologie"], [/oncolog|canc[ée]ro/, "oncologie"], [/allergo/, "allergologie"], [/g[ée]riatr/, "gériatrie"], [/addicto/, "addictologie"], [/di[ée]t[ée]t|nutrition/, "diététique"], [/sage-?femme/, "sage-femme"], [/podolog/, "podologie"], [/orthophon/, "orthophonie"], [/urgences?/, "urgences"]];
const specialiteDe = (s: string) => SPECIALITES.find(([re]) => re.test(s))?.[1];
/** Les phrases (ponctuation ou retour à la ligne) d'un texte normalisé. */
const phrasesDe = (t: string) => t.split(/[.;\n]+/).map((x) => x.trim()).filter(Boolean);
const nettoie = (s: string) => s.replace(/\s+/g, " ").replace(/[.:,;]+$/, "").trim();
const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Posologie et durée lues dans le segment qui suit un médicament — borné à la virgule, au point ou au médicament suivant. */
function posologieDe(seg: string, dci: string): { posologie: string; duree?: string } {
  const s = norm(seg);
  const d = /(\d+)\s*(j\b|jour|jours|sem\b|semaine|semaines|mois)/.exec(s);
  const duree = d ? `${d[1]} ${/^j/.test(d[2]) ? "jours" : /^s/.test(d[2]) ? "semaines" : "mois"}` : undefined;
  const posologie =
    /matin,? midi et soir|3\s*(?:x|fois)\s*(?:par|\/)\s*j|3\s*\/\s*j|trois fois/.test(s) ? "1 prise matin, midi et soir" :
    /matin et soir|2\s*(?:x|fois)\s*(?:par|\/)\s*j|2\s*\/\s*j|deux fois/.test(s) ? "1 prise matin et soir" :
    /le matin|1\s*(?:x|fois)\s*(?:par|\/)\s*j|1\s*\/\s*j|une fois par jour|par jour\b/.test(s) ? "1 prise le matin" :
    /le soir|au coucher/.test(s) ? "1 prise le soir" :
    /toutes les (\d+)\s*h/.test(s) ? `1 prise toutes les ${/toutes les (\d+)\s*h/.exec(s)![1]} h` :
    /si douleur|si besoin|si fievre|a la demande|en cas de/.test(s) ? "1 prise si besoin, 3 par jour au plus" :
    /dose unique|en une prise/.test(s) ? "dose unique" :
    /renouvel/.test(s) ? "sans changement" :
    `selon la note${dci ? "" : ""}`;
  return { posologie, duree };
}

export async function* simulateCompose(input: ComposeInput): AsyncGenerator<ComposeEvent> {
  const queue: ComposeEvent[] = [];
  const ctx: ToolCtx = { input, actions: [], references: [], locus: 0, patient: resolvePatient(input), emit: (ev) => queue.push(ev) };
  const flush = function* () { while (queue.length) yield queue.shift()!; };
  const call = async (name: string, arg: Record<string, unknown>) => executeTool(name, arg, ctx);
  const note = input.ecran === "note" && !!input.note;
  const sec = note ? sections(input.note!) : undefined;
  /** Le texte que les règles d'action lisent : la conduite à tenir d'une note structurée, sinon tout. */
  const source = note ? sec!.prescriptif : input.texte;
  const t = norm(source);
  const tout = norm(note ? `${input.note}\n${input.texte}` : input.texte);
  const phrases: string[] = [];
  const dit = (re: RegExp) => re.test(t);
  /** La phrase de `source` qui contient un déclencheur, pour n'en lire que le contexte proche. */
  const phraseAvec = (re: RegExp) => phrasesDe(t).find((p) => re.test(p));

  yield { step: "reflexion", titre: "Je lis le dossier et la demande" };
  await sleep(300);

  // Depuis l'accueil : le patient nommé devient le contexte ; un nom partagé par deux dossiers demande le prénom.
  let ambigu = false;
  if (!ctx.patient) {
    const found = trouvePatient(input.texte);
    if (found.ambigu) ambigu = true;
    else if (found.id) { ctx.patient = fromDataset(found.id); yield { step: "reflexion", titre: "J'ouvre le dossier" }; await call("ouvrir", { cible: "patient", patientId: found.id }); yield* flush(); }
  }
  const d = ctx.patient;
  const prenom = d?.prenom ?? "";
  const mineur = (d?.age ?? 99) < 16;
  const chroniques = d ? d.meds.filter((m) => m.chronique) : [];
  const dureeMois = /(\d+)\s*mois/.exec(phraseAvec(/renouvel|ordo|pour \d+ mois/) ?? "")?.[1] ?? "3";
  const concl = sec?.concl ? nettoie(sec.concl) : undefined;

  // Une note de consultation : ce qu'elle établit va au dossier.
  if (note && d) {
    yield { step: "reflexion", titre: "Je lis la note" }; await sleep(350);
    // Sans « Conclusion : », la première phrase qui n'est pas une consigne (prolonge, renouvelle, adresser…) ; sinon le problème suivi.
    const chroniqueCite = !!d.chronique && norm(d.chronique).split(/\W+/).filter((w) => w.length > 5).some((w) => tout.includes(w));
    const libelle = concl ?? nettoie(input.note!.split(/\n|\. /).map((l) => l.trim()).find((l) => l.length > 12 && !/^(motif|histoire|examen)\s*:/i.test(l) && !/^(donc|on fait|on prolonge|prolonge|renouvel|adress|rappel|revoir|kin[ée]|ordo|arr[êe]t|courrier|mail|message|je |alors)/i.test(norm(l))) ?? (chroniqueCite && d.chronique ? `${d.chronique} · suivi` : "Consultation"));
    const motif = sec?.motif ? nettoie(sec.motif) : undefined;
    await call("inscrire_au_dossier", { type: "probleme", libelle: majuscule(libelle.slice(0, 90)), detail: motif ? `Motif : ${motif}` : undefined, justification: "Conclusion de la note du jour." });
    const mesures = [...input.note!.matchAll(/\b(TA|PA|tension)\s*:?\s*(\d{2,3}\s*\/\s*\d{2,3})|\b(poids)\s*:?\s*(\d{2,3}(?:[.,]\d)?)\s*kg|\b(temp[ée]rature|T°)\s*:?\s*(\d{2}(?:[.,]\d)?)|\b(sat|SpO2)\s*:?\s*(\d{2})\s*%/gi)];
    for (const m of mesures.slice(0, 3)) await call("inscrire_au_dossier", { type: "mesure", libelle: m[0].replace(/\s+/g, " "), justification: "Mesure relevée dans la note." });
    yield* flush();
    phrases.push(`${majuscule(libelle).replace(/\.$/, "")}.`);
  }

  /* ---------------- Ordonnances : une par nature ---------------- */
  type Ligne = { libelle: string; posologie?: string; duree?: string; renouvellement?: number };
  const renouvel = dit(/\brenouvel(?![^.\n]{0,14}arret)/);
  const veutOrdo = dit(/\b(ordo|ordonnance|prescri[st]|prescription)\b/) || renouvel;
  const matches = [...source.matchAll(DRUGS)].filter((m) => {
    const avant = norm(source.slice(Math.max(0, m.index! - 45), m.index!));
    // Dans l'anamnèse : « a pris », « automédication », « sous … depuis » — ce n'est pas une prescription.
    return !/(automedication|a pris|avait pris|prend deja|prenait|sous\s*$|depuis|habituel|allergi|intoleran)\s*[^.\n]{0,20}$/.test(avant);
  });
  const medLignes: Ligne[] = [];
  if (d) {
    const nommes = d.meds.filter((m) => dit(new RegExp(`\\b${norm(m.dci).slice(0, 6)}`)));
    if (renouvel) for (const m of (nommes.length ? nommes : chroniques)) medLignes.push({ libelle: `${m.dci}${m.dosage ? " " + m.dosage : ""}`, posologie: m.posologie, duree: `${dureeMois} mois` });
    for (const m of matches) {
      const dci = m[1].toLowerCase().replace(/\s+/g, " ");
      if (medLignes.some((l) => l.libelle.startsWith(dci))) continue;
      if (/^(vaccin|dtp|revaxis|boostrix)/.test(dci)) { medLignes.push({ libelle: /dtp|revaxis|boostrix/.test(dci) || /dtp/.test(t) ? "Vaccin dTP (Revaxis) · rappel" : `Vaccin ${dci.replace(/^vaccin\s*/, "")}`, posologie: "1 injection IM" }); continue; }
      const fin = source.slice(m.index! + m[0].length);
      const next = DRUGS.exec(fin); DRUGS.lastIndex = 0;
      const seg = fin.slice(0, Math.min(next ? next.index : 80, fin.search(/[.;\n]/) === -1 ? 80 : fin.search(/[.;\n]/)));
      const { posologie, duree } = posologieDe(seg, dci);
      medLignes.push({ libelle: `${dci}${m[2] ? " " + m[2].replace(/\s+/g, " ").replace(/\s*\/\s*kg/, "/kg") : ""}`, posologie, duree });
    }
    if (!medLignes.length && veutOrdo && !note) {
      const lib = input.texte.replace(/^(ordo(nnance)?|prescri[st]?|prescription)\s*:?\s*/i, "").replace(/\s*pour \d+ mois.*$/i, "").trim();
      if (lib && !dit(/\b(bio|nfs|tsh|creat|hba1c|radio|scanner|irm|echo|kine)/)) medLignes.push({ libelle: lib, posologie: "à préciser", duree: `${dureeMois} mois` });
    }
  }
  if (medLignes.length && d) {
    yield { step: "reflexion", titre: "Je rédige l'ordonnance" }; await sleep(350);
    await call("proposer_ordonnance", { type: "medicament", lignes: medLignes, justification: renouvel ? "Renouvellement des traitements de fond, sans changement." : note ? "Prescrite dans la conduite à tenir de la note." : "Rédigée depuis la demande ; à relire avant signature." });
    yield* flush();
    phrases.push(`Ordonnance prête${renouvel ? " : renouvellement sans changement" : ""}.`);
  }
  // Biologie : un bilan nommé dans la conduite à tenir (pas « bilan reçu », « résultats montrent »).
  const bioPhrase = phraseAvec(/\b(bilan|nfs|tsh|creat|hba1c|glycemie|iono|prise de sang|ecbu|crp|ferritine|vitamine d|bilan lipidique|ldl|serologie|beta ?hcg|toxoplasm|rubeole)\b/);
  if (bioPhrase && d && !/\b(recu|recus|montre|revient|resultat|normal|normaux|en attente|arrive)\b/.test(bioPhrase)) {
    const items: string[] = [];
    const EX: [RegExp, string][] = [[/\bnfs\b/, "NFS"], [/\btsh\b/, "TSH"], [/creat/, "créatinine, DFG"], [/hba1c/, "HbA1c"], [/glycemie/, "glycémie à jeun"], [/\biono/, "ionogramme"], [/\bcrp\b/, "CRP"], [/ferritine/, "ferritine"], [/vitamine d/, "vitamine D"], [/lipidique|ldl/, "bilan lipidique"], [/ecbu/, "ECBU"], [/beta ?hcg/, "β-hCG"], [/toxoplasm/, "sérologie toxoplasmose"], [/rubeole/, "sérologie rubéole"], [/serologie/, "sérologies"]];
    for (const [re, lab] of EX) if (re.test(bioPhrase) && !items.includes(lab)) items.push(lab);
    if (!items.length) items.push(/grossesse|trimestre/.test(tout) ? "Bilan du 1er trimestre de grossesse" : /renal|hta|hypertension/.test(tout) ? "Bilan biologique de suivi (ionogramme, créatinine, DFG)" : "Bilan biologique");
    yield { step: "reflexion", titre: "Je prépare la biologie" }; await sleep(250);
    await call("proposer_ordonnance", { type: "biologie", lignes: items.map((libelle) => ({ libelle })), justification: note ? "Demandé dans la conduite à tenir." : "Demandé." });
    yield* flush(); phrases.push("Bilan biologique prescrit.");
  }
  // Imagerie demandée (pas reçue).
  const imgPhrase = phraseAvec(/\b(radio(graphie)?|scanner|irm|echo(graphie)?|mammographie|doppler)\b/);
  if (imgPhrase && d && !/\b(recu|recus|montre|revient|resultat|normal|normaux|en attente|arrive|lu|vu)\b/.test(imgPhrase)) {
    const ex = /irm/.test(imgPhrase) ? "IRM" : /scanner/.test(imgPhrase) ? "Scanner" : /mammo/.test(imgPhrase) ? "Mammographie" : /doppler/.test(imgPhrase) ? "Écho-doppler" : /echo/.test(imgPhrase) ? "Échographie" : "Radiographie";
    const zone = /(?:radio|scanner|irm|echo(?:graphie)?|doppler)\s+(?:du|de la|de l'|des|d'|de)\s+([a-z' -]{3,30}?)(?=\s*(?:,|$|\bet\b|\bpour\b|\bsi\b))/.exec(imgPhrase)?.[1];
    yield { step: "reflexion", titre: "Je prépare la demande d'imagerie" }; await sleep(250);
    await call("proposer_ordonnance", { type: "imagerie", lignes: [{ libelle: `${ex}${zone ? ` ${zone.trim()}` : ""}` }], justification: note ? "Demandée dans la conduite à tenir." : "Demandée." });
    yield* flush(); phrases.push("Imagerie demandée.");
  }
  // Paramédical : la kiné est une ordonnance, pas un courrier.
  const kine = phraseAvec(/\bkin[ée]|\bseances?\b|orthophon|p[ée]dicure|infirmi/);
  if (kine && d && !/(pas de|sans) kin/.test(kine)) {
    const n = /(\d+)\s*seances?/.exec(kine)?.[1];
    const acte = /orthophon/.test(kine) ? "Orthophonie" : /infirmi/.test(kine) ? "Soins infirmiers" : /pedicure/.test(kine) ? "Pédicurie-podologie" : "Kinésithérapie";
    const pour = concl ?? /kin[ée](?:sith[ée]rapie)?\s*(?:pour|:)\s*([^,.\n]{3,60})/.exec(kine)?.[1];
    yield { step: "reflexion", titre: "Je rédige l'ordonnance paramédicale" }; await sleep(250);
    await call("proposer_ordonnance", { type: "paramedical", lignes: [{ libelle: `${acte}${n ? ` · ${n} séances` : ""}${pour ? ` · ${nettoie(pour)}` : ""}${/domicile/.test(kine) ? " · à domicile" : ""}` }], justification: note ? "Prescrite dans la conduite à tenir." : "Demandée." });
    yield* flush(); phrases.push(`${acte} prescrite.`);
  }

  /* ---------------- Rendez-vous ---------------- */
  const rdvPhrase = phraseAvec(/\b(rdv|rendez-? ?vous|revoir|recontrol|a revoir|controle (dans|a))\b/);
  if (rdvPhrase && d && !/\b(si|en cas|selon|prochain rendez|au prochain|dernier rendez|a rate|annul)\b/.test(rdvPhrase) && !dit(/\bpas de (rdv|rendez)/)) {
    yield { step: "reflexion", titre: "Je cherche un créneau" }; await sleep(300);
    const delai = delaiJours(rdvPhrase) ?? delaiJours(t);
    await call("proposer_rdv", { dans_jours: delai ?? 42, duree_min: /(\d+)\s*min/.test(rdvPhrase) ? Number(/(\d+)\s*min/.exec(rdvPhrase)![1]) : 20, moment: /matin/.test(rdvPhrase) ? "matin" : /apr/.test(rdvPhrase) ? "apres-midi" : undefined, motif: /suivi|contr|revoir/.test(rdvPhrase) ? `Consultation de suivi${concl ? ` · ${concl.slice(0, 40)}` : ""}` : "Consultation", justification: delai ? "Créneau libre le plus proche du délai demandé ; SMS de confirmation." : "Délai non précisé : six semaines par défaut, à ajuster." });
    yield* flush();
    phrases.push("Créneau réservé, SMS préparé.");
  }

  /* ---------------- Message ---------------- */
  const msgPhrase = phraseAvec(/\b(mail|message|sms|previens|prevenir|rassur|reponds|repondre|ecris|ecrire)\b/);
  if (msgPhrase && d && !/\b(pas de|sans) (mail|message|sms)/.test(msgPhrase)) {
    yield { step: "reflexion", titre: "Je rédige le message" }; await sleep(350);
    const normaux = d.lastLabNormal === true;
    const a = /pharmac/.test(msgPhrase) ? "pharmacie" : /confr|cardio|neuro|gyn|pneumo|rhumat|special|collegue/.test(msgPhrase) ? "confrere" : /secret/.test(msgPhrase) ? "secretariat" : "patient";
    const resultats = /resultat|bio|analyse|prise de sang/.test(msgPhrase) && d.lastLabNormal !== undefined;
    const ouvert = a === "patient" ? (mineur ? `Bonjour, concernant ${prenom} : ` : `Bonjour ${prenom}, `) : "";
    const clause = /\bque\s+(.{3,200})$/i.exec(input.texte.trim().replace(/[.!]+$/, ""))?.[1];
    const corps = a === "patient" && clause
      ? `${ouvert}${clause.charAt(0).toLowerCase() + clause.slice(1)}. ${/rdv|rendez|prochain/.test(msgPhrase) ? "On en reparle au prochain rendez-vous." : "N'hésitez pas à m'écrire si vous avez une question."} Bien à vous, Dr Vandepitterie`
      : a === "patient"
      ? `${ouvert}${resultats ? (normaux ? "vos derniers résultats sont rassurants, tout est dans la norme" : "j'ai bien reçu vos résultats et je les ai regardés") : concl ? `suite à la consultation de ce jour (${concl.toLowerCase()}), tout est en ordre` : /rassur/.test(msgPhrase) ? "rien d'inquiétant dans ce que nous avons vu ensemble" : "je reviens vers vous comme convenu"}. ${/rdv|rendez|prochain/.test(msgPhrase) ? "On en reparle au prochain rendez-vous." : "N'hésitez pas à m'écrire si vous avez une question."} Bien à vous, Dr Vandepitterie`
      : a === "pharmacie" ? `Bonjour, vous pouvez délivrer en dépannage ; l'ordonnance renouvelée vous arrive par MSSanté. Merci. Dr Vandepitterie`
      : a === "secretariat" ? `Merci de ${/rappel|appel/.test(msgPhrase) ? `rappeler ${d.nom}` : `prévenir ${d.nom}`}${concl ? ` (${concl.toLowerCase()})` : ""}. Dr Vandepitterie`
      : `Cher confrère, chère consœur, je vous adresse ${d.nom} pour avis${concl ? ` (${concl.toLowerCase()})` : ""}. Les éléments du dossier suivent. Bien confraternellement, Dr Vandepitterie`;
    await call("proposer_message", { a, nom: a === "patient" && mineur ? `Parents de ${prenom}` : undefined, objet: resultats ? "Vos résultats" : /rappel/.test(msgPhrase) ? "Rappel" : concl ? "Suite à la consultation" : "Message du cabinet", corps, justification: resultats && normaux ? "Dernière biologie sans anomalie." : "Rédigé depuis la demande ; rien d'inventé." });
    yield* flush();
    phrases.push("Message rédigé.");
  }

  /* ---------------- Courrier d'adressage ---------------- */
  const crPhrase = phraseAvec(/\b(courrier|adresser?|adressage|adresse (a|au|en)|lettre|avis (du|d un|de) |orient)\b/);
  if (crPhrase && d && !/\b(pas de|sans|aucun) (courrier|lettre|adressage)/.test(crPhrase) && !/\bavis d arret|arret de travail/.test(crPhrase) && !/\b(mail|message|sms)\b/.test(crPhrase)) {
    const spe = specialiteDe(crPhrase) ?? (/\bkin[ée]/.test(crPhrase) ? undefined : specialiteDe(t));
    if (spe || !/\bkin[ée]/.test(crPhrase)) {
      yield { step: "reflexion", titre: "Je rédige le courrier" }; await sleep(350);
      const pour = concl ?? nettoie(/(?:pour|:)\s*([^,.\n]{3,80})/.exec(crPhrase)?.[1] ?? "avis");
      const dest = spe ? `Dr — ${spe}` : "Dr — confrère";
      await call("proposer_courrier", { type: "adressage", destinataire: dest, specialite: spe, titre: `Adressage${spe ? ` en ${spe}` : ""}`, corps: `Cher confrère, chère consœur,\n\nJe vous adresse ${d.nom}, ${d.age} ans, pour ${pour.toLowerCase()}.\n\n${d.allergies.length ? `Allergies : ${d.allergies.join(", ")}.\n` : ""}${chroniques.length ? `Traitement en cours : ${chroniques.map((m) => `${m.dci}${m.dosage ? " " + m.dosage : ""}`).join(", ")}.\n` : ""}\nBien confraternellement,\nDr Vandepitterie`, justification: "Adressage demandé ; les éléments utiles du dossier sont repris." });
      yield* flush();
      phrases.push(`Courrier d'adressage${spe ? ` en ${spe}` : ""} rédigé.`);
    }
  }
  // Certificat (sport, absence, aptitude) et déclaration de maladie professionnelle.
  const certPhrase = phraseAvec(/\bcertificat|\battestation\b|non contre-?indication|aptitude/);
  if (certPhrase && d && !/(pas de|sans) certificat/.test(certPhrase)) {
    const sport = /sport|licence|club|competition|non contre/.test(certPhrase) || /sport|licence/.test(tout);
    const titre = sport ? "Certificat médical d'absence de contre-indication à la pratique du sport" : /absence|ecole|scolaire|creche/.test(certPhrase) ? "Certificat médical d'absence" : /attestation/.test(certPhrase) ? "Attestation médicale" : "Certificat médical";
    yield { step: "reflexion", titre: "Je rédige le certificat" }; await sleep(250);
    await call("proposer_courrier", { type: sport || !/attestation/.test(certPhrase) ? "certificat" : "attestation", destinataire: sport ? "Club ou fédération (à qui de droit)" : "À qui de droit", titre, corps: sport ? `Je soussigné, Dr Vandepitterie, certifie avoir examiné ce jour ${d.nom}, né(e) le ${d.ehr.match(/\d{2}\/\d{2}\/\d{4}/)?.[0] ?? "—"}, et n'avoir pas constaté, à ce jour, de contre-indication clinique à la pratique du sport${/competition/.test(tout) ? ", y compris en compétition" : ""}.\n\nCertificat remis en main propre à l'intéressé(e) pour faire valoir ce que de droit.` : `Je soussigné, Dr Vandepitterie, certifie avoir examiné ce jour ${d.nom}${concl ? ` et constaté : ${concl.toLowerCase()}` : ""}.\n\nCertificat remis en main propre pour faire valoir ce que de droit.`, justification: "Demandé ; remis au patient, rien n'est envoyé." });
    yield* flush(); phrases.push("Certificat rédigé.");
  }
  if (dit(/maladie professionnelle|declaration (de )?mp\b|\bmp\b/) && d && !/pas de (declaration|mp)/.test(t)) {
    yield { step: "reflexion", titre: "Je prépare le certificat de maladie professionnelle" }; await sleep(250);
    await call("proposer_courrier", { type: "certificat", destinataire: "CPAM · service maladies professionnelles", titre: "Certificat médical initial · maladie professionnelle", corps: `Je soussigné, Dr Vandepitterie, certifie avoir examiné ce jour ${d.nom}${concl ? ` : ${concl.toLowerCase()}` : d.chronique ? ` : ${d.chronique.toLowerCase()}` : ""}.\n\nAffection susceptible d'être d'origine professionnelle (tableau à préciser). Le patient est informé de la démarche de déclaration auprès de sa caisse.`, justification: "Déclaration demandée ; le tableau et la date de première constatation sont à vérifier avant signature." });
    yield* flush(); phrases.push("Certificat de maladie professionnelle préparé.");
  }

  /* ---------------- Arrêt de travail ---------------- */
  const atPhrase = phraseAvec(/\b(arret (de travail|maladie)|\baat\b|arret\b(?! (du|de la|des|de l) (tabac|cigarette|alcool|pilule|traitement)))/);
  if (atPhrase && d && !/\b(pas d arret|sans arret|reprise|fin d arret)\b/.test(atPhrase) && !/\bavis d arret/.test(atPhrase)) {
    yield { step: "reflexion", titre: "Je prépare l'arrêt" }; await sleep(300);
    const jArret = /arret[^.\n]*?(\d+)\s*(j\b|jour|jours|sem\b|semaine|semaines|mois)/.exec(atPhrase) ?? /(\d+)\s*(j\b|jour|jours|sem\b|semaine|semaines|mois)[^.\n]*?arret/.exec(atPhrase);
    const jours = jArret ? Number(jArret[1]) * (/^sem/.test(jArret[2]) ? 7 : /^mois/.test(jArret[2]) ? 30 : 1) : undefined;
    const sorties = /(non|pas|aucune) (autoris|sortie)|sans sortie|sorties? interdite/.test(atPhrase) ? "non" : /libre/.test(atPhrase) ? "libres" : "oui";
    await call("proposer_arret", { jours: jours ?? 5, sorties, prolongation: /prolong/.test(atPhrase) || /prolong/.test(t), temps_partiel: /temps partiel|mi-temps/.test(atPhrase), motif: concl ?? (d.chronique && norm(d.chronique).split(/\W+/).filter((w) => w.length > 5).some((w) => tout.includes(w)) ? d.chronique : note ? "À préciser" : nettoie(/(?:pour|motif)\s*:?\s*([^,.\n]{3,80})/.exec(atPhrase)?.[1] ?? "À préciser")), justification: jours ? "Durée et sorties telles que dictées." : "Durée non précisée : cinq jours par défaut, à ajuster." });
    yield* flush();
    phrases.push("Arrêt préparé.");
  }

  /* ---------------- Verser, ouvrir ---------------- */
  if (dit(/\b(verse|inscri|au dossier)\b/) && d && !note) {
    yield { step: "reflexion", titre: "J'inscris au dossier" }; await sleep(300);
    await call("inscrire_au_dossier", { type: "note", libelle: "Faits extraits du document ouvert", detail: "", justification: "Lecture du document par Locus, versée au dossier." });
    yield* flush();
    phrases.push("Faits inscrits au dossier.");
  }
  if (!note && !ctx.actions.length) {
    if (dit(/courriers? non lus|arrive ce matin|\bboite\b|reception/)) { await call("ouvrir", { cible: "boite", boite: /bio|result/.test(t) ? "bio" : /message/.test(t) ? "messages" : "courriers" }); yield* flush(); }
    else if (dit(/hors norme|resultats? bio/)) { await call("ouvrir", { cible: "boite", boite: "bio" }); yield* flush(); }
    else if (dit(/\b(message|pharmacie)\b/) && !d) { await call("ouvrir", { cible: "boite", boite: "messages" }); yield* flush(); }
    else if (dit(/(toutes? les|les) (tsh|creat|hba1c|ldl|bio)/) && d && !d.local) { await call("ouvrir", { cible: "documents", patientId: d.id, type: "Biologie" }); yield* flush(); }
  }

  /* ---------------- Une question : Locus répond ---------------- */
  const question = dit(/\?|\b(quel|quelle|quels|quelles|combien|pourquoi|comment|faut-il|que faire|conduite a tenir|cible|dose|posologie|interaction|recommand)\b/);
  const verbeAction = dit(/\b(ordo|ordonnance|prescri|renouvel|rdv|rendez|revoir|mail|message|sms|courrier|adresse|arret|aat|certificat)\b/);
  if (!note && !ctx.actions.filter((a) => a.kind !== "naviguer").length) {
    if (ambigu) phrases.push("Plusieurs patients portent ce nom : précisez le prénom, ou ouvrez le dossier avant de demander.");
    else if (!d && verbeAction) phrases.push("Je n'ai pas reconnu le patient : nommez-le (prénom et nom) ou ouvrez son dossier, puis redemandez.");
    else if (question && !ctx.actions.length) {
      yield { step: "reflexion", titre: "Je consulte Locus" };
      const out = await call("locus_retrieve", { question: input.texte });
      yield* flush();
      const first = out.split("\n").find((l) => l.trim() && !/^#/.test(l)) ?? out.split("\n")[0];
      phrases.push((out.split("\n")[0].replace(/^#\s*/, "") + (first && first !== out.split("\n")[0] ? " " + first : "")).slice(0, 420));
      // Le contrôle que la réponse implique, seulement s'il concerne un problème du dossier.
      const ehr = norm(d?.ehr ?? "");
      if (d && /controle|surveill|dans 3 mois|6 mois|bilan/i.test(out) && ((/hba1c/i.test(out) && /diabet/.test(ehr)) || (/tsh/i.test(out) && /thyro/.test(ehr)))) {
        await call("proposer_ordonnance", { type: "biologie", lignes: [{ libelle: /hba1c/i.test(out) ? "HbA1c, créatinine, DFG, microalbuminurie" : "TSH", duree: "à faire dans 3 mois" }], justification: "Contrôle que la recommandation implique [1]." });
        yield* flush();
      }
    } else if (!ctx.actions.length) phrases.push(`Je n'ai rien reconnu dans « ${input.texte.slice(0, 60)}${input.texte.length > 60 ? "…" : ""} ». Demandez une ordonnance, un rendez-vous, un message, un courrier, un arrêt, ou posez une question.`);
  }

  const plan: ComposePlan = { synthese: phrases.join(" ") || "Prêt à valider.", actions: ctx.actions, references: ctx.references, via: "simulation", locus: ctx.locus, patient: d ? { nom: d.nom, sexe: d.sexe, age: d.age, naissance: d.naissance, allergies: d.allergies } : undefined };
  yield { step: "done", plan };
}
