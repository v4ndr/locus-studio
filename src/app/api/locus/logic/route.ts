import { logicCompute } from "@/locus/client.server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.mku_key) return Response.json({ error: "mku_key manquante" }, { status: 400 });
  return Response.json(await logicCompute({ mku_key: body.mku_key, answers: body.answers ?? {}, checked: body.checked ?? [], level: body.level }));
}
