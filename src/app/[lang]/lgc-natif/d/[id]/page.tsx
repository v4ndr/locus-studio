import { DossierLocalView } from "@/components/studio/local";

/* Les dossiers locaux vivent dans le navigateur : la page est une coquille rendue à la demande, le contenu vient du poste. */
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DossierLocalView id={id} />;
}
