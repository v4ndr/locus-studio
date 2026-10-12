import { notFound } from "next/navigation";
import { DOSSIERS } from "@/data";
import { patientView, documentView, homeData } from "@/studio/view.server";
import { DocumentView } from "@/components/studio/document";

export const dynamic = "force-static";
export const dynamicParams = false;
export function generateStaticParams() {
  return DOSSIERS.flatMap((d) => (patientView(d.patient.id)?.documents ?? []).map((r) => ({ id: d.patient.id, docId: r.id })));
}

export default async function Page({ params }: { params: Promise<{ id: string; docId: string }> }) {
  const { id, docId } = await params;
  const v = patientView(id);
  const doc = documentView(id, docId);
  if (!v || !doc) notFound();
  return <DocumentView v={v} doc={doc} praticien={homeData().praticien} />;
}
