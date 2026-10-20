"use client";
import * as React from "react";
import type { ComposeAction } from "@/locus/compose/contract";
import { chargeOf, materialize, alerteAllergie, isoParis, type Charge, type RxLigne, RX_LABEL, CR_TYPE, DOS_LABEL, MSG_A, SORTIES, jourFr, heureFr } from "@/locus/compose/materialize";
import { CABINET, DR_LAURENT } from "@/data/cabinet";
import { Md } from "../md";
import { I, Kbd } from "./chrome";
import { cn } from "@/lib/cn";

/**
 * Le document tel qu'il est rendu et envoyé — en-tête du cabinet, patient,
 * corps, signature — et le panneau qui le montre : à gauche le formulaire
 * typé de l'action, à droite le papier qui se met à jour en direct. Le même
 * panneau sert à relire avant signature, à consulter après, et à corriger en
 * place : un document modifié est renvoyé et remplace le précédent.
 */

export interface PatientRendu { nom: string; naissance?: string; sexe?: "F" | "M"; age?: number; /** Pour recalculer le garde-fou allergie quand une ligne change. */ allergies?: string[] }
const PRAT = { nom: `Dr ${DR_LAURENT.prenom} ${DR_LAURENT.nom}`, rpps: DR_LAURENT.rpps, specialite: DR_LAURENT.specialite, adresse: CABINET.adresse, cabinet: CABINET.nom, mssante: DR_LAURENT.mssante };
function frDate(iso?: string) { if (!iso) return ""; const d = new Date(iso); return isNaN(d.getTime()) ? iso : d.toLocaleDateString("fr-FR"); }
function finArret(debut: string, jours: number) { const d = new Date(debut); d.setDate(d.getDate() + Math.max(1, jours) - 1); return d.toLocaleDateString("fr-FR"); }

