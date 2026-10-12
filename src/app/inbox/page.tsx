import { inbox, displayName, recordsOf, pendingProposals } from "@/data";
import { InboxView, type InboxEntry } from "@/components/inbox";

export const dynamic = "force-static";

export default function Page() {
  const items: InboxEntry[] = inbox().map((i) => {
    const d = i.dossier;
    const patient = { id: d.patient.id, nom: displayName(d.patient), hue: d.patient.photoHue ?? 200, prenom: d.patient.prenomUsuel, nomUsage: d.patient.nomUsage };
    const related = recordsOf(d, "proposal").filter((p) => p.declencheur.recordId === i.record.id || (i.kind === "message" && p.declencheur.type === "message"));
    const reply = i.kind === "message" && i.record.triage?.reponseProposeeId ? recordsOf(d, "message").find((m) => m.id === i.record.triage!.reponseProposeeId) : undefined;
    return { kind: i.kind, at: i.at, patient, record: i.record as never, proposals: related, reply };
  });
  return <InboxView items={items} pendingTotal={pendingProposals().length} />;
}
