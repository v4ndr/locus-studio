"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Layers, Minus, Plus, Moon, Sun, Workflow, Wrench, X, Copy, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { common, lgc, LANG_COOKIE, LANGS, route, type Lang } from "@/i18n";
import { useLang } from "@/i18n/lang";
import { Button, ButtonLink, buttonClass } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { LocusMark } from "@/components/shell/locus-mark";
import { useTheme, type Mode } from "@/components/shell/theme";
import { ANCHOR_IDS, defaultFields, type AnchorId } from "@/data/integration-lgc/fournier";
import type { LocusOut } from "@/data/integration-lgc/blocks";
import { WF_EXAMPLE } from "@/data/integration-lgc/workflow";
import { Medicab, type ZoneProps } from "./medicab";
import { AskBox, LocusBody, LocusCard, LocusLoading, LocusTag, type CardAction } from "./locus-card";
import { Wizard } from "./wizard";
import { useDialogFocus } from "./use-dialog";
import { MyBricks } from "./my-bricks";
import { blockOutput, runWorkflow, type Via } from "./api";
import { EXAMPLES, emptyDraft, nextId, useBricks, workflowDraft, type Brick, type Draft } from "./model";

/**
 * « Intégration LGC » : MédiCab 7 en plein écran, et le chrome Studio réduit
 * à une barre flottante. On y pose des briques Locus (outil ou workflow) sur
 * cinq ancrages façon CDS Hooks, plus un bouton de barre d'outils.
 */

type Shown = LocusOut | "loading";
interface OutState { key: string; loading: boolean; out: LocusOut | null; error?: boolean }

const brickKey = (b: Brick) => JSON.stringify([b.kind, b.tool, b.settings, b.fields, b.anchor, b.steps]);
const POP = "rounded-xl border border-border bg-popover text-popover-foreground shadow-[0_16px_40px_rgba(0,0,0,.45)] font-sans";

function autreLangue(pathname: string, to: Lang) {
  const parts = pathname.split("/");
  parts[1] = to;
  return parts.join("/") || `/${to}`;
}

