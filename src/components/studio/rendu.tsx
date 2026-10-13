"use client";
import * as React from "react";
import type { ComposeAction } from "@/locus/compose/contract";
import { chargeOf, materialize, type Charge, type RxLigne, RX_LABEL, CR_TYPE, DOS_LABEL, MSG_A, SORTIES, jourFr, heureFr } from "@/locus/compose/materialize";
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

export interface PatientRendu { nom: string; naissance?: string; sexe?: "F" | "M"; age?: number }
const PRAT = { nom: `Dr ${DR_LAURENT.prenom} ${DR_LAURENT.nom}`, rpps: DR_LAURENT.rpps, specialite: DR_LAURENT.specialite, adresse: CABINET.adresse, cabinet: CABINET.nom, mssante: DR_LAURENT.mssante };
function frDate(iso?: string) { if (!iso) return ""; const d = new Date(iso); return isNaN(d.getTime()) ? iso : d.toLocaleDateString("fr-FR"); }
function finArret(debut: string, jours: number) { const d = new Date(debut); d.setDate(d.getDate() + Math.max(1, jours) - 1); return d.toLocaleDateString("fr-FR"); }

/** Le papier. */
export function DocumentRendu({ action, patient, date, compact }: { action: ComposeAction; patient: PatientRendu; date?: string; compact?: boolean }) {
  const c = chargeOf(action.kind, action.charge);
  const quand = date ?? action.envoyeLe ?? new Date().toISOString();
  const entete = (
    <div className="flex justify-between gap-4 text-[12px] leading-[1.45]">
      <div className="flex flex-col"><b className="font-semibold text-[13px]">{PRAT.nom}</b><span className="text-muted-2">{PRAT.specialite} · RPPS {PRAT.rpps}</span><span className="text-muted-2">{PRAT.cabinet}</span><span className="text-muted-2">{PRAT.adresse}</span></div>
      <div className="flex flex-col items-end text-muted-2"><span>Lyon, le {frDate(quand)}</span>{action.envoyeLe && <span className="text-ok">{action.renvoye ? "renvoyé" : "envoyé"} {frDate(action.envoyeLe)}</span>}</div>
    </div>
  );
  const bloc = (
    <div className="flex flex-col text-[13px]"><span>{patient.sexe === "F" ? "Mme" : patient.sexe === "M" ? "M." : ""} {patient.nom}</span>{patient.naissance && <span className="text-muted-2">né{patient.sexe === "F" ? "e" : ""} le {patient.naissance}{patient.age !== undefined ? ` · ${patient.age} ans` : ""}</span>}</div>
  );
  const signature = (texte: string) => <div className="mt-auto flex items-end justify-between gap-4 pt-4"><span className="text-[11px] text-muted-2">{texte}</span><span className="rounded-lg border-[1.5px] border-dashed border-accent-line px-3.5 py-2 text-[12px]" style={{ color: "var(--accent)" }}>{action.envoyeLe ? "Signé e-CPS" : "Signature e-CPS"}</span></div>;

  let corps: React.ReactNode;
  if (!c) corps = <p className="m-0 text-sm">{action.titre}</p>;
  else switch (c.kind) {
    case "ordonnance":
      corps = (
        <>
          <h2 className="m-0 text-[15px] font-semibold uppercase tracking-[.04em]">{RX_LABEL[c.type] ?? "Ordonnance"}{c.lignes.some((l) => l.ald) ? " · ALD" : ""}</h2>
          <ol className="m-0 flex list-decimal flex-col gap-2.5 pl-5 text-[13px] leading-[1.5]">
            {c.lignes.map((l, i) => <li key={i}><b className="font-medium">{l.libelle}</b>{l.posologie ? <><br />{l.posologie}</> : null}{l.duree ? <span className="text-muted-2"> · {l.duree}</span> : null}{l.renouvellement ? <span className="text-muted-2"> · à renouveler {l.renouvellement} fois</span> : null}{l.ald ? <span className="ml-2 rounded-[4px] bg-soft px-1.5 text-[11px]">ALD</span> : null}</li>)}
          </ol>
          {signature(action.envoyeLe ? "Ordonnance numérique · transmise à la pharmacie et au patient" : "Ordonnance numérique à la signature · QR code")}
        </>
      );
      break;
    case "rdv":
      corps = (
        <>
          <h2 className="m-0 text-[15px] font-semibold uppercase tracking-[.04em]">Rendez-vous</h2>
          <div className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-1.5 text-[13px]"><span className="text-muted-2">Quand</span><span>{c.debut ? `${jourFr(c.debut)} à ${heureFr(c.debut)}` : "à planifier"}</span><span className="text-muted-2">Durée</span><span>{c.duree_min} min</span><span className="text-muted-2">Motif</span><span>{c.motif}</span><span className="text-muted-2">Avec</span><span>{PRAT.nom}</span></div>
          <div className="rounded-[10px] bg-bg px-3.5 py-3 text-[12px] leading-[1.5]"><span className="k">SMS au patient</span><br />Bonjour, votre rendez-vous avec le {PRAT.nom} est fixé le {c.debut ? `${jourFr(c.debut)} à ${heureFr(c.debut)}` : "…"}. {PRAT.cabinet}, {PRAT.adresse}. Répondez STOP pour annuler.</div>
          {signature(action.envoyeLe ? "Inscrit à l'agenda · SMS envoyé" : "Sera inscrit à l'agenda, SMS envoyé au patient")}
        </>
      );
      break;
    case "message":
      corps = (
        <>
          <h2 className="m-0 text-[15px] font-semibold uppercase tracking-[.04em]">Message sécurisé</h2>
          <div className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-1.5 text-[13px]"><span className="text-muted-2">À</span><span>{c.nom || (c.a === "patient" ? patient.nom : MSG_A[c.a] ?? c.a)} <span className="text-muted-2">· {c.a === "patient" ? "messagerie patient" : "MSSanté"}</span></span><span className="text-muted-2">Objet</span><span>{c.objet}</span></div>
          <div className="whitespace-pre-line text-[13px] leading-[1.6]">{c.corps}</div>
          {signature(action.envoyeLe ? "Envoyé" : `De ${PRAT.mssante}`)}
        </>
      );
      break;
    case "courrier":
      corps = (
        <>
          <div className="text-[13px]"><span className="text-muted-2">À l'attention de</span> {c.destinataire}{c.specialite ? <span className="text-muted-2"> · {c.specialite}</span> : null}</div>
          <h2 className="m-0 text-[15px] font-semibold">{c.titre}<span className="ml-2 text-[11px] font-normal text-muted-2">{CR_TYPE[c.type] ?? c.type}</span></h2>
          <div className="text-[13px]"><Md text={c.corps} /></div>
          {signature(action.envoyeLe ? "Envoyé par MSSanté" : `Par MSSanté, de ${PRAT.mssante}`)}
        </>
      );
      break;
    case "arret":
      corps = (
        <>
          <h2 className="m-0 text-[15px] font-semibold uppercase tracking-[.04em]">Avis d'arrêt de travail{c.prolongation ? " · prolongation" : ""}</h2>
          <div className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-1.5 text-[13px]"><span className="text-muted-2">Du</span><span>{frDate(quand)}</span><span className="text-muted-2">Au</span><span>{finArret(quand, c.jours)} inclus · {c.jours} jour{c.jours > 1 ? "s" : ""}</span><span className="text-muted-2">Sorties</span><span>{SORTIES[c.sorties] ?? c.sorties}</span><span className="text-muted-2">Temps partiel</span><span>{c.temps_partiel ? "oui" : "non"}</span></div>
          <div className="rounded-[10px] border border-dashed border-line px-3.5 py-2.5 text-[12px] leading-[1.5]"><span className="k">Volet 1 · médical, confidentiel</span><br />Motif : {c.motif}</div>
          <div className="text-[11px] text-muted-2">Volets 2 et 3 (employeur, assuré) sans le motif.</div>
          {signature(action.envoyeLe ? "Télétransmis à la CPAM (AAT)" : "Téléservice AAT · télétransmis à la signature")}
        </>
      );
      break;
    case "dossier":
      corps = (
        <>
          <h2 className="m-0 text-[15px] font-semibold uppercase tracking-[.04em]">{DOS_LABEL[c.type] ?? "Dossier"}</h2>
          <div className="text-[13px] leading-[1.55]"><b className="font-medium">{c.libelle}</b>{c.detail ? <><br />{c.detail}</> : null}</div>
          <div className="text-[11px] text-muted-2">Inscrit au dossier · alimenté au DMP (Mon espace santé) sous forme de volet de synthèse.</div>
          {signature(action.envoyeLe ? "Inscrit · DMP alimenté" : "Inscription au dossier à la signature")}
        </>
      );
      break;
  }
  return (
    <div className={cn("flex min-h-[420px] w-full flex-col gap-5 rounded-md border border-line bg-paper text-ink", compact ? "px-5 py-5" : "px-7 py-7 sm:px-9 sm:py-8")} style={{ boxShadow: "var(--shadow)" }}>
      {entete}
      {bloc}
      <div className="flex flex-1 flex-col gap-3.5 border-t border-line-4 pt-4">{corps}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Le formulaire typé, par genre d'action                               */
/* ------------------------------------------------------------------ */

const inp = "min-w-0 w-full rounded-[8px] border border-line bg-paper px-2.5 py-1.5 text-sm text-ink outline-none focus:border-accent-line";
const Lbl = ({ l, children, wide }: { l: string; children: React.ReactNode; wide?: boolean }) => <label className={cn("flex flex-col gap-1", wide && "sm:col-span-2")}><span className="k">{l}</span>{children}</label>;

function Form({ c, onChange }: { c: Charge; onChange: (c: Charge) => void }) {
  switch (c.kind) {
    case "ordonnance": {
      const set = (i: number, patch: Partial<RxLigne>) => onChange({ ...c, lignes: c.lignes.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
      return (
        <div className="flex flex-col gap-3">
          <Lbl l="Type"><select value={c.type} onChange={(e) => onChange({ ...c, type: e.target.value })} className={inp}>{Object.entries(RX_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Lbl>
          {c.lignes.map((l, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-[10px] border border-line-3 bg-bg p-3">
              <div className="flex items-center gap-2"><span className="d text-[11px]">ligne {i + 1}</span><span className="flex-1" />{c.lignes.length > 1 && <button type="button" onClick={() => onChange({ ...c, lignes: c.lignes.filter((_, j) => j !== i) })} className="text-xs text-muted-2 hover:text-rec-text">Retirer</button>}</div>
              <input value={l.libelle} onChange={(e) => set(i, { libelle: e.target.value })} placeholder="DCI dosage, examen ou acte" className={inp} />
              <div className="grid gap-2 sm:grid-cols-2">
                <input value={l.posologie ?? ""} onChange={(e) => set(i, { posologie: e.target.value })} placeholder="Posologie · 1 cp matin et soir" className={inp} />
                <input value={l.duree ?? ""} onChange={(e) => set(i, { duree: e.target.value })} placeholder="Durée · 3 mois" className={inp} />
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <label className="flex items-center gap-2"><span className="text-muted-2">Renouvelable</span><input type="number" min={0} max={12} value={l.renouvellement ?? 0} onChange={(e) => set(i, { renouvellement: Number(e.target.value) || undefined })} className={cn(inp, "w-[64px]")} /><span className="text-muted-2">fois</span></label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={!!l.ald} onChange={(e) => set(i, { ald: e.target.checked })} /> ALD</label>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => onChange({ ...c, lignes: [...c.lignes, { libelle: "" }] })} className="self-start rounded-[8px] border border-line bg-paper px-3 py-1.5 text-sm text-ink hover:bg-hover">+ Ajouter une ligne</button>
        </div>
      );
    }
    case "rdv": {
      const d = c.debut ? c.debut.slice(0, 10) : ""; const h = c.debut ? c.debut.slice(11, 16) : "09:30";
      const setDebut = (dd: string, hh: string) => onChange({ ...c, debut: dd ? `${dd}T${hh || "09:30"}:00+02:00` : "" });
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Lbl l="Date"><input type="date" value={d} onChange={(e) => setDebut(e.target.value, h)} className={inp} /></Lbl>
          <Lbl l="Heure"><input type="time" value={h} onChange={(e) => setDebut(d, e.target.value)} className={inp} /></Lbl>
          <Lbl l="Durée"><select value={c.duree_min} onChange={(e) => onChange({ ...c, duree_min: Number(e.target.value) })} className={inp}>{[10, 15, 20, 30, 45].map((n) => <option key={n} value={n}>{n} min</option>)}</select></Lbl>
          <Lbl l="Motif"><input value={c.motif} onChange={(e) => onChange({ ...c, motif: e.target.value })} className={inp} /></Lbl>
        </div>
      );
    }
    case "message":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Lbl l="À"><select value={c.a} onChange={(e) => onChange({ ...c, a: e.target.value })} className={inp}>{Object.entries(MSG_A).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Lbl>
          <Lbl l="Nom (si pas le patient)"><input value={c.nom ?? ""} onChange={(e) => onChange({ ...c, nom: e.target.value || undefined })} className={inp} /></Lbl>
          <Lbl l="Objet" wide><input value={c.objet} onChange={(e) => onChange({ ...c, objet: e.target.value })} className={inp} /></Lbl>
          <Lbl l="Message" wide><textarea value={c.corps} rows={7} onChange={(e) => onChange({ ...c, corps: e.target.value })} className={cn(inp, "resize-y leading-[1.5]")} /></Lbl>
        </div>
      );
    case "courrier":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Lbl l="Type"><select value={c.type} onChange={(e) => onChange({ ...c, type: e.target.value })} className={inp}>{Object.entries(CR_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Lbl>
          <Lbl l="Spécialité"><input value={c.specialite ?? ""} onChange={(e) => onChange({ ...c, specialite: e.target.value || undefined })} className={inp} /></Lbl>
          <Lbl l="Destinataire" wide><input value={c.destinataire} onChange={(e) => onChange({ ...c, destinataire: e.target.value })} className={inp} placeholder="Dr Nom, service, établissement" /></Lbl>
          <Lbl l="Titre" wide><input value={c.titre} onChange={(e) => onChange({ ...c, titre: e.target.value })} className={inp} /></Lbl>
          <Lbl l="Corps" wide><textarea value={c.corps} rows={10} onChange={(e) => onChange({ ...c, corps: e.target.value })} className={cn(inp, "resize-y leading-[1.5]")} /></Lbl>
        </div>
      );
    case "arret":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Lbl l="Durée (jours)"><input type="number" min={1} max={365} value={c.jours} onChange={(e) => onChange({ ...c, jours: Math.max(1, Number(e.target.value) || 1) })} className={inp} /></Lbl>
          <Lbl l="Sorties"><select value={c.sorties} onChange={(e) => onChange({ ...c, sorties: e.target.value })} className={inp}>{Object.entries(SORTIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Lbl>
          <div className="flex flex-wrap items-center gap-4 text-sm sm:col-span-2"><label className="flex items-center gap-2"><input type="checkbox" checked={!!c.temps_partiel} onChange={(e) => onChange({ ...c, temps_partiel: e.target.checked })} /> Temps partiel thérapeutique</label><label className="flex items-center gap-2"><input type="checkbox" checked={!!c.prolongation} onChange={(e) => onChange({ ...c, prolongation: e.target.checked })} /> Prolongation</label></div>
          <Lbl l="Motif médical (volet confidentiel)" wide><input value={c.motif} onChange={(e) => onChange({ ...c, motif: e.target.value })} className={inp} /></Lbl>
        </div>
      );
    case "dossier":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Lbl l="Type"><select value={c.type} onChange={(e) => onChange({ ...c, type: e.target.value })} className={inp}>{Object.entries(DOS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Lbl>
          <Lbl l="Libellé" wide><input value={c.libelle} onChange={(e) => onChange({ ...c, libelle: e.target.value })} className={inp} /></Lbl>
          <Lbl l="Détail" wide><textarea value={c.detail ?? ""} rows={4} onChange={(e) => onChange({ ...c, detail: e.target.value || undefined })} className={cn(inp, "resize-y leading-[1.5]")} /></Lbl>
        </div>
      );
  }
}

/* ------------------------------------------------------------------ */
/* Le panneau : formulaire + papier                                     */
/* ------------------------------------------------------------------ */

export function ActionPanel({ action, patient, onChange, onClose, titre }: { action: ComposeAction; patient: PatientRendu; /** Absent : consultation seule. */ onChange?: (a: ComposeAction) => void; onClose: () => void; titre?: string }) {
  const [onglet, setOnglet] = React.useState<"modifier" | "apercu">(onChange ? "modifier" : "apercu");
  const c = chargeOf(action.kind, action.charge);
  React.useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } }; window.addEventListener("keydown", k, true); return () => window.removeEventListener("keydown", k, true); }, [onClose]);
  const update = (nc: Charge) => { if (!onChange) return; const m = materialize(nc, patient.nom); onChange({ ...action, ...m, justification: action.justification, statut: "pret" }); };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(17,17,17,.35)] p-0 sm:items-center sm:p-6" onClick={onClose} role="dialog" aria-modal="true">
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[94dvh] w-full max-w-[1100px] flex-col overflow-hidden rounded-t-[16px] bg-bg sm:rounded-[16px]" style={{ boxShadow: "0 24px 64px rgba(0,0,0,.25)" }}>
        <div className="flex items-center gap-3 border-b border-line-2 px-5 py-3">
          <span className="d flex h-6 min-w-6 items-center justify-center rounded-[6px] bg-soft px-1 text-[10px] text-ink-3">{action.code}</span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{titre ?? action.titre}</span>
          {action.envoyeLe && <span className="text-xs text-ok">{action.renvoye ? "renvoyé" : "envoyé"} le {frDate(action.envoyeLe)}{onChange ? " · toute modification sera renvoyée" : ""}</span>}
          {onChange && <div className="flex rounded-full border border-line bg-paper p-0.5 lg:hidden">{(["modifier", "apercu"] as const).map((o) => <button key={o} type="button" onClick={() => setOnglet(o)} className={cn("rounded-full px-3 py-1 text-xs", onglet === o ? "bg-ink text-paper" : "text-ink-2")}>{o === "modifier" ? "Modifier" : "Aperçu"}</button>)}</div>}
          <button type="button" onClick={onClose} className="flex items-center gap-2 rounded-[8px] px-2 py-1 text-sm text-muted-2 hover:text-ink">Fermer <Kbd>esc</Kbd></button>
        </div>
        <div className={cn("grid min-h-0 flex-1 overflow-y-auto", onChange ? "lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]" : "")}>
          {onChange && c && (
            <div className={cn("flex flex-col gap-4 border-line-2 px-5 py-5 lg:border-r", onglet !== "modifier" && "hidden lg:flex")}>
              <Form c={c} onChange={update} />
              {action.justification && <div className="rounded-[10px] bg-accent-soft-2 px-3.5 py-2.5 text-[13px] leading-[1.5]"><span className="k" style={{ color: "var(--accent)" }}>Pourquoi</span><br />{action.justification}</div>}
              <span className="text-xs text-muted-2">Le papier à droite se met à jour en direct. {action.envoyeLe ? "À la signature, cette version est renvoyée et remplace l'envoi précédent." : "Rien ne part avant la signature."}</span>
            </div>
          )}
          <div className={cn("bg-soft/40 px-4 py-5 sm:px-6", onChange && onglet !== "apercu" && "hidden lg:block")}>
            <div className="mx-auto max-w-[640px]"><DocumentRendu action={action} patient={patient} /></div>
          </div>
        </div>
        {onChange && <div className="flex items-center justify-end gap-2 border-t border-line-2 px-5 py-3"><button type="button" onClick={onClose} className="flex items-center gap-2 rounded-[10px] bg-ink px-4 py-[9px] text-sm text-paper"><I.check size={13} color="var(--paper)" w={2.5} /> Terminé</button></div>}
      </div>
    </div>
  );
}
