"use client";
import * as React from "react";
import { ArrowRight, Check, ChevronRight, FileAudio, Mic, Square } from "lucide-react";
import { cn } from "@/lib/cn";
import { fetchLive } from "@/lib/live";
import { scribe, type Lang, type ScribeDict } from "@/i18n";
import { PageHead, PageInner } from "@/components/shell/page-inner";
import { Button } from "@/components/ui/button";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Box, Card, CardAction, CardBody, CardFooter, CardIcon, CardText, CardTitle } from "@/components/ui/card";
import { CONSULTATIONS, consultation, transcriptTexte, type Consultation, type RubriqueCr } from "@/data/scribe/consultations";
import type { DecisionReponse, ErreurReponse, LiveProbe, ModeleNote, NoteReponse } from "@/data/scribe/live";
import { ActionRow, AideCard, NoteTable, Player, Provenance, Recap, Stepper, TranscriptLines, type EtatGen, type LigneVue } from "./parts";
import { useDictee } from "./dictee";
import { LocusLoader } from "@/components/shell/locus-loader";

/**
 * Scribe + aide à la décision (maquette Scribe.dc.html, spec §6).
 *
 * Un écran de départ (3 consultations enregistrées et la dictée au micro),
 * puis un parcours guidé en 5 étapes : Écouter, Compte rendu, Aide à la
 * décision, Actions, Récapitulatif. Une barre d'action fixe porte une seule
 * action principale par étape.
 *
 * Seule l'entrée peut être enregistrée : une consultation enregistrée est
 * une dictée fictive qui défile à l'écran. Tout ce qui en sort est généré en
 * direct, à chaque lancement, par les routes `/api/scribe/*` : choisir une
 * consultation enregistrée lance aussitôt la génération du compte rendu,
 * puis de l'aide à la décision et des actions. Au micro, la même chaîne part
 * de « Générer le compte rendu ». Un échec s'affiche comme tel, avec
 * « Réessayer » : jamais de contenu de remplacement.
 */

const MICRO = "micro";
type Statut = "ok" | "ign";
type Gen = { etat: EtatGen; erreur?: string };
const ATTENTE: Gen = { etat: "attente" };

/** Le rythme de la lecture : la durée d'une réplique suit sa longueur (lecture), pas l'horodatage réel. */
function planning(c: Consultation) {
  const durees = c.transcript.lignes.map((l) => Math.min(3600, Math.max(1000, 500 + l.texte.split(/\s+/).length * 170)));
  const debuts: number[] = [];
  let acc = 0;
  for (const d of durees) { debuts.push(acc); acc += d; }
  return { debuts, durees, total: acc };
}

function copierTexte(titre: string, sousTitre: string, cr: RubriqueCr[], vals: string[], ok: string[]) {
  const lignes = [titre, sousTitre, "", "Compte rendu"];
  cr.forEach((r, i) => { if (r.titre) lignes.push(`${r.label}`); else if ((vals[i] ?? "").trim()) lignes.push(`${r.sous ? "  " : ""}${r.label} : ${vals[i]!.trim()}`); });
  if (ok.length) lignes.push("", "Actions validées", ...ok.map((x) => `- ${x}`));
  return lignes.join("\n");
}

const noteTexte = (rows: RubriqueCr[], vals: string[]) => rows.map((r, i) => (r.titre ? r.label : (vals[i] ?? "").trim() ? `${r.label} : ${vals[i]!.trim()}` : "")).filter(Boolean).join("\n");

/** Le message d'une réponse en erreur : le code de la route, traduit ; le refus de données réelles, tel quel. */
async function erreurDe(t: ScribeDict, r: Response): Promise<string> {
  const j = (await r.json().catch(() => null)) as ErreurReponse | null;
  if (j?.code === "donnees_reelles" && j.error) return j.error;
  if (j?.code === "indisponible" || j?.code === "sature" || j?.code === "echec") return t.errors[j.code];
  if (r.status === 429) return t.errors.quota;
  return r.status >= 500 ? t.errors.indisponible : t.errors.echec;
}

