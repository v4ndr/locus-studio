"use client";
import * as React from "react";
import { Check, Code, Copy, Pencil, Trash2, X } from "lucide-react";
import { lgc } from "@/i18n";
import { useLang } from "@/i18n/lang";
import { Button, buttonClass } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Segmented } from "@/components/ui/segmented";
import { FIELDS } from "@/data/integration-lgc/fournier";
import { HOOKS, TOOLS } from "@/data/integration-lgc/blocks";
import { coreCall, type Brick } from "./model";

/** « Mes briques » : outil, déclencheur, affichage, interrupteur, Modifier, flux et appel API. */
export function MyBricks({ bricks, onToggle, onEdit, onRemove, onReset, onClose }: {
  bricks: Brick[]; onToggle: (id: string) => void; onEdit: (b: Brick) => void; onRemove: (id: string) => void; onReset: () => void; onClose: () => void;
}) {
  const lang = useLang();
  const t = lgc[lang];
  const [open, setOpen] = React.useState<string | null>(null);
  return (
    <section aria-label={t.bar.myBricks} className="absolute bottom-[calc(var(--bar-h)+44px)] left-4 z-[21] flex max-h-[calc(100%-var(--bar-h)-90px)] w-[min(480px,calc(100%-32px))] flex-col gap-3 overflow-auto rounded-xl border border-border bg-popover p-4 font-sans text-sm text-popover-foreground shadow-[0_16px_40px_rgba(0,0,0,.45)]">
      <div className="flex items-center gap-2">
        <h2 className="m-0 flex-1 text-[15px] font-semibold tracking-[-.01em]">{t.bar.myBricks}</h2>
        <button type="button" onClick={onClose} aria-label={t.out.close} className={buttonClass({ variant: "ghost", size: "icon", className: "size-8" })}><X aria-hidden="true" /></button>
      </div>
      {bricks.length === 0 && <p className="m-0 text-muted-foreground">{t.list.empty}</p>}
      {bricks.map((b) => {
        const name = t.tools[b.tool].name;
        const chain = `${t.anchors[b.anchor]} → ${t.displays[b.display]}`;
        return (
          <div key={b.id} className="flex flex-col gap-2.5 rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="grid min-w-0 flex-1 gap-[3px]">
                <span className="font-semibold tracking-[-.01em]">{name}</span>
                <span className="text-[13px] text-muted-foreground">{chain}</span>
                <span className="font-mono text-xs text-muted-foreground">{t.list.data(b.fields.length)}</span>
              </span>
              <Switch checked={b.on} onCheckedChange={() => onToggle(b.id)} aria-label={t.list.toggle} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" onClick={() => onEdit(b)}><Pencil aria-hidden="true" />{t.list.edit}</Button>
              <Button size="sm" onClick={() => setOpen(open === b.id ? null : b.id)} aria-expanded={open === b.id} className={open === b.id ? "bg-accent" : undefined}><Code aria-hidden="true" />{t.list.details}</Button>
              <span className="flex-1" />
              <Button size="sm" variant="ghost" onClick={() => onRemove(b.id)} aria-label={`${t.list.remove} · ${name}`} className="text-muted-foreground"><Trash2 aria-hidden="true" /></Button>
            </div>
            {open === b.id && <Details b={b} />}
          </div>
        );
      })}
      <button type="button" onClick={onReset} className="self-start text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">{t.list.reset}</button>
    </section>
  );
}

function Details({ b }: { b: Brick }) {
  const lang = useLang();
  const t = lgc[lang];
  const [tab, setTab] = React.useState<"flow" | "api">("api");
  const [copied, setCopied] = React.useState(false);
  const code = coreCall(b, t.list.coreQuestion);
  const copy = async () => {
    if (!code) return;
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };
  const row = (k: string, v: React.ReactNode) => (
    <div className="grid gap-0.5">
      <span className="text-xs text-muted-foreground">{k}</span>
      <span className="text-[13px]">{v}</span>
    </div>
  );
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted px-3.5 py-3">
      <div className="flex items-center gap-2">
        <Segmented<"flow" | "api"> label={t.list.details} value={tab} onChange={setTab} options={[{ value: "flow", label: t.list.flow }, { value: "api", label: t.list.api }]} />
        <span className="flex-1" />
        {tab === "api" && code && <Button size="sm" onClick={copy} className="h-7 text-xs">{copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{copied ? t.out.copied : t.out.copy}</Button>}
      </div>
      {tab === "api" ? (
        <>
          {code && <span className="font-mono text-xs font-medium">{t.list.coreTitle}</span>}
          <span className="text-xs text-muted-foreground">{code ? t.list.coreNote : t.list.coreNone}</span>
          {code && <pre className="m-0 max-h-72 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-[1.55] text-foreground">{code}</pre>}
          <span className="mt-1 border-t border-border pt-2.5 text-xs text-muted-foreground">{t.list.apiNote}</span>
        </>
      ) : (
        <div className="grid gap-2.5 py-1">
          {row(t.list.trigger, <>{t.anchors[b.anchor]} <span className="font-mono text-xs text-muted-foreground">{HOOKS[b.anchor]}</span></>)}
          {row(t.list.sent, b.fields.map((k) => `${t.fields[k]} : ${FIELDS[k].value}`).join(" · ") || "—")}
          {row(t.tools[b.tool].name, TOOLS[b.tool].settings.map((s) => { const v = b.settings[s.k]; return s.kind === "toggle" ? `${t.settings[s.k]} ${v ? t.wizard.on : t.wizard.off}` : `${t.settings[s.k]} ${t.options[String(v)]}`; }).join(" · ") || "—")}
          {row(t.list.display, t.displays[b.display])}
        </div>
      )}
    </div>
  );
}

