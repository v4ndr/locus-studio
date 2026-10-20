"use client";
import * as React from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronRight, Lock, Mic, Square, User } from "lucide-react";
import { cn } from "@/lib/cn";
import { route, scribe, type Lang, type ScribeDict } from "@/i18n";
import { PageHead, PageInner } from "@/components/shell/page-inner";
import { Button, buttonClass } from "@/components/ui/button";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Box, Card, CardAction, CardBody, CardFooter, CardIcon, CardText, CardTitle } from "@/components/ui/card";
import { CONSULTATIONS, consultation, type CarteAide, type Consultation, type RubriqueCr } from "@/data/scribe/consultations";
import type { DecisionReponse, LiveProbe, ModeleNote, NoteReponse } from "@/data/scribe/live";
import { ActionRow, AideCard, NoteTable, Player, Recap, Stepper, TranscriptLines, type LigneVue } from "./parts";
import { useDictee } from "./dictee";

/**
 * Scribe + aide à la décision (maquette Scribe.dc.html, spec §6).
 *
 * Un écran de départ (3 consultations scriptées et la consultation en direct,
 * réservée aux comptes), puis un parcours guidé en 5 étapes : Écouter,
 * Compte rendu, Aide à la décision, Actions, Récapitulatif. Une barre
 * d'action fixe porte une seule action principale par étape.
 *
 * Rejoué : la transcription horodatée défile mot à mot ; compte rendu, aide
 * et actions sont précalculés. Direct : dictée au micro (transcription en
 * temps réel), puis compte rendu, Locus et actions par les routes
 * `/api/scribe/*`, toutes derrière `guardLive`.
 */

const LIVE = "live";
type Statut = "ok" | "ign";

