"use client";
import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Check, Lock, LockOpen } from "lucide-react";
import { acces, route, type Lang } from "@/i18n";
import { PageHead, PageInner } from "@/components/shell/page-inner";
import { Box } from "@/components/ui/card";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { useStudioAccount } from "./auth";
import { SigninBox } from "./signin";
import { COUNTRIES, DemandeSchema, ORG_TYPES, emailPerso, type Country, type Demande, type DemandeReponse, type OrgType } from "./schema";

/** L'écran `/[lang]/acces` : reprise de Acces.dc.html. */

type Erreurs = Partial<Record<keyof Demande, string>>;

function BoxHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between gap-2.5 border-b border-border px-6 pb-4 pt-5">
      <h2 className="m-0 text-[15px] font-semibold tracking-[-.01em]">{title}</h2>
      {sub && <span className="text-[12.5px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

function DemandeForm({ lang, onSent }: { lang: Lang; onSent: (email: string) => void }) {
  const t = acces[lang];
  const [email, setEmail] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [org, setOrg] = React.useState("");
  const [orgType, setOrgType] = React.useState<OrgType>("editeur_logiciel");
  const [role, setRole] = React.useState("");
  const [country, setCountry] = React.useState<Country>("FR");
  const [note, setNote] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const [erreurs, setErreurs] = React.useState<Erreurs>({});
  const [global, setGlobal] = React.useState<string | null>(null);
  const [envoi, setEnvoi] = React.useState(false);

  const perso = emailPerso(email);

  const messageChamp = (champ: keyof Demande, valeur: string): string => {
    if (champ === "email") {
      if (!valeur.trim()) return t.errors.required;
      if (emailPerso(valeur)) return t.form.perso;
      return t.errors.email;
    }
    if (champ === "consent") return t.errors.consent;
    if (!valeur.trim()) return t.errors.required;
    return t.errors.text;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (envoi) return;
    setGlobal(null);
    const demande = { email, full_name: fullName, organisation: org, org_type: orgType, job_title: role, country, note: note.trim() || undefined, consent, locale: lang };
    const valeurs: Record<string, string> = { email, full_name: fullName, organisation: org, job_title: role, note };
    const parsed = DemandeSchema.safeParse(demande);
    if (!parsed.success) {
      const errs: Erreurs = {};
      for (const issue of parsed.error.issues) {
        const champ = issue.path[0] as keyof Demande;
        if (!errs[champ]) errs[champ] = messageChamp(champ, valeurs[champ] ?? "");
      }
      setErreurs(errs);
      return;
    }
    setErreurs({});
    setEnvoi(true);
    try {
      const r = await fetch("/api/acces/demande", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const j = (await r.json().catch(() => null)) as DemandeReponse | null;
      if (j?.ok) { onSent(parsed.data.email); return; }
      if (j && !j.ok) {
        if (j.code === "perso") { setErreurs({ email: t.form.perso }); return; }
        if (j.code === "invalid" && j.field) { setErreurs({ [j.field]: messageChamp(j.field, valeurs[j.field] ?? "x") }); return; }
        setGlobal(t.errors[j.code]);
        return;
      }
      setGlobal(t.errors.unavailable);
    } catch {
      setGlobal(t.errors.network);
    } finally {
      setEnvoi(false);
    }
  };

  const clear = (champ: keyof Demande) => setErreurs((e) => (e[champ] ? { ...e, [champ]: undefined } : e));

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 px-6 pb-6 pt-5">
      <div className="grid grid-cols-1 gap-3.5 min-[821px]:grid-cols-2">
        <Field label={t.form.name} className="content-start" error={erreurs.full_name}>
          <Input type="text" name="name" autoComplete="name" value={fullName} onChange={(e) => { setFullName(e.target.value); clear("full_name"); }} placeholder={t.form.namePh} aria-invalid={!!erreurs.full_name} maxLength={120} />
        </Field>
        <Field label={t.form.email} className="content-start" error={perso ? t.form.perso : erreurs.email}>
          <Input type="email" name="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => { setEmail(e.target.value); clear("email"); }} placeholder={t.form.emailPh} aria-invalid={perso || !!erreurs.email} maxLength={254} />
        </Field>
        <Field label={t.form.org} className="content-start" error={erreurs.organisation}>
          <Input type="text" name="organization" autoComplete="organization" value={org} onChange={(e) => { setOrg(e.target.value); clear("organisation"); }} placeholder={t.form.orgPh} aria-invalid={!!erreurs.organisation} maxLength={160} />
        </Field>
        <Field label={t.form.type} className="content-start" error={erreurs.org_type}>
          <Select name="org_type" value={orgType} onChange={(e) => setOrgType(e.target.value as OrgType)}>
            {ORG_TYPES.map((k) => <option key={k} value={k}>{t.form.types[k]}</option>)}
          </Select>
        </Field>
        <Field label={t.form.role} className="content-start" error={erreurs.job_title}>
          <Input type="text" name="job_title" autoComplete="organization-title" value={role} onChange={(e) => { setRole(e.target.value); clear("job_title"); }} placeholder={t.form.rolePh} aria-invalid={!!erreurs.job_title} maxLength={120} />
        </Field>
        <Field label={t.form.country} className="content-start" error={erreurs.country}>
          <Select name="country" value={country} onChange={(e) => setCountry(e.target.value as Country)}>
            {COUNTRIES.map((k) => <option key={k} value={k}>{t.form.countries[k]}</option>)}
          </Select>
        </Field>
        <Field label={t.form.note} optional={t.form.optional} className="content-start min-[821px]:col-span-2" error={erreurs.note}>
          <Textarea name="note" rows={4} value={note} onChange={(e) => { setNote(e.target.value); clear("note"); }} placeholder={t.form.notePh} maxLength={2000} />
        </Field>
        <div className="grid gap-1.5 min-[821px]:col-span-2">
          <label className="flex items-start gap-2.5 text-[13px] text-muted-foreground">
            <input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); clear("consent"); }} className="mt-0.5 size-4 shrink-0 accent-primary" />
            <span>{t.form.consent}</span>
          </label>
          {erreurs.consent && <span className="text-[12.5px] text-destructive">{erreurs.consent}</span>}
        </div>
      </div>
      {global && <p role="alert" className="m-0 text-[13px] text-destructive">{global}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[12.5px] text-muted-foreground">{t.form.foot}</span>
        <Button type="submit" variant="primary" disabled={envoi}>{envoi ? t.form.sending : t.form.send}</Button>
      </div>
    </form>
  );
}

