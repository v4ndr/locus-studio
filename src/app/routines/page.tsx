import { inbox, pendingProposals } from "@/data";
import { buildRoutines } from "@/data/routines";
import { RoutinesView } from "@/components/routines";
import { PatientsCounts } from "@/components/counts";

export const dynamic = "force-static";

export default function Page() {
  return (
    <>
      <PatientsCounts inbox={inbox().length} proposals={pendingProposals().length} />
      <RoutinesView routines={buildRoutines()} />
    </>
  );
}
