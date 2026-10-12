"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Users, Inbox, Sparkles, Repeat, Cpu, BookOpen, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { StudioProvider, useStudio } from "@/store/studio";
import { CommandPalette } from "./command-palette";

const NAV = [
  { href: "/journee", label: "Journée", icon: CalendarDays },
  { href: "/inbox", label: "Réception", icon: Inbox, badge: "inbox" as const },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/agents", label: "Locus", icon: Sparkles, badge: "proposals" as const },
  { href: "/routines", label: "Routines", icon: Repeat },
  { href: "/locus", label: "locus-core", icon: Cpu },
  { href: "/manifeste", label: "Manifeste", icon: BookOpen },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  /* L'écran unique (le fil) n'a pas de barre latérale : il n'y a plus de pages. */
  if (pathname === "/") return <>{children}</>;
  return (
    <StudioProvider>
      <ShellInner>{children}</ShellInner>
    </StudioProvider>
  );
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { counts } = useStudio();
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r bg-sidebar sticky top-0 h-dvh">
        <div className="px-4 py-4 flex items-center gap-2">
          <Mark />
          <div className="leading-tight">
            <div className="font-semibold tracking-[-0.033em]">locus<span className="opacity-60">/studio</span></div>
            <div className="text-micro text-muted-foreground">Maison de santé des Tilleuls</div>
          </div>
        </div>
        <button onClick={() => setPaletteOpen(true)} className="mx-3 mb-2 flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted">
          <Search className="h-3.5 w-3.5" /> Rechercher… <span className="ml-auto font-mono text-micro">⌘K</span>
        </button>
        <nav className="flex-1 px-2 py-1 space-y-0.5">
          {NAV.map((n) => {
            const active = pathname.startsWith(n.href);
            const badge = n.badge ? counts[n.badge] : 0;
            return (
              <Link key={n.href} href={n.href} className={cn("flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors", active ? "bg-accent text-accent-foreground font-medium" : "text-foreground/80 hover:bg-muted")}>
                <n.icon className="h-4 w-4" />
                {n.label}
                {badge > 0 && <span className={cn("ml-auto rounded-full px-1.5 text-micro font-semibold", n.badge === "proposals" ? "bg-agent text-agent-foreground" : "bg-primary text-primary-foreground")}>{badge}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 py-3 border-t text-micro text-muted-foreground space-y-1">
          <Link href="/" className="flex items-center gap-2 rounded-md bg-agent-soft px-2 py-1.5 text-agent font-medium"><Sparkles className="h-3 w-3" /> Retour au fil (l'écran unique)</Link>
          <div className="pt-1 text-muted-foreground/80">Ces écrans sont les « vues héritées » : un meilleur LGC, pas l'avenir.</div>
          <div>Dr Claire Laurent · jeudi 15 oct. 2026</div>
        </div>
      </aside>
      <div className="flex-1 min-w-0 overflow-x-hidden">
        <MobileBar onSearch={() => setPaletteOpen(true)} />
        <main className="mx-auto max-w-[1400px] px-4 md:px-6 py-4 md:py-6">{children}</main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}

function MobileBar({ onSearch }: { onSearch: () => void }) {
  const pathname = usePathname();
  return (
    <div className="md:hidden sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <div className="flex items-center gap-2 px-3 py-2">
        <Mark />
        <span className="font-semibold tracking-tight">locus/studio</span>
        <button onClick={onSearch} className="ml-auto rounded-md border p-1.5"><Search className="h-4 w-4" /></button>
      </div>
      <div className="flex overflow-x-auto px-2 pb-2 gap-1">
        {NAV.map((n) => {
          const active = pathname.startsWith(n.href);
          return <Link key={n.href} href={n.href} className={cn("rounded-full px-3 py-1 text-xs whitespace-nowrap", active ? "bg-accent text-accent-foreground" : "bg-muted")}>{n.label}</Link>;
        })}
      </div>
    </div>
  );
}

function Mark() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
      <circle cx="13" cy="13" r="12" fill="var(--primary)" />
      <circle cx="13" cy="13" r="5" fill="none" stroke="var(--primary-foreground)" strokeWidth="2.2" />
      <circle cx="13" cy="13" r="1.6" fill="var(--primary-foreground)" />
    </svg>
  );
}
