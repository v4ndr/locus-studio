"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Layers, Minus, Plus, Moon, Sun, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { common, lgc, LANG_COOKIE, LANGS, route, type Lang } from "@/i18n";
import { useLang } from "@/i18n/lang";
import { Button, buttonClass } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { LocusMark } from "@/components/shell/locus-mark";
import { useTheme, type Mode } from "@/components/shell/theme";
import { ANCHOR_IDS, defaultFields, type AnchorId } from "@/data/integration-lgc/fournier";
import { TOOLS, defaultSettings, type LocusOut, type ToolId } from "@/data/integration-lgc/blocks";
import { Medicab, type ZoneProps } from "./medicab";
import { AskBox, LocusBody, LocusCard, LocusFailed, LocusLoading, LocusTag, RetryButton, Verdict, surface, type CardAction } from "./locus-card";
import { Wizard } from "./wizard";
import { useDialogFocus } from "./use-dialog";
import { MyBricks } from "./my-bricks";
import { blockOutput, errorText } from "./api";
import { EXAMPLES, emptyDraft, nextId, useBricks, withRequired, type Brick, type Draft } from "./model";

/**
 * « Intégration LGC » : MédiCab 7 en plein écran, et le chrome Studio réduit
 * à une barre flottante. On y pose des briques Locus (trois outils) sur
 * trois ancrages façon CDS Hooks, plus un bouton de barre d'outils.
 * Chaque brique active est calculée par core quand elle s'affiche ou
 * change ; un échec reste un échec, affiché avec « Réessayer ».
 */

/** Une brique en échec : le message à afficher, dans la langue de l'UI. */
interface Failed { failed: string }
type Shown = LocusOut | "loading" | Failed;
interface OutState { key: string; loading: boolean; out: LocusOut | null; error?: string }

const isFailed = (s: Shown | null): s is Failed => !!s && typeof s === "object" && "failed" in s;

