import { notFound } from "next/navigation";
import { DOSSIERS } from "@/data";
import { patientView, documentView, homeData, inboxView } from "@/studio/view.server";
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
  // La boîte d'où ce document peut venir : un courrier ou une bio ont une liste de voisins dans la réception.
  const boite = doc.source === "document" ? inboxView("courriers") : doc.source === "lab" ? inboxView("bio") : undefined;
  return <DocumentView v={v} doc={doc} boite={boite?.rows} boiteKind={boite?.kind} praticien={homeData().praticien} />;
}
