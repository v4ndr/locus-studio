import { CAPABILITIES } from "@/locus/capabilities";
import { coreConfig } from "@/locus/config";
import { DOSSIERS, displayName, inbox, pendingProposals } from "@/data";
import { LocusView } from "@/components/locus-view";
import { PatientsCounts } from "@/components/counts";

export const dynamic = "force-dynamic";

export default function Page() {
  const cfg = coreConfig();
  return (
    <>
      <PatientsCounts inbox={inbox().length} proposals={pendingProposals().length} />
      <LocusView capabilities={CAPABILITIES} mode={cfg.mode} url={cfg.mode === "simulation" ? null : cfg.url} patients={DOSSIERS.map((d) => ({ id: d.patient.id, nom: displayName(d.patient) }))} />
    </>
  );
}
