import { todayAppointments, inbox, pendingProposals, DOSSIERS, recordsOf, summaryOf, displayName } from "@/data";
import { JourneeView } from "@/components/journee";

export const dynamic = "force-static";

export default function Page() {
  const agenda = todayAppointments().map(({ appointment, dossier, briefing }) => ({
    appointment,
    briefing,
    patient: { id: dossier.patient.id, nom: displayName(dossier.patient), hue: dossier.patient.photoHue ?? 200, prenom: dossier.patient.prenomUsuel, nomUsage: dossier.patient.nomUsage, naissance: dossier.patient.ins.dateNaissance, ligne: summaryOf(dossier)?.enUneLigne ?? "" },
    pending: recordsOf(dossier, "proposal").filter((p) => p.etat === "a-valider").length,
  }));
  const pend = pendingProposals().map(({ proposal, dossier }) => ({ proposal, patient: { id: dossier.patient.id, nom: displayName(dossier.patient) } }));
  const box = inbox();
  const stats = {
    patients: DOSSIERS.length,
    executees: DOSSIERS.flatMap((d) => recordsOf(d, "proposal")).filter((p) => p.etat === "executee").length,
    inbox: box.length,
    inboxUrgent: box.filter((i) => (i.kind === "message" ? i.record.triage?.urgence : i.record.lecture?.urgence) === "jour" || (i.kind === "message" ? i.record.triage?.urgence : i.record.lecture?.urgence) === "immediate").length,
  };
  return <JourneeView agenda={agenda} pending={pend} stats={stats} />;
}
