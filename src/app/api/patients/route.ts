import { DOSSIERS, recordsOf, summaryOf } from "@/data";
import { ageAt } from "@/locus/ehr";
import { now } from "@/data/clock";

export const dynamic = "force-dynamic";

function norm(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function GET(req: Request) {
  const q = norm(new URL(req.url).searchParams.get("q") ?? "").trim();
  const hits = DOSSIERS.map((d) => {
    const p = d.patient;
    const sum = summaryOf(d);
    const hay = norm([p.nomUsage, p.prenomUsuel, p.ins.nomNaissance, sum?.enUneLigne ?? "", ...recordsOf(d, "problem").map((x) => x.libelle), ...recordsOf(d, "medication").map((x) => x.dci)].join(" "));
    const score = q ? (hay.includes(q) ? (norm(p.nomUsage).startsWith(q) ? 3 : norm(p.nomUsage + " " + p.prenomUsuel).includes(q) ? 2 : 1) : 0) : 1;
    return { score, hit: { id: p.id, nom: p.nomUsage, prenom: p.prenomUsuel, hue: p.photoHue ?? 200, ligne: sum?.enUneLigne ?? `${ageAt(p.ins.dateNaissance, now())} ans` } };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.hit.nom.localeCompare(b.hit.nom, "fr"))
    .slice(0, 12)
    .map((x) => x.hit);
  return Response.json(hits);
}
