"use client";
import * as React from "react";
import { CreditCard, FileText, FlaskConical, Mail, Pill, Printer, User } from "lucide-react";
import { cn } from "@/lib/cn";
import { dossier, frDate, REF_DATE, type AnchorId } from "@/data/integration-lgc/fournier";
import { LocusMark } from "@/components/shell/locus-mark";
import s from "./medicab.module.css";

/**
 * MédiCab 7, le LGC fictif : fenêtre, menus, barre d'outils, bandeau
 * patient, historique, consultation, ordonnance, panneaux. Les quatre zones
 * d'injection (`Zone`) reçoivent les sorties Locus et, pendant l'assistant,
 * le bouton « Injecter ici » ou le repère « Point d'injection ».
 * MédiCab est délavé exprès : seules les surfaces Locus, vertes, ressortent.
 */

export type ZoneMode = "idle" | "cand" | "sel";
export interface ZoneProps { mode: ZoneMode; slot: React.ReactNode }

function Zone({ z, className, children }: { z: ZoneProps; className?: string; children: React.ReactNode }) {
  return <div className={cn(s.zone, z.mode === "cand" && s.zoneCand, z.mode === "sel" && s.zoneSel, className)}>{children}</div>;
}

const Outs = ({ items, pad }: { items: React.ReactNode[]; pad?: boolean }) => (items.length ? <div className={cn(s.outs, pad && s.outsPad)}>{items}</div> : null);

export interface MedicabProps {
  zones: Record<AnchorId, ZoneProps>;
  inline: Record<AnchorId, React.ReactNode[]>;
  banners: React.ReactNode[];
  panel: React.ReactNode;
  toolbarLocus: { show: boolean; open: boolean; onClick: () => void; hint: string };
  /** Une alerte bloquante de Locus est ouverte sur la ligne d'ordonnance. */
  flagged: boolean;
  blocked: boolean;
  validated: boolean;
  /** Le motif d'une alerte bloquante passée outre, s'il y en a une. */
  overrideMotif?: string;
  onValidate: () => void;
  activeCount: number;
  /** Le widget Locus est ouvert : sur un écran moyen, MédiCab range ses colonnes secondaires pour lui faire place. */
  widgetOpen?: boolean;
  /** Le bandeau sandbox, dans la langue de l'UI. */
  banner: string;
}

