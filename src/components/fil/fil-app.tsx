"use client";
import * as React from "react";
import Link from "next/link";

import type { World, Scene, Intent, FilEntry, WorldPatient, Consigne } from "@/fil/types";
import { parseIntent } from "@/fil/intent";
import { FilProvider, useFil } from "@/fil/store";
import { StudioProvider, useStudio } from "@/store/studio";
import { genericScript } from "@/data/consultations";
import type { Proposal, Draft, Prescription, TranscriptTurn } from "@/domain/types";
import { Composer } from "./composer";
import { Stream } from "./stream";
import { SceneMatinee, ScenePatient, SceneCourbe, SceneTable, SceneObjet, SceneLocus, SceneRecu, SceneSessions, SceneConsignes, SceneAide } from "./scenes";
import { SceneConsultation } from "./consult-scene";
import { norm } from "@/fil/intent";
import { cn } from "@/lib/cn";

export function FilApp({ world }: { world: World }) {
  return (
    <StudioProvider>
      <FilProvider>
        <Inner world={world} />
      </FilProvider>
    </StudioProvider>
  );
}

let clock = 0;
/** L'heure « de session » : on avance de quelques secondes à chaque entrée pour garder l'ordre du fil. */
function nowIso(): string {
  clock += 1;
  const d = new Date(new Date("2026-10-15T08:05:00+02:00").getTime() + clock * 7000);
  /* ISO en heure de Paris (+02:00 en octobre), comme le jeu de données : le fil se trie par date, pas par chaîne. */
  const paris = new Date(d.getTime() + 2 * 3600_000);
  return paris.toISOString().replace(/\.\d{3}Z$/, "+02:00");
}

