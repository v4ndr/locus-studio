import { proposals, journal, displayName, inbox, AUTONOMY_LAURENT } from "@/data";
import { AgentsView } from "@/components/agents";

export const dynamic = "force-static";

export default function Page() {
  const all = proposals().map(({ proposal, dossier }) => ({ proposal, patient: { id: dossier.patient.id, nom: displayName(dossier.patient) } }));
  const j = journal().slice(0, 40).map((x) => ({ id: x.id, at: x.at, acteur: x.acteur, action: x.action, detail: x.detail, patient: x.dossier ? { id: x.dossier.patient.id, nom: displayName(x.dossier.patient) } : undefined }));
  return <AgentsView all={all} journal={j} inboxCount={inbox().length} policy={AUTONOMY_LAURENT} />;
}
