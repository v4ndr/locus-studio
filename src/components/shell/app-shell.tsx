"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Building, House, KeyRound, Library, Menu, Moon, Search, Sun, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { common, LANG_COOKIE, LANGS, route, TOOLS, type Lang, type RouteKey } from "@/i18n";
import { useLang } from "@/i18n/lang";
import { buttonClass } from "@/components/ui/button";
import { Badge, StatusDot } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";
import { Segmented } from "@/components/ui/segmented";
import { LocusMark } from "./locus-mark";
import { GraphBackground } from "./graph-background";
import { useTheme, type Mode } from "./theme";
import { CommandPalette, type PaletteItem } from "./command-palette";
import { TOOL_ICONS } from "./tool-icons";

/**
 * La coque console de l'app (identité Noir) : sidebar fixe de 248 px, zone
 * principale qui défile, fond en graphe et grain. Sous 820 px, la sidebar
 * passe dans un tiroir ouvert depuis la barre du haut.
 *
 * Les pages remplissent la zone principale ; `PageInner` (dans
 * `./page-inner`) donne la colonne standard de 1120 px.
 */


/** Les routes plein écran : pas de sidebar ni de fond, la page porte son propre chrome. */
const IMMERSIVE: RouteKey[] = ["integration"];

function Wordmark({ lang, onClick }: { lang: Lang; onClick?: () => void }) {
  const t = common[lang];
  return (
    <Link href={route(lang, "home")} onClick={onClick} className="flex min-w-0 items-center gap-[9px] rounded-lg px-2 py-1.5 text-foreground">
      <LocusMark size={24} className="shrink-0" />
      <span className="whitespace-nowrap text-[21px] font-normal tracking-[-.5px]">{t.brand.wordmarkA}<span className="text-muted-foreground">{t.brand.wordmarkB}</span></span>
    </Link>
  );
}

/** Le chemin courant dans l'autre langue (le préfixe change, le reste non). */
function autreLangue(pathname: string, to: Lang) {
  const parts = pathname.split("/");
  parts[1] = to;
  return parts.join("/") || `/${to}`;
}

function NavLink({ href, icon: Icon, label, active, extra, onClick }: { href: string; icon: LucideIcon; label: string; active: boolean; extra?: React.ReactNode; onClick?: () => void }) {
  return (
    <Link href={href} onClick={onClick} aria-current={active ? "page" : undefined} className={cn("flex h-8 items-center gap-2 overflow-hidden whitespace-nowrap rounded-md px-2 text-foreground", active ? "bg-sidebar-accent font-medium" : "opacity-85 hover:bg-sidebar-accent hover:opacity-100")}>
      <Icon size={16} aria-hidden="true" className="shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {extra}
    </Link>
  );
}