function Inner({ world }: { world: World }) {
  const { state, dispatch } = useFil();
  const studio = useStudio();
  const patients = React.useMemo(() => Object.fromEntries(world.patients.map((p) => [p.id, p])), [world.patients]);
  const refs = React.useMemo(() => world.patients.map((p) => ({ id: p.id, nom: p.nom, prenom: p.prenom, nomUsage: p.nomUsage })), [world.patients]);
  const entries = React.useMemo(() => [...world.seed, ...state.entries], [world.seed, state.entries]);
  const focus = state.focus ? patients[state.focus] : undefined;
  const [busy, setBusy] = React.useState(false);
  const timers = React.useRef<number[]>([]);
  React.useEffect(() => () => timers.current.forEach(clearTimeout), []);

  /* Une proposition, telle qu'elle est maintenant (brouillon corrigé, décisions de session). */
  const current = React.useCallback((p: Proposal): Proposal => state.drafts[p.id] ?? p, [state.drafts]);
  const etatDe = React.useCallback((p: Proposal) => studio.etatDe(p), [studio]);
  const allProposals = React.useCallback((pid: string): Proposal[] => [...Object.values(state.drafts).filter((d) => d.patientId === pid && d.id.startsWith("live.")), ...studio.state.propositions.filter((x) => x.patientId === pid), ...(patients[pid]?.proposals ?? [])].map(current), [state.drafts, studio.state.propositions, patients, current]);

  const add = React.useCallback((e: Omit<FilEntry, "id" | "at"> & { id?: string; at?: string }) => {
    dispatch({ type: "add", entry: { id: e.id ?? `s.${Date.now()}.${Math.random().toString(36).slice(2, 7)}`, at: e.at ?? nowIso(), ...e } });
  }, [dispatch]);
  const sol = React.useCallback((corps: string, extra: Partial<FilEntry> = {}) => add({ who: "sol", corps, ...extra }), [add]);
  const setScene = React.useCallback((scene: Scene) => dispatch({ type: "scene", scene }), [dispatch]);
  const setFocus = React.useCallback((patientId?: string) => dispatch({ type: "focus", patientId }), [dispatch]);

  /** Un travail de Locus, visible dans le fil, qui change d'état après un délai. */
  const session = React.useCallback((titre: string, patientId: string | undefined, opts: { delai?: number; fin?: "fait" | "attente" | "echec"; titreFin?: string } = {}) => {
    const id = `sess.${Date.now()}.${Math.random().toString(36).slice(2, 6)}`;
    add({ id, who: "session", patientId, titre, session: { etat: "en-cours" } });
    timers.current.push(window.setTimeout(() => dispatch({ type: "session", id, etat: opts.fin ?? "fait", titre: opts.titreFin }), opts.delai ?? 1800 + Math.random() * 1500));
  }, [add, dispatch]);

  const effets = React.useCallback((p: Proposal, patientId: string) => {
    const nom = patients[patientId]?.nom ?? "";
    switch (p.action) {
      case "ordonnance": session(`Ordonnance numérique transmise (${nom})`, patientId); session(`Déposée dans Mon Espace Santé (${nom})`, patientId, { delai: 3200 }); break;
      case "courrier": session(`Courrier envoyé par MSSanté (${nom})`, patientId); break;
      case "arret-travail": session(`Arrêt de travail télétransmis (AAT amelipro) — ${nom}`, patientId); session(`Volet patient déposé dans Mon Espace Santé (${nom})`, patientId, { delai: 3400 }); break;
      case "message-patient": session(`Message envoyé à ${nom}`, patientId, { delai: 900 }); break;
      case "message-confrere": session(`Message envoyé par MSSanté (${nom})`, patientId, { delai: 900 }); break;
      case "creer-enregistrement": case "modifier-enregistrement": session(`Dossier mis à jour (${nom}) — résumé vivant recalculé`, patientId, { delai: 1200 }); break;
      case "rdv": session(`Rendez-vous posé (${nom})`, patientId, { delai: 800 }); break;
      case "codage": case "facturation": session(`FSE télétransmise (${nom})`, patientId); break;
      case "alimenter-dmp": session(`Déposé dans Mon Espace Santé (${nom})`, patientId); break;
      case "rappel": session(`Rappel posé (${nom})`, patientId, { delai: 700 }); break;
      default: break;
    }
  }, [patients, session]);

  const signer = React.useCallback((p: Proposal, patientId: string, silencieux = false) => {
    studio.dispatch({ type: "decide", id: p.id, etat: "validee" });
    effets(p, patientId);
    if (!silencieux) sol(`Signé : **${p.titre}**. Je transmets et je rends compte ici.`, { patientId });
  }, [studio, effets, sol]);

  const ouvrirObjet = React.useCallback((patientId: string, p: Proposal) => {
    setFocus(patientId);
    setScene({ type: "objet", patientId, proposal: current(p) });
  }, [setFocus, setScene, current]);

  const prochainObjet = React.useCallback((patientId: string, excl?: string) => allProposals(patientId).find((x) => x.id !== excl && etatDe(x) === "a-valider"), [allProposals, etatDe]);

  /* ---------------- l'exécution d'une intention ---------------- */
  const execute = React.useCallback((text: string, intent: Intent) => {
    add({ who: "moi", corps: text });
    if (state.solStopped && intent.kind !== "reprends" && intent.kind !== "stop" && intent.kind !== "aide") {
      sol("Je suis arrêté. Dites « reprends » pour que je reprenne.");
      return;
    }
    switch (intent.kind) {
      case "aide": setScene({ type: "aide" }); return;
      case "stop": dispatch({ type: "stop", value: true }); sol("Je m'arrête : rien ne part, rien ne se prépare. Dites « reprends »."); return;
      case "reprends": dispatch({ type: "stop", value: false }); sol("Je reprends."); return;
      case "matinee": setFocus(undefined); setScene({ type: "matinee" }); sol("Votre matinée, dans l'ordre des décisions. Delacroix d'abord : biologie, courrier cardio, et sa fille. Puis Garnier (arrêt), Moreau (grossesse), Perrin (angine), Roussel (tension).", { scene: { type: "matinee" } }); return;
      case "patient": { const p = patients[intent.patientId]; setFocus(p.id); setScene({ type: "patient", patientId: p.id }); const n = allProposals(p.id).filter((x) => etatDe(x) === "a-valider").length; sol(`${p.nom}, ${p.age} ans. ${p.ligne} ${n ? `${n} chose${n > 1 ? "s" : ""} prête${n > 1 ? "s" : ""} à signer.` : "Rien en attente."}`, { patientId: p.id, scene: { type: "patient", patientId: p.id } }); return; }
      case "courbe": { const p = patients[intent.patientId]; setFocus(p.id); const lecture = lectureCourbe(p, intent.mesure); setScene({ type: "courbe", patientId: p.id, mesure: intent.mesure }); sol(lecture, { patientId: p.id, scene: { type: "courbe", patientId: p.id, mesure: intent.mesure } }); return; }
      case "table": { const r = world.routines.find((x) => x.id === intent.routineId); if (!r) { sol("Je n'ai pas cette liste."); return; } setFocus(undefined); setScene({ type: "table", routineId: r.id }); const n = r.resultats.filter((x) => x.cible).length; sol(`${r.nom} : ${n} patient${n > 1 ? "s" : ""} ciblé${n > 1 ? "s" : ""}. ${r.autonomie === 2 ? "C'est fait (relances envoyées)." : "C'est préparé ; dites « signe tout » pour envoyer."}`, { scene: { type: "table", routineId: r.id } }); return; }
      case "besoin-patient": sol(`Pour qui ? Dites un nom (« ${intent.pour} pour Delacroix »), ou mettez un patient en focus.`); return;
      case "objet": {
        const p = patients[intent.patientId];
        setFocus(p.id);
        const cands = allProposals(p.id).filter((x) => etatDe(x) === "a-valider" && (intent.action === "quelconque" || x.action === intent.action || (intent.action === "message-patient" && x.action === "message-confrere")));
        if (cands.length) { setScene({ type: "objet", patientId: p.id, proposal: cands[0] }); sol(`Voici ${cands.length > 1 ? "la première des " + cands.length : "ce que j'ai préparé"} : **${cands[0].titre}**. Signez, corrigez en parlant, ou rejetez.`, { patientId: p.id, scene: { type: "objet", patientId: p.id, proposal: cands[0] } }); return; }
        if (intent.action === "ordonnance") {
          const chron = p.meds.filter((m) => m.type === "chronique");
          if (!chron.length) { sol(`Rien de préparé pour ${p.nom}, et pas de traitement chronique à renouveler. Dites-moi quoi prescrire.`, { patientId: p.id }); return; }
          const draft: Proposal = { id: `session.rx.${p.id}.${Date.now()}`, kind: "proposal", patientId: p.id, schema: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), provenance: { origin: "agent", actor: "locus", confidence: 0.85 }, status: "propose", action: "ordonnance", titre: `Renouvellement ${chron.length} ligne${chron.length > 1 ? "s" : ""}, 3 mois`, justification: `Renouvellement du traitement chronique de ${p.nom} à l'identique, 3 mois. Vérifié : allergies (${p.allergies.join(", ") || "aucune"}), pas de nouvelle alerte LAP.`, charge: { type: "medicament", date: "2026-10-15", lignes: chron.map((m) => ({ libelle: `${m.dci.toUpperCase()}${m.dosage ? " " + m.dosage : ""}`, dci: m.dci, posologie: m.posologie, duree: "3 mois", ald: m.ald })) } satisfies Draft<Prescription>, declencheur: { type: "praticien", libelle: `« ${text} »` }, autonomie: 1, etat: "a-valider", agent: "locus" };
          studio.dispatch({ type: "ajouter", proposal: draft });
          setScene({ type: "objet", patientId: p.id, proposal: draft });
          sol(`Rien n'était préparé : voici le renouvellement à l'identique (${chron.length} ligne${chron.length > 1 ? "s" : ""}, 3 mois). Corrigez en parlant.`, { patientId: p.id, scene: { type: "objet", patientId: p.id, proposal: draft } });
          return;
        }
        sol(`Rien de préparé de ce type pour ${p.nom}. Dites-moi quoi écrire, ou posez la question à Locus.`, { patientId: p.id });
        return;
      }
      case "signer": {
        /* « signe l'ordonnance » : si l'objet ouvert n'est pas celui-là, on l'ouvre d'abord. */
        if (intent.action && !intent.tout) {
          const scOk = state.scene.type === "objet" && (state.scene.proposal.action === intent.action || (intent.action === "message-patient" && state.scene.proposal.action === "message-confrere"));
          if (!scOk) {
            const pid0 = intent.patientId ?? (state.scene.type !== "vide" && state.scene.type !== "matinee" && state.scene.type !== "table" && state.scene.type !== "sessions" && state.scene.type !== "consignes" && state.scene.type !== "aide" && "patientId" in state.scene ? state.scene.patientId : undefined);
            if (!pid0) { sol("Pour qui ? Dites un nom."); return; }
            const cands = allProposals(pid0).filter((x) => etatDe(x) === "a-valider" && (x.action === intent.action || (intent.action === "message-patient" && x.action === "message-confrere")));
            if (!cands.length) { sol(`Rien de ce type à signer pour ${patients[pid0].nom}.`, { patientId: pid0 }); return; }
            setFocus(pid0);
            setScene({ type: "objet", patientId: pid0, proposal: cands[0] });
            sol(`Voici ${cands.length > 1 ? `la première des ${cands.length}` : "l'objet"} : **${cands[0].titre}**. Relisez, puis « signe » (ou corrigez en parlant).`, { patientId: pid0, scene: { type: "objet", patientId: pid0, proposal: cands[0] } });
            return;
          }
        }
        if (state.scene.type === "objet" && !intent.tout) {
          const p = current(state.scene.proposal); const pid = state.scene.patientId;
          if (etatDe(p) !== "a-valider") { sol("C'est déjà tranché."); return; }
          signer(p, pid);
          const next = prochainObjet(pid, p.id);
          setScene(next ? { type: "objet", patientId: pid, proposal: next } : { type: "patient", patientId: pid });
          if (next) sol(`Suivant : **${next.titre}**.`, { patientId: pid });
          return;
        }
        const pid = intent.patientId ?? (state.scene.type === "objet" || state.scene.type === "patient" || state.scene.type === "consultation" ? state.scene.patientId : undefined);
        if (!pid) { sol("Signer quoi ? Ouvrez un objet, ou dites un nom."); return; }
        const todo = allProposals(pid).filter((x) => etatDe(x) === "a-valider" && x.action !== "signaler");
        if (!todo.length) { sol(`Rien à signer pour ${patients[pid].nom}.`, { patientId: pid }); return; }
        todo.forEach((x) => signer(x, pid, true));
        sol(`Signé : ${todo.length} objet${todo.length > 1 ? "s" : ""} pour ${patients[pid].nom}. Je transmets.`, { patientId: pid });
        setScene({ type: "patient", patientId: pid });
        return;
      }
      case "rejeter": {
        if (state.scene.type !== "objet") { sol("Rejeter quoi ? Ouvrez un objet."); return; }
        const p = state.scene.proposal; const pid = state.scene.patientId;
        studio.dispatch({ type: "decide", id: p.id, etat: "rejetee", commentaire: text });
        sol(`Rejeté : **${p.titre}**. Je le retiens : je ne vous le reproposerai pas tel quel.`, { patientId: pid });
        const next = prochainObjet(pid, p.id);
        setScene(next ? { type: "objet", patientId: pid, proposal: next } : { type: "patient", patientId: pid });
        return;
      }
      case "corriger": {
        if (state.scene.type !== "objet") { sol("Corriger quoi ? Ouvrez un objet."); return; }
        const res = corriger(current(state.scene.proposal), intent.texte);
        if (!res) { sol("Je n'ai pas compris la correction. Essayez « plutôt 1 mois », « retire la statine », « ajoute du paracétamol »."); return; }
        dispatch({ type: "draft", proposal: res.proposal });
        setScene({ type: "objet", patientId: state.scene.patientId, proposal: res.proposal });
        sol(`Corrigé : ${res.resume}.`, { patientId: state.scene.patientId });
        return;
      }
      case "consultation": { const p = patients[intent.patientId]; setFocus(p.id); setScene({ type: "consultation", patientId: p.id }); sol(`Consultation de ${p.nom}. ${p.briefing ? p.briefing.synthese : "Pas de brief : rien de nouveau depuis la dernière fois."} J'écoute dès que vous lancez.`, { patientId: p.id, scene: { type: "consultation", patientId: p.id } }); return; }
      case "cloture": cloture(intent.patientId); return;
      case "sessions": setScene({ type: "sessions" }); { const n = entries.filter((e) => e.who === "session").length; sol(`${n} travaux ce matin, listés avec leur état.`, { scene: { type: "sessions" } }); } return;
      case "consignes": setScene({ type: "consignes" }); return;
      case "consigne": {
        const c: Consigne = { id: `c.${Date.now()}`, at: nowIso(), texte: intent.texte, lecture: lectureConsigne(intent.texte, world.patients) };
        dispatch({ type: "consigne", consigne: c });
        add({ who: "consigne", titre: intent.texte, corps: `Locus : ${c.lecture}` });
        setScene({ type: "consignes" });
        return;
      }
      case "tache": {
        const pid = intent.patientId;
        const t = norm(intent.texte);
        const attente = /appelle|rappel|demande/.test(t);
        session(`${intent.texte}`, pid, attente ? { fin: "attente", delai: 2500, titreFin: `${intent.texte} — en attente de rappel` } : { delai: 2200 });
        sol(attente ? "Je m'en occupe. Je vous préviens ici dès qu'ils rappellent." : "C'est fait. Visible dans mes sessions.", { patientId: pid });
        return;
      }
      case "locus": {
        const pid = intent.patientId;
        if (pid) setFocus(pid);
        setScene({ type: "locus", patientId: pid, question: intent.question, nonce: Date.now() });
        return;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, patients, world, entries, add, sol, setScene, setFocus, dispatch, studio, allProposals, etatDe, current, signer, prochainObjet, session]);

  function cloture(pid: string) {
    const p = patients[pid];
    const script = world.scripts[pid] ?? genericScript(pid, p.appointment?.motif ?? "Consultation", p.prenom);
    const todo = allProposals(pid).filter((x) => etatDe(x) === "a-valider" && x.action !== "signaler");
    todo.forEach((x) => { studio.dispatch({ type: "decide", id: x.id, etat: "validee" }); effets(x, pid); });
    const lignes = [
      `Note signée, codée ${script.cloture.codes.map((c) => c.libelle).join(" + ") || "—"}`,
      `FSE ${script.cloture.acte} ${script.cloture.montant} € télétransmise${script.cloture.tiersPayant ? " (tiers payant AMO)" : ""}`,
      ...todo.map((x) => `${x.titre} — signé`),
      ...script.cloture.dmp.map((d) => `Mon Espace Santé : ${d}`),
      "Résumé vivant mis à jour par Locus",
    ];
    session(`FSE ${script.cloture.acte} ${script.cloture.montant} € télétransmise (${p.nom})`, pid);
    session(`Note déposée dans Mon Espace Santé (${p.nom})`, pid, { delai: 3000 });
    const tours = state.entries.find((e) => e.who === "consult" && e.patientId === pid)?.tours ?? [];
    if (!tours.length) add({ who: "consult", patientId: pid, tours: script.steps.map((s) => s.turn), corps: "Consultation clôturée." });
    setScene({ type: "recu", patientId: pid, lignes });
    sol(`Clôturé. ${todo.length} objet${todo.length > 1 ? "s" : ""} signé${todo.length > 1 ? "s" : ""}, FSE partie, note déposée. Tout est dans le fil.`, { patientId: pid, scene: { type: "recu", patientId: pid, lignes } });
    const soir = world.patients.find((x) => x.id === "pat_marchand");
    if (!state.demoSoir && soir && pid === "pat_delacroix") {
      dispatch({ type: "demoSoir" });
      timers.current.push(window.setTimeout(() => {
        add({ who: "patient", patientId: soir.id, nom: soir.nom, titre: "Re: Encore une cystite", corps: "Pas vraiment mieux, et j'ai un peu de fièvre ce soir (38,2). Je fais quoi ?" });
        const prop: Proposal = { id: `session.soir.${Date.now()}`, kind: "proposal", patientId: soir.id, schema: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), provenance: { origin: "agent", actor: "locus", confidence: 0.86 }, status: "propose", action: "message-patient", titre: "Fièvre sous fosfomycine : consulter ce soir si > 38,5 ou douleur lombaire ; 8h30 demain bloqué", justification: "Fièvre 12 h après fosfomycine : hors périmètre « logistique », donc je ne réponds pas seul. Pyélonéphrite à écarter si fièvre > 38,5 ou douleur lombaire [1]. J'ai bloqué 8h30 demain.", references: [{ docId: "has-cystite-2021", titre: "Cystite aiguë simple, à risque de complication ou récidivante, de la femme", editeur: "HAS", date: "2021" }], charge: { canal: "patient", threadId: "th_marchand_cystite", de: { type: "agent", nom: "Locus, pour le Dr Laurent" }, a: [{ type: "patient", nom: soir.nom }], date: "2026-10-15", corps: "Bonjour Sophie,\n\nUne fièvre modérée peut survenir, mais il faut la surveiller. Si elle dépasse 38,5, si vous avez mal dans le dos ou des frissons, consultez ce soir (SOS Médecins ou le 15). Sinon, le Dr Laurent vous voit demain à 8h30 : c'est bloqué pour vous.\n\nSol, pour le Dr Laurent" }, declencheur: { type: "message", libelle: "Message de Sophie Marchand ce soir" }, autonomie: 1, etat: "a-valider", agent: "locus" };
        studio.dispatch({ type: "ajouter", proposal: prop });
        add({ who: "sol", patientId: soir.id, titre: "Sophie Marchand, fièvre sous fosfomycine", corps: "Hors de mon périmètre (clinique) : je n'ai pas répondu seul. Réponse préparée : consulter ce soir si > 38,5 ou douleur lombaire, sinon 8h30 demain (créneau bloqué). **À valider.**", aValider: true, scene: { type: "objet", patientId: soir.id, proposal: prop } });
      }, 14000));
    }
  }

  function onSubmit(text: string) {
    const intent = parseIntent(text, refs, { patientId: state.focus, objetOuvert: state.scene.type === "objet" });
    setBusy(true);
    try { execute(text, intent); } finally { setBusy(false); }
  }

  const sc = state.scene;
  const scenePatient = "patientId" in sc && sc.patientId ? patients[sc.patientId] : undefined;

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="flex h-10 items-center gap-3 px-4 text-micro text-muted-foreground">
        <Mark />
        <span className="text-sm font-medium tracking-[-0.033em] text-foreground">locus</span>
        <span className="hidden sm:inline">{world.praticien.nom} · jeudi 15 oct. 2026</span>
        <span className={cn("ml-auto flex items-center gap-1.5", state.solStopped && "text-warning")} title={state.solStopped ? "Locus arrêté" : "Locus travaille entre vos messages"}><span className={cn("h-1.5 w-1.5 rounded-full", state.solStopped ? "bg-warning" : "bg-agent animate-pulse-soft")} /><span className="hidden md:inline">{state.solStopped ? "arrêté" : "travaille"}</span></span>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="flex min-h-0 flex-col border-r border-border/60">
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-3 md:px-5">
            <Stream entries={entries} patients={patients} focus={state.focus} solStopped={state.solStopped} onOpen={(s) => setScene(s)} onPatient={(id) => { setFocus(id); setScene({ type: "patient", patientId: id }); }} />
          </div>
          <div className="px-3 pb-3 pt-1 md:px-5">
            <Composer patients={world.patients} focus={focus} onFocusClear={() => setFocus(undefined)} onSubmit={onSubmit} busy={busy} />
            <div className="mt-1.5 flex items-center justify-between text-micro text-muted-foreground/70"><button onClick={() => setScene({ type: "aide" })} className="hover:text-foreground">⌘K · aide</button><span><button onClick={() => { if (confirm("Rejouer la journée ? Le fil et les décisions reviennent à 8h05.") ) { dispatch({ type: "reset" }); studio.dispatch({ type: "reset" }); } }} className="hover:text-foreground">rejouer</button> · <Link href="/journee" className="hover:text-foreground">vues héritées</Link> · <Link href="/manifeste" className="hover:text-foreground">manifeste</Link></span></div>
          </div>
        </section>
        <aside className={cn("min-h-0 overflow-y-auto p-4 md:p-6", sc.type === "vide" ? "hidden lg:block" : "fixed inset-x-0 bottom-0 top-10 z-30 border-t border-border/60 bg-background lg:static lg:inset-auto lg:z-auto lg:border-0")}>
          {sc.type !== "vide" && <button onClick={() => setScene({ type: "vide" })} className="mb-3 flex items-center gap-1 text-xs text-primary lg:hidden">← retour au fil</button>}
          {sc.type === "vide" && <SceneAide />}
          {sc.type === "aide" && <SceneAide />}
          {sc.type === "matinee" && <SceneMatinee patients={world.patients} etatDe={etatDe} onPatient={(id) => { setFocus(id); setScene({ type: "patient", patientId: id }); }} onObjet={ouvrirObjet} />}
          {sc.type === "patient" && scenePatient && <ScenePatient p={{ ...scenePatient, proposals: allProposals(scenePatient.id) }} etatDe={etatDe} onObjet={(p) => ouvrirObjet(scenePatient.id, p)} onCourbe={(m) => execute(`${scenePatient.nomUsage} : courbe ${m}`, { kind: "courbe", patientId: scenePatient.id, mesure: m })} onConsult={() => execute(`consultation ${scenePatient.nomUsage}`, { kind: "consultation", patientId: scenePatient.id })} />}
          {sc.type === "courbe" && scenePatient && <SceneCourbe p={scenePatient} mesure={sc.mesure} lecture={lectureCourbe(scenePatient, sc.mesure)} />}
          {sc.type === "table" && <SceneTable r={world.routines.find((r) => r.id === sc.routineId)!} onPatient={(id) => { setFocus(id); setScene({ type: "patient", patientId: id }); }} />}
          {sc.type === "objet" && scenePatient && <SceneObjet p={scenePatient} proposal={current(sc.proposal)} etat={etatDe(sc.proposal)} onSign={() => execute("signe", { kind: "signer", tout: false })} onReject={() => execute("rejette", { kind: "rejeter" })} onCorrect={() => { const el = document.querySelector("textarea"); el?.focus(); }} />}
          {sc.type === "locus" && <SceneLocus p={sc.patientId ? patients[sc.patientId] : undefined} question={sc.question} nonce={sc.nonce} onDone={(r) => sol(`**${r.answerShort || "Réponse"}** — ${r.docs.length + r.rcp.length} sources${r.ehrAdditions ? `. Fait patient relevé : « ${r.ehrAdditions} » (dites « inscris-le »).` : "."}`, { patientId: sc.patientId, scene: sc })} />}
          {sc.type === "consultation" && scenePatient && <SceneConsultation p={{ ...scenePatient, proposals: allProposals(scenePatient.id).filter((x) => !x.id.startsWith("live.")) }} script={world.scripts[scenePatient.id] ?? genericScript(scenePatient.id, scenePatient.appointment?.motif ?? "Consultation", scenePatient.prenom)} scripted={!!world.scripts[scenePatient.id]} generated={Object.values(state.drafts)} etatDe={etatDe} onProposal={(x) => dispatch({ type: "draft", proposal: x })} onTurns={(t: TranscriptTurn[]) => { const id = `consult.${scenePatient.id}`; dispatch({ type: "add", entry: { id, at: nowIso(), who: "consult", patientId: scenePatient.id, tours: t } }); }} onObjet={(x) => ouvrirObjet(scenePatient.id, x)} onCloture={() => execute("clôture", { kind: "cloture", patientId: scenePatient.id })} />}
          {sc.type === "recu" && scenePatient && <SceneRecu p={scenePatient} lignes={sc.lignes} />}
          {sc.type === "sessions" && <SceneSessions entries={entries} patients={patients} onPatient={(id) => { setFocus(id); setScene({ type: "patient", patientId: id }); }} />}
          {sc.type === "consignes" && <SceneConsignes consignes={state.consignes} />}
        </aside>
      </div>
    </div>
  );
}

