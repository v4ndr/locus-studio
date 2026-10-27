"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, House, KeyRound, Library, Menu, Moon, Search, Sun, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { common, LANG_COOKIE, LANGS, route, TOOLS, type Lang, type RouteKey } from "@/i18n";
import { useLang } from "@/i18n/lang";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";
import { Segmented } from "@/components/ui/segmented";
import { LocusMark } from "./locus-mark";
import { useTheme, type Mode } from "./theme";
import { CommandPalette, type PaletteItem } from "./command-palette";
import { TOOL_ICONS } from "./tool-icons";
import { AccountFooter } from "@/sandbox/acces/account";

/**
 * La coque de l'app, sans sidebar : la page prend toute la largeur, et les
 * actions flottent au-dessus. À gauche, la marque (retour à l'accueil) ; à
 * droite, une pilule avec les quatre sandbox, la recherche (⌘K), la langue
 * et un menu (ressources, thème, compte). Sous 820 px, la pilule se réduit à
 * la recherche et au menu, qui reprend alors les sandbox et la langue.
 *
 * Les pages remplissent la zone principale, sous une bande de 64 px laissée
 * aux pilules ; `PageInner` (dans `./page-inner`) donne la colonne standard.
 */

/** Les routes plein écran : pas de coque, la page porte son propre chrome. */
const IMMERSIVE: RouteKey[] = ["integration"];
/** Les pages d'avant le mur (entrée, accès) : ni coque ni palette. */
const NUES: RouteKey[] = ["landing", "acces"];

/** La pilule flottante : papier translucide, filet, flou derrière. */
const FLOAT = "shell-float fixed top-3 z-40 flex h-12 items-center rounded-full border border-border bg-card/85 shadow-[0_8px_24px_-14px_rgba(34,48,45,.35)] backdrop-blur-md";

/** Le chemin courant dans l'autre langue (le préfixe change, le reste non). */
function autreLangue(pathname: string, to: Lang) {
  const parts = pathname.split("/");
  parts[1] = to;
  return parts.join("/") || `/${to}`;
}

function useNav(lang: Lang, pathname: string) {
  const router = useRouter();
  const actif = (key: RouteKey) => key === "home" ? pathname === route(lang, "home") : pathname === route(lang, key) || pathname.startsWith(route(lang, key) + "/");
  const setLang = (to: Lang) => {
    if (to === lang) return;
    try { document.cookie = `${LANG_COOKIE}=${to}; path=/; max-age=31536000; samesite=lax`; } catch {}
    router.push(autreLangue(pathname, to) + (typeof window !== "undefined" ? window.location.search : ""));
  };
  return { actif, setLang };
}

/** La marque, en haut à gauche : ramène à l'accueil des sandbox. */
function Brand({ lang }: { lang: Lang }) {
  const t = common[lang];
  return (
    <Link href={route(lang, "home")} aria-label={`${t.brand.name} · ${t.nav.home}`} className={cn(FLOAT, "left-4 gap-2.5 pl-3.5 pr-4 text-foreground min-[821px]:left-5")}>
      <LocusMark size={22} className="shrink-0 text-brand" />
      <span className="whitespace-nowrap text-[17px] font-extrabold tracking-[-.01em]">{t.brand.wordmarkA}<span className="font-light italic text-brand">{t.brand.wordmarkB}</span></span>
    </Link>
  );
}

function MenuLink({ href, icon: Icon, label, active, extra, onClick }: { href: string; icon: LucideIcon; label: string; active: boolean; extra?: React.ReactNode; onClick: () => void }) {
  return (
    <Link href={href} onClick={onClick} aria-current={active ? "page" : undefined} className={cn("flex h-9 items-center gap-2.5 rounded-full px-3 text-foreground", active ? "bg-accent font-semibold" : "hover:bg-accent")}>
      <Icon size={16} aria-hidden="true" className="shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {extra}
    </Link>
  );
}

/** Le menu de la pilule : sur mobile, toute la navigation ; partout, les ressources, le thème et le compte. */
function ShellMenu({ lang, pathname, onClose }: { lang: Lang; pathname: string; onClose: () => void }) {
  const t = common[lang];
  const { mode, setMode } = useTheme();
  const { actif, setLang } = useNav(lang, pathname);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { ref.current?.querySelector<HTMLElement>("a, button")?.focus(); }, []);
  return (
    <div ref={ref} role="dialog" aria-label={t.nav.label} className="shell-float fixed right-4 top-[68px] z-50 grid max-h-[calc(100dvh-84px)] w-[min(320px,calc(100vw-32px))] content-start gap-1 overflow-y-auto rounded-[20px] border border-border bg-popover p-2 text-popover-foreground shadow-[0_24px_48px_-20px_rgba(34,48,45,.4)] min-[821px]:right-5">
      <nav aria-label={t.nav.label} className="grid gap-px">
        <div className="grid gap-px min-[821px]:hidden">
          <MenuLink href={route(lang, "home")} icon={House} label={t.nav.home} active={actif("home")} onClick={onClose} />
          <p className="eyebrow m-0 px-3 pb-1 pt-3 text-[11px]">{t.nav.sandbox}</p>
          {TOOLS.map((k) => <MenuLink key={k} href={route(lang, k)} icon={TOOL_ICONS[k]} label={t.tools[k]} active={actif(k)} onClick={onClose} />)}
        </div>
        <p className="eyebrow m-0 px-3 pb-1 pt-3 text-[11px] min-[821px]:pt-2">{t.nav.resources}</p>
        <MenuLink href={route(lang, "documentation")} icon={BookOpen} label={t.nav.docs} active={actif("documentation")} onClick={onClose} />
        <MenuLink href={route(lang, "sources")} icon={Library} label={t.nav.sources} active={actif("sources")} onClick={onClose} />
        <MenuLink href={route(lang, "clesApi")} icon={KeyRound} label={t.nav.keys} active={actif("clesApi")} onClick={onClose} extra={<Badge variant="secondary" className="rounded-full">{t.nav.invite}</Badge>} />
      </nav>
      <div className="mt-1 flex flex-wrap gap-2 border-t border-border px-1 pt-3">
        <Segmented<Mode> label={t.theme.label} value={mode} onChange={setMode} options={[{ value: "light", label: <Sun aria-hidden="true" />, aria: t.theme.light }, { value: "dark", label: <Moon aria-hidden="true" />, aria: t.theme.dark }]} />
        <Segmented<Lang> label={t.language.label} value={lang} onChange={setLang} options={LANGS.map((l) => ({ value: l, label: l.toUpperCase() }))} />
      </div>
      <div className="px-1 pb-1 pt-2"><AccountFooter lang={lang} onNavigate={onClose} /></div>
      <p className="m-0 border-t border-border px-3 pb-1 pt-2.5 text-xs text-muted-foreground">{t.banner}</p>
    </div>
  );
}

