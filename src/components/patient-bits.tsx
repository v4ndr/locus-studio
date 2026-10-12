"use client";
import * as React from "react";
import Link from "next/link";
import { ShieldCheck, Phone, MessageSquare, Mail, Smartphone } from "lucide-react";
import type { Patient } from "@/domain/types";
import { Avatar, Badge } from "./ui";
import { initials } from "@/lib/format";

export function ageOf(dateNaissance: string, ref = new Date("2026-10-15")): number {
  const d = new Date(dateNaissance);
  let age = ref.getFullYear() - d.getFullYear();
  const m = ref.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < d.getDate())) age--;
  return age;
}

export function PatientHeader({ p, ligne, right }: { p: Patient; ligne?: string; right?: React.ReactNode }) {
  const canal = { messagerie: MessageSquare, sms: Smartphone, telephone: Phone, email: Mail }[p.contact.canalPrefere];
  const CanalIcon = canal;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Avatar hue={p.photoHue} initials={initials(p.prenomUsuel, p.nomUsage)} size="lg" />
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight">
          <Link href={`/patients/${p.id}`} className="hover:underline">{p.prenomUsuel} {p.nomUsage}</Link>
          <span className="ml-2 text-base font-normal text-muted-foreground">{ageOf(p.ins.dateNaissance)} ans · {p.ins.sexe === "F" ? "F" : "H"}</span>
        </h1>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-micro text-muted-foreground">
          <Badge tone={p.ins.statut === "qualifiee" ? "success" : "warning"}><ShieldCheck className="h-2.5 w-2.5" /> INS {p.ins.statut}</Badge>
          {p.couverture.ald?.map((a) => <Badge key={a.code} tone="primary">ALD {a.code}</Badge>)}
          {p.couverture.c2s && <Badge tone="primary">C2S</Badge>}
          <span className="flex items-center gap-1"><CanalIcon className="h-3 w-3" /> {p.contact.canalPrefere}</span>
          {p.vie?.profession && <span>· {p.vie.profession}</span>}
          {p.vie?.situation && <span>· {p.vie.situation}</span>}
        </div>
        {ligne && <p className="mt-1 text-sm text-foreground/80">{ligne}</p>}
      </div>
      {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
    </div>
  );
}