/* ---------------- lectures de Locus ---------------- */

function lectureCourbe(p: WorldPatient, m: "dfg" | "ta" | "hba1c" | "poids" | "ldl"): string {
  const s = p.series[m] ?? [];
  if (s.length < 2) return `Pas assez de mesures de ${m} pour une courbe.`;
  const last = s[s.length - 1], prev = s[s.length - 2];
  const d = last.valeur - prev.valeur;
  const dir = d > 0 ? "monte" : d < 0 ? "baisse" : "est stable";
  const base = { dfg: `DFG **${last.valeur}** (${prev.valeur} le ${prev.date}) : ${dir}. ${last.valeur < 60 ? "Sous 60 : maladie rénale chronique ; metformine plafonnée à 2000 mg/j entre 45 et 59, contre-indiquée sous 30 [RCP 4.2]. Apixaban : critère de réduction non atteint (créatinine < 133)." : "Au-dessus de 60 : pas de contrainte rénale sur les prescriptions."}`,
    ta: `Dernière TA **${last.valeur}/${last.valeur2}** ; ${s.slice(-6).length} dernières mesures en moyenne ${Math.round(s.slice(-6).reduce((a, x) => a + x.valeur, 0) / s.slice(-6).length)}/${Math.round(s.slice(-6).reduce((a, x) => a + (x.valeur2 ?? 0), 0) / s.slice(-6).length)}. ${last.valeur >= 140 ? "Au-dessus de la cible (< 140/90 cabinet, < 135/85 automesure) [HAS 2016]." : "Dans la cible."}`,
    hba1c: `HbA1c **${last.valeur} %** (${prev.valeur} % le ${prev.date}) : ${dir}. ${last.valeur > 7 ? "Au-dessus de la cible de 7 % : intensifier après vérification de l'observance ; iSGLT2 si rein ou cœur [HAS 2024]." : "À la cible."}`,
    poids: `Poids **${last.valeur} kg** (${prev.valeur} le ${prev.date}) : ${dir}.`,
    ldl: `LDL **${last.valeur} g/L** (${prev.valeur} le ${prev.date}) : ${dir}. ${last.valeur > 0.7 ? "Au-dessus de la cible du haut risque (< 0,7) : vérifier l'observance de la statine avant d'intensifier." : "À la cible."}` }[m];
  const jalons = p.jalons.filter((j) => j.date >= s[0].date);
  return base + (jalons.length ? ` Jalons : ${jalons.map((j) => `${j.libelle} (${j.date.slice(0, 4)})`).join(", ")}.` : "");
}