/** La pilule de droite : les quatre sandbox, la recherche, la langue, le menu. */
function Actions({ lang, pathname, onSearch }: { lang: Lang; pathname: string; onSearch: () => void }) {
  const t = common[lang];
  const { actif, setLang } = useNav(lang, pathname);
  const [menu, setMenu] = React.useState(false);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const fermer = React.useCallback((rendreFocus = true) => { setMenu(false); if (rendreFocus) btnRef.current?.focus(); }, []);
  React.useEffect(() => { setMenu(false); }, [pathname]);
  React.useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") fermer(); };
    const onDown = (e: PointerEvent) => { if (!boxRef.current?.contains(e.target as Node)) fermer(false); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("pointerdown", onDown); };
  }, [menu, fermer]);
  const rond = "grid size-9 shrink-0 place-items-center rounded-full text-foreground hover:bg-accent [&_svg]:size-4";
  return (
    <div ref={boxRef}>
      <div className={cn(FLOAT, "right-4 gap-0.5 px-1.5 min-[821px]:right-5")}>
        <nav aria-label={t.nav.sandbox} className="hidden items-center gap-0.5 min-[821px]:flex">
          {TOOLS.map((k) => {
            const Icon = TOOL_ICONS[k];
            const on = actif(k);
            return (
              <Link key={k} href={route(lang, k)} aria-current={on ? "page" : undefined} aria-label={t.tools[k]} title={t.tools[k]} className={cn("flex h-9 shrink-0 items-center gap-2 rounded-full [&_svg]:size-4", on ? "bg-primary px-3.5 font-semibold text-primary-foreground" : "w-9 justify-center text-foreground hover:bg-accent")}>
                <Icon aria-hidden="true" />{on && <span className="whitespace-nowrap text-[13px] max-[1180px]:sr-only">{t.tools[k]}</span>}
              </Link>
            );
          })}
          <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
        </nav>
        <button type="button" onClick={onSearch} aria-label={t.nav.search} className={cn(rond, "min-[821px]:flex min-[821px]:w-auto min-[821px]:gap-2 min-[821px]:pl-3 min-[821px]:pr-1.5")}>
          <Search aria-hidden="true" /><span className="hidden text-[13px] text-muted-foreground min-[1280px]:inline">{t.nav.search}</span><Kbd className="hidden min-[821px]:inline-flex">⌘K</Kbd>
        </button>
        <span className="hidden min-[821px]:contents">
          <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
          <Segmented<Lang> label={t.language.label} value={lang} onChange={setLang} options={LANGS.map((l) => ({ value: l, label: l.toUpperCase() }))} className="border-0" />
        </span>
        <button ref={btnRef} type="button" onClick={() => setMenu((m) => !m)} aria-label={menu ? t.menu.close : t.menu.open} aria-expanded={menu} aria-haspopup="dialog" className={cn(rond, menu && "bg-accent")}>
          {menu ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>
      {menu && <ShellMenu lang={lang} pathname={pathname} onClose={() => fermer()} />}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const lang = useLang();
  const t = common[lang];
  const pathname = usePathname() ?? `/${lang}`;
  const [palette, setPalette] = React.useState(false);
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
    { href: route(lang, "sources"), label: t.nav.sources, icon: Library },
    { href: route(lang, "documentation"), label: t.nav.docs, icon: BookOpen },
    { href: route(lang, "clesApi"), label: t.nav.keys, icon: KeyRound },
  ];

  if (NUES.some((k) => pathname === route(lang, k) || pathname === route(lang, k) + "/")) {
    return <div className="shell-main min-h-dvh">{children}</div>;
  }

  if (IMMERSIVE.some((k) => pathname === route(lang, k) || pathname.startsWith(route(lang, k) + "/"))) {
    return <>{children}{palette && <CommandPalette items={items} lang={lang} onClose={() => setPalette(false)} />}</>;
  }

  return (
    <>
      <Brand lang={lang} />
      <Actions lang={lang} pathname={pathname} onSearch={() => setPalette(true)} />
      {/* La bande du haut est laissée aux pilules : rien ne passe dessous au chargement. */}
      <div className="shell-main flex min-h-dvh flex-col pt-[68px]">
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      {palette && <CommandPalette items={items} lang={lang} onClose={() => setPalette(false)} />}
    </>
  );
}
