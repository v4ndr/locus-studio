import { notFound } from "next/navigation";
import { DOSSIERS, getDossier, recordsOf, summaryOf, pendingProposals, inbox } from "@/data";
import { SCRIPTS, genericScript } from "@/data/consultations";
import { ConsultationView } from "@/components/consultation";
import { PatientsCounts } from "@/components/counts";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return DOSSIERS.map((d) => ({ id: d.patient.id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = getDossier(id);
  if (!d) notFound();
  const rdv = recordsOf(d, "appointment").find((a) => a.debut.startsWith("2026-10-15"));
  const script = SCRIPTS[id] ?? genericScript(id, rdv?.motif ?? "Consultation", d.patient.prenomUsuel);
  const briefing = rdv?.preparationId ? recordsOf(d, "briefing").find((b) => b.id === rdv.preparationId) : undefined;
  const existing = recordsOf(d, "proposal").filter((p) => p.etat === "a-valider");
  return (
    <>
      <PatientsCounts inbox={inbox().length} proposals={pendingProposals().length} />
      <ConsultationView patient={d.patient} ligne={summaryOf(d)?.enUneLigne} script={script} briefing={briefing} existing={existing} scripted={!!SCRIPTS[id]} />
    </>
  );
}
