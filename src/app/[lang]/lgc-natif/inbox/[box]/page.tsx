import { notFound } from "next/navigation";
import { inboxView, homeData } from "@/studio/view.server";
import { InboxView } from "@/components/studio/inbox";
import type { InboxKind } from "@/studio/types";

export const dynamic = "force-static";
export const dynamicParams = false;
const BOXES: InboxKind[] = ["courriers", "bio", "messages"];
export function generateStaticParams() { return BOXES.map((box) => ({ box })); }

export default async function Page({ params }: { params: Promise<{ box: string }> }) {
  const { box } = await params;
  if (!BOXES.includes(box as InboxKind)) notFound();
  return <InboxView v={inboxView(box as InboxKind)} praticien={homeData().praticien} />;
}
