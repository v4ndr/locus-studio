import { specialite } from "@/locus/client.server";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ cis: string }> }) {
  const { cis } = await ctx.params;
  const s = await specialite(cis);
  if (!s) return Response.json({ error: "SPECIALITE_NOT_FOUND" }, { status: 404 });
  return Response.json(s);
}
