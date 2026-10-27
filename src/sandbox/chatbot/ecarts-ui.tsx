"use client";
import * as React from "react";
import { GitBranch, Gauge, Library, Link2, MessageCircleQuestion, Pill, Split, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { chatbot, type Lang } from "@/i18n";
import type { Ecart, EcartKey } from "./ecarts";

/**
 * Les écarts à regarder, en fin de réponse, dans les deux colonnes : un
 * repère court par écart, et au survol (au toucher sur mobile) une infobulle
 * qui met côte à côte ce que fait Locus et ce que fait le RAG simple. Le
 * repère survolé dans une colonne s'allume aussi dans l'autre. Côté Locus, la
 * famille verte de la landing ; côté RAG simple, des repères fades.
 */

export type Cote = "locus" | "rag";
export interface Survol { k: EcartKey; from: Cote }

const ICONES: Record<EcartKey, LucideIcon> = {
  editeurs: Library,
  medicament: Pill,
  instruments: GitBranch,
  precisions: MessageCircleQuestion,
  conditions: Split,
  confiance: Gauge,
  renvois: Link2,
};

interface Ligne { titre: string; locus: { court: string; detail: string }; rag: { court: string; detail: string } }

/** Le texte d'un écart, dans la langue de l'interface, à partir de ses chiffres. */
function ligne(lang: Lang, e: Ecart): Ligne {
  const t = chatbot[lang].ecarts;
  switch (e.k) {
    case "editeurs": {
      const rag = t.editeurs.rag(e.rag.length);
      return { titre: t.editeurs.titre, locus: { court: t.editeurs.locus(e.locus.length), detail: e.locus.join(", ") }, rag: { court: rag, detail: e.rag.join(", ") || rag } };
    }
    case "medicament":
      return { titre: t.medicament.titre, locus: { court: t.medicament.locus(e.rcp.length, e.drug.length), detail: [...e.rcp, ...e.drug].join(" · ") }, rag: { court: t.medicament.rag, detail: t.medicament.rag } };
    case "instruments":
      return { titre: t.instruments.titre, locus: { court: t.instruments.locus(e.tree.length, e.score.length), detail: [...e.tree, ...e.score].join(" · ") }, rag: { court: t.instruments.rag, detail: t.instruments.rag } };
    case "precisions":
      return { titre: t.precisions.titre, locus: { court: t.precisions.locus(e.n), detail: t.precisions.locusDetail(e.n) }, rag: { court: t.precisions.rag, detail: t.precisions.ragDetail } };
    case "conditions":
      return { titre: t.conditions.titre, locus: { court: t.conditions.locus, detail: e.items.join(" · ") }, rag: { court: t.conditions.rag, detail: t.conditions.rag } };
    case "confiance": {
      const levels = chatbot[lang].confidence.levels;
      return { titre: t.confiance.titre, locus: { court: t.confiance.locus(e.c.level), detail: levels[e.c.level - 1] ?? levels[0] }, rag: { court: t.confiance.rag, detail: t.confiance.ragDetail } };
    }
    case "renvois":
      return { titre: t.renvois.titre, locus: { court: t.renvois.locus(e.locus.sans, e.locus.total), detail: t.renvois.detail(e.locus.sans, e.locus.total) }, rag: { court: t.renvois.rag(e.rag.sans, e.rag.total), detail: t.renvois.detail(e.rag.sans, e.rag.total) } };
  }
}

export function Ecarts({ lang, cote, items, hot, onHot }: { lang: Lang; cote: Cote; items: Ecart[]; hot: Survol | null; onHot: (s: Survol | null) => void }) {
  const t = chatbot[lang].ecarts;
  const id = React.useId();
  if (!items.length) return null;
  const locus = cote === "locus";
  const ouvert = hot?.from === cote ? items.find((e) => e.k === hot.k) : undefined;
  const l = ouvert ? ligne(lang, ouvert) : null;

  return (
    <section
      aria-label={t.title}
      onKeyDown={(e) => { if (e.key === "Escape") onHot(null); }}
      className={cn("relative flex flex-col gap-2.5 rounded-[var(--radius)] px-3.5 py-3", locus ? "border border-[color-mix(in_srgb,var(--brand)_22%,transparent)] bg-brand-soft" : "border border-dashed border-border")}
    >
      <span className={cn("eyebrow text-[11px]", !locus && "text-muted-foreground")}>{t.title}</span>
      <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
        {items.map((e, i) => {
          const Icon = ICONES[e.k];
          const txt = ligne(lang, e)[cote].court;
          const actif = hot?.k === e.k;
          const lui = actif && hot?.from === cote;
          return (
            <li key={e.k} className={locus ? "locus-chip" : undefined} style={locus ? { animationDelay: `${i * 50}ms` } : undefined}>
              <button
                type="button"
                aria-describedby={lui ? `${id}-bulle` : undefined}
                onPointerEnter={(ev) => { if (ev.pointerType === "mouse") onHot({ k: e.k, from: cote }); }}
                onPointerLeave={(ev) => { if (ev.pointerType === "mouse") onHot(null); }}
                onFocus={() => onHot({ k: e.k, from: cote })}
                onBlur={() => onHot(null)}
                onClick={() => onHot({ k: e.k, from: cote })}
                className={cn(
                  "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-left text-[13px] transition-[color,background-color,border-color,box-shadow] [&_svg]:size-3.5 [&_svg]:shrink-0",
                  locus
                    ? cn("border-[color-mix(in_srgb,var(--brand)_32%,transparent)] bg-card font-medium text-foreground [&_svg]:text-brand", actif && "border-brand shadow-[0_0_0_3px_var(--brand-soft)]")
                    : cn("border-dashed border-border bg-transparent text-muted-foreground", actif && "border-solid border-ring text-foreground"),
                )}
              >
                <Icon aria-hidden="true" />{txt}
              </button>
            </li>
          );
        })}
      </ul>
      {l && (
        <div id={`${id}-bulle`} role="tooltip" className="absolute inset-x-0 top-full z-20 mt-1.5 flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-popover px-3.5 py-3 text-popover-foreground shadow-[0_18px_40px_-18px_rgba(34,48,45,.45)]">
          <span className="text-[13px] font-semibold leading-snug">{l.titre}</span>
          <dl className="m-0 grid gap-1.5 text-xs leading-snug [grid-template-columns:auto_1fr] [column-gap:12px]">
            <dt className="font-medium text-brand">{t.locus}</dt>
            <dd className="m-0 text-foreground">{l.locus.detail}</dd>
            <dt className="font-medium text-muted-foreground">{t.rag}</dt>
            <dd className="m-0 text-muted-foreground">{l.rag.detail}</dd>
          </dl>
        </div>
      )}
    </section>
  );
}