export function IntegrationLgc() {
  const lang = useLang();
  const t = lgc[lang];
  const c = common[lang];
  const router = useRouter();
  const pathname = usePathname() ?? `/${lang}/integration-lgc`;
  const { mode, setMode } = useTheme();
  const [bricks, setBricks] = useBricks();

  // Chrome Studio
  const [chooser, setChooser] = React.useState(false);
  const [list, setList] = React.useState(false);
  const [wiz, setWiz] = React.useState<{ draft: Draft; step: number; editId: string | null } | null>(null);

  // État de MédiCab
  const [replaced, setReplaced] = React.useState(false);
  const [validated, setValidated] = React.useState(false);
  const [dismissed, setDismissed] = React.useState<Set<string>>(new Set());
  const [wfDone, setWfDone] = React.useState<Set<string>>(new Set());
  /**
   * La fenêtre Locus : `show` (une brique « Fenêtre bloquante » vient d'être
   * activée), `validate` (ouverte par « Valider l'ordonnance »), `override`
   * (« Ignorer » sur une alerte bloquante). Fermer revient toujours à
   * l'ordonnance : seule une décision explicite valide, et passer outre une
   * alerte demande un motif.
   */
  const [modal, setModal] = React.useState<{ mode: "show" | "validate" | "override"; ids?: string[] } | null>(null);
  /** Les alertes passées outre, avec leur motif (affiché dans la barre de signature). */
  const [overrides, setOverrides] = React.useState<Record<string, string>>({});
  const [widgetMin, setWidgetMin] = React.useState(false);
  const [tbOpen, setTbOpen] = React.useState(false);
  const [letter, setLetter] = React.useState<string[] | null>(null);
  const [narrowSeen, setNarrowSeen] = React.useState(false);

  // Sorties des briques actives
  const [outs, setOuts] = React.useState<Record<string, OutState>>({});
  const outsRef = React.useRef(outs);
  const [via, setVia] = React.useState<Via | null>(null);

  // La hauteur de la barre flottante (elle passe sur plusieurs lignes en mobile) place les popovers au-dessus.
  const rootRef = React.useRef<HTMLDivElement>(null);
  const barRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const bar = barRef.current, root = rootRef.current;
    if (!bar || !root) return;
    const ro = new ResizeObserver(() => root.style.setProperty("--bar-h", `${bar.offsetHeight}px`));
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);

  React.useEffect(() => {
    for (const b of bricks) {
      if (!b.on) continue;
      const key = brickKey(b);
      if (outsRef.current[b.id]?.key === key) continue;
      const put = (s: OutState) => { outsRef.current = { ...outsRef.current, [b.id]: s }; setOuts(outsRef.current); };
      put({ key, loading: true, out: null });
      const p = b.kind === "workflow"
        ? runWorkflow(b.steps ?? [], b).then((r) => ({ out: r.output, via: r.via }))
        : blockOutput(b).then((r) => ({ out: r.output, via: r.via }));
      p.then((r) => { if (outsRef.current[b.id]?.key !== key) return; put({ key, loading: false, out: r.out }); setVia((v) => (v === "replay" ? v : r.via)); })
        .catch(() => { if (outsRef.current[b.id]?.key !== key) return; put({ key, loading: false, out: null, error: true }); });
    }
  }, [bricks]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setChooser(false); setList(false); setModal(null); setLetter(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const setLang = (to: Lang) => {
    if (to === lang) return;
    try { document.cookie = `${LANG_COOKIE}=${to}; path=/; max-age=31536000; samesite=lax`; } catch {}
    router.push(autreLangue(pathname, to));
  };

  /* ---------- Sorties affichées ---------- */

  const shown = (b: Brick): Shown | null => {
    if (dismissed.has(b.id)) return null;
    const o = outs[b.id];
    if (!o || o.loading || o.key !== brickKey(b)) return "loading";
    if (o.error) return { title: "Locus", lines: [t.out.error] };
    if (!o.out) return null; // workflow arrêté par sa condition : rien ne s'affiche
    if (b.kind === "tool" && b.tool === "controle" && replaced && o.out.actions?.includes("replace")) {
      return { title: "Ligne remplacée", lines: ["Céfuroxime-axétil 250 mg, 1 cp matin et soir, 4 jours."], actions: ["cancel"] };
    }
    if (b.kind === "workflow" && wfDone.has(b.id)) {
      const label = o.out.actionLabel ?? "";
      return { title: /hba1c/i.test(label) ? "HbA1c" : o.out.title, lines: [/hba1c/i.test(label) ? "HbA1c ajoutée à la prochaine biologie." : `Brouillon créé : ${label}.`], actions: ["cancel"] };
    }
    return o.out;
  };

  /** Une alerte bloquante : le contrôle d'ordonnance réglé sur « Bloquant » qui signale une ligne. */
  const isBlocking = (b: Brick, out: LocusOut | "loading" | null) => b.kind === "tool" && b.tool === "controle" && b.settings.niveau === "bloquant" && !!out && out !== "loading" && !!out.actions?.includes("replace");

  const dismiss = (ids: string[], motif?: string) => {
    setDismissed((s) => { const n = new Set(s); for (const id of ids) n.add(id); return n; });
    if (motif) setOverrides((o) => { const n = { ...o }; for (const id of ids) n[id] = motif; return n; });
  };

  const act = (b: Brick, out: LocusOut, a: CardAction) => {
    if (a === "ignore") {
      // Une alerte bloquante ne s'écarte pas d'un clic : on demande le motif.
      if (isBlocking(b, out)) { setModal({ mode: "override", ids: [b.id] }); return; }
      dismiss([b.id]);
      setModal((m) => (m?.mode === "show" ? null : m));
    }
    if (a === "replace") { setReplaced(true); setModal(null); }
    if (a === "openLetter") setLetter(out.letter ?? out.lines);
    if (a === "wfAction") setWfDone((s) => new Set(s).add(b.id));
    if (a === "cancel") {
      if (b.kind === "workflow") setWfDone((s) => { const n = new Set(s); n.delete(b.id); return n; });
      else { setReplaced(false); setValidated(false); setOverrides({}); }
    }
  };

  const inline = Object.fromEntries(ANCHOR_IDS.map((a) => [a, [] as React.ReactNode[]])) as Record<AnchorId, React.ReactNode[]>;
  const banners: React.ReactNode[] = [];
  const panels: React.ReactNode[] = [];
  const widgets: { b: Brick; s: Shown }[] = [];
  const modals: { b: Brick; out: LocusOut }[] = [];
  let blocked = false;
  let modalAlert = false;
  let flagged = false;
  let hba1cAdded = false;
  const active = bricks.filter((b) => b.on);

  for (const b of active) {
    const s = shown(b);
    if (!s) continue;
    if (b.kind === "workflow" && wfDone.has(b.id) && /hba1c/i.test(outs[b.id]?.out?.actionLabel ?? "")) hba1cAdded = true;
    const hidden = b.anchor === "tb" && !tbOpen;
    if (s !== "loading" && b.tool === "controle" && s.actions?.includes("replace")) {
      flagged = true;
      // En « Fenêtre bloquante », c'est la fenêtre qui bloque : « Valider » l'ouvre. Ailleurs, le bouton se grise.
      if (isBlocking(b, s) && b.display !== "modal" && !hidden) blocked = true;
      if (b.display === "modal") modalAlert = true;
    }
    if (hidden) continue;
    const key = b.id;
    if (b.display === "inline" && b.anchor !== "tb") {
      inline[b.anchor].push(s === "loading" ? <LocusLoading key={key} /> : <LocusCard key={key} brick={b} out={s} onAction={(a) => act(b, s, a)} />);
    } else if (b.display === "inline" || b.display === "banner") {
      banners.push(
        <div key={key} className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-card px-3 py-2 font-sans text-[13px] text-card-foreground">
          <LocusTag />
          {s === "loading" ? <span className="text-muted-foreground">{t.out.loading}</span> : (
            <>
              <b className="font-semibold">{s.title}</b>
              <span className="min-w-[min(100%,260px)] flex-1 text-muted-foreground">{s.lines[0]}</span>
              {s.source && <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">{s.source}</span>}
              {s.actions?.map((a) => (
                <button key={a} type="button" onClick={() => act(b, s, a)} className={buttonClass({ variant: a === "replace" || a === "wfAction" ? "primary" : "default", size: "sm", className: "h-8 px-3 text-[13px]" })}>
                  {a === "wfAction" ? s.actionLabel : t.out[a]}
                </button>
              ))}
            </>
          )}
        </div>,
      );
    } else if (b.display === "panel") {
      panels.push(
        <div key={key} className="flex flex-col gap-2 rounded-lg border border-border bg-muted px-3.5 py-3 text-[13px] text-foreground">
          {s === "loading" ? <span className="text-muted-foreground">{t.out.loading}</span> : <LocusBody brick={b} out={s} variant="panel" onAction={(a) => act(b, s, a)} />}
        </div>,
      );
    } else if (b.display === "widget") widgets.push({ b, s });
    else if (b.display === "modal" && s !== "loading") modals.push({ b, out: s });
  }

  const panel = panels.length ? (
    <aside aria-label={t.out.panel} className="flex min-w-[240px] flex-[0_1_300px] flex-col gap-2.5 self-stretch rounded-xl border border-border bg-card p-3 font-sans text-card-foreground shadow-sm max-[760px]:flex-[1_1_100%]">
      <span><LocusTag /></span>
      {panels}
    </aside>
  ) : null;

  /* ---------- Assistant ---------- */

  const openWizard = (draft: Draft, editId: string | null = null) => { setChooser(false); setList(false); setWiz({ draft, step: 1, editId }); };
  const setDraft = (p: Partial<Draft>) => setWiz((w) => (w ? { ...w, draft: { ...w.draft, ...p } } : w));
  const pickAnchor = (a: AnchorId) => setDraft({ anchor: a, fields: defaultFields(a, wiz?.draft.kind === "workflow") });
  const submit = () => {
    if (!wiz || !wiz.draft.anchor || !wiz.draft.display) return;
    const id = wiz.editId ?? nextId(bricks);
    const nb: Brick = { ...wiz.draft, id, on: true, anchor: wiz.draft.anchor, display: wiz.draft.display };
    setBricks((bs) => (wiz.editId ? bs.map((x) => (x.id === id ? nb : x)) : [...bs, nb]));
    setDismissed((s) => { const n = new Set(s); n.delete(id); return n; });
    setWfDone((s) => { const n = new Set(s); n.delete(id); return n; });
    setWiz(null);
    setList(true);
    setWidgetMin(false);
    setOverrides((o) => { const n = { ...o }; delete n[id]; return n; });
    if (nb.display === "modal") setModal({ mode: "show" });
    if (nb.anchor === "tb") setTbOpen(true);
  };

  const zones = Object.fromEntries(ANCHOR_IDS.map((a) => {
    const sel = !!wiz && wiz.draft.anchor === a;
    const cand = !!wiz && wiz.step === 1 && !sel;
    const slot = sel
      ? <span className="rounded-md bg-primary px-2 py-[3px] font-sans text-xs font-medium text-primary-foreground">{t.wizard.anchorTag}</span>
      : cand ? <button type="button" onClick={() => pickAnchor(a)} className="min-h-[26px] rounded-md border border-dashed border-ring bg-background px-2.5 font-sans text-xs font-medium text-foreground hover:bg-accent">{t.wizard.inject}</button> : null;
    return [a, { mode: sel ? "sel" : cand ? "cand" : "idle", slot } satisfies ZoneProps];
  })) as Record<AnchorId, ZoneProps>;

  const validate = () => {
    if (blocked) return;
    if (modals.length) setModal({ mode: "validate" });
    else setValidated(true);
  };

  const modalOpen = !!modal && (modal.mode === "override" || modals.length > 0);
  const overrideMotif = Object.entries(overrides).find(([id]) => dismissed.has(id))?.[1];
  const tbBricks = active.filter((b) => b.anchor === "tb");

  return (
    <div ref={rootRef} className="relative [--bar-h:50px]">
      <Medicab
        zones={zones}
        inline={inline}
        banners={banners}
        panel={panel}
        toolbarLocus={{ show: tbBricks.length > 0, open: tbOpen, hint: t.out.toolbarHint, onClick: () => { setTbOpen((o) => !o); if (!tbOpen && tbBricks.some((b) => b.display === "modal")) setModal({ mode: "show" }); } }}
        replaced={replaced}
        flagged={flagged && !replaced}
        blocked={blocked}
        validated={validated}
        overrideMotif={overrideMotif}
        onValidate={validate}
        hba1cAdded={hba1cAdded}
        activeCount={active.length}
        banner={c.banner}
      />

      {/* Écran étroit : MédiCab reste lisible (colonnes empilées), mais on dit qu'il est pensé pour un ordinateur. */}
      {!narrowSeen && (
        <div role="status" className="absolute inset-x-2 top-2 z-[16] hidden items-start gap-2 rounded-lg border border-border bg-popover py-2 pl-3 pr-1.5 font-sans text-[13px] leading-[1.4] text-popover-foreground shadow-sm max-[640px]:flex">
          <span className="flex-1 pt-1">{t.out.narrow}</span>
          <button type="button" onClick={() => setNarrowSeen(true)} aria-label={t.out.close} className={buttonClass({ variant: "ghost", size: "icon", className: "size-8 shrink-0" })}><X aria-hidden="true" /></button>
        </div>
      )}

      {/* Widget Locus ancré */}
      {widgets.length > 0 && (
        <section aria-label={t.out.widget} className={cn(POP, "absolute bottom-[calc(var(--bar-h)+48px)] right-4 z-[15] max-h-[min(60vh,calc(100%-var(--bar-h)-120px))] w-[min(340px,calc(100%-32px))] overflow-auto text-sm")}>
          <div className="flex items-center gap-2 border-b border-border py-2 pl-3 pr-2">
            <span className="flex-1"><LocusTag /></span>
            <button type="button" onClick={() => setWidgetMin((m) => !m)} aria-label={widgetMin ? t.out.expand : t.out.minimize} aria-expanded={!widgetMin} className={buttonClass({ variant: "ghost", size: "icon", className: "size-8" })}>{widgetMin ? <Plus aria-hidden="true" /> : <Minus aria-hidden="true" />}</button>
          </div>
          {!widgetMin && (
            <div className="flex flex-col gap-2.5 p-3 text-[13px]">
              {widgets.map(({ b, s }) => (
                <div key={b.id} className="flex flex-col gap-1.5">
                  {s === "loading" ? <span className="text-muted-foreground">{t.out.loading}</span> : <LocusBody brick={b} out={{ ...s, question: false }} variant="widget" onAction={(a) => act(b, s, a)} />}
                </div>
              ))}
              <AskBox brick={widgets[0].b} />
            </div>
          )}
        </section>
      )}

      <StudioBar
        lang={lang}
        mode={mode}
        setMode={setMode}
        setLang={setLang}
        count={bricks.length}
        chooser={chooser}
        list={list}
        via={via}
        barRef={barRef}
        onAdd={() => { setList(false); setChooser((v) => !v); }}
        onList={() => { setChooser(false); setList((v) => !v); }}
      />

      {chooser && !wiz && (
        <section aria-label={t.chooser.label} className={cn(POP, "absolute bottom-[calc(var(--bar-h)+44px)] left-4 z-[22] flex w-[min(400px,calc(100%-32px))] flex-col gap-1.5 p-2")}>
          {([["tool", Wrench, t.chooser.tool, t.chooser.toolDesc], ["workflow", Workflow, t.chooser.workflow, t.chooser.workflowDesc]] as const).map(([k, Icon, title, desc]) => (
            <button key={k} type="button" onClick={() => openWizard(k === "tool" ? emptyDraft() : workflowDraft(WF_EXAMPLE[lang]))} className="flex min-h-14 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-foreground hover:bg-accent">
              <span className="grid size-8 shrink-0 place-items-center rounded-md border border-border bg-muted"><Icon size={16} aria-hidden="true" /></span>
              <span className="grid gap-0.5"><span className="text-sm font-medium">{title}</span><span className="text-[13px] text-muted-foreground">{desc}</span></span>
            </button>
          ))}
        </section>
      )}

      {list && !wiz && (
        <MyBricks
          bricks={bricks}
          onClose={() => setList(false)}
          onToggle={(id) => { setBricks((bs) => bs.map((b) => (b.id === id ? { ...b, on: !b.on } : b))); setWidgetMin(false); }}
          onEdit={(b) => openWizard({ ...b }, b.id)}
          onRemove={(id) => setBricks((bs) => bs.filter((b) => b.id !== id))}
          onReset={() => { setBricks(EXAMPLES); setDismissed(new Set()); setWfDone(new Set()); setReplaced(false); setValidated(false); setOverrides({}); }}
        />
      )}

      {wiz && (
        <Wizard
          draft={wiz.draft}
          setDraft={setDraft}
          step={wiz.step}
          setStep={(n) => setWiz((w) => (w ? { ...w, step: n } : w))}
          editing={!!wiz.editId}
          onClose={() => setWiz(null)}
          onSubmit={submit}
          pickAnchor={pickAnchor}
        />
      )}

      {modalOpen && modal && (
        <LocusDialog
          mode={modal.mode}
          items={modal.mode === "override" ? active.filter((b) => modal.ids?.includes(b.id)).flatMap((b) => { const o = outs[b.id]?.out; return o ? [{ b, out: o }] : []; }) : modals}
          alert={modalAlert}
          onAction={act}
          onClose={() => setModal(null)}
          onValidate={() => { setModal(null); setValidated(true); }}
          onOverride={(motif) => {
            const ids = modal.mode === "override" ? modal.ids ?? [] : modals.filter(({ b, out }) => b.tool === "controle" && out.actions?.includes("replace")).map(({ b }) => b.id);
            dismiss(ids, motif);
            setModal(null);
            if (modal.mode === "validate") setValidated(true);
          }}
        />
      )}

      {letter && <LetterDialog lines={letter} onClose={() => setLetter(null)} />}
    </div>
  );
}

/**
 * La fenêtre Locus avant validation. Fermer (croix, Échap, « Modifier
 * l'ordonnance ») ne valide jamais : il faut « Valider l'ordonnance » quand
 * rien n'est signalé, ou « Passer outre, avec motif » quand une alerte l'est.
 */
function LocusDialog({ mode, items, alert, onAction, onClose, onValidate, onOverride }: {
  mode: "show" | "validate" | "override";
  items: { b: Brick; out: LocusOut }[];
  alert: boolean;
  onAction: (b: Brick, out: LocusOut, a: CardAction) => void;
  onClose: () => void;
  onValidate: () => void;
  onOverride: (motif: string) => void;
}) {
  const lang = useLang();
  const t = lgc[lang].out;
  const [motif, setMotif] = React.useState<string | null>(mode === "override" ? "" : null);
  const ref = useDialogFocus<HTMLElement>();
  const asking = motif !== null;
  const ok = (motif ?? "").trim().length >= 3;
  const label = mode === "override" ? t.overrideTitle : `Locus · ${t.before}`;
  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-black/50 p-4">
      <section ref={ref} role="dialog" aria-modal="true" aria-label={label} className={cn(POP, "flex max-h-[90dvh] w-[min(480px,100%)] flex-col gap-3 overflow-auto p-5 text-sm")}>
        <div className="flex items-center gap-2">
          <LocusTag /><span className="flex-1 text-[13px] text-muted-foreground">{mode === "override" ? t.overrideTitle : t.before}</span>
          <button type="button" onClick={onClose} aria-label={mode === "show" ? t.close : t.editOrder} className={buttonClass({ variant: "ghost", size: "icon", className: "size-8" })}><X aria-hidden="true" /></button>
        </div>
        {items.map(({ b, out }) => (
          <div key={b.id} className="flex flex-col gap-2">
            <span className="text-base font-semibold tracking-[-.01em]">{out.title}</span>
            {/* Avant validation, « Ignorer » cède la place à « Passer outre, avec motif ». */}
            <LocusBody brick={b} out={mode === "show" ? out : { ...out, actions: asking ? [] : out.actions?.filter((a) => a !== "ignore") }} variant="modal" onAction={(a) => onAction(b, out, a)} />
          </div>
        ))}
        {asking ? (
          <form className="grid gap-2 border-t border-border pt-3" onSubmit={(e) => { e.preventDefault(); if (ok) onOverride((motif ?? "").trim()); }}>
            <label htmlFor="lgc-motif" className="text-[13px] font-medium">{t.motif}</label>
            <textarea id="lgc-motif" data-autofocus autoFocus rows={2} maxLength={200} required value={motif ?? ""} onChange={(e) => setMotif(e.target.value)} placeholder={t.motifPh} className="resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs placeholder:text-muted-foreground" />
            <div className="flex flex-wrap justify-end gap-2">
              <Button onClick={mode === "override" ? onClose : () => setMotif(null)}>{mode === "override" ? t.close : lgc[lang].wizard.back}</Button>
              <Button type="submit" variant="primary" disabled={!ok}>{mode === "validate" ? t.confirmOverride : t.confirmIgnore}</Button>
            </div>
          </form>
        ) : mode === "validate" ? (
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={onClose} data-autofocus>{t.editOrder}</Button>
            {alert ? <Button onClick={() => setMotif("")}>{t.override}</Button> : <Button variant="primary" onClick={onValidate}>{t.validateOrder}</Button>}
          </div>
        ) : (
          <Button onClick={onClose} className="self-end">{t.close}</Button>
        )}
      </section>
    </div>
  );
}

function LetterDialog({ lines, onClose }: { lines: string[]; onClose: () => void }) {
  const lang = useLang();
  const t = lgc[lang].out;
  const [copied, setCopied] = React.useState(false);
  const ref = useDialogFocus<HTMLElement>();
  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-black/50 p-4">
      <section ref={ref} role="dialog" aria-modal="true" aria-label={t.letter} className={cn(POP, "flex max-h-[90dvh] w-[min(560px,100%)] flex-col gap-3 overflow-auto p-5 text-sm")}>
        <div className="flex items-center gap-2"><LocusTag /><span className="flex-1 font-semibold">{t.letter}</span>
          <button type="button" onClick={onClose} aria-label={t.close} className={buttonClass({ variant: "ghost", size: "icon", className: "size-8" })}><X aria-hidden="true" /></button>
        </div>
        <div className="grid gap-2 rounded-lg border border-border bg-muted p-4 leading-[1.5]">{lines.map((l, i) => <p key={i} className="m-0">{l}</p>)}</div>
        <div className="flex justify-end gap-2">
          <Button onClick={async () => { try { await navigator.clipboard.writeText(lines.join("\n\n")); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} }}>{copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{copied ? t.copied : t.copy}</Button>
          <Button variant="primary" onClick={onClose}>{t.close}</Button>
        </div>
      </section>
    </div>
  );
}

function StudioBar({ lang, mode, setMode, setLang, count, chooser, list, via, barRef, onAdd, onList }: {
  lang: Lang; mode: Mode; setMode: (m: Mode) => void; setLang: (l: Lang) => void; count: number; chooser: boolean; list: boolean; via: Via | null; barRef: React.RefObject<HTMLDivElement | null>; onAdd: () => void; onList: () => void;
}) {
  const t = lgc[lang];
  const c = common[lang];
  return (
    <div ref={barRef} className={cn(POP, "absolute bottom-9 left-4 z-20 flex max-w-[calc(100%-32px)] flex-wrap items-center gap-1.5 p-1.5 text-sm")}>
      <Link href={route(lang, "home")} aria-label={t.bar.home} className="flex h-9 items-center gap-2 rounded-md pl-2 pr-2.5 text-foreground hover:bg-accent">
        <LocusMark size={20} />
        <span className="text-[17px] tracking-[-.01em] max-[640px]:hidden">{c.brand.wordmarkA}<span className="text-muted-foreground">{c.brand.wordmarkB}</span></span>
      </Link>
      <span aria-hidden="true" className="h-5 w-px bg-border max-[640px]:hidden" />
      <span className="px-2 font-medium max-[1100px]:hidden">{c.tools.integration}</span>
      <Button variant="primary" onClick={onAdd} aria-expanded={chooser}><Plus aria-hidden="true" />{t.bar.addBrick}</Button>
      <Button onClick={onList} aria-pressed={list} className={list ? "bg-accent" : undefined}><Layers aria-hidden="true" />{t.bar.myBricks}<span className="font-mono text-xs text-muted-foreground">{count}</span></Button>
      <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-border max-[640px]:hidden" />
      <Segmented<Mode> label={t.bar.theme} value={mode} onChange={setMode} options={[{ value: "dark", label: <Moon aria-hidden="true" />, aria: t.bar.dark }, { value: "light", label: <Sun aria-hidden="true" />, aria: t.bar.light }]} />
      <Segmented<Lang> label={t.bar.language} value={lang} onChange={setLang} options={LANGS.map((l) => ({ value: l, label: l.toUpperCase() }))} />
      {via && <span className="px-1.5 font-mono text-[11px] text-muted-foreground max-[1100px]:hidden">{via === "replay" ? t.bar.replay : t.bar.live}</span>}
      <ButtonLink href={route(lang, "acces")}>{t.bar.access}</ButtonLink>
    </div>
  );
}
