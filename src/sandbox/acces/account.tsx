"use client";
import Link from "next/link";
import { Building, LogOut, UserRound } from "lucide-react";
import { acces, common, route, type Lang } from "@/i18n";
import { buttonClass } from "@/components/ui/button";
import { useStudioAccount } from "./auth";

/**
 * Le compte, au pied du menu flottant : le compte connecté (email,
 * déconnexion), sinon Visiteur et « Se connecter ».
 */
export function AccountFooter({ lang, onNavigate }: { lang: Lang; onNavigate?: () => void }) {
  const t = common[lang];
  const { user, signOut } = useStudioAccount();
  if (user) {
    return (
      <div className="flex items-center gap-2.5">
        <span className="grid size-[30px] shrink-0 place-items-center rounded-full border border-input text-muted-foreground"><UserRound size={16} aria-hidden="true" /></span>
        <span className="grid min-w-0 flex-1 leading-tight"><span className="truncate" title={user.email ?? undefined}>{user.email ?? user.id}</span><small className="truncate text-xs text-muted-foreground">{acces[lang].account.live}</small></span>
        <button type="button" onClick={() => void signOut()} aria-label={acces[lang].account.signOut} title={acces[lang].account.signOut} className={buttonClass({ size: "icon", variant: "ghost", className: "size-8" })}><LogOut aria-hidden="true" /></button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-[30px] shrink-0 place-items-center rounded-full border border-input text-muted-foreground"><Building size={16} aria-hidden="true" /></span>
      <span className="grid min-w-0 flex-1 leading-tight"><span className="truncate">{t.account.guest}</span><small className="truncate text-xs text-muted-foreground">{t.account.guestSub}</small></span>
      <Link href={route(lang, "acces")} onClick={onNavigate} className={buttonClass({ size: "sm" })}>{t.account.signin}</Link>
    </div>
  );
}