function Sidebar({ lang, pathname, drawer, onClose, onSearch }: { lang: Lang; pathname: string; drawer: boolean; onClose: () => void; onSearch: () => void }) {
  const t = common[lang];
  const router = useRouter();
  const { mode, setMode } = useTheme();
  const actif = (key: RouteKey) => key === "home" ? pathname === route(lang, "home") : pathname === route(lang, key) || pathname.startsWith(route(lang, key) + "/");
  const setLang = (to: Lang) => {
    if (to === lang) return;
    try { document.cookie = `${LANG_COOKIE}=${to}; path=/; max-age=31536000; samesite=lax`; } catch {}
    router.push(autreLangue(pathname, to) + (typeof window !== "undefined" ? window.location.search : ""));
  };
  const fermer = drawer ? onClose : undefined;
  // Tiroir : le focus entre dans le tiroir à l'ouverture.
  const closeRef = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => { if (drawer) closeRef.current?.focus(); }, [drawer]);
  return (
    <aside aria-label={t.nav.label} role={drawer ? "dialog" : undefined} aria-modal={drawer ? true : undefined} className={cn("shell-side flex min-h-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground", drawer ? "fixed inset-0 z-[60] border-r-0" : "sticky top-0 hidden h-dvh min-[821px]:flex")}>
      <div className="grid gap-2 px-3 pb-2 pt-3.5">
        <div className="flex items-center">
          <Wordmark lang={lang} onClick={fermer} />
          {drawer && <><span className="flex-1" /><button ref={closeRef} type="button" onClick={onClose} aria-label={t.menu.close} className={buttonClass({ size: "icon" })}><X size={16} aria-hidden="true" /></button></>}
        </div>
        <button type="button" onClick={onSearch} className="flex h-9 items-center gap-2 rounded-md border border-input bg-background pl-2.5 pr-2 text-left text-muted-foreground shadow-xs">
          <Search size={16} aria-hidden="true" /><span className="flex-1">{t.nav.search}</span><Kbd>⌘K</Kbd>
        </button>
      </div>
      <nav className="grid flex-1 content-start gap-px overflow-y-auto px-3 pb-3 pt-1">
        <NavLink href={route(lang, "home")} icon={House} label={t.nav.home} active={actif("home")} onClick={fermer} />
        <div className="px-2 pb-1 pt-4 text-xs font-medium text-muted-foreground">{t.nav.sandbox}</div>
        {TOOLS.map((k) => <NavLink key={k} href={route(lang, k)} icon={TOOL_ICONS[k]} label={t.tools[k]} active={actif(k)} onClick={fermer} />)}
        <div className="px-2 pb-1 pt-4 text-xs font-medium text-muted-foreground">{t.nav.resources}</div>
        <span aria-disabled="true" className="flex h-8 items-center gap-2 rounded-md px-2 opacity-60"><Library size={16} aria-hidden="true" /><span className="flex-1 truncate">{t.nav.sources}</span><Badge variant="secondary">{t.nav.soon}</Badge></span>
        <span aria-disabled="true" className="flex h-8 items-center gap-2 rounded-md px-2 opacity-60"><BookOpen size={16} aria-hidden="true" /><span className="flex-1 truncate">{t.nav.docs}</span><Badge variant="secondary">{t.nav.soon}</Badge></span>
        <NavLink href={route(lang, "acces")} icon={KeyRound} label={t.nav.keys} active={false} onClick={fermer} extra={<Badge variant="secondary">{t.nav.invite}</Badge>} />
      </nav>
      <div className="mx-3 mb-2.5 grid gap-1 rounded-lg border border-sidebar-border bg-background p-3 text-[12.5px] text-muted-foreground">
        <b className="flex items-center gap-1.5 font-medium text-foreground"><StatusDot />{t.notice.title}</b>
        {t.notice.text}
      </div>
      <div className="grid gap-2.5 border-t border-sidebar-border px-3 pb-3 pt-2.5">
        <div className="flex gap-2">
          <Segmented<Mode> label={t.theme.label} value={mode} onChange={setMode} options={[{ value: "dark", label: <Moon aria-hidden="true" />, aria: t.theme.dark }, { value: "light", label: <Sun aria-hidden="true" />, aria: t.theme.light }]} />
          <Segmented<Lang> label={t.language.label} value={lang} onChange={setLang} options={LANGS.map((l) => ({ value: l, label: l.toUpperCase() }))} />
        </div>
        <div className="flex items-center gap-2.5">
          <span className="grid size-[30px] shrink-0 place-items-center rounded-[7px] border border-input text-muted-foreground"><Building size={16} aria-hidden="true" /></span>
          <span className="grid min-w-0 flex-1 leading-tight"><span className="truncate">{t.account.guest}</span><small className="truncate text-xs text-muted-foreground">{t.account.guestSub}</small></span>
          <Link href={route(lang, "acces")} onClick={fermer} className={buttonClass({ size: "sm" })}>{t.account.signin}</Link>
        </div>
      </div>
    </aside>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const lang = useLang();
  const t = common[lang];
  const pathname = usePathname() ?? `/${lang}`;
  const [drawer, setDrawer] = React.useState(false);
  const [palette, setPalette] = React.useState(false);
  const menuRef = React.useRef<HTMLButtonElement>(null);
  const fermerTiroir = React.useCallback(() => setDrawer(false), []);
  // Tiroir refermé : le focus revient au bouton menu (après la levée d'`inert`).
  const etaitOuvert = React.useRef(false);
  React.useEffect(() => { if (!drawer && etaitOuvert.current) menuRef.current?.focus(); etaitOuvert.current = drawer; }, [drawer]);

  React.useEffect(() => { setDrawer(false); }, [pathname]);
  React.useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") fermerTiroir(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [drawer, fermerTiroir]);
  // ⌘K ouvre la palette, sauf dans le LGC natif IA qui a son propre ⌘K (le composer).
  const dansStudio = pathname.startsWith(route(lang, "lgcNatif"));
  React.useEffect(() => {
    if (dansStudio) return;
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((p) => !p); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dansStudio]);

  const items: PaletteItem[] = [
    { href: route(lang, "home"), label: t.nav.home, icon: House },
    ...TOOLS.map((k) => ({ href: route(lang, k), label: t.tools[k], icon: TOOL_ICONS[k] })),
    { href: route(lang, "acces"), label: t.account.request, icon: KeyRound },
  ];

  if (IMMERSIVE.some((k) => pathname === route(lang, k) || pathname.startsWith(route(lang, k) + "/"))) {
    return <>{children}{palette && <CommandPalette items={items} lang={lang} onClose={() => setPalette(false)} />}</>;
  }

  return (
    <>
      <GraphBackground />
      <div className="relative z-[1] grid min-h-dvh grid-cols-1 min-[821px]:grid-cols-[248px_minmax(0,1fr)]">
        <Sidebar lang={lang} pathname={pathname} drawer={false} onClose={() => setDrawer(false)} onSearch={() => setPalette(true)} />
        {drawer && <Sidebar lang={lang} pathname={pathname} drawer onClose={fermerTiroir} onSearch={() => { setDrawer(false); setPalette(true); }} />}
        {/* Tiroir ouvert : le reste de la page sort du parcours clavier. */}
        <div className="shell-main flex min-h-dvh flex-col" inert={drawer}>
          <div className="shell-mtop sticky top-0 z-20 border-b border-border bg-sidebar min-[821px]:hidden">
            <div className="flex items-center gap-2 px-4 py-2.5">
              <Wordmark lang={lang} />
              <span className="flex-1" />
              <Link href={route(lang, "acces")} className={buttonClass({ size: "sm" })}>{t.account.signin}</Link>
              <button ref={menuRef} type="button" onClick={() => setDrawer(true)} aria-label={t.menu.open} aria-expanded={drawer} className={buttonClass({ size: "icon" })}><Menu size={16} aria-hidden="true" /></button>
            </div>
            <p className="m-0 flex items-center gap-1.5 border-t border-border px-4 py-1.5 text-xs text-muted-foreground"><StatusDot />{t.banner}</p>
          </div>
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
      {palette && <CommandPalette items={items} lang={lang} onClose={() => setPalette(false)} />}
    </>
  );
}
