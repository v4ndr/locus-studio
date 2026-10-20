"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSignIn, useSignUp } from "@clerk/nextjs";
import { LogOut, Mail } from "lucide-react";
import { acces, route, type Lang } from "@/i18n";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import type { StudioAccount } from "./auth";

/**
 * L'encart « Déjà un accès » : connexion par code email sur l'instance
 * Clerk Studio (flux personnalisé, pas de composant Clerk). L'inscription
 * publique n'existe pas : un compte naît d'une invitation, dont le lien
 * revient ici avec `?invited=1&__clerk_ticket=…`.
 *
 * Sans clés Clerk, l'encart affiche « bientôt » et aucun hook Clerk n'est
 * appelé.
 */

type Props = { lang: Lang; account: StudioAccount; invited: boolean; ticket: string | null; ticketStatus: string | null };

export function SigninBox(props: Props) {
  const t = acces[props.lang].signin;
  if (!props.account.enabled) {
    return (
      <div className="grid justify-items-start gap-2">
        <Badge variant="secondary">{t.soonBadge}</Badge>
        <p className="m-0 text-[13px] text-muted-foreground">{t.soon}</p>
      </div>
    );
  }
  if (props.account.failed) return <p role="status" className="m-0 text-[13px] text-muted-foreground">{t.unavailable}</p>;
  if (!props.account.loaded) return <p className="m-0 h-[76px] text-[13px] text-muted-foreground" aria-busy="true" />;
  if (props.account.user) return <Connecte {...props} />;
  return <ClerkSignin {...props} />;
}

function Connecte({ lang, account, invited }: Props) {
  const t = acces[lang].signin;
  return (
    <div className="grid gap-3">
      {invited && <p role="status" className="m-0 text-[13px] text-foreground">{t.invited}</p>}
      <p className="m-0 grid gap-0.5 text-[13px] text-muted-foreground">
        {t.signedAs}
        <b className="truncate text-sm font-medium text-foreground">{account.user?.email ?? account.user?.id}</b>
      </p>
      <div className="flex flex-wrap gap-2">
        <Link href={route(lang, "home")} className={buttonClass({ variant: "primary" })}>{t.open}</Link>
        <Button variant="ghost" onClick={() => void account.signOut()}><LogOut aria-hidden="true" />{t.signOut}</Button>
      </div>
    </div>
  );
}

function ClerkSignin({ lang, invited, ticket, ticketStatus }: Props) {
  const t = acces[lang].signin;
  const router = useRouter();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [etape, setEtape] = React.useState<"email" | "code">("email");
  const [erreur, setErreur] = React.useState<string | null>(null);
  const [occupe, setOccupe] = React.useState(false);
  const [invitation, setInvitation] = React.useState<"idle" | "running" | "failed">(ticket ? "running" : "idle");
  const ticketFait = React.useRef(false);

  // Session ouverte : l'URL perd le jeton d'invitation, le serveur relit la session.
  const ouvrir = React.useCallback(() => {
    router.replace(route(lang, "acces", invited ? "?invited=1" : ""));
    router.refresh();
  }, [router, lang, invited]);

  // Le lien d'invitation : le jeton crée le compte (ou ouvre la session s'il existe déjà), sans formulaire.
  React.useEffect(() => {
    if (!ticket || ticketFait.current) return;
    ticketFait.current = true;
    (async () => {
      try {
        if (ticketStatus === "sign_in") {
          const { error } = await signIn.ticket({ ticket });
          if (error || signIn.status !== "complete") throw error ?? new Error(signIn.status);
          await signIn.finalize();
        } else {
          const { error } = await signUp.ticket({ ticket });
          if (error || signUp.status !== "complete") throw error ?? new Error(signUp.status ?? "incomplete");
          await signUp.finalize();
        }
        ouvrir();
      } catch (e) {
        console.error("[acces] invitation", e);
        setInvitation("failed");
      }
    })();
  }, [ticket, ticketStatus, signIn, signUp, ouvrir]);

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (occupe || !email.trim()) return;
    setErreur(null); setOccupe(true);
    try {
      const { error } = await signIn.emailCode.sendCode({ emailAddress: email.trim() });
      if (error) { setErreur(error.code === "form_identifier_not_found" ? t.unknown : t.failed); return; }
      setEtape("code");
    } finally { setOccupe(false); }
  };

  const verifier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (occupe || !code.trim()) return;
    setErreur(null); setOccupe(true);
    try {
      const { error } = await signIn.emailCode.verifyCode({ code: code.trim() });
      if (error) { setErreur(/code|verification/i.test(error.code) ? t.badCode : t.failed); return; }
      if (signIn.status !== "complete") { setErreur(t.failed); return; }
      await signIn.finalize();
      ouvrir();
    } finally { setOccupe(false); }
  };

  return (
    <div className="grid gap-3">
      {invited && invitation === "idle" && <p role="status" className="m-0 text-[13px] text-foreground">{t.invitedPending}</p>}
      {invitation === "failed" && <p role="alert" className="m-0 text-[13px] text-destructive">{t.invitedFailed}</p>}
      {invitation === "running" ? (
        <p role="status" className="m-0 text-[13px] text-muted-foreground" aria-busy="true">{t.invitedRunning}</p>
      ) : etape === "email" ? (
        <form onSubmit={envoyer} className="grid gap-3">
          <Field label={t.email}>
            <Input type="email" name="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} required />
          </Field>
          <Button type="submit" disabled={occupe}><Mail aria-hidden="true" />{t.sendCode}</Button>
        </form>
      ) : (
        <form onSubmit={verifier} className="grid gap-3">
          <p className="m-0 text-[13px] text-muted-foreground">{t.codeSent}</p>
          <Field label={t.code}>
            <Input type="text" name="code" autoComplete="one-time-code" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value.replace(/\s/g, ""))} placeholder={t.codePh} maxLength={12} className="font-mono tracking-[.2em]" required autoFocus />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary" disabled={occupe}>{t.verify}</Button>
            <Button variant="ghost" onClick={() => { setEtape("email"); setCode(""); setErreur(null); }}>{t.resend}</Button>
          </div>
        </form>
      )}
      {erreur && <p role="alert" className="m-0 text-[13px] text-destructive">{erreur}</p>}
      {/* Contrôle anti-robot de Clerk, si l'instance l'active. */}
      <div id="clerk-captcha" />
    </div>
  );
}