function Recu({ lang, email, onEdit }: { lang: Lang; email: string; onEdit: () => void }) {
  const t = acces[lang];
  return (
    <div className="grid justify-items-start gap-3.5 p-6" role="status">
      <span className="grid size-8 place-items-center rounded-md border border-border bg-muted"><Check size={16} aria-hidden="true" /></span>
      <h2 className="m-0 text-base font-semibold tracking-[-.01em]">{t.sent.title}</h2>
      <p className="m-0 text-muted-foreground">{t.sent.text} <b className="font-medium text-foreground">{email || t.sent.fallback}</b>.</p>
      <div className="flex flex-wrap gap-2">
        <Link href={route(lang, "home")} className={buttonClass()}>{t.back}</Link>
        <Button variant="ghost" onClick={onEdit}>{t.sent.edit}</Button>
      </div>
    </div>
  );
}

export function AccesPage({ lang, invited, ticket, ticketStatus }: { lang: Lang; invited: boolean; ticket: string | null; ticketStatus: string | null }) {
  const t = acces[lang];
  const account = useStudioAccount();
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  return (
    <PageInner>
      <PageHead title={t.title}>
        <Link href={route(lang, "home")} className={buttonClass()}><ArrowLeft aria-hidden="true" />{t.back}</Link>
      </PageHead>
      <div className="grid items-start gap-3 min-[1101px]:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Box>
          <BoxHead title={t.form.title} sub={t.form.sub} />
          {/* Le formulaire reste monté sous « Demande reçue » : « Modifier la demande » retrouve les champs. */}
          <div className={cn(sentTo !== null && "hidden")}><DemandeForm lang={lang} onSent={setSentTo} /></div>
          {sentTo !== null && <Recu lang={lang} email={sentTo} onEdit={() => setSentTo(null)} />}
        </Box>
        <div className="grid gap-3">
          <Box>
            <BoxHead title={t.signin.title} />
            <div className="grid gap-3 px-6 pb-[22px] pt-[18px]">
              <SigninBox lang={lang} account={account} invited={invited} ticket={ticket} ticketStatus={ticketStatus} />
            </div>
          </Box>
          <Box className="grid gap-3.5 px-5 py-[18px]">
            <div className="grid gap-1">
              <h3 className="m-0 flex items-center gap-2 text-sm font-semibold"><Lock size={16} aria-hidden="true" />{t.compare.without}</h3>
              <p className="m-0 text-[13px] text-muted-foreground">{t.compare.withoutText}</p>
            </div>
            <div className="grid gap-1">
              <h3 className="m-0 flex items-center gap-2 text-sm font-semibold"><LockOpen size={16} aria-hidden="true" />{t.compare.with}</h3>
              <p className="m-0 text-[13px] text-muted-foreground">{t.compare.withText}</p>
            </div>
          </Box>
        </div>
      </div>
    </PageInner>
  );
}