/** Le papier. */
export function DocumentRendu({ action, patient, date, compact }: { action: ComposeAction; patient: PatientRendu; date?: string; compact?: boolean }) {
  const c = chargeOf(action.kind, action.charge);
  const quand = date ?? action.envoyeLe ?? new Date().toISOString();
  const entete = (
    <div className="flex justify-between gap-4 text-[12px] leading-[1.45]">
      <div className="flex flex-col"><b className="font-semibold text-[13px]">{PRAT.nom}</b><span className="text-dim-2">{PRAT.specialite} · RPPS {PRAT.rpps}</span><span className="text-dim-2">{PRAT.cabinet}</span><span className="text-dim-2">{PRAT.adresse}</span></div>
      <div className="flex flex-col items-end text-dim-2"><span>Lyon, le {frDate(quand)}</span>{action.envoyeLe && <span className="text-ok">{action.renvoye ? "renvoyé" : "envoyé"} {frDate(action.envoyeLe)}</span>}</div>
    </div>
  );
  const bloc = (
    <div className="flex flex-col text-[13px]"><span>{patient.sexe === "F" ? "Mme" : patient.sexe === "M" ? "M." : ""} {patient.nom}</span>{patient.naissance && <span className="text-dim-2">né{patient.sexe === "F" ? "e" : ""} le {patient.naissance}{patient.age !== undefined ? ` · ${patient.age} ans` : ""}</span>}</div>
  );
  const signature = (texte: string) => <div className="mt-auto flex items-end justify-between gap-4 pt-4"><span className="text-[11px] text-dim-2">{texte}</span><span className="rounded-lg border-[1.5px] border-dashed border-agent-line px-3.5 py-2 text-[12px]" style={{ color: "var(--agent)" }}>{action.envoyeLe ? "Signé e-CPS" : "Signature e-CPS"}</span></div>;

  let corps: React.ReactNode;
  if (!c) corps = <p className="m-0 text-sm">{action.titre}</p>;
  else switch (c.kind) {
    case "ordonnance":
      corps = (
        <>
          <h2 className="m-0 text-[15px] font-semibold uppercase tracking-[.04em]">{RX_LABEL[c.type] ?? "Ordonnance"}{c.lignes.some((l) => l.ald) ? " · ALD" : ""}</h2>
          <ol className="m-0 flex list-decimal flex-col gap-2.5 pl-5 text-[13px] leading-[1.5]">
            {c.lignes.filter((l) => l.libelle.trim()).map((l, i) => <li key={i}><b className="font-medium">{l.libelle}</b>{c.type === "medicament" && l.posologie ? <><br />{l.posologie}</> : null}{c.type === "medicament" && l.duree ? <span className="text-dim-2"> · {l.duree}</span> : null}{c.type === "medicament" && l.renouvellement ? <span className="text-dim-2"> · à renouveler {l.renouvellement} fois</span> : null}{l.ald ? <span className="ml-2 rounded-[4px] bg-soft px-1.5 text-[11px]">ALD</span> : null}</li>)}
          </ol>
          {c.indication && <div className="text-[13px]"><span className="text-dim-2">Renseignements cliniques · </span>{c.indication}</div>}
          {signature(action.envoyeLe ? "Ordonnance numérique · transmise à la pharmacie et au patient" : "Ordonnance numérique à la signature · QR code")}
        </>
      );
      break;
    case "rdv":
      corps = (
        <>
          <h2 className="m-0 text-[15px] font-semibold uppercase tracking-[.04em]">Rendez-vous</h2>
          <div className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-1.5 text-[13px]"><span className="text-dim-2">Quand</span><span>{c.debut ? `${jourFr(c.debut)} à ${heureFr(c.debut)}` : "à planifier"}</span><span className="text-dim-2">Durée</span><span>{c.duree_min} min</span><span className="text-dim-2">Motif</span><span>{c.motif}</span><span className="text-dim-2">Avec</span><span>{PRAT.nom}</span></div>
          <div className="rounded-[10px] bg-bg px-3.5 py-3 text-[12px] leading-[1.5]"><span className="k">SMS au patient</span><br />Bonjour, votre rendez-vous avec le {PRAT.nom} est fixé le {c.debut ? `${jourFr(c.debut).toLowerCase()} à ${heureFr(c.debut).replace(":", " h ")}` : "…"}. {PRAT.cabinet}, {PRAT.adresse}. Pour annuler ou déplacer, répondez à ce message.</div>
          {signature(action.envoyeLe ? "Inscrit à l'agenda · SMS envoyé" : "Sera inscrit à l'agenda, SMS envoyé au patient")}
        </>
      );
      break;
    case "message":
      corps = (
        <>
          <h2 className="m-0 text-[15px] font-semibold uppercase tracking-[.04em]">Message sécurisé</h2>
          <div className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-1.5 text-[13px]"><span className="text-dim-2">À</span><span>{c.nom || (c.a === "patient" ? patient.nom : MSG_A[c.a] ?? c.a)} <span className="text-dim-2">· {c.a === "patient" ? "messagerie patient" : "MSSanté"}</span></span><span className="text-dim-2">Objet</span><span>{c.objet}</span></div>
          <div className="whitespace-pre-line text-[13px] leading-[1.6]">{c.corps}</div>
          {signature(action.envoyeLe ? "Envoyé" : `De ${PRAT.mssante}`)}
        </>
      );
      break;
    case "courrier":
      corps = (
        <>
          <div className="text-[13px]"><span className="text-dim-2">À l'attention de</span> {c.destinataire}{c.specialite ? <span className="text-dim-2"> · {c.specialite}</span> : null}</div>
          <h2 className="m-0 text-[15px] font-semibold">{c.titre}<span className="ml-2 text-[11px] font-normal text-dim-2">{CR_TYPE[c.type] ?? c.type}</span></h2>
          <div className="text-[13px]"><Md text={c.corps} /></div>
          {signature(["certificat", "attestation", "courrier-patient"].includes(c.type) ? (action.envoyeLe ? "Signé · remis au patient" : "Remis au patient en main propre après signature") : action.envoyeLe ? "Envoyé par MSSanté" : `Par MSSanté, de ${PRAT.mssante}`)}
        </>
      );
      break;
    case "arret":
      corps = (
        <>
          <h2 className="m-0 text-[15px] font-semibold uppercase tracking-[.04em]">Avis d'arrêt de travail{c.prolongation ? " · prolongation" : ""}</h2>
          <div className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-1.5 text-[13px]"><span className="text-dim-2">Du</span><span>{frDate(quand)}</span><span className="text-dim-2">Au</span><span>{finArret(quand, c.jours)} inclus · {c.jours} jour{c.jours > 1 ? "s" : ""}</span><span className="text-dim-2">Sorties</span><span>{SORTIES[c.sorties] ?? c.sorties}</span><span className="text-dim-2">Temps partiel</span><span>{c.temps_partiel ? "oui" : "non"}</span></div>
          <div className="rounded-[10px] border border-dashed border-line px-3.5 py-2.5 text-[12px] leading-[1.5]"><span className="k">Volet 1 · médical, confidentiel</span><br />Motif : {c.motif}</div>
          <div className="text-[11px] text-dim-2">Volets 2 et 3 (employeur, assuré) sans le motif.</div>
          {signature(action.envoyeLe ? "Télétransmis à la CPAM (AAT)" : "Téléservice AAT · télétransmis à la signature")}
        </>
      );
      break;
    case "dossier":
      corps = (
        <>
          <h2 className="m-0 text-[15px] font-semibold uppercase tracking-[.04em]">Fiche · {DOS_LABEL[c.type] ?? c.type}</h2>
          <div className="text-[13px] leading-[1.55]"><b className="font-medium">{c.libelle}</b>{c.detail ? <><br />{c.detail}</> : null}</div>
          <div className="mt-auto pt-4 text-[11px] text-dim-2">{action.envoyeLe ? "Ajouté à la fiche du patient." : "Sera ajouté à la fiche du patient à la validation. Rien n'est signé ni envoyé."}</div>
        </>
      );
      break;
  }
  return (
    <div className={cn("papier flex min-h-[420px] w-full flex-col gap-5 rounded-md border border-line bg-paper text-ink", compact ? "px-5 py-5" : "px-7 py-7 sm:px-9 sm:py-8")} style={{ boxShadow: "var(--shadow)" }}>
      {entete}
      {bloc}
      <div className="flex flex-1 flex-col gap-3.5 border-t border-line-4 pt-4">{corps}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Le formulaire typé, par genre d'action                               */
/* ------------------------------------------------------------------ */

const inp = "min-w-0 w-full rounded-[8px] border border-line bg-paper px-2.5 py-1.5 text-base text-ink sm:text-sm";
const Lbl = ({ l, children, wide }: { l: string; children: React.ReactNode; wide?: boolean }) => <label className={cn("flex flex-col gap-1", wide && "sm:col-span-2")}><span className="k">{l}</span>{children}</label>;

function Form({ c, onChange }: { c: Charge; onChange: (c: Charge) => void }) {
  switch (c.kind) {
    case "ordonnance": {
      const med = c.type === "medicament";
      const set = (i: number, patch: Partial<RxLigne>) => onChange({ ...c, lignes: c.lignes.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
      if (!med) {
        // Un examen, un acte : les lignes demandées et le renseignement clinique, rien d'autre.
        return (
          <div className="flex flex-col gap-3">
            <Lbl l={RX_LABEL[c.type] ?? "Ordonnance"}><textarea autoComplete="off" autoCorrect="off" spellCheck={false} value={c.lignes.map((l) => l.libelle).join("\n")} rows={4} placeholder={"Un examen ou un acte par ligne"} onChange={(e) => onChange({ ...c, lignes: e.target.value.split("\n").map((libelle) => ({ libelle })) })} className={cn(inp, "resize-y leading-[1.5]")} /></Lbl>
            <Lbl l="Renseignements cliniques"><input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" value={c.indication ?? ""} onChange={(e) => onChange({ ...c, indication: e.target.value || undefined })} placeholder="Ce que le confrère doit savoir, en une ligne" className={inp} /></Lbl>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={c.lignes.some((l) => l.ald)} onChange={(e) => onChange({ ...c, lignes: c.lignes.map((l) => ({ ...l, ald: e.target.checked })) })} /> En rapport avec l'ALD</label>
          </div>
        );
      }
      return (
        <div className="flex flex-col gap-3">
          {c.lignes.map((l, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-[10px] border border-line-3 bg-bg p-3">
              <div className="flex items-center gap-2"><span className="d text-[11px]">ligne {i + 1}</span><span className="flex-1" />{c.lignes.length > 1 && <button type="button" onClick={() => onChange({ ...c, lignes: c.lignes.filter((_, j) => j !== i) })} className="min-h-8 text-xs text-dim-2 hover:text-rec-text">Retirer</button>}</div>
              <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" value={l.libelle} onChange={(e) => set(i, { libelle: e.target.value })} placeholder="DCI et dosage" aria-label={`Ligne ${i + 1} · libellé`} className={inp} />
              <div className="grid gap-2 sm:grid-cols-2">
                <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" value={l.posologie ?? ""} onChange={(e) => set(i, { posologie: e.target.value })} placeholder="Posologie · 1 cp matin et soir" aria-label={`Ligne ${i + 1} · posologie`} className={inp} />
                <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" value={l.duree ?? ""} onChange={(e) => set(i, { duree: e.target.value })} placeholder="Durée · 3 mois" aria-label={`Ligne ${i + 1} · durée`} className={inp} />
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" checked={!!l.ald} onChange={(e) => set(i, { ald: e.target.checked })} /> ALD</label>
                {l.renouvellement ? <span className="text-dim-2">à renouveler {l.renouvellement} fois <button type="button" onClick={() => set(i, { renouvellement: undefined })} className="ml-1 underline">retirer</button></span> : <button type="button" onClick={() => set(i, { renouvellement: 1 })} className="text-dim-2 underline">ajouter un renouvellement</button>}
              </div>
            </div>
          ))}
          <button type="button" onClick={() => onChange({ ...c, lignes: [...c.lignes, { libelle: "" }] })} className="min-h-10 self-start rounded-[8px] border border-line bg-paper px-3 py-1.5 text-sm text-ink hover:bg-hover">+ Ajouter une ligne</button>
        </div>
      );
    }
    case "rdv": {
      const d = c.debut ? c.debut.slice(0, 10) : ""; const h = c.debut ? heureFr(c.debut) : "09:30";
      const setDebut = (dd: string, hh: string) => onChange({ ...c, debut: dd ? isoParis(dd, hh || "09:30") : "" });
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Lbl l="Date"><input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" type="date" value={d} onChange={(e) => setDebut(e.target.value, h)} className={inp} /></Lbl>
          <Lbl l="Heure"><input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" type="time" value={h} onChange={(e) => setDebut(d, e.target.value)} className={inp} /></Lbl>
          <Lbl l="Durée"><select value={c.duree_min} onChange={(e) => onChange({ ...c, duree_min: Number(e.target.value) })} className={inp}>{[10, 15, 20, 30, 45].map((n) => <option key={n} value={n}>{n} min</option>)}</select></Lbl>
          <Lbl l="Motif"><input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" value={c.motif} onChange={(e) => onChange({ ...c, motif: e.target.value })} className={inp} /></Lbl>
        </div>
      );
    }
    case "message":
      return (
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Lbl l="À"><select value={c.a} onChange={(e) => onChange({ ...c, a: e.target.value, nom: e.target.value === "patient" ? undefined : c.nom })} className={inp}>{Object.entries(MSG_A).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Lbl>
            {c.a !== "patient" && <Lbl l="Nom"><input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" value={c.nom ?? ""} onChange={(e) => onChange({ ...c, nom: e.target.value || undefined })} placeholder="Dr Nom, pharmacie…" className={inp} /></Lbl>}
          </div>
          <Lbl l="Objet"><input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" value={c.objet} onChange={(e) => onChange({ ...c, objet: e.target.value })} className={inp} /></Lbl>
          <Lbl l="Message"><textarea autoComplete="off" autoCorrect="off" spellCheck={false} value={c.corps} rows={7} onChange={(e) => onChange({ ...c, corps: e.target.value })} className={cn(inp, "resize-y leading-[1.5]")} /></Lbl>
        </div>
      );
    case "courrier":
      return (
        <div className="flex flex-col gap-3">
          <Lbl l="À"><input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" value={c.destinataire} onChange={(e) => onChange({ ...c, destinataire: e.target.value })} className={inp} placeholder="Dr Nom, service, établissement" /></Lbl>
          <Lbl l="Titre"><input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" value={c.titre} onChange={(e) => onChange({ ...c, titre: e.target.value })} className={inp} /></Lbl>
          <Lbl l="Corps"><textarea autoComplete="off" autoCorrect="off" spellCheck={false} value={c.corps} rows={10} onChange={(e) => onChange({ ...c, corps: e.target.value })} className={cn(inp, "resize-y leading-[1.5]")} /></Lbl>
        </div>
      );
    case "arret":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Lbl l="Durée (jours)"><input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" type="number" min={1} max={365} value={c.jours} onChange={(e) => onChange({ ...c, jours: Math.max(1, Number(e.target.value) || 1) })} className={inp} /></Lbl>
          <Lbl l="Sorties"><select value={c.sorties} onChange={(e) => onChange({ ...c, sorties: e.target.value })} className={inp}>{Object.entries(SORTIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Lbl>
          <div className="flex flex-wrap items-center gap-4 text-sm sm:col-span-2"><label className="flex items-center gap-2"><input type="checkbox" checked={!!c.temps_partiel} onChange={(e) => onChange({ ...c, temps_partiel: e.target.checked })} /> Temps partiel thérapeutique</label><label className="flex items-center gap-2"><input type="checkbox" checked={!!c.prolongation} onChange={(e) => onChange({ ...c, prolongation: e.target.checked })} /> Prolongation</label></div>
          <Lbl l="Motif médical (volet confidentiel)" wide><input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" value={c.motif} onChange={(e) => onChange({ ...c, motif: e.target.value })} className={inp} /></Lbl>
        </div>
      );
    case "dossier":
      return (
        <div className="flex flex-col gap-3">
          <Lbl l="Rubrique de la fiche"><select value={c.type} onChange={(e) => onChange({ ...c, type: e.target.value })} className={inp}>{Object.entries(DOS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Lbl>
          <Lbl l="Ligne"><input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" value={c.libelle} onChange={(e) => onChange({ ...c, libelle: e.target.value })} placeholder="Telle qu'elle apparaîtra dans la fiche" className={inp} /></Lbl>
          <Lbl l="Détail (facultatif)"><input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" value={c.detail ?? ""} onChange={(e) => onChange({ ...c, detail: e.target.value || undefined })} className={inp} /></Lbl>
        </div>
      );
  }
}

/* ------------------------------------------------------------------ */
/* Le panneau : formulaire + papier                                     */
/* ------------------------------------------------------------------ */

/** Un dialogue est ouvert : les raccourcis globaux (⌘⏎ valider, esc remonter) doivent se taire. */
export const dialogOuvert = () => typeof document !== "undefined" && !!document.querySelector("[role=dialog][aria-modal=true]");

export function ActionPanel({ action, patient, onChange, onClose, onRemove, titre }: { action: ComposeAction; patient: PatientRendu; /** Absent : consultation seule. */ onChange?: (a: ComposeAction) => void; onClose: () => void; /** Retirer l'action du plan, depuis le panneau. */ onRemove?: () => void; titre?: string }) {
  const [onglet, setOnglet] = React.useState<"modifier" | "apercu">(onChange ? "modifier" : "apercu");
  const c = chargeOf(action.kind, action.charge);
  const boite = React.useRef<HTMLDivElement>(null);
  const fermer = React.useRef<HTMLButtonElement>(null);
  // Le focus entre dans le dialogue, y reste (Tab boucle), et revient d'où il est parti à la fermeture.
  React.useEffect(() => {
    const avant = document.activeElement as HTMLElement | null;
    const premier = boite.current?.querySelector<HTMLElement>("input, select, textarea") ?? fermer.current;
    premier?.focus();
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); onClose(); return; }
      if (e.key === "Tab" && boite.current) {
        const f = [...boite.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])")].filter((el) => el.offsetParent !== null);
        if (!f.length) return;
        const i = f.indexOf(document.activeElement as HTMLElement);
        if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && (i === -1 || i === f.length - 1)) { e.preventDefault(); f[0].focus(); }
      }
    };
    window.addEventListener("keydown", k, true);
    return () => { window.removeEventListener("keydown", k, true); avant?.focus?.(); };
  }, [onClose]);
  // Modifier en place : le garde-fou allergie est recalculé sur les lignes (si le patient est connu), jamais perdu ; une alerte garde « à relire ».
  const update = (nc: Charge) => {
    if (!onChange) return;
    const alerte = nc.kind === "ordonnance" ? (patient.allergies ? alerteAllergie(nc.lignes, patient.allergies) : nc.alerte) : undefined;
    const m = materialize(nc, patient.nom, alerte);
    onChange({ ...action, ...m, justification: action.justification, statut: alerte ? "relire" : "pret" });
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(17,17,17,.35)] p-0 sm:items-center sm:p-6" onClick={onClose} role="dialog" aria-modal="true" aria-label={titre ?? action.titre}>
      <div ref={boite} onClick={(e) => e.stopPropagation()} className="flex max-h-[94dvh] w-full max-w-[1100px] flex-col overflow-hidden rounded-t-[16px] bg-bg sm:rounded-[16px]" style={{ boxShadow: "0 24px 64px rgba(0,0,0,.25)" }}>
        <div className="flex items-center gap-3 border-b border-line-2 px-5 py-3">
          <span className="d flex h-6 min-w-6 items-center justify-center rounded-[6px] bg-soft px-1 text-[10px] text-ink-3">{action.code}</span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{titre ?? action.titre}</span>
          {action.envoyeLe && <span className="hidden text-xs text-ok sm:inline">{action.renvoye ? "renvoyé" : "envoyé"} le {frDate(action.envoyeLe)}{onChange ? " · toute modification sera renvoyée" : ""}</span>}
          {onChange && <div className="flex rounded-full border border-line bg-paper p-0.5 lg:hidden">{(["modifier", "apercu"] as const).map((o) => <button key={o} type="button" onClick={() => setOnglet(o)} aria-pressed={onglet === o} className={cn("min-h-9 rounded-full px-3 py-1 text-xs", onglet === o ? "bg-ink text-paper" : "text-ink-2")}>{o === "modifier" ? "Modifier" : "Aperçu"}</button>)}</div>}
          <button ref={fermer} type="button" onClick={onClose} className="flex min-h-9 items-center gap-2 rounded-[8px] px-2 py-1 text-sm text-dim-2 hover:text-ink">Fermer <Kbd>esc</Kbd></button>
        </div>
        {action.alerte && <div className="flex items-start gap-2.5 border-b border-line-2 bg-[color-mix(in_srgb,var(--warn)_12%,var(--paper))] px-5 py-2.5 text-[13px] leading-[1.45] text-warn" role="alert"><span className="mt-px shrink-0 font-semibold">⚠ Allergie au dossier</span><span className="min-w-0 flex-1">{action.alerte} · à vérifier avant signature{onChange ? " ; changez la ligne ou retirez-la du plan" : ""}.</span></div>}
        <div className={cn("grid min-h-0 flex-1 overflow-y-auto", onChange ? "lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]" : "")}>
          {onChange && c && (
            <div className={cn("flex flex-col gap-4 border-line-2 px-5 py-5 lg:border-r", onglet !== "modifier" && "hidden lg:flex")}>
              <Form c={c} onChange={update} />
              {action.justification && <div className="rounded-[10px] bg-agent-soft-2 px-3.5 py-2.5 text-[13px] leading-[1.5]"><span className="k" style={{ color: "var(--agent)" }}>Pourquoi</span><br />{action.justification}</div>}
              <span className="text-xs text-dim-2">{action.kind === "ordonnance" ? "Une autre nature d'ordonnance (examen, kiné…) est une autre ordonnance : « + Ajouter » dans la consultation. " : ""}{action.envoyeLe ? "Une fois enregistrée, cette version est renvoyée et remplace l'envoi précédent." : action.kind === "dossier" ? "Ajouté à la fiche à la validation." : "Rien ne part avant la signature."}</span>
            </div>
          )}
          <div className={cn("bg-soft/40 px-4 py-5 sm:px-6", onChange && onglet !== "apercu" && "hidden lg:block")}>
            <div className="mx-auto max-w-[640px]"><DocumentRendu action={action} patient={patient} /></div>
          </div>
        </div>
        {onChange && <div className="flex items-center gap-2 border-t border-line-2 px-5 py-3">{onRemove && <button type="button" onClick={() => { onRemove(); onClose(); }} className="min-h-11 rounded-[10px] px-3 py-[9px] text-sm text-dim-2 hover:text-rec-text">Supprimer</button>}<span className="flex-1" /><button type="button" onClick={onClose} className="flex min-h-11 items-center gap-2 rounded-[10px] bg-ink px-4 py-[9px] text-sm text-paper"><I.check size={13} color="var(--paper)" w={2.5} /> Terminé</button></div>}
      </div>
    </div>
  );
}
