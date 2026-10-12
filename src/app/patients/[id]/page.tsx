import { notFound } from "next/navigation";
import { DOSSIERS, getDossier, pendingProposals, inbox } from "@/data";
import { DossierView } from "@/components/dossier";
import { PatientsCounts } from "@/components/counts";
import { toPatientEhr } from "@/locus/ehr";
import { now } from "@/data/clock";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return DOSSIERS.map((d) => ({ id: d.patient.id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = getDossier(id);
  if (!d) notFound();
  return (
    <>
      <PatientsCounts inbox={inbox().length} proposals={pendingProposals().length} />
      <DossierView dossier={d} ehr={toPatientEhr(d, now())} />
    </>
  );
}