export function ScribePage({ lang }: { lang: Lang }) {
  const t = scribe[lang];

  /* ---------- Parcours ---------- */
  const [cid, setCid] = React.useState<string | null>(null);
  const [step, setStep] = React.useState(1);
  const [unlocked, setUnlocked] = React.useState(1);
  const [modele, setModele] = React.useState<ModeleNote>("mg");
  const [why, setWhy] = React.useState<Record<number, boolean>>({});
  const [retained, setRetained] = React.useState<Record<number, boolean>>({});
  const [status, setStatus] = React.useState<Record<number, Statut | undefined>>({});
  const [texts, setTexts] = React.useState<string[]>([]);
  const [editing, setEditing] = React.useState<number | null>(null);
  const [showTr, setShowTr] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  /* ---------- Entrée : lecture de l'enregistrement, ou micro ---------- */
  const [playing, setPlaying] = React.useState(false);
  const [pos, setPos] = React.useState(0);
  const [probe, setProbe] = React.useState<LiveProbe | null>(null);
  const [micTr, setMicTr] = React.useState("");
  const dictee = useDictee(React.useCallback((delta: string) => setMicTr((x) => x + delta), []));

  /* ---------- Génération en direct ---------- */
  const [noteGen, setNoteGen] = React.useState<Gen>(ATTENTE);
  const [cr, setCr] = React.useState<RubriqueCr[]>([]);
  const [crVals, setCrVals] = React.useState<string[]>([]);
  const [decGen, setDecGen] = React.useState<Gen>(ATTENTE);
  const [dec, setDec] = React.useState<DecisionReponse | null>(null);
  /**
   * Numéros de requête : une réponse arrivée après un changement de
   * consultation ou une régénération est ignorée. `decPour` : la note pour
   * laquelle l'aide en cours (ou affichée) a été demandée.
   */
  const seq = React.useRef({ note: 0, dec: 0 });
  const decPour = React.useRef<string | null>(null);

  React.useEffect(() => {
    let vivant = true;
    fetchLive("/api/scribe/live", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<LiveProbe>) : { dictee: false }))
      .catch(() => ({ dictee: false }))
      .then((p) => { if (vivant) setProbe(p); });
    return () => { vivant = false; };
  }, []);

  const isMic = cid === MICRO;
  const c = isMic ? undefined : consultation(cid);
  const plan = React.useMemo(() => (c ? planning(c) : null), [c]);
  const aide = dec?.aide ?? [];

  /* ---------- Lecture ---------- */
  React.useEffect(() => {
    if (!playing || !plan) return;
    const id = setInterval(() => {
      setPos((p) => {
        const n = Math.min(plan.total, p + 60);
        if (n >= plan.total) setPlaying(false);
        return n;
      });
    }, 60);
    return () => clearInterval(id);
  }, [playing, plan]);

  const total = plan?.total ?? 0;
  const ended = !!plan && pos >= total && !playing;
  const who = (q: string) => t.who[q as keyof ScribeDict["who"]] ?? q;
  const shownLines: LigneVue[] = React.useMemo(() => {
    if (!c || !plan) return [];
    const out: LigneVue[] = [];
    c.transcript.lignes.forEach((l, i) => {
      const d = plan.debuts[i]!;
      if (pos < d) return;
      const mots = l.texte.split(" ");
      const frac = Math.min(1, (pos - d) / (plan.durees[i]! * 0.75));
      out.push({ who: who(l.qui), doc: l.qui === "medecin", texte: frac >= 1 ? l.texte : mots.slice(0, Math.max(1, Math.ceil(mots.length * frac))).join(" ") });
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c, plan, pos, lang]);
  // La dernière réplique entièrement affichée (annoncée aux lecteurs d'écran).
  const derniere = React.useMemo(() => {
    if (!c || !plan) return null;
    let k = -1;
    c.transcript.lignes.forEach((_, i) => { if (pos >= plan.debuts[i]! + plan.durees[i]! * 0.75) k = i; });
    const l = k >= 0 ? c.transcript.lignes[k]! : null;
    return l ? { who: who(l.qui), texte: l.texte } : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c, plan, pos, lang]);
  const allLines: LigneVue[] = c ? c.transcript.lignes.map((l) => ({ who: who(l.qui), doc: l.qui === "medecin", texte: l.texte })) : [];

  // La transcription défile : la dernière réplique reste visible au-dessus de la barre.
  const trEnd = React.useRef<HTMLDivElement>(null);
  const nLignes = shownLines.length;
  React.useEffect(() => {
    if (!playing || nLignes === 0 || !trEnd.current) return;
    // Garder la dernière réplique visible au-dessus de la barre fixe, sans défilement horizontal.
    const bas = trEnd.current.getBoundingClientRect().bottom;
    const limite = window.innerHeight - 96;
    if (bas > limite) window.scrollBy({ top: bas - limite, behavior: "smooth" });
  }, [nLignes, playing]);
  const micArea = React.useRef<HTMLTextAreaElement>(null);
  React.useEffect(() => {
    if (dictee.etat === "on" && micArea.current) micArea.current.scrollTop = micArea.current.scrollHeight;
  }, [micTr, dictee.etat]);

  /* ---------- Génération : compte rendu, puis aide et actions ---------- */
  const genererDecision = async (note: string) => {
    const n = ++seq.current.dec;
    decPour.current = note;
    setDecGen({ etat: "encours" }); setDec(null); setRetained({}); setWhy({}); setStatus({}); setTexts([]); setEditing(null);
    try {
      const r = await fetchLive("/api/scribe/decision", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note, motif: c?.motif }) });
      if (n !== seq.current.dec) return;
      if (!r.ok) { const e = await erreurDe(t, r); if (n === seq.current.dec) setDecGen({ etat: "erreur", erreur: e }); return; }
      const j = (await r.json()) as DecisionReponse;
      if (n !== seq.current.dec) return;
      setDec(j); setTexts(j.actions.slice()); setDecGen({ etat: "pret" });
    } catch {
      if (n === seq.current.dec) setDecGen({ etat: "erreur", erreur: t.errors.reseau });
    }
  };

  /** Le compte rendu depuis la dictée ; s'il aboutit, l'aide et les actions suivent aussitôt. */
  const genererNote = async (transcript: string, motif: string | undefined, m: ModeleNote) => {
    const n = ++seq.current.note;
    seq.current.dec++; decPour.current = null;
    setNoteGen({ etat: "encours" }); setCr([]); setCrVals([]);
    setDecGen(ATTENTE); setDec(null); setTexts([]); setRetained({}); setWhy({}); setStatus({});
    try {
      const r = await fetchLive("/api/scribe/note", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transcript, modele: m, motif }) });
      if (n !== seq.current.note) return;
      if (!r.ok) { const e = await erreurDe(t, r); if (n === seq.current.note) setNoteGen({ etat: "erreur", erreur: e }); return; }
      const j = (await r.json()) as NoteReponse;
      if (n !== seq.current.note) return;
      const vals = j.cr.map((x) => x.valeur);
      setCr(j.cr); setCrVals(vals); setNoteGen({ etat: "pret" });
      void genererDecision(noteTexte(j.cr, vals));
    } catch {
      if (n === seq.current.note) setNoteGen({ etat: "erreur", erreur: t.errors.reseau });
    }
  };
  const source = () => (isMic ? { transcript: micTr, motif: undefined } : c ? { transcript: transcriptTexte(c), motif: c.motif } : null);
  const relancerNote = () => { const s = source(); if (s?.transcript.trim()) void genererNote(s.transcript, s.motif, modele); };
  const noteCourante = noteTexte(cr, crVals);

  /* ---------- Navigation ---------- */
  const reset = (id: string | null) => {
    dictee.arreter();
    seq.current.note++; seq.current.dec++; decPour.current = null;
    setCid(id); setStep(1); setUnlocked(1); setPlaying(false); setPos(0); setModele("mg");
    setWhy({}); setRetained({}); setStatus({}); setEditing(null); setShowTr(false); setCopied(false);
    setTexts([]); setMicTr(""); setCr([]); setCrVals([]); setDec(null); setNoteGen(ATTENTE); setDecGen(ATTENTE);
  };
  /** Une consultation enregistrée : la lecture démarre et la génération part aussitôt, sans attendre la fin. */
  const lancer = (k: Consultation) => {
    reset(k.id);
    setPlaying(true);
    void genererNote(transcriptTexte(k), k.motif, "mg");
  };
  const go = (n: number) => {
    setEditing(null);
    if (dictee.etat !== "off") dictee.arreter();
    setStep(n); setUnlocked((u) => Math.max(u, n));
    // La note a été modifiée depuis la dernière aide : l'aide est recalculée sur la note relue.
    if (n === 3 && noteGen.etat === "pret" && decPour.current !== noteCourante) void genererDecision(noteCourante);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };
  const play = () => {
    if (!plan) return;
    if (pos >= plan.total) setPos(0);
    setPlaying(true);
  };

  /* ---------- Actions ---------- */
  const retainedActs: Record<number, boolean> = {};
  aide.forEach((a, i) => { if (retained[i] && a.action !== undefined && a.action >= 0) retainedActs[a.action] = true; });
  const order = texts.map((_, i) => i).sort((a, b) => (retainedActs[b] ? 1 : 0) - (retainedActs[a] ? 1 : 0));
  const okActions = texts.filter((_, i) => status[i] === "ok");
  const setStat = (i: number, v: Statut) => { setStatus((s) => ({ ...s, [i]: s[i] === v ? undefined : v })); setEditing(null); };

  /* ---------- Écran de départ ---------- */
  if (!cid) {
    return (
      <PageInner className="gap-5">
        <div className="flex flex-col gap-2">
          <PageHead title={t.choose} />
          <p className="m-0 max-w-[720px] text-muted-foreground">{t.intro}</p>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-4">
          {CONSULTATIONS.map((k) => (
            <button key={k.id} type="button" onClick={() => lancer(k)} className="flex text-left">
              <Card interactive className="w-full">
                <CardBody>
                  <CardIcon><FileAudio aria-hidden="true" /></CardIcon>
                  <CardTitle>{k.motif}</CardTitle>
                  <CardText>{k.patient}</CardText>
                  <div className="flex flex-wrap gap-1.5"><Badge className="bg-muted font-normal text-muted-foreground">{t.recorded.badge}</Badge><Badge variant="pill">{k.duree}</Badge></div>
                </CardBody>
                <CardFooter><CardAction>{t.recorded.open}<ArrowRight aria-hidden="true" /></CardAction></CardFooter>
              </Card>
            </button>
          ))}
          <button type="button" onClick={() => reset(MICRO)} className="flex text-left">
            <Card interactive className="w-full">
              <CardBody>
                <CardIcon><Mic aria-hidden="true" /></CardIcon>
                <CardTitle>{t.live.title}</CardTitle>
                <CardText>{t.live.text}</CardText>
                <div><Badge className="bg-muted font-normal text-muted-foreground">{t.live.badge}</Badge></div>
              </CardBody>
              <CardFooter><CardAction>{t.live.open}<ArrowRight aria-hidden="true" /></CardAction></CardFooter>
            </Card>
          </button>
        </div>
      </PageInner>
    );
  }

  /* ---------- Bouton principal selon l'étape ---------- */
  let label = "", disabled = false, primary: () => void = () => {};
  if (step === 1) {
    if (isMic) {
      if (dictee.etat !== "off") { label = t.primary.stop; primary = dictee.arreter; }
      else if (micTr.trim()) { label = t.primary.generate; primary = () => { go(2); relancerNote(); }; }
      else if (probe?.dictee) { label = t.primary.start; primary = () => void dictee.demarrer(); }
      else { label = t.primary.generate; disabled = true; }
    } else { label = t.primary.note; primary = () => { setPlaying(false); go(2); }; }
  } else if (step === 2) { label = t.primary.aide; disabled = noteGen.etat !== "pret" || !cr.length; primary = () => go(3); }
  else if (step === 3) { label = t.primary.actions; disabled = decGen.etat !== "pret"; primary = () => go(4); }
  else if (step === 4) {
    if (okActions.length === 0) { label = t.primary.need; disabled = true; }
    else { label = t.primary.recap; primary = () => go(5); }
  }

  const titre = isMic ? t.live.title : c!.motif;
  const sousTitre = isMic ? t.live.patient : c!.patientLong;
  const busy = noteGen.etat === "encours" || decGen.etat === "encours";
  const regenerer = () => { if (step === 2) relancerNote(); else void genererDecision(noteCourante); };
  const voix = () => {
    if (!probe?.dictee) return;
    if (step !== 1) go(1);
    void dictee.demarrer();
  };
  const showVoice = isMic && !!probe?.dictee && dictee.etat === "off" && (step === 2 || (step === 1 && !!micTr.trim()));
  const copier = async () => {
    const txt = copierTexte(titre, sousTitre, cr, crVals, okActions);
    try { await navigator.clipboard.writeText(txt); } catch {}
    setCopied(true);
  };
  const etatLecture = playing ? t.state.playing : ended ? t.state.ended : pos > 0 ? t.state.paused : t.state.ready;

  return (
    <div className="flex min-h-dvh flex-col max-[820px]:min-h-[calc(100dvh-92px)]">
      <PageInner className="flex-1 grid-cols-[minmax(0,1fr)] content-start gap-5">
        <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
          <div className="flex min-w-0 flex-[1_1_auto] flex-col gap-0.5">
            <h1 className="m-0 text-[30px] font-extrabold leading-[1.08] tracking-[-.03em] min-[821px]:text-[38px]">{titre}</h1>
            <span className="text-muted-foreground">{sousTitre}</span>
          </div>
          {t.frenchContent && <Badge variant="pill">{t.frenchContent}</Badge>}
          <Button variant="ghost" className="text-muted-foreground" onClick={() => reset(null)}>{t.change}</Button>
        </div>

        <Provenance t={t} source={isMic ? "micro" : "enregistree"} note={noteGen.etat} aide={noteGen.etat === "erreur" ? "attente" : decGen.etat} />

        <Stepper t={t} step={step} unlocked={unlocked} onPick={go} />

        {/* 1 · Écouter */}
        {step === 1 && !isMic && (
          <div className="flex flex-col gap-4">
            <Player t={t} playing={playing} progress={total ? pos / total : 0} etat={etatLecture} onToggle={() => (playing ? setPlaying(false) : play())} />
            {/* Lecteurs d'écran : chaque réplique est annoncée une fois complète, pas mot à mot. */}
            <div aria-live="polite" className="sr-only">{derniere ? `${derniere.who} : ${derniere.texte}` : ""}</div>
            <Box aria-label={t.transcript} className="flex flex-col px-5 pb-3.5 pt-1">
              {shownLines.length === 0 && <p className="m-0 py-7 text-center text-muted-foreground">{t.trEmpty}</p>}
              <TranscriptLines lignes={shownLines} />
              <div ref={trEnd} />
              {!ended && pos > 0 && <Button variant="ghost" size="sm" className="mt-2.5 self-start text-muted-foreground" onClick={() => { setPlaying(false); setPos(total); }}>{t.skip}</Button>}
              {ended && <div className="mt-3 flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-muted-foreground"><Check size={16} aria-hidden="true" />{t.ended}</div>}
            </Box>
          </div>
        )}
        {step === 1 && isMic && (
          <div className="flex flex-col gap-4">
            <Box className="flex flex-wrap items-center gap-[18px] px-[18px] py-4">
              {probe?.dictee ? (
                <>
                  <button type="button" onClick={() => (dictee.etat === "off" ? void dictee.demarrer() : dictee.arreter())} aria-label={dictee.etat === "off" ? t.liveMode.mic : t.liveMode.micStop} className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                    {dictee.etat === "off" ? <Mic size={16} aria-hidden="true" /> : <Square size={14} fill="currentColor" strokeWidth={0} aria-hidden="true" />}
                  </button>
                  <span className={cn("inline-flex items-center gap-1.5 text-[13px]", dictee.etat === "on" ? "text-foreground" : "text-muted-foreground")}>
                    <StatusDot active={dictee.etat === "on"} />
                    {dictee.etat === "on" ? t.state.live : dictee.etat === "connexion" ? t.liveMode.connecting : micTr ? t.state.paused : t.state.ready}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">{t.liveMode.micOff}</span>
              )}
              <span className="ml-auto text-[13px] text-muted-foreground">{t.liveMode.warning}</span>
            </Box>
            {dictee.erreur && <p role="alert" className="m-0 rounded-md bg-destructive/10 px-3 py-2 text-[13px] text-destructive">{dictee.erreur === "micro" ? t.liveMode.noMic : dictee.erreur === "quota" ? t.liveMode.quota : t.liveMode.sttError}</p>}
            <Box className="p-0">
              <label htmlFor="scribe-mic-tr" className="sr-only">{t.transcript}</label>
              <textarea id="scribe-mic-tr" ref={micArea} rows={12} value={micTr} onChange={(e) => setMicTr(e.target.value)} placeholder={t.liveMode.placeholder} className="block w-full resize-y rounded-xl bg-transparent px-5 py-4 leading-relaxed placeholder:text-muted-foreground focus:outline-none" />
            </Box>
          </div>
        )}

        {/* 2 · Compte rendu */}
        {step === 2 && (
          <div className="flex flex-col gap-3">
            {noteGen.etat === "encours" || noteGen.etat === "attente" ? <Attente texte={t.liveMode.writing} />
              : noteGen.etat === "erreur" ? <Erreur texte={noteGen.erreur ?? t.errors.echec} retry={t.retry} onRetry={relancerNote} />
              : (
                <>
                  <Genere texte={t.run.generated} />
                  <NoteTable t={t} cr={cr} vals={crVals} onEdit={(i, v) => setCrVals((x) => { const y = x.slice(); y[i] = v; return y; })} />
                </>
              )}
            {!isMic && (
              <>
                <Button variant="ghost" className="self-start text-muted-foreground" onClick={() => setShowTr((s) => !s)} aria-expanded={showTr}>
                  <ChevronRight aria-hidden="true" className={cn("transition-transform", showTr && "rotate-90")} />{t.showTr}
                </Button>
                {showTr && <Box aria-label={t.transcript} className="flex flex-col px-5 pb-3.5 pt-1"><TranscriptLines lignes={allLines} dim /></Box>}
              </>
            )}
          </div>
        )}

        {/* 3 · Aide à la décision */}
        {step === 3 && (
          <div className="flex flex-col gap-3">
            {decGen.etat === "encours" || decGen.etat === "attente" ? <Attente texte={t.liveMode.thinking} />
              : decGen.etat === "erreur" ? <Erreur texte={decGen.erreur ?? t.errors.echec} retry={t.retry} onRetry={() => void genererDecision(noteCourante)} />
              : aide.length === 0 ? <Erreur texte={t.liveMode.emptyAide} neutre />
              : (
                <>
                  <Genere texte={t.run.generatedAide} />
                  {aide.map((a, i) => (
                    <AideCard key={i} t={t} a={a} retained={!!retained[i]} open={!!why[i]} onRetain={() => setRetained((r) => ({ ...r, [i]: !r[i] }))} onWhy={() => setWhy((w) => ({ ...w, [i]: !w[i] }))} />
                  ))}
                </>
              )}
          </div>
        )}

        {/* 4 · Actions */}
        {step === 4 && (
          <div className="flex flex-col gap-3">
            {texts.length === 0 ? <Erreur texte={t.liveMode.emptyActions} neutre /> : (
              <>
                <span className="text-muted-foreground">{t.count(okActions.length, texts.length)}</span>
                <Box aria-label={t.actionsLabel} className="overflow-hidden">
                  {order.map((i) => (
                    <ActionRow key={i} t={t} texte={texts[i]!} statut={status[i]} retained={!!retainedActs[i]} editing={editing === i}
                      onOk={() => setStat(i, "ok")} onIgn={() => setStat(i, "ign")} onEdit={() => setEditing((e) => (e === i ? null : i))}
                      onText={(v) => setTexts((x) => { const y = x.slice(); y[i] = v; return y; })} />
                  ))}
                </Box>
              </>
            )}
          </div>
        )}

        {/* 5 · Récapitulatif */}
        {step === 5 && <Recap t={t} rows={cr.map((r, i) => ({ r, v: crVals[i] ?? "" })).filter((x) => !x.r.titre && x.v.trim()).map((x) => ({ label: x.r.label, valeur: x.v }))} ok={okActions} />}
      </PageInner>

      {/* Barre d'action fixe */}
      <div className="sticky bottom-0 z-10 border-t border-border bg-background/[.88] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center gap-2 px-4 py-3 min-[821px]:px-10">
          {showVoice && <Button onClick={voix}><Mic aria-hidden="true" />{t.voice}</Button>}
          {step === 2 && (
            <label className="flex items-center gap-2 text-muted-foreground">
              {t.template}
              <select value={modele} onChange={(e) => setModele(e.target.value as ModeleNote)} className="h-9 rounded-md border border-input bg-background px-2.5 text-foreground shadow-xs">
                {(Object.keys(t.templates) as ModeleNote[]).map((k) => <option key={k} value={k}>{t.templates[k]}</option>)}
              </select>
            </label>
          )}
          {((step === 2 && noteGen.etat === "pret") || (step === 3 && decGen.etat === "pret")) && <Button variant="ghost" className="text-muted-foreground" onClick={regenerer} disabled={busy}>{t.regen}</Button>}
          <span className="flex-auto" />
          {step > 1 && step < 5 && <Button onClick={() => go(step - 1)}>{t.prev}</Button>}
          {step === 5 ? (
            <span className="flex flex-wrap gap-2">
              <Button onClick={() => (c ? lancer(c) : reset(cid))}>{t.restart}</Button>
              <Button variant="primary" onClick={copier}>{copied && <Check aria-hidden="true" />}{copied ? t.copied : t.copy}</Button>
            </span>
          ) : (
            <Button variant="primary" onClick={primary} disabled={disabled}>{label}</Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** La mention au-dessus d'un contenu généré : il vient de la génération en direct, et se modifie. */
function Genere({ texte }: { texte: string }) {
  return <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground"><StatusDot />{texte}</span>;
}

/** Locus génère : son loader, en grand, à la place du contenu attendu. */
function Attente({ texte }: { texte: string }) {
  return (
    <Box className="px-5 py-6" aria-live="polite">
      <LocusLoader size="card" label={texte} />
    </Box>
  );
}

function Erreur({ texte, neutre, retry, onRetry }: { texte: string; neutre?: boolean; retry?: string; onRetry?: () => void }) {
  return (
    <Box role={neutre ? undefined : "alert"} className="flex flex-wrap items-center gap-3 px-5 py-5">
      <span className={cn("min-w-0 flex-[1_1_280px]", neutre ? "text-muted-foreground" : "text-destructive")}>{texte}</span>
      {retry && onRetry && <Button onClick={onRetry}>{retry}</Button>}
    </Box>
  );
}