/** Le rythme du rejoué : la durée d'une réplique suit sa longueur (lecture), pas l'horodatage réel. */
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
  const [crVals, setCrVals] = React.useState<string[]>([]);
  const [editing, setEditing] = React.useState<number | null>(null);
  const [showTr, setShowTr] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [voiceNotice, setVoiceNotice] = React.useState(false);

  /* ---------- Rejoué ---------- */
  const [playing, setPlaying] = React.useState(false);
  const [pos, setPos] = React.useState(0);

  /* ---------- Direct ---------- */
  const [probe, setProbe] = React.useState<LiveProbe | null>(null);
  const [liveTr, setLiveTr] = React.useState("");
  const [liveCr, setLiveCr] = React.useState<RubriqueCr[] | null>(null);
  const [liveDec, setLiveDec] = React.useState<(DecisionReponse & { pour: string }) | null>(null);
  const [busy, setBusy] = React.useState<"note" | "decision" | null>(null);
  const [liveErr, setLiveErr] = React.useState<string | null>(null);
  const dictee = useDictee(React.useCallback((delta: string) => setLiveTr((x) => x + delta), []));

  React.useEffect(() => {
    let vivant = true;
    fetch("/api/scribe/live", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<LiveProbe>) : { live: false, dictee: false }))
      .catch(() => ({ live: false, dictee: false }))
      .then((p) => { if (vivant) setProbe(p); });
    return () => { vivant = false; };
  }, []);

  const isLive = cid === LIVE;
  const c = isLive ? undefined : consultation(cid);
  const plan = React.useMemo(() => (c ? planning(c) : null), [c]);

  // Données courantes : précalculées (rejoué) ou issues des routes live.
  const cr: RubriqueCr[] = isLive ? liveCr ?? [] : c?.cr ?? [];
  const aide: CarteAide[] = isLive ? liveDec?.aide ?? [] : c?.aide ?? [];

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
  const liveArea = React.useRef<HTMLTextAreaElement>(null);
  React.useEffect(() => {
    if (dictee.etat === "on" && liveArea.current) liveArea.current.scrollTop = liveArea.current.scrollHeight;
  }, [liveTr, dictee.etat]);

  /* ---------- Navigation ---------- */
  const reset = (id: string | null) => {
    dictee.arreter();
    const k = consultation(id);
    setCid(id); setStep(1); setUnlocked(1); setPlaying(false); setPos(0); setModele("mg");
    setWhy({}); setRetained({}); setStatus({}); setEditing(null); setShowTr(false); setCopied(false); setVoiceNotice(false);
    setTexts(k ? k.actions.slice() : []); setCrVals(k ? k.cr.map((r) => r.valeur) : []);
    setLiveTr(""); setLiveCr(null); setLiveDec(null); setBusy(null); setLiveErr(null);
  };
  const go = (n: number) => {
    setPlaying(false); setEditing(null); setVoiceNotice(false);
    if (dictee.etat !== "off") dictee.arreter();
    setStep(n); setUnlocked((u) => Math.max(u, n));
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };
  const play = () => {
    if (!plan) return;
    if (pos >= plan.total) setPos(0);
    setPlaying(true);
  };

  /* ---------- Direct : routes ---------- */
  const erreurDe = async (r: Response) => {
    const j = (await r.json().catch(() => null)) as { code?: string; error?: string } | null;
    return j?.code === "donnees_reelles" && j.error ? j.error : t.liveMode.error;
  };
  const noteTexte = (rows: RubriqueCr[], vals: string[]) => rows.map((r, i) => (r.titre ? r.label : (vals[i] ?? "").trim() ? `${r.label} : ${vals[i]!.trim()}` : "")).filter(Boolean).join("\n");

  const genererNote = async () => {
    setBusy("note"); setLiveErr(null); setLiveDec(null); setRetained({}); setWhy({}); setStatus({}); setTexts([]);
    setUnlocked(2);
    try {
      const r = await fetch("/api/scribe/note", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transcript: liveTr, modele }) });
      if (!r.ok) { setLiveErr(await erreurDe(r)); setLiveCr(null); return; }
      const j = (await r.json()) as NoteReponse;
      setLiveCr(j.cr); setCrVals(j.cr.map((x) => x.valeur));
    } catch { setLiveErr(t.liveMode.error); } finally { setBusy(null); }
  };
  const genererDecision = async (force = false) => {
    const note = noteTexte(cr, crVals);
    if (!force && liveDec?.pour === note) return;
    setBusy("decision"); setLiveErr(null); setRetained({}); setWhy({}); setStatus({});
    setUnlocked(3);
    try {
      const r = await fetch("/api/scribe/decision", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note }) });
      if (!r.ok) { setLiveErr(await erreurDe(r)); setLiveDec(null); return; }
      const j = (await r.json()) as DecisionReponse;
      setLiveDec({ ...j, pour: note }); setTexts(j.actions.slice());
    } catch { setLiveErr(t.liveMode.error); } finally { setBusy(null); }
  };

  /* ---------- Actions ---------- */
  const retainedActs: Record<number, boolean> = {};
  aide.forEach((a, i) => { if (retained[i] && a.action !== undefined && a.action >= 0) retainedActs[a.action] = true; });
  const order = texts.map((_, i) => i).sort((a, b) => (retainedActs[b] ? 1 : 0) - (retainedActs[a] ? 1 : 0));
  const okActions = texts.filter((_, i) => status[i] === "ok");
  const setStat = (i: number, v: Statut) => { setStatus((s) => ({ ...s, [i]: s[i] === v ? undefined : v })); setEditing(null); };

  /* ---------- Écran de départ ---------- */
  if (!cid) {
    const liveOuvert = !!probe?.live;
    return (
      <PageInner>
        <PageHead title={t.choose}>
          {!liveOuvert && <Link href={route(lang, "acces")} className={buttonClass({ variant: "primary" })}>{t.request}</Link>}
        </PageHead>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-4">
          {CONSULTATIONS.map((k) => (
            <button key={k.id} type="button" onClick={() => reset(k.id)} className="flex text-left">
              <Card interactive className="w-full">
                <CardBody>
                  <CardIcon><User aria-hidden="true" /></CardIcon>
                  <CardTitle>{k.motif}</CardTitle>
                  <CardText>{k.patient}</CardText>
                  <div><Badge variant="pill">{k.duree}</Badge></div>
                </CardBody>
                <CardFooter><CardAction>{t.replay}<ArrowRight aria-hidden="true" /></CardAction></CardFooter>
              </Card>
            </button>
          ))}
          {liveOuvert ? (
            <button type="button" onClick={() => reset(LIVE)} className="flex text-left">
              <Card interactive className="w-full">
                <CardBody>
                  <CardIcon><Mic aria-hidden="true" /></CardIcon>
                  <CardTitle>{t.live.title}</CardTitle>
                  <CardText>{t.live.text}</CardText>
                </CardBody>
                <CardFooter><CardAction>{t.live.open}<ArrowRight aria-hidden="true" /></CardAction></CardFooter>
              </Card>
            </button>
          ) : (
            <Link href={route(lang, "acces")} className="flex">
              <Card interactive className="w-full">
                <CardBody>
                  <CardIcon><Mic aria-hidden="true" /></CardIcon>
                  <CardTitle>{t.live.title}</CardTitle>
                  <CardText>{t.live.text}</CardText>
                  <div><Badge className="bg-muted font-normal text-muted-foreground"><Lock size={12} aria-hidden="true" />{t.live.needAccess}</Badge></div>
                </CardBody>
                <CardFooter><CardAction>{t.request}<ArrowRight aria-hidden="true" /></CardAction></CardFooter>
              </Card>
            </Link>
          )}
        </div>
      </PageInner>
    );
  }

  /* ---------- Bouton principal selon l'étape ---------- */
  let label = "", disabled = false, primary: () => void = () => {};
  if (step === 1) {
    if (isLive) {
      if (dictee.etat !== "off") { label = t.primary.stop; primary = dictee.arreter; }
      else if (liveTr.trim()) { label = t.primary.generate; primary = () => { go(2); void genererNote(); }; }
      else if (probe?.dictee) { label = t.primary.start; primary = () => void dictee.demarrer(); }
      else { label = t.primary.generate; disabled = true; }
    } else if (playing) { label = t.primary.listening; disabled = true; }
    else if (ended) { label = t.primary.generate; primary = () => go(2); }
    else if (pos > 0) { label = t.primary.resume; primary = play; }
    else { label = t.primary.start; primary = play; }
  } else if (step === 2) { label = t.primary.aide; disabled = isLive && (busy !== null || !cr.length); primary = () => { go(3); if (isLive) void genererDecision(); }; }
  else if (step === 3) { label = t.primary.actions; disabled = isLive && busy !== null; primary = () => go(4); }
  else if (step === 4) {
    if (okActions.length === 0) { label = t.primary.need; disabled = true; }
    else { label = t.primary.recap; primary = () => go(5); }
  }

  const titre = isLive ? t.live.title : c!.motif;
  const sousTitre = isLive ? t.live.patient : c!.patientLong;
  const regenerer = () => {
    if (isLive) { if (step === 2) void genererNote(); else void genererDecision(true); return; }
    setCrVals(c!.cr.map((r) => r.valeur)); setRetained({}); setWhy({});
  };
  const voix = () => {
    if (!isLive) { setVoiceNotice((v) => !v); return; }
    if (!probe?.dictee) return;
    if (step !== 1) go(1);
    void dictee.demarrer();
  };
  const showVoice = step === 1 ? (isLive ? !!probe?.dictee && dictee.etat === "off" && !!liveTr.trim() : ended) : step === 2;
  const copier = async () => {
    const txt = copierTexte(titre, sousTitre, cr, crVals, okActions);
    try { await navigator.clipboard.writeText(txt); } catch {}
    setCopied(true);
  };
  const etatLecture = playing ? t.state.live : ended ? t.state.ended : pos > 0 ? t.state.paused : t.state.ready;

  return (
    <div className="flex min-h-dvh flex-col max-[820px]:min-h-[calc(100dvh-92px)]">
      <PageInner className="flex-1 grid-cols-[minmax(0,1fr)] content-start gap-5">
        <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
          <div className="flex min-w-0 flex-[1_1_auto] flex-col gap-0.5">
            <h1 className="m-0 text-[26px] font-semibold leading-[1.15] tracking-[-.03em]">{titre}</h1>
            <span className="text-muted-foreground">{sousTitre}</span>
          </div>
          {t.frenchContent && <Badge variant="pill">{t.frenchContent}</Badge>}
          <Button variant="ghost" className="text-muted-foreground" onClick={() => reset(null)}>{t.change}</Button>
        </div>

        <Stepper t={t} step={step} unlocked={unlocked} onPick={go} />

        {/* 1 · Écouter */}
        {step === 1 && !isLive && (
          <div className="flex flex-col gap-4">
            <Player t={t} playing={playing} progress={total ? pos / total : 0} etat={etatLecture} onToggle={() => (playing ? setPlaying(false) : play())} />
            <Box aria-label={t.transcript} aria-live="polite" className="flex flex-col px-5 pb-3.5 pt-1">
              {shownLines.length === 0 && <p className="m-0 py-7 text-center text-muted-foreground">{t.trEmpty}</p>}
              <TranscriptLines lignes={shownLines} />
              <div ref={trEnd} />
              {!ended && pos > 0 && <Button variant="ghost" size="sm" className="mt-2.5 self-start text-muted-foreground" onClick={() => { setPlaying(false); setPos(total); }}>{t.skip}</Button>}
              {ended && <div className="mt-3 flex items-center gap-2 rounded-md bg-ok-soft px-3 py-2 text-ok"><Check size={16} aria-hidden="true" />{t.ended}</div>}
            </Box>
          </div>
        )}
        {step === 1 && isLive && (
          <div className="flex flex-col gap-4">
            <Box className="flex flex-wrap items-center gap-[18px] px-[18px] py-4">
              {probe?.dictee ? (
                <>
                  <button type="button" onClick={() => (dictee.etat === "off" ? void dictee.demarrer() : dictee.arreter())} aria-label={dictee.etat === "off" ? t.liveMode.mic : t.liveMode.micStop} className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                    {dictee.etat === "off" ? <Mic size={16} aria-hidden="true" /> : <Square size={14} fill="currentColor" strokeWidth={0} aria-hidden="true" />}
                  </button>
                  <span className={cn("inline-flex items-center gap-1.5 text-[13px]", dictee.etat === "on" ? "text-foreground" : "text-muted-foreground")}>
                    <StatusDot active={dictee.etat === "on"} />
                    {dictee.etat === "on" ? t.state.live : dictee.etat === "connexion" ? t.liveMode.connecting : liveTr ? t.state.paused : t.state.ready}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">{t.liveMode.micOff}</span>
              )}
              <span className="ml-auto text-[13px] text-muted-foreground">{t.liveMode.warning}</span>
            </Box>
            {dictee.erreur && <p role="alert" className="m-0 rounded-md bg-destructive/10 px-3 py-2 text-[13px] text-destructive">{dictee.erreur === "micro" ? t.liveMode.noMic : t.liveMode.sttError}</p>}
            <Box className="p-0">
              <label htmlFor="scribe-live-tr" className="sr-only">{t.transcript}</label>
              <textarea id="scribe-live-tr" ref={liveArea} rows={12} value={liveTr} onChange={(e) => setLiveTr(e.target.value)} placeholder={t.liveMode.placeholder} className="block w-full resize-y rounded-xl bg-transparent px-5 py-4 leading-relaxed placeholder:text-muted-foreground focus:outline-none" />
            </Box>
          </div>
        )}

        {/* 2 · Compte rendu */}
        {step === 2 && (
          <div className="flex flex-col gap-3">
            {isLive && busy === "note" ? <Attente texte={t.liveMode.writing} />
              : isLive && liveErr ? <Erreur texte={liveErr} />
              : <NoteTable t={t} cr={cr} vals={crVals} onEdit={(i, v) => setCrVals((x) => { const y = x.slice(); y[i] = v; return y; })} />}
            {!isLive && (
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
            {isLive && busy === "decision" ? <Attente texte={t.liveMode.thinking} />
              : isLive && liveErr ? <Erreur texte={liveErr} />
              : aide.length === 0 ? <Erreur texte={t.liveMode.emptyAide} neutre />
              : aide.map((a, i) => (
                <AideCard key={i} t={t} a={a} retained={!!retained[i]} open={!!why[i]} onRetain={() => setRetained((r) => ({ ...r, [i]: !r[i] }))} onWhy={() => setWhy((w) => ({ ...w, [i]: !w[i] }))} />
              ))}
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
          {showVoice && (
            <Button onClick={voix} aria-expanded={!isLive ? voiceNotice : undefined}><Mic aria-hidden="true" />{t.voice}</Button>
          )}
          {voiceNotice && !isLive && (
            <span className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
              <Lock size={14} aria-hidden="true" />{t.voiceLocked}
              <Link href={route(lang, "acces")} className="font-medium text-foreground underline underline-offset-4">{t.request}</Link>
            </span>
          )}
          {step === 2 && (
            <label className="flex items-center gap-2 text-muted-foreground">
              {t.template}
              <select value={modele} onChange={(e) => setModele(e.target.value as ModeleNote)} className="h-9 rounded-md border border-input bg-background px-2.5 text-foreground shadow-xs">
                {(Object.keys(t.templates) as ModeleNote[]).map((k) => <option key={k} value={k}>{t.templates[k]}</option>)}
              </select>
            </label>
          )}
          {(step === 2 || step === 3) && <Button variant="ghost" className="text-muted-foreground" onClick={regenerer} disabled={busy !== null}>{t.regen}</Button>}
          <span className="flex-auto" />
          {step > 1 && step < 5 && <Button onClick={() => go(step - 1)}>{t.prev}</Button>}
          {step === 5 ? (
            <span className="flex flex-wrap gap-2">
              <Button onClick={() => reset(cid)}>{t.restart}</Button>
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

function Attente({ texte }: { texte: string }) {
  return (
    <Box className="flex items-center gap-2.5 px-5 py-6 text-muted-foreground" aria-live="polite">
      <StatusDot className="animate-pulse" />{texte}
    </Box>
  );
}

function Erreur({ texte, neutre }: { texte: string; neutre?: boolean }) {
  return <Box role={neutre ? undefined : "alert"} className={cn("px-5 py-6", neutre ? "text-muted-foreground" : "text-destructive")}>{texte}</Box>;
}
