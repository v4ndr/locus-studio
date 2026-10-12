import { DOSSIERS, recordsOf, displayName, inbox, pendingProposals } from "@/data";
import { ageAt } from "@/locus/ehr";
import { now, day } from "@/data/clock";
import { RoutinesView, type Routine } from "@/components/routines";
import { PatientsCounts } from "@/components/counts";

export const dynamic = "force-static";

export default function Page() {
  const n = now();
  const pts = DOSSIERS.map((d) => ({ d, p: d.patient, age: ageAt(d.patient.ins.dateNaissance, n), nom: displayName(d.patient) }));
  const routines: Routine[] = [
    {
      id: "hba1c", nom: "Diabétiques sans HbA1c depuis 6 mois", quand: "Chaque dimanche 20h", action: "Préparer l'ordonnance de bilan et un message au patient", autonomie: 1,
      regle: "Problème actif E11 ET aucune HbA1c (LOINC 4548-4) depuis 180 jours",
      resultats: pts.filter(({ d }) => recordsOf(d, "problem").some((x) => x.cim10?.startsWith("E11") && x.status === "actif")).map(({ d, p, nom }) => { const last = recordsOf(d, "lab").flatMap((l) => l.resultats.filter((r) => r.loinc === "4548-4").map(() => l.prelevementLe)).sort().pop(); return { id: p.id, nom, detail: last ? `dernière HbA1c ${last}` : "jamais dosée au cabinet", cible: !last || last < day(-180) }; }),
    },
    {
      id: "crc", nom: "Dépistage colorectal 50-74 ans non à jour", quand: "1er du mois", action: "Message avec le kit à retirer en pharmacie ; coloscopie si risque élevé", autonomie: 2,
      regle: "50 ≤ âge ≤ 74 ET (aucun test < 2 ans OU état « à proposer »)",
      resultats: pts.filter(({ age }) => age >= 50 && age <= 74).map(({ d, p, nom, age }) => { const s = recordsOf(d, "screening").find((x) => x.programme === "colorectal"); return { id: p.id, nom, detail: `${age} ans · ${s ? s.etat : "jamais proposé"}`, cible: !s || s.etat === "en-retard" || s.etat === "a-proposer" }; }),
    },
    {
      id: "grippe", nom: "Vaccination grippe ≥ 65 ans ou ALD, saison en cours", quand: "Chaque lundi d'octobre à janvier", action: "Message au patient, vaccin réservé au cabinet", autonomie: 2,
      regle: "(âge ≥ 65 OU ALD) ET aucune vaccination grippe depuis le 1er octobre",
      resultats: pts.filter(({ age, p }) => age >= 65 || (p.couverture.ald?.length ?? 0) > 0).map(({ d, p, nom, age }) => { const v = recordsOf(d, "vaccination").filter((x) => x.valences.some((y) => /grippe/i.test(y))).map((x) => x.date).sort().pop(); return { id: p.id, nom, detail: `${age} ans · ${v ? `dernier vaccin ${v}` : "jamais"}`, cible: !v || v < "2026-10-01" }; }),
    },
    {
      id: "renouv", nom: "Renouvellements dus sous 15 jours", quand: "Chaque jour 6h", action: "Pré-remplir l'ordonnance, proposer un rendez-vous ou un renouvellement sans consultation si possible", autonomie: 1,
      regle: "Traitement chronique ET (dernier renouvellement + durée) < aujourd'hui + 15 j",
      resultats: pts.flatMap(({ d, p, nom }) => recordsOf(d, "medication").filter((m) => m.type === "chronique" && m.dernierRenouvellement && m.dureeRenouvellementJours).map((m) => ({ m, due: new Date(new Date(m.dernierRenouvellement!).getTime() + m.dureeRenouvellementJours! * 86_400_000).toISOString().slice(0, 10) })).filter((x) => x.due < day(15)).slice(0, 1).map((x) => ({ id: p.id, nom, detail: `${x.m.dci} · dû le ${x.due}`, cible: true }))),
    },
    {
      id: "mammo", nom: "Mammographie 50-74 ans en retard", quand: "1er du mois", action: "Relance avec l'invitation du CRCDC", autonomie: 2,
      regle: "Femme ET 50 ≤ âge ≤ 74 ET état « en retard »",
      resultats: pts.filter(({ p, age }) => p.ins.sexe === "F" && age >= 50 && age <= 74).map(({ d, p, nom, age }) => { const s = recordsOf(d, "screening").find((x) => x.programme === "sein"); return { id: p.id, nom, detail: `${age} ans · ${s?.etat ?? "non renseigné"}`, cible: s?.etat === "en-retard" }; }),
    },
  ];
  return (
    <>
      <PatientsCounts inbox={inbox().length} proposals={pendingProposals().length} />
      <RoutinesView routines={routines} />
    </>
  );
}
