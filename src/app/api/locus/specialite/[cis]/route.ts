import { CoreIndisponible, specialite } from "@/locus/client.server";
import { guardLive } from "@/lib/server/guard";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request, ctx: { params: Promise<{ cis: string }> }) {
  const g = await guardLive(req);
  if (!g.ok) return g.response;
  const { cis } = await ctx.params;
  if (!/^\d{8}$/.test(cis)) return Response.json({ error: "SPECIALITE_NOT_FOUND" }, { status: 404 });
  try {
    const s = await specialite(cis);
    if (!s) return Response.json({ error: "SPECIALITE_NOT_FOUND" }, { status: 404 });
    return Response.json(s);
  } catch (e) {
    if (e instanceof CoreIndisponible) return Response.json({ error: e.message, code: "locus_indisponible" }, { status: 503 });
    throw e;
  }
}