function lectureConsigne(texte: string, patients: WorldPatient[]): string {
  const t = norm(texte);
  const age = t.match(/plus de (\d+)|(\d+) ans et plus|>\s*(\d+)/);
  let cibles: WorldPatient[] = [];
  if (age) { const a = Number(age[1] ?? age[2] ?? age[3]); cibles = patients.filter((p) => p.age >= a); }
  else if (/diab/.test(t)) cibles = patients.filter((p) => p.problems.some((x) => /diab/i.test(x.libelle)));
  else if (/enfant/.test(t)) cibles = patients.filter((p) => p.age < 16);
  else if (/hta|hypertend|tension/.test(t)) cibles = patients.filter((p) => p.problems.some((x) => /hypertension/i.test(x.libelle)));
  else if (/ald/.test(t)) cibles = patients.filter((p) => p.meds.some((m) => m.ald));
  const qui = cibles.length ? ` ${cibles.length} patient${cibles.length > 1 ? "s" : ""} concerné${cibles.length > 1 ? "s" : ""} : ${cibles.slice(0, 4).map((p) => p.nom).join(", ")}${cibles.length > 4 ? "…" : ""}.` : "";
  return `Noté, appliqué dès la prochaine proposition.${qui}`;
}

/** Les corrections qu'on peut dire à un objet ouvert. Déterministe, volontairement. */
function corriger(p: Proposal, texte: string): { proposal: Proposal; resume: string } | null {
  const t = norm(texte);
  const c = p.charge as Record<string, unknown> | undefined;
  if (!c || "recordId" in c) return null;
  if (p.action === "ordonnance") {
    const rx = c as unknown as Draft<Prescription>;
    const lignes = rx.lignes.map((l) => ({ ...l }));
    const duree = t.match(/(\d+)\s*(mois|jours?|semaines?)/);
    const cible = (l: { libelle: string; dci?: string }) => { const words = t.split(/\s+/).filter((w) => w.length > 4); return words.some((w) => norm(l.libelle).includes(w) || (l.dci && norm(l.dci).includes(w))); };
    if (/^(retire|enleve|sans|supprime)/.test(t)) { const keep = lignes.filter((l) => !cible(l)); if (keep.length === lignes.length) return null; return { proposal: { ...p, charge: { ...rx, lignes: keep } as unknown as Proposal["charge"] }, resume: `${lignes.length - keep.length} ligne retirée` }; }
    if (/^(ajoute|mets|rajoute)/.test(t)) { const lib = texte.replace(/^(ajoute|mets|rajoute)\s*(du |de la |de l'|des |le |la |l')?/i, "").trim(); return { proposal: { ...p, charge: { ...rx, lignes: [...lignes, { libelle: lib.toUpperCase(), posologie: "posologie à préciser", duree: duree ? `${duree[1]} ${duree[2]}` : "1 mois" }] } as unknown as Proposal["charge"] }, resume: `« ${lib} » ajouté (posologie à préciser)` }; }
    if (duree) { let n = 0; const next = lignes.map((l) => { const hit = /pour|du |de la |le |la /.test(t) && t.split(/pour|du |de la |le |la /)[1] ? cible(l) : true; if (hit) { n++; return { ...l, duree: `${duree[1]} ${duree[2]}` }; } return l; }); if (!n) return null; return { proposal: { ...p, charge: { ...rx, lignes: next } as unknown as Proposal["charge"] }, resume: `durée ${duree[1]} ${duree[2]} sur ${n} ligne${n > 1 ? "s" : ""}` }; }
    return null;
  }
  if (p.action === "arret-travail") {
    const s = c as unknown as Draft<import("@/domain/types").SickLeave>;
    const d = t.match(/(\d+)\s*jours?/);
    if (d) { const au = new Date(s.du); au.setDate(au.getDate() + Number(d[1]) - 1); return { proposal: { ...p, charge: { ...s, au: au.toISOString().slice(0, 10) } as unknown as Proposal["charge"] }, resume: `arrêt de ${d[1]} jours` }; }
    if (/sorties? libres/.test(t)) return { proposal: { ...p, charge: { ...s, sortiesAutorisees: "libres" } as unknown as Proposal["charge"] }, resume: "sorties libres" };
    return null;
  }
  if (p.action === "courrier" || p.action === "message-patient" || p.action === "message-confrere") {
    const m = c as unknown as { corps: string };
    if (/^(ajoute|mets|precise|dis)/.test(t)) { const add = texte.replace(/^(ajoute|mets|précise|precise|dis)\s*(que |qu'|:)?\s*/i, "").trim(); return { proposal: { ...p, charge: { ...c, corps: m.corps.replace(/\n\n([^\n]*)$/, `\n\n${add}\n\n$1`) } as unknown as Proposal["charge"] }, resume: "phrase ajoutée" }; }
    if (/plus court|raccourcis/.test(t)) { const paras = m.corps.split("\n\n"); return { proposal: { ...p, charge: { ...c, corps: [paras[0], paras[paras.length - 1]].join("\n\n") } as unknown as Proposal["charge"] }, resume: "raccourci" }; }
    return null;
  }
  return null;
}

function Mark() {
  return <svg width="22" height="22" viewBox="0 0 26 26" aria-hidden><circle cx="13" cy="13" r="12" fill="var(--primary)" /><circle cx="13" cy="13" r="5" fill="none" stroke="var(--primary-foreground)" strokeWidth="2.2" /><circle cx="13" cy="13" r="1.6" fill="var(--primary-foreground)" /></svg>;
}


