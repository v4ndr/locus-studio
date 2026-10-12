import { notFound } from "next/navigation";
import { DOSSIERS } from "@/data";
import { patientView, homeData } from "@/studio/view.server";
import { RencontreView } from "@/components/studio/rencontre";

export const dynamic = "force-static";
export const dynamicParams = false;
export function generateStaticParams() { return DOSSIERS.map((d) => ({ id: d.patient.id })); }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = patientView(id);
  if (!v) notFound();
  return <RencontreView v={v} praticien={homeData().praticien} />;
}