const brickKey = (b: Brick) => JSON.stringify([b.tool, b.settings, b.fields, b.anchor]);
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
  const [list, setList] = React.useState(false);
  const [wiz, setWiz] = React.useState<{ draft: Draft; step: number; editId: string | null } | null>(null);

  // État de MédiCab
  const [validated, setValidated] = React.useState(false);
  const [dismissed, setDismissed] = React.useState<Set<string>>(new Set());
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
  // Sur téléphone, le widget couvrirait tout MédiCab : il arrive replié, son en-tête Locus reste visible.
  React.useEffect(() => { if (window.matchMedia("(max-width: 640px)").matches) setWidgetMin(true); }, []);
  const [tbOpen, setTbOpen] = React.useState(false);
  const [narrowSeen, setNarrowSeen] = React.useState(false);

  // Sorties des briques actives
  const [outs, setOuts] = React.useState<Record<string, OutState>>({});
  const outsRef = React.useRef(outs);
  /** Incrémenté par « Réessayer » : relance le calcul des briques sans sortie. */
  const [attempt, setAttempt] = React.useState(0);

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
      blockOutput(b)
        .then((r) => { if (outsRef.current[b.id]?.key !== key) return; put({ key, loading: false, out: r.output }); })
        .catch((e) => { if (outsRef.current[b.id]?.key !== key) return; put({ key, loading: false, out: null, error: errorText(e, t.out) }); });
    }
  }, [bricks, attempt, t.out]);

  /** Oublie la sortie en échec d'une brique : l'effet ci-dessus la recalcule. */
  const retry = (id: string) => {
    const { [id]: _, ...rest } = outsRef.current;
    outsRef.current = rest;
    setOuts(rest);
    setAttempt((n) => n + 1);
  };

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setList(false); setModal(null);
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
    if (o.error) return { failed: o.error };
    return o.out;
  };

  /**
   * Une alerte bloquante : un contrôle d'ordonnance réglé sur « Bloquant »
   * dont la réponse signale un problème, tant qu'elle n'est pas écartée avec
   * un motif. Une réponse rassurante ne bloque rien.
   */
  const isBlocking = (b: Brick, out: Shown | null) => b.tool === "controle" && b.settings.niveau === "bloquant" && !!out && out !== "loading" && !isFailed(out) && !!out.alert;

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
  };

  const inline = Object.fromEntries(ANCHOR_IDS.map((a) => [a, [] as React.ReactNode[]])) as Record<AnchorId, React.ReactNode[]>;
  const banners: React.ReactNode[] = [];
  const panels: React.ReactNode[] = [];
  const widgets: { b: Brick; s: Shown }[] = [];
  const failed = (b: Brick, msg: string) => <LocusFailed key={b.id} message={msg} onRetry={() => retry(b.id)} />;
  const modals: { b: Brick; out: LocusOut }[] = [];
  let blocked = false;
  let modalAlert = false;
  let flagged = false;
  const active = bricks.filter((b) => b.on);

  for (const b of active) {
    const s = shown(b);
    if (!s) continue;
    // La ligne d'ordonnance se signale dès qu'un contrôle y trouve un problème, bloquant ou non.
    if (b.tool === "controle" && s !== "loading" && !isFailed(s) && s.alert) flagged = true;
    const hidden = b.anchor === "tb" && !tbOpen;
    if (isBlocking(b, s)) {
      // En « Fenêtre bloquante », c'est la fenêtre qui bloque : « Valider » l'ouvre. Ailleurs, le bouton se grise.
      if (b.display !== "modal" && !hidden) blocked = true;
      if (b.display === "modal") modalAlert = true;
    }
    if (hidden) continue;
    const key = b.id;
    if (b.display === "inline" && b.anchor !== "tb") {
      inline[b.anchor].push(s === "loading" ? <LocusLoading key={key} /> : isFailed(s) ? failed(b, s.failed) : <LocusCard key={key} brick={b} out={s} onAction={(a) => act(b, s, a)} />);
    } else if (b.display === "inline" || b.display === "banner" || (b.display === "modal" && isFailed(s))) {
      // Une fenêtre bloquante en échec ne bloque rien : son erreur passe en bandeau.
      banners.push(
        <div key={key} className="shrink-0 bg-[#e9edf2] px-2 pt-2">
          <div key={s === "loading" ? "l" : isFailed(s) ? "e" : "o"} role={isFailed(s) ? "alert" : undefined} className={cn(surface(), "flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 text-sm")}>
            <LocusTag state={s === "loading" ? "computing" : isFailed(s) ? "error" : "done"} />
            {s === "loading" ? <span className="text-muted-foreground">{t.out.loading}</span> : isFailed(s) ? (
              <>
                <span className="min-w-[min(100%,260px)] flex-1">{s.failed}</span>
                <RetryButton onRetry={() => retry(b.id)} />
              </>
            ) : (
              <>
                <b className="text-[15px] font-semibold tracking-[-.01em]">{s.title}</b>
                {s.alert !== undefined && <Verdict alert={s.alert} />}
                <span className="min-w-[min(100%,260px)] flex-1">{s.lines[0]}</span>
                {s.sources?.[0] && <span className="rounded-full border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">{s.sources[0]}</span>}
                {s.actions?.map((a) => (
                  <button key={a} type="button" onClick={() => act(b, s, a)} className={buttonClass({ size: "sm", className: "h-8 px-3 text-[13px]" })}>{t.out[a]}</button>
                ))}
              </>
            )}
          </div>
        </div>,
      );
    } else if (b.display === "panel") {
      panels.push(
        <div key={key} className="flex flex-col gap-2.5 text-sm">
          <span className="flex"><LocusTag state={s === "loading" ? "computing" : isFailed(s) ? "error" : "done"} /></span>
          {s === "loading" ? <span className="text-muted-foreground">{t.out.loading}</span> : isFailed(s) ? (
            <>
              <span role="alert">{s.failed}</span>
              <span className="flex"><RetryButton onRetry={() => retry(b.id)} /></span>
            </>
          ) : <LocusBody brick={b} out={s} variant="panel" onAction={(a) => act(b, s, a)} />}
        </div>,
      );
    } else if (b.display === "widget") widgets.push({ b, s });
    else if (b.display === "modal" && s !== "loading" && !isFailed(s)) modals.push({ b, out: s });
  }

  const panel = panels.length ? (
    <aside aria-label={t.out.panel} className={cn(surface(), "flex min-w-0 flex-[0_0_320px] flex-col gap-4 self-stretch p-4 max-[760px]:flex-[1_1_100%] [&>*+*]:border-t [&>*+*]:border-border [&>*+*]:pt-4")}>
      {panels}
    </aside>
  ) : null;

  /* ---------- Assistant ---------- */

  const openWizard = (draft: Draft, editId: string | null = null) => { setList(false); setWiz({ draft, step: 1, editId }); };
  const setDraft = (p: Partial<Draft>) => setWiz((w) => (w ? { ...w, draft: { ...w.draft, ...p } } : w));
  const pickAnchor = (a: AnchorId) => setWiz((w) => (w?.draft.tool ? { ...w, draft: { ...w.draft, anchor: a, fields: withRequired(w.draft.tool, a, defaultFields(a)) } } : w));
  /** Changer d'outil garde l'ancrage et l'affichage s'ils lui conviennent ; un outil à un seul ancrage le prend d'office. */
  const pickTool = (tool: ToolId) => setWiz((w) => {
    if (!w) return w;
    const d = w.draft;
    const def = TOOLS[tool];
    const anchor = d.anchor && def.anchors.includes(d.anchor) ? d.anchor : def.anchors.length === 1 ? def.anchors[0] : null;
    return { ...w, draft: { tool, anchor, fields: anchor ? withRequired(tool, anchor, anchor === d.anchor && d.tool ? d.fields : defaultFields(anchor)) : [], settings: d.tool === tool ? d.settings : defaultSettings(tool), display: d.display && def.displays.includes(d.display) ? d.display : null } };
  });
  const submit = () => {
    if (!wiz || !wiz.draft.tool || !wiz.draft.anchor || !wiz.draft.display) return;
    const id = wiz.editId ?? nextId(bricks);
    const nb: Brick = { ...wiz.draft, id, on: true, tool: wiz.draft.tool, anchor: wiz.draft.anchor, display: wiz.draft.display };
    setBricks((bs) => (wiz.editId ? bs.map((x) => (x.id === id ? nb : x)) : [...bs, nb]));
    setDismissed((s) => { const n = new Set(s); n.delete(id); return n; });
    setWiz(null);
    setList(true);
    setWidgetMin(false);
    setOverrides((o) => { const n = { ...o }; delete n[id]; return n; });
    if (nb.display === "modal") setModal({ mode: "show" });
    if (nb.anchor === "tb") setTbOpen(true);
  };

  const zones = Object.fromEntries(ANCHOR_IDS.map((a) => {
    const sel = !!wiz && wiz.draft.anchor === a;
    // Pendant le choix de l'ancrage, seules les zones où l'outil a un sens proposent « Injecter ici ».
    const cand = !!wiz && wiz.step === 2 && !sel && !!wiz.draft.tool && TOOLS[wiz.draft.tool].anchors.includes(a);
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
  /** L'état du calcul des briques actives, pour la barre : en cours, en échec, ou tout calculé en direct. */
  const states = active.map((b) => outs[b.id]).map((o, i) => (!o || o.loading || o.key !== brickKey(active[i]) ? "computing" : o.error ? "error" : "done"));
  const status: BarStatus = !states.length ? null : states.includes("computing") ? { kind: "computing" } : states.includes("error") ? { kind: "error", n: states.filter((x) => x === "error").length } : { kind: "done" };

  return (
    // Widget ouvert sur grand écran : MédiCab lui laisse sa colonne, pour qu'il ne cache rien (`--widget-pad`, lu par `.body`).
    <div ref={rootRef} className={cn("relative [--bar-h:50px]", widgets.length > 0 && !widgetMin && "min-[1180px]:[--widget-pad:412px]")}>
      <Medicab
        zones={zones}
        inline={inline}
        banners={banners}
        panel={panel}
        toolbarLocus={{ show: tbBricks.length > 0, open: tbOpen, hint: t.out.toolbarHint, onClick: () => { setTbOpen((o) => !o); if (!tbOpen && tbBricks.some((b) => b.display === "modal")) setModal({ mode: "show" }); } }}
        flagged={flagged}
        blocked={blocked}
        validated={validated}
        overrideMotif={overrideMotif}
        onValidate={validate}
        activeCount={active.length}
        widgetOpen={widgets.length > 0 && !widgetMin}
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
        <section aria-label={t.out.widget} className={cn(surface(), "absolute bottom-[calc(var(--bar-h)+48px)] right-4 z-[15] max-h-[calc(100%-var(--bar-h)-150px)] w-[min(388px,calc(100%-32px))] overflow-auto text-sm")}>
          <div className="sticky top-0 z-[1] flex items-center gap-2 border-b border-border bg-card py-2 pl-3.5 pr-2">
            {/* Une seule étiquette pour le widget : l'état le moins avancé de ses briques. */}
            <span className="flex-1"><LocusTag state={widgets.some(({ s }) => s === "loading") ? "computing" : widgets.some(({ s }) => isFailed(s)) ? "error" : "done"} /></span>
            <button type="button" onClick={() => setWidgetMin((m) => !m)} aria-label={widgetMin ? t.out.expand : t.out.minimize} aria-expanded={!widgetMin} className={buttonClass({ variant: "ghost", size: "icon", className: "size-8" })}>{widgetMin ? <Plus aria-hidden="true" /> : <Minus aria-hidden="true" />}</button>
          </div>
          {!widgetMin && (
            <div className="flex flex-col gap-3.5 p-4">
              {widgets.map(({ b, s }) => (
                <div key={b.id} className="flex flex-col gap-2">
                  {s === "loading" ? <span className="text-muted-foreground">{t.out.loading}</span> : isFailed(s) ? (
                    <span className="flex flex-wrap items-center gap-2"><span role="alert" className="flex-1">{s.failed}</span><RetryButton onRetry={() => retry(b.id)} /></span>
                  ) : <LocusBody brick={b} out={{ ...s, question: false }} variant="widget" onAction={(a) => act(b, s, a)} />}
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
        list={list}
        status={status}
        barRef={barRef}
        onAdd={() => openWizard(emptyDraft())}
        onList={() => setList((v) => !v)}
      />

      {list && !wiz && (
        <MyBricks
          bricks={bricks}
          onClose={() => setList(false)}
          onToggle={(id) => { setBricks((bs) => bs.map((b) => (b.id === id ? { ...b, on: !b.on } : b))); setWidgetMin(false); }}
          onEdit={(b) => openWizard({ ...b }, b.id)}
          onRemove={(id) => setBricks((bs) => bs.filter((b) => b.id !== id))}
          onReset={() => { setBricks(EXAMPLES); setDismissed(new Set()); setValidated(false); setOverrides({}); }}
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
          pickTool={pickTool}
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
            const ids = modal.mode === "override" ? modal.ids ?? [] : modals.filter(({ b, out }) => isBlocking(b, out)).map(({ b }) => b.id);
            dismiss(ids, motif);
            setModal(null);
            if (modal.mode === "validate") setValidated(true);
          }}
        />
      )}

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
      <section ref={ref} role="dialog" aria-modal="true" aria-label={label} className={cn(surface(), "flex max-h-[90dvh] w-[min(520px,100%)] flex-col gap-3.5 overflow-auto p-5 text-sm")}>
        <div className="flex items-center gap-2">
          <LocusTag /><span className="flex-1 text-[13px] text-muted-foreground">{mode === "override" ? t.overrideTitle : t.before}</span>
          <button type="button" onClick={onClose} aria-label={mode === "show" ? t.close : t.editOrder} className={buttonClass({ variant: "ghost", size: "icon", className: "size-8" })}><X aria-hidden="true" /></button>
        </div>
        {items.map(({ b, out }) => (
          <div key={b.id} className="flex flex-col gap-2">
            <span className="flex flex-wrap items-center gap-2"><span className="text-base font-semibold tracking-[-.01em]">{out.title}</span>{out.alert !== undefined && <Verdict alert={out.alert} />}</span>
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

type BarStatus = { kind: "computing" } | { kind: "error"; n: number } | { kind: "done" } | null;

function StudioBar({ lang, mode, setMode, setLang, count, list, status, barRef, onAdd, onList }: {
  lang: Lang; mode: Mode; setMode: (m: Mode) => void; setLang: (l: Lang) => void; count: number; list: boolean; status: BarStatus; barRef: React.RefObject<HTMLDivElement | null>; onAdd: () => void; onList: () => void;
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
      <Button variant="primary" onClick={onAdd}><Plus aria-hidden="true" />{t.bar.addBrick}</Button>
      <Button onClick={onList} aria-pressed={list} className={list ? "bg-accent" : undefined}><Layers aria-hidden="true" />{t.bar.myBricks}<span className="font-mono text-xs text-muted-foreground">{count}</span></Button>
      <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-border max-[640px]:hidden" />
      <Segmented<Mode> label={t.bar.theme} value={mode} onChange={setMode} options={[{ value: "dark", label: <Moon aria-hidden="true" />, aria: t.bar.dark }, { value: "light", label: <Sun aria-hidden="true" />, aria: t.bar.light }]} />
      <Segmented<Lang> label={t.bar.language} value={lang} onChange={setLang} options={LANGS.map((l) => ({ value: l, label: l.toUpperCase() }))} />
      {status && (
        <span role="status" className="flex items-center gap-1.5 px-1.5 text-xs text-muted-foreground max-[1100px]:hidden">
          <i aria-hidden="true" className={cn("block size-1.5 rounded-full", status.kind === "error" ? "bg-muted-foreground" : "bg-brand", status.kind === "computing" && "animate-pulse")} />
          {status.kind === "computing" ? t.bar.computing : status.kind === "error" ? t.bar.failed(status.n) : t.bar.live}
        </span>
      )}
    </div>
  );
}
