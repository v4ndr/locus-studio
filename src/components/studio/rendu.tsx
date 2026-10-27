"use client";
import { TriangleAlert } from "lucide-react";
import * as React from "react";
import type { ComposeAction } from "@/locus/compose/contract";
import { chargeOf, materialize, alerteAllergie, isoParis, type Charge, type RxLigne, RX_LABEL, CR_TYPE, DOS_LABEL, MSG_A, SORTIES, TR_SITUATION, TR_MODE, TR_AMBU, TR_LIEU, jourFr, heureFr } from "@/locus/compose/materialize";
import { CABINET, DR_LAURENT } from "@/data/cabinet";
import { Md } from "../md";
import { I, Kbd, useT } from "./chrome";
import { cn } from "@/lib/cn";

/**
 * Le document tel qu'il est rendu et envoyé — en-tête du cabinet, patient,
 * corps, signature — et le panneau qui le montre : à gauche le formulaire
 * typé de l'action, à droite le papier qui se met à jour en direct. Le même
 * panneau sert à relire avant signature, à consulter après, et à corriger en
 * place : un document modifié est renvoyé et remplace le précédent.
 */

export interface PatientRendu { nom: string; naissance?: string; sexe?: "F" | "M"; age?: number; /** Pour recalculer le garde-fou allergie quand une ligne change. */ allergies?: string[]; /** Fictifs, pour les formulaires administratifs (bon de transport). */ matricule?: string; adresse?: string }
const PRAT = { nom: `Dr ${DR_LAURENT.prenom} ${DR_LAURENT.nom}`, rpps: DR_LAURENT.rpps, specialite: DR_LAURENT.specialite, adresse: CABINET.adresse, cabinet: CABINET.nom, mssante: DR_LAURENT.mssante, finess: CABINET.finess };

/** Une case du formulaire, cochée ou non, et son libellé. */
function Case({ on, children }: { on: boolean; children: React.ReactNode }) {
  return <span className="inline-flex items-start gap-1.5"><span aria-hidden="true" className={cn("mt-[2px] flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[2px] border", on ? "border-ink bg-ink text-paper" : "border-dim-2")}>{on && <I.check size={10} color="var(--paper)" w={3.5} />}</span><span className={on ? "font-medium" : "text-dim-2"}>{children}<span className="sr-only">{on ? " : coché" : " : non coché"}</span></span></span>;
}
/** Le bandeau noir des rubriques du cerfa. */
const Bandeau = ({ children }: { children: React.ReactNode }) => <div className="bg-ink px-2 py-[3px] text-center text-[11px] font-semibold text-paper">{children}</div>;
const Champ = ({ k, children }: { k: string; children: React.ReactNode }) => <div className="flex flex-col border-b border-line px-2 py-1"><span className="text-[10px] text-dim-2">{k}</span><span className="min-h-[18px] text-[12.5px]">{children}</span></div>;

/**
 * La prescription médicale de transport, rubrique par rubrique comme le cerfa
 * n° 11574*04 (S3138d) : bénéficiaire et assuré, situation de prise en charge,
 * mode de transport, trajet, urgence, éléments médicaux, prescripteur. Un
 * spécimen fictif, marqué comme tel sur le papier.
 */