export function Medicab(p: MedicabProps) {
  const d = dossier();
  const ligne = d.ordonnance[0];
  const [creat, dfg, kali, ...hba] = d.biologie;
  return (
    <div className={s.win} data-widget={p.widgetOpen || undefined}>
      <div className={s.title}>
        <span aria-hidden="true" className={s.appIcon} />
        <b>MédiCab 7 — Cabinet des Tilleuls</b>
        <span className={s.doc}>{d.medecin}</span>
        <span aria-hidden="true" className={s.winBtns}><span /><span /><span /></span>
      </div>
      <div className={s.menus} aria-hidden="true">
        <span><u>F</u>ichier</span><span><u>É</u>dition</span><span><u>P</u>atient</span><span><u>C</u>onsultation</span><span>P<u>r</u>escription</span><span>C<u>o</u>urriers</span><span><u>O</u>utils</span><span><u>A</u>ide</span>
      </div>

      <Zone z={p.zones.tb}>
        <div className={s.toolbar}>
          <span className={s.tbBtn}><User aria-hidden="true" />Patient</span>
          <span className={s.tbBtn}><FileText aria-hidden="true" />Consultation</span>
          <span className={s.tbBtn}><Pill aria-hidden="true" />Ordonnance</span>
          <span className={s.tbBtn}><FlaskConical aria-hidden="true" />Examen</span>
          <span className={s.tbBtn}><Mail aria-hidden="true" />Courrier</span>
          <span className={s.tbBtn}><CreditCard aria-hidden="true" />Feuille de soins</span>
          <span className={s.tbBtn}><Printer aria-hidden="true" />Imprimer</span>
          {p.toolbarLocus.show && (
            <button type="button" onClick={p.toolbarLocus.onClick} aria-pressed={p.toolbarLocus.open} title={p.toolbarLocus.hint} className={cn("locus-btn flex h-7 items-center gap-1.5 rounded-full pl-2 pr-3 font-sans text-xs font-semibold", p.toolbarLocus.open && "ring-2 ring-[var(--glow)] ring-offset-1")}>
              <LocusMark size={14} />Locus
            </button>
          )}
          <span className="flex-1" />
          {p.zones.tb.slot}
        </div>
      </Zone>

      {p.banners}

      <Zone z={p.zones.pv}>
        <div className={s.patient}>
          <div className={s.patientRow}>
            <b className={s.patientName}>{d.nom}</b>
            <span>{d.age} ans · né le {d.naissance}</span>
            <span className={s.mut}>Dossier n° {d.numero}</span>
            <span className={s.mut}>MT : {d.medecin}</span>
            <span className="flex-1" />
            {p.zones.pv.slot}
          </div>
          <div className={s.flags}>
            <span className={s.mut}>Points importants :</span>
            <span className={s.flagRed}>Allergie pénicilline</span>
            <span className={s.flagBlue}>HTA</span>
            <span className={s.flagBlue}>Diabète type 2</span>
            <span className={s.flagBlue}>DFG 72</span>
          </div>
          <Outs items={p.inline.pv} />
        </div>
      </Zone>

      <div className={s.body}>
        <nav aria-label="Menu MédiCab" className={s.nav}>
          {["Consultation", "Administratif", "Courrier", "Prescription", "Biologie", "Vaccins", "Feuille de soins", "DMP"].map((m) => <span key={m}>{m}</span>)}
        </nav>

        <div className={cn(s.box, s.histo)}>
          <div className={s.boxHead}><span>Historique</span></div>
          <table className={s.table}>
            <tbody>
              {d.historique.map((h, i) => <tr key={h.date + h.libelle} className={i === 0 ? s.today : undefined}><td style={{ whiteSpace: "nowrap" }}>{h.date}</td><td>{h.libelle}</td></tr>)}
            </tbody>
          </table>
        </div>

        <div className={s.main}>
          <Zone z={p.zones.note}>
            <div className={s.box}>
              <div className={s.tabs}>
                <span className={s.tabOn}>Consultation du {frDate(REF_DATE)}</span>
                <span className={s.tab}>Examen</span>
                <span className={s.tab}>Courrier</span>
                <span className={s.spacer} />
                <span className="mb-1">{p.zones.note.slot}</span>
              </div>
              <div className={s.note}>
                <div><b>Motif :</b> {d.note.motif}</div>
                <div><b>Examen :</b> {d.note.examen}</div>
                <div><b>Conclusion :</b> {d.note.conclusion}</div>
                <div className={s.consts}>{d.note.constantes.map((c) => <span key={c}>{c}</span>)}</div>
                <Outs items={p.inline.note} />
              </div>
            </div>
          </Zone>

          <Zone z={p.zones.ordo}>
            <div className={s.box}>
              <div className={s.boxHead}><span>Ordonnance en cours</span>{p.zones.ordo.slot}</div>
              <table className={s.ordo}>
                <thead><tr><th>Médicament</th><th>Posologie</th><th>Durée</th></tr></thead>
                <tbody>
                  <tr className={p.flagged ? s.rowFlag : undefined}><td>{ligne.med}</td><td>{ligne.posologie}</td><td>{ligne.duree}</td></tr>
                  <tr><td>{d.ordonnance[1].med}</td><td>{d.ordonnance[1].posologie}</td><td>{d.ordonnance[1].duree}</td></tr>
                </tbody>
              </table>
              <Outs items={p.inline.ordo} pad />
            </div>
          </Zone>

          <div className={s.signBar}>
            <span className={s.signStatus}>{p.blocked ? "Validation bloquée par Locus" : p.validated ? (p.overrideMotif ? `Ordonnance validée · alerte Locus passée outre, motif : ${p.overrideMotif}` : "Ordonnance validée") : p.overrideMotif ? `Alerte Locus passée outre, motif : ${p.overrideMotif}` : ""}</span>
            <button type="button" className={s.legacyBtn}>Imprimer</button>
            <button type="button" className={s.legacyBtn}>Annuler</button>
            <button type="button" className={s.validate} onClick={p.onValidate} disabled={p.blocked} title={p.blocked ? "Alerte Locus à traiter avant validation" : undefined}>Valider l&apos;ordonnance</button>
          </div>
        </div>

        <div className={s.side}>
          <div className={s.box}>
            <div className={s.boxHead}><span>Antécédents</span></div>
            <div className={s.list}>{d.antecedents.map((a) => <span key={a.libelle}>{a.libelle} ({a.annee})</span>)}</div>
          </div>
          <div className={s.box}>
            <div className={s.boxHead}><span>Allergies</span></div>
            <div className={s.allergy}>Pénicilline · urticaire (2019)</div>
          </div>
          <div className={s.box}>
            <div className={s.boxHead}><span>Traitement de fond</span></div>
            <div className={s.list}>{d.traitement.map((t) => <span key={t}>{t}</span>)}</div>
          </div>
          <div className={s.box}>
            <div className={s.boxHead}><span>Biologie reçue</span></div>
            <table className={cn(s.table, s.labTable)}>
              <tbody>
                <tr><td>{creat.libelle}</td><td>{creat.affichage}</td></tr>
                <tr><td>{dfg.libelle}</td><td>{dfg.affichage}</td></tr>
                <tr><td>{kali.libelle}</td><td>{kali.affichage}</td></tr>
                <tr><td colSpan={2} className={s.mut}>Laboratoire des Tilleuls · {frDate(creat.date)}</td></tr>
                {hba.map((b, i) => <tr key={b.date} className={i === 0 ? s.labSep : undefined}><td>{b.libelle}</td><td>{b.affichage} · {frDate(b.date)}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>

        {p.panel}
      </div>

      <div className={s.status}>
        <span>Connecté · Poste 2</span>
        <span>{p.activeCount} brique{p.activeCount > 1 ? "s" : ""} Locus active{p.activeCount > 1 ? "s" : ""}</span>
        <span className={s.spacer} />
        <span>{p.banner}</span>
      </div>
    </div>
  );
}