function BonDeTransport({ c, patient, quand, signe }: { c: Extract<Charge, { kind: "transport" }>; patient: PatientRendu; quand: string; signe: boolean }) {
  const lieu = (t: string, l?: string) => (t === "domicile" ? "domicile" : l || "à préciser");
  return (
    <div className="relative flex flex-col gap-2.5 overflow-hidden text-[12px] leading-[1.45]">
      <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[28deg] select-none whitespace-nowrap text-[64px] font-bold tracking-[.12em] text-dim-2 opacity-[.12]">SPÉCIMEN</span>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col"><span className="text-[11px] italic">cerfa</span><span className="text-[11px] text-dim-2">n° 11574*04</span></div>
        <div className="flex flex-1 flex-col items-center text-center"><h2 className="m-0 text-[16px] font-semibold">Prescription médicale de transport</h2><span className="text-[10px] text-dim-2">articles L. 162-4-1 2°, L. 321-1 2°, L. 322-5, L. 432-1, R. 322-2 du code de la sécurité sociale</span></div>
        <span className="max-w-[120px] text-right text-[10px] text-dim-2">Volet 1 à adresser au contrôle médical</span>
      </div>
      <div className="rounded-[4px] border border-dashed border-line px-2 py-1 text-center text-[11px] font-medium">Spécimen fictif · patient fictif · sans valeur de prescription</div>

      <Bandeau>la personne bénéficiaire du transport et l'assuré(e)</Bandeau>
      <div className="grid grid-cols-1 border-l border-r border-t border-line sm:grid-cols-2">
        <Champ k="nom et prénom">{patient.nom}</Champ>
        <Champ k="date de naissance">{patient.naissance ?? ""}</Champ>
        <Champ k="numéro d'immatriculation (fictif)">{patient.matricule ?? "non renseigné"}</Champ>
        <Champ k="organisme de rattachement">caisse primaire (fictive)</Champ>
        <div className="sm:col-span-2"><Champ k="adresse">{patient.adresse ?? ""}</Champ></div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1"><span>Assuré(e) : la personne bénéficiaire</span><span className="text-dim-2">Transport en rapport avec un accident causé par un tiers :</span><Case on={false}>oui</Case><Case on>non</Case></div>

      <Bandeau>la prescription médicale</Bandeau>
      <div className="flex flex-col gap-1"><b className="font-semibold">1 · Situation permettant la prise en charge du transport</b>
        <div className="flex flex-col gap-1 pl-2">
          <Case on={c.situation.includes("hospitalisation")}>entrée ou sortie d'hospitalisation (complète, partielle, ambulatoire), y compris séances de chimiothérapie, radiothérapie et hémodialyse</Case>
          <span className="flex flex-wrap gap-x-4 gap-y-1"><span className="text-dim-2">transport en lien avec une affection de longue durée avec déficience ou incapacité :</span><Case on={c.situation.includes("ald-exoneree")}>ALD exonérante</Case><Case on={c.situation.includes("ald-non-exoneree")}>ALD non exonérante</Case></span>
          <span className="flex flex-wrap gap-x-4"><Case on={c.situation.includes("at-mp")}>transport lié à un accident du travail ou à une maladie professionnelle</Case>{c.situation.includes("at-mp") && <span>date de l'AT/MP : {c.date_atmp ? frDate(c.date_atmp) : "à préciser"}</span>}</span>
        </div>
      </div>
      <div className="flex flex-col gap-1"><b className="font-semibold">2 · Mode de transport au regard de l'état de santé et de l'autonomie</b>
        <div className="flex flex-col gap-1 pl-2">
          <Case on={c.mode === "ambulance"}>transport en ambulance, justifié par la nécessité :</Case>
          <span className="flex flex-wrap gap-x-4 gap-y-1 pl-5">{Object.entries(TR_AMBU).map(([k, v]) => <Case key={k} on={c.mode === "ambulance" && c.ambulance_motifs.includes(k)}>{v}</Case>)}</span>
          <span className="flex flex-wrap gap-x-4"><Case on={c.mode === "assis-professionnalise"}>transport assis professionnalisé (VSL, taxi conventionné)</Case><Case on={c.mode === "assis-professionnalise" && !!c.transport_partage}>l'état du patient permet un transport partagé</Case></span>
          <span className="flex flex-wrap gap-x-4"><Case on={c.mode === "vehicule-personnel"}>moyen de transport individuel</Case><Case on={c.mode === "transport-en-commun"}>transport en commun terrestre</Case><Case on={(c.mode === "vehicule-personnel" || c.mode === "transport-en-commun") && !!c.accompagnant}>personne accompagnante nécessaire</Case></span>
        </div>
      </div>
      <div className="flex flex-col gap-1"><b className="font-semibold">Trajet</b>
        <div className="grid grid-cols-1 gap-2 pl-2 sm:grid-cols-2">
          <div className="flex flex-col gap-0.5"><span className="text-dim-2">départ</span>{Object.entries(TR_LIEU).map(([k, v]) => <Case key={k} on={c.depart === k}>{v.toLowerCase()}{c.depart === k && k !== "domicile" ? ` : ${lieu(k, c.depart_lieu)}` : ""}</Case>)}</div>
          <div className="flex flex-col gap-0.5"><span className="text-dim-2">arrivée</span>{Object.entries(TR_LIEU).map(([k, v]) => <Case key={k} on={c.arrivee === k}>{v.toLowerCase()}{c.arrivee === k && k !== "domicile" ? ` : ${lieu(k, c.arrivee_lieu)}` : ""}</Case>)}</div>
        </div>
        <span className="flex flex-wrap gap-x-5 pl-2"><Case on={c.aller_retour}>transport aller-retour</Case><span><b className="font-semibold">3 ·</b> nombre de transports itératifs : {c.iteratifs ?? "—"}</span></span>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1"><b className="font-semibold">4 · Urgence :</b><Case on={c.urgence === "samu"}>appel du SAMU-centre 15</Case><Case on={c.urgence === "autre"}>autres{c.urgence === "autre" && c.urgence_precision ? ` : ${c.urgence_precision}` : ""}</Case></div>
      <div className="flex flex-col gap-1"><b className="font-semibold">5 · Éléments d'ordre médical</b><div className="min-h-[40px] whitespace-pre-line rounded-[3px] border border-line px-2 py-1.5 text-[12.5px]">{c.elements_medicaux}</div></div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1"><b className="font-semibold">6 · Exonération du ticket modérateur, cas particuliers :</b><Case on={false}>oui</Case><Case on>non</Case><span className="text-dim-2">pension militaire d'invalidité :</span><Case on={false}>oui</Case><Case on>non</Case></div>

      <Bandeau>Identification du prescripteur et de la structure dans laquelle il exerce</Bandeau>
      <div className="grid grid-cols-1 border-l border-r border-t border-line sm:grid-cols-2">
        <Champ k="nom et prénom">{PRAT.nom}</Champ>
        <Champ k="raison sociale · adresse">{PRAT.cabinet} · {PRAT.adresse}</Champ>
        <Champ k="identifiant (n° RPPS, fictif)">{PRAT.rpps}</Champ>
        <Champ k="n° structure (FINESS, fictif)">{PRAT.finess}</Champ>
        <Champ k="date">{frDate(quand)}</Champ>
        <Champ k="signature">{signe ? "Signé e-CPS" : "à la signature e-CPS"}</Champ>
      </div>
      <span className="text-right text-[10px] text-dim-2">S3138d · reproduction fictive</span>
    </div>
  );
}
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
    case "transport":
      corps = (
        <>
          <BonDeTransport c={c} patient={patient} quand={quand} signe={!!action.envoyeLe} />
          {signature(action.envoyeLe ? "Signée · remise au patient pour le transporteur" : "Remise au patient après signature · volets 1 et 2")}
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
      {/* Le cerfa porte lui-même le bénéficiaire et le prescripteur : pas d'en-tête de cabinet par-dessus. */}
      {c?.kind !== "transport" && entete}
      {c?.kind !== "transport" && bloc}
      <div className={cn("flex flex-1 flex-col gap-3.5", c?.kind !== "transport" && "border-t border-line-4 pt-4")}>{corps}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Le formulaire typé, par genre d'action                               */
/* ------------------------------------------------------------------ */

const inp = "min-w-0 w-full rounded-[8px] border border-line bg-paper px-2.5 py-1.5 text-base text-ink sm:text-sm";
const Lbl = ({ l, children, wide }: { l: string; children: React.ReactNode; wide?: boolean }) => <label className={cn("flex flex-col gap-1", wide && "sm:col-span-2")}><span className="k">{l}</span>{children}</label>;

function Form({ c, onChange }: { c: Charge; onChange: (c: Charge) => void }) {
  const { t: d, L } = useT();
  const t = d.panel;
  switch (c.kind) {
    case "ordonnance": {
      const med = c.type === "medicament";
      const set = (i: number, patch: Partial<RxLigne>) => onChange({ ...c, lignes: c.lignes.map((l, j) => (j === i ? { ...l, ...patch } : l)) });
      if (!med) {
        // Un examen, un acte : les lignes demandées et le renseignement clinique, rien d'autre.
        return (
          <div className="flex flex-col gap-3">
            <Lbl l={L(RX_LABEL[c.type] ?? "Ordonnance")}><textarea autoComplete="off" autoCorrect="off" spellCheck={false} value={c.lignes.map((l) => l.libelle).join("\n")} rows={4} placeholder={t.onePerLine} onChange={(e) => onChange({ ...c, lignes: e.target.value.split("\n").map((libelle) => ({ libelle })) })} className={cn(inp, "resize-y leading-[1.5]")} /></Lbl>
            <Lbl l={t.clinical}><input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" value={c.indication ?? ""} onChange={(e) => onChange({ ...c, indication: e.target.value || undefined })} placeholder={t.clinicalPh} className={inp} /></Lbl>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={c.lignes.some((l) => l.ald)} onChange={(e) => onChange({ ...c, lignes: c.lignes.map((l) => ({ ...l, ald: e.target.checked })) })} /> {t.aldRelated}</label>
          </div>
        );
      }
      return (
        <div className="flex flex-col gap-3">
          {c.lignes.map((l, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-[10px] border border-line-3 bg-bg p-3">
              <div className="flex items-center gap-2"><span className="d text-[11px]">{t.line(i + 1)}</span><span className="flex-1" />{c.lignes.length > 1 && <button type="button" onClick={() => onChange({ ...c, lignes: c.lignes.filter((_, j) => j !== i) })} className="min-h-8 text-xs text-dim-2 hover:text-rec-text">{t.takeOut}</button>}</div>
              <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" value={l.libelle} onChange={(e) => set(i, { libelle: e.target.value })} placeholder={t.dciPh} aria-label={t.lineAria(i + 1, t.label)} className={inp} />
              <div className="grid gap-2 sm:grid-cols-2">
                <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" value={l.posologie ?? ""} onChange={(e) => set(i, { posologie: e.target.value })} placeholder={t.posoPh} aria-label={t.lineAria(i + 1, t.posology)} className={inp} />
                <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" value={l.duree ?? ""} onChange={(e) => set(i, { duree: e.target.value })} placeholder={t.durPh} aria-label={t.lineAria(i + 1, t.duration)} className={inp} />
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" checked={!!l.ald} onChange={(e) => set(i, { ald: e.target.checked })} /> ALD</label>
                {l.renouvellement ? <span className="text-dim-2">{t.renewN(l.renouvellement)} <button type="button" onClick={() => set(i, { renouvellement: undefined })} className="ml-1 underline">{t.removeLc}</button></span> : <button type="button" onClick={() => set(i, { renouvellement: 1 })} className="text-dim-2 underline">{t.addRenewal}</button>}
              </div>
            </div>
          ))}
          <button type="button" onClick={() => onChange({ ...c, lignes: [...c.lignes, { libelle: "" }] })} className="min-h-10 self-start rounded-[8px] border border-line bg-paper px-3 py-1.5 text-sm text-ink hover:bg-hover">{t.addLine}</button>
        </div>
      );
    }
    case "rdv": {
      const d = c.debut ? c.debut.slice(0, 10) : ""; const h = c.debut ? heureFr(c.debut) : "09:30";
      const setDebut = (dd: string, hh: string) => onChange({ ...c, debut: dd ? isoParis(dd, hh || "09:30") : "" });
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Lbl l={t.date}><input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" type="date" value={d} onChange={(e) => setDebut(e.target.value, h)} className={inp} /></Lbl>
          <Lbl l={t.time}><input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" type="time" value={h} onChange={(e) => setDebut(d, e.target.value)} className={inp} /></Lbl>
          <Lbl l={t.durationL}><select value={c.duree_min} onChange={(e) => onChange({ ...c, duree_min: Number(e.target.value) })} className={inp}>{[10, 15, 20, 30, 45].map((n) => <option key={n} value={n}>{n} min</option>)}</select></Lbl>
          <Lbl l={t.motif}><input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" value={c.motif} onChange={(e) => onChange({ ...c, motif: e.target.value })} className={inp} /></Lbl>
        </div>
      );
    }
    case "message":
      return (
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Lbl l={t.to}><select value={c.a} onChange={(e) => onChange({ ...c, a: e.target.value, nom: e.target.value === "patient" ? undefined : c.nom })} className={inp}>{Object.entries(MSG_A).map(([k, v]) => <option key={k} value={k}>{L(v)}</option>)}</select></Lbl>
            {c.a !== "patient" && <Lbl l={t.name}><input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" value={c.nom ?? ""} onChange={(e) => onChange({ ...c, nom: e.target.value || undefined })} placeholder={t.namePh} className={inp} /></Lbl>}
          </div>
          <Lbl l={t.subject}><input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" value={c.objet} onChange={(e) => onChange({ ...c, objet: e.target.value })} className={inp} /></Lbl>
          <Lbl l={t.message}><textarea autoComplete="off" autoCorrect="off" spellCheck={false} value={c.corps} rows={7} onChange={(e) => onChange({ ...c, corps: e.target.value })} className={cn(inp, "resize-y leading-[1.5]")} /></Lbl>
        </div>
      );
    case "courrier":
      return (
        <div className="flex flex-col gap-3">
          <Lbl l={t.to}><input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" value={c.destinataire} onChange={(e) => onChange({ ...c, destinataire: e.target.value })} className={inp} placeholder={t.recipientPh} /></Lbl>
          <Lbl l={t.title}><input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" value={c.titre} onChange={(e) => onChange({ ...c, titre: e.target.value })} className={inp} /></Lbl>
          <Lbl l={t.body}><textarea autoComplete="off" autoCorrect="off" spellCheck={false} value={c.corps} rows={10} onChange={(e) => onChange({ ...c, corps: e.target.value })} className={cn(inp, "resize-y leading-[1.5]")} /></Lbl>
        </div>
      );
    case "arret":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Lbl l={t.days}><input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" type="number" min={1} max={365} value={c.jours} onChange={(e) => onChange({ ...c, jours: Math.max(1, Number(e.target.value) || 1) })} className={inp} /></Lbl>
          <Lbl l={t.outings}><select value={c.sorties} onChange={(e) => onChange({ ...c, sorties: e.target.value })} className={inp}>{Object.entries(SORTIES).map(([k, v]) => <option key={k} value={k}>{L(v)}</option>)}</select></Lbl>
          <div className="flex flex-wrap items-center gap-4 text-sm sm:col-span-2"><label className="flex items-center gap-2"><input type="checkbox" checked={!!c.temps_partiel} onChange={(e) => onChange({ ...c, temps_partiel: e.target.checked })} /> {t.partTime}</label><label className="flex items-center gap-2"><input type="checkbox" checked={!!c.prolongation} onChange={(e) => onChange({ ...c, prolongation: e.target.checked })} /> {t.extension}</label></div>
          <Lbl l={t.medicalReason} wide><input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" value={c.motif} onChange={(e) => onChange({ ...c, motif: e.target.value })} className={inp} /></Lbl>
        </div>
      );
    case "transport": {
      const bascule = (liste: string[], k: string) => (liste.includes(k) ? liste.filter((x) => x !== k) : [...liste, k]);
      const lieux = (k: "depart" | "arrivee") => {
        const lk = k === "depart" ? "depart_lieu" : "arrivee_lieu";
        return (
          <Lbl l={k === "depart" ? t.trFrom : t.trTo}>
            <select value={c[k]} onChange={(e) => onChange({ ...c, [k]: e.target.value })} className={inp}>{Object.entries(TR_LIEU).map(([v, l]) => <option key={v} value={v}>{L(l)}</option>)}</select>
            {c[k] !== "domicile" && <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" value={c[lk] ?? ""} onChange={(e) => onChange({ ...c, [lk]: e.target.value || undefined })} placeholder={t.trPlacePh} aria-label={`${k === "depart" ? t.trFrom : t.trTo} · ${t.trPlacePh}`} className={inp} />}
          </Lbl>
        );
      };
      return (
        <div className="flex flex-col gap-3">
          <fieldset className="flex flex-col gap-1.5"><legend className="k pb-1">{t.trSituation}</legend>{Object.entries(TR_SITUATION).map(([k, v]) => <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={c.situation.includes(k)} onChange={() => onChange({ ...c, situation: bascule(c.situation, k) })} /> {L(v)}</label>)}</fieldset>
          {c.situation.includes("at-mp") && <Lbl l={t.trAtmpDate}><input type="date" value={c.date_atmp ?? ""} onChange={(e) => onChange({ ...c, date_atmp: e.target.value || undefined })} className={inp} /></Lbl>}
          <Lbl l={t.trMode}><select value={c.mode} onChange={(e) => onChange({ ...c, mode: e.target.value })} className={inp}>{Object.entries(TR_MODE).map(([k, v]) => <option key={k} value={k}>{L(v)}</option>)}</select></Lbl>
          {c.mode === "ambulance" && <fieldset className="flex flex-col gap-1.5"><legend className="k pb-1">{t.trAmbulance}</legend>{Object.entries(TR_AMBU).map(([k, v]) => <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={c.ambulance_motifs.includes(k)} onChange={() => onChange({ ...c, ambulance_motifs: bascule(c.ambulance_motifs, k) })} /> {L(v)}</label>)}</fieldset>}
          {c.mode === "assis-professionnalise" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!c.transport_partage} onChange={(e) => onChange({ ...c, transport_partage: e.target.checked })} /> {t.trShared}</label>}
          {(c.mode === "vehicule-personnel" || c.mode === "transport-en-commun") && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!c.accompagnant} onChange={(e) => onChange({ ...c, accompagnant: e.target.checked })} /> {t.trEscort}</label>}
          <div className="grid gap-3 sm:grid-cols-2">{lieux("depart")}{lieux("arrivee")}</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={c.aller_retour} onChange={(e) => onChange({ ...c, aller_retour: e.target.checked })} /> {t.trReturn}</label>
            <Lbl l={t.trIterative}><input autoComplete="off" type="number" min={0} max={99} value={c.iteratifs ?? ""} onChange={(e) => onChange({ ...c, iteratifs: Number(e.target.value) > 0 ? Math.round(Number(e.target.value)) : undefined })} className={inp} /></Lbl>
          </div>
          <Lbl l={t.trUrgency}><select value={c.urgence} onChange={(e) => onChange({ ...c, urgence: e.target.value })} className={inp}><option value="non">{t.trUrgencyNone}</option><option value="samu">{t.trUrgencySamu}</option><option value="autre">{t.trUrgencyOther}</option></select></Lbl>
          {c.urgence === "autre" && <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" value={c.urgence_precision ?? ""} onChange={(e) => onChange({ ...c, urgence_precision: e.target.value || undefined })} placeholder={t.trUrgencyPh} aria-label={`${t.trUrgency} · ${t.trUrgencyPh}`} className={inp} />}
          <Lbl l={t.trMedical}><textarea autoComplete="off" autoCorrect="off" spellCheck={false} value={c.elements_medicaux} rows={4} placeholder={t.trMedicalPh} onChange={(e) => onChange({ ...c, elements_medicaux: e.target.value })} className={cn(inp, "resize-y leading-[1.5]")} /></Lbl>
        </div>
      );
    }
    case "dossier":
      return (
        <div className="flex flex-col gap-3">
          <Lbl l={t.section}><select value={c.type} onChange={(e) => onChange({ ...c, type: e.target.value })} className={inp}>{Object.entries(DOS_LABEL).map(([k, v]) => <option key={k} value={k}>{L(v)}</option>)}</select></Lbl>
          <Lbl l={t.ficheLine}><input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" value={c.libelle} onChange={(e) => onChange({ ...c, libelle: e.target.value })} placeholder={t.ficheLinePh} className={inp} /></Lbl>
          <Lbl l={t.detail}><input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore data-lpignore="true" value={c.detail ?? ""} onChange={(e) => onChange({ ...c, detail: e.target.value || undefined })} className={inp} /></Lbl>
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
  const { t: d } = useT();
  const t = d.panel;
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6" onClick={onClose} role="dialog" aria-modal="true" aria-label={titre ?? action.titre}>
      <div ref={boite} onClick={(e) => e.stopPropagation()} className="flex max-h-[94dvh] w-full max-w-[1100px] flex-col overflow-hidden rounded-t-[16px] border border-border bg-bg sm:rounded-[16px]" style={{ boxShadow: "var(--shadow-sm)" }}>
        <div className="flex items-center gap-3 border-b border-line-2 px-5 py-3">
          <span className="d flex h-6 min-w-6 items-center justify-center rounded-[6px] bg-soft px-1 text-[10px] text-ink-3">{action.code}</span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{titre ?? action.titre}</span>
          {action.envoyeLe && <span className="hidden text-xs text-ok sm:inline">{t.sentOn(!!action.renvoye, d.dateLocale === "fr-FR" ? frDate(action.envoyeLe) : new Date(action.envoyeLe).toLocaleDateString(d.dateLocale), !!onChange)}</span>}
          {onChange && <div className="flex rounded-full border border-line bg-paper p-0.5 lg:hidden">{(["modifier", "apercu"] as const).map((o) => <button key={o} type="button" onClick={() => setOnglet(o)} aria-pressed={onglet === o} className={cn("min-h-9 rounded-full px-3 py-1 text-xs", onglet === o ? "bg-ink text-paper" : "text-ink-2")}>{o === "modifier" ? t.edit : t.preview}</button>)}</div>}
          <button ref={fermer} type="button" onClick={onClose} className="flex min-h-9 items-center gap-2 rounded-[8px] px-2 py-1 text-sm text-dim-2 hover:text-ink">{d.close} <Kbd>esc</Kbd></button>
        </div>
        {action.alerte && <div className="flex items-start gap-2.5 border-b border-line-2 bg-[color-mix(in_srgb,var(--warn)_12%,var(--paper))] px-5 py-2.5 text-[13px] leading-[1.45] text-warn" role="alert"><span className="mt-px shrink-0 font-semibold"><TriangleAlert size={16} aria-hidden="true" className="mr-1 inline-block shrink-0 align-[-3px]" />{t.allergy}</span><span className="min-w-0 flex-1">{action.alerte}{t.allergyCheck(!!onChange)}</span></div>}
        <div className={cn("grid min-h-0 flex-1 overflow-y-auto", onChange ? "lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]" : "")}>
          {onChange && c && (
            <div className={cn("flex flex-col gap-4 border-line-2 px-5 py-5 lg:border-r", onglet !== "modifier" && "hidden lg:flex")}>
              <Form c={c} onChange={update} />
              {action.justification && <div className="rounded-[10px] bg-agent-soft-2 px-3.5 py-2.5 text-[13px] leading-[1.5]"><span className="k" style={{ color: "var(--agent)" }}>{t.why}</span><br />{action.justification}</div>}
              <span className="text-xs text-dim-2">{action.kind === "ordonnance" ? t.otherRx : ""}{action.envoyeLe ? t.resendNote : action.kind === "dossier" ? t.ficheNote : t.nothingBefore}</span>
            </div>
          )}
          <div className={cn("bg-soft/40 px-4 py-5 sm:px-6", onChange && onglet !== "apercu" && "hidden lg:block")}>
            <div className="mx-auto max-w-[640px]"><DocumentRendu action={action} patient={patient} /></div>
          </div>
        </div>
        {onChange && <div className="flex items-center gap-2 border-t border-line-2 px-5 py-3">{onRemove && <button type="button" onClick={() => { onRemove(); onClose(); }} className="min-h-11 rounded-[10px] px-3 py-[9px] text-sm text-dim-2 hover:text-rec-text">{d.remove}</button>}<span className="flex-1" /><button type="button" onClick={onClose} className="flex min-h-11 items-center gap-2 rounded-[10px] bg-ink px-4 py-[9px] text-sm text-paper"><I.check size={13} color="var(--paper)" w={2.5} /> {t.done}</button></div>}
      </div>
    </div>
  );
}
