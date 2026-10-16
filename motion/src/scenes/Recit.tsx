import { AbsoluteFill, interpolate } from "remotion";
import type { Story } from "../story";
import { totalClics, totalFrappes } from "../avant";
import { CLICS_APRES } from "./Apres";
import { C, FONT } from "../theme";
import { clamp, pop, ramp, timeline, typed } from "../timeline";
import { Avatar, Check, K, Mark, Wordmark } from "../ui/kit";
import { Scene } from "../ui/Scene";

/* Les scènes de texte : la rencontre, le plan, la comparaison, le message. */

export const Hook: React.FC<{ f: number; s: Story }> = ({ f, s }) => {
  const { from, to } = timeline(s).hook;
  const carte = pop(f, from + 14);
  const debutCitation = from + 40;
  const texte = typed(s.citation, f, debutCitation, 46);
  const tape = texte.length < s.citation.length;
  return (
    <Scene f={f} from={from} to={to} fadeIn={1}>
      <AbsoluteFill style={{ padding: "0 96px", justifyContent: "center", gap: 56 }}>
        <K size={22} style={{ opacity: ramp(f, from, from + 10) }}>{s.quand}</K>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 22,
            opacity: carte,
            transform: `translateY(${(1 - carte) * 30}px)`,
          }}
        >
          <Avatar initials={s.patient.initiales} size={84} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-.02em" }}>{s.patient.nom}</span>
            <span style={{ fontSize: 26, color: C.muted2 }}>{s.patient.meta} · {s.patient.contexte}</span>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 58, lineHeight: 1.22, letterSpacing: "-.025em", fontWeight: 500, color: C.ink, minHeight: 300 }}>
          «&nbsp;{texte.replace(/ ([?!:;])/g, "\u00A0$1")}
          {tape ? <span style={{ display: "inline-block", width: 4, height: 54, background: C.accent, verticalAlign: -8, marginLeft: 4 }} /> : "\u00A0»"}
        </p>
      </AbsoluteFill>
    </Scene>
  );
};

export const Plan: React.FC<{ f: number; s: Story }> = ({ f, s }) => {
  const { from, to } = timeline(s).plan;
  return (
    <Scene f={f} from={from} to={to}>
      <AbsoluteFill style={{ padding: "0 96px", justifyContent: "center", gap: 40 }}>
        <K size={22}>{s.planTitre ?? "La décision du médecin"}</K>
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          {s.plan.map((p, i) => {
            const a = pop(f, from + 14 + i * 16);
            return (
              <div key={p} style={{ display: "flex", alignItems: "center", gap: 24, opacity: a, transform: `translateX(${(1 - a) * -40}px)` }}>
                <span style={{ display: "flex", width: 52, height: 52, flexShrink: 0, alignItems: "center", justifyContent: "center", borderRadius: 999, background: C.accentSoft, color: C.accent }}>
                  <Check size={28} w={2.6} />
                </span>
                <span style={{ fontSize: 42, lineHeight: 1.2, fontWeight: 500, letterSpacing: "-.02em" }}>{p}</span>
              </div>
            );
          })}
        </div>
        <p style={{ margin: "24px 0 0", fontSize: 34, lineHeight: 1.35, color: C.muted2, opacity: ramp(f, from + 70, from + 84) }}>
          {s.constat[0]}
          <br />
          <span style={{ color: C.ink }}>{s.constat[1]}</span>
        </p>
      </AbsoluteFill>
    </Scene>
  );
};

/** La transition : le bilan du logiciel, puis le compteur se rembobine — on rejoue la même consultation. */
export const Transition: React.FC<{ f: number; s: Story }> = ({ f, s }) => {
  const { from, to } = timeline(s).transition;
  const a = pop(f, from + 2);
  const retour = ramp(f, from + 30, from + 62);
  const clics = Math.round(totalClics(s) * (1 - retour));
  const frappes = Math.round(totalFrappes(s) * (1 - retour));
  const texte = ramp(f, from + 44, from + 58);
  const rembobine = retour > 0 && retour < 1;
  return (
    <Scene f={f} from={from} to={to}>
      <AbsoluteFill style={{ padding: "0 96px", justifyContent: "center", gap: 48 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, opacity: a, transform: `scale(${0.96 + 0.04 * a})`, transformOrigin: "left center" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
            <span style={{ fontFamily: FONT.mono, fontSize: 200, fontWeight: 500, lineHeight: 1, letterSpacing: "-.04em", color: retour >= 1 ? C.muted3 : C.recText }}>{clics}</span>
            <span style={{ fontSize: 56, color: C.muted2 }}>clics</span>
            <span style={{ marginLeft: "auto", fontFamily: FONT.mono, fontSize: 44, color: C.muted2, opacity: rembobine ? 1 : 0 }}>◀◀</span>
          </div>
          <span style={{ fontFamily: FONT.mono, fontSize: 40, color: C.muted2 }}>{frappes} frappes</span>
        </div>
        <p style={{ margin: 0, fontSize: 64, lineHeight: 1.15, letterSpacing: "-.03em", fontWeight: 600, opacity: texte, transform: `translateY(${(1 - texte) * 20}px)` }}>{s.transition}</p>
      </AbsoluteFill>
    </Scene>
  );
};

/** Le chiffre : les clics d'aujourd'hui face aux clics de demain, qui deviennent des secondes. */
export const Compare: React.FC<{ f: number; s: Story }> = ({ f, s }) => {
  const { from, to } = timeline(s).compare;
  const a = pop(f, from + 6);
  const b = pop(f, from + 26);
  const bascule = ramp(f, from + 62, from + 74);
  const gros = { fontSize: 168, fontWeight: 600, letterSpacing: "-.05em", lineHeight: 1 } as const;
  return (
    <Scene f={f} from={from} to={to}>
      <AbsoluteFill style={{ padding: "0 96px", justifyContent: "center", gap: 70 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, opacity: a, transform: `translateY(${(1 - a) * 30}px)` }}>
          <K size={22}>Aujourd'hui</K>
          <span style={{ ...gros, color: C.muted3 }}>{totalClics(s)} clics</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, opacity: b, transform: `translateY(${(1 - b) * 30}px)` }}>
          <K size={22} color={C.accent}>Demain</K>
          <div style={{ position: "relative", height: 168, overflow: "hidden" }}>
            <span style={{ ...gros, position: "absolute", left: 0, top: 0, color: C.accent, opacity: 1 - bascule, transform: `translateY(${-bascule * 120}px)` }}>{CLICS_APRES} clics</span>
            <span style={{ ...gros, position: "absolute", left: 0, top: 0, color: C.accent, opacity: bascule, transform: `translateY(${(1 - bascule) * 120}px)`, whiteSpace: "nowrap" }}>{s.secondes} secondes</span>
          </div>
        </div>
      </AbsoluteFill>
    </Scene>
  );
};

export const Outro: React.FC<{ f: number; s: Story }> = ({ f, s }) => {
  const { from, to } = timeline(s).outro;
  const l1 = ramp(f, from + 4, from + 18);
  const l2 = ramp(f, from + 30, from + 44);
  const m = pop(f, from + 74);
  return (
    <Scene f={f} from={from} to={to} fadeOut={0}>
      <AbsoluteFill style={{ padding: "0 96px", justifyContent: "center", gap: 28 }}>
        <p style={{ margin: 0, fontSize: 60, lineHeight: 1.18, letterSpacing: "-.03em", fontWeight: 500, color: C.muted2, opacity: l1, transform: `translateY(${(1 - l1) * 20}px)` }}>{s.message[0]}</p>
        <p style={{ margin: 0, fontSize: 60, lineHeight: 1.18, letterSpacing: "-.03em", fontWeight: 600, color: C.ink, opacity: l2, transform: `translateY(${(1 - l2) * 20}px)` }}>{s.message[1]}</p>
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 110, gap: 22, opacity: m }}>
        <Mark size={interpolate(m, [0, 1], [60, 84], clamp)} />
        <Wordmark size={40} />
        <span style={{ fontFamily: FONT.mono, fontSize: 18, color: C.muted3, letterSpacing: ".04em" }}>{s.lgcTitre ? "Démonstrateur · patients et chiffres fictifs" : "Démonstrateur · patient fictif"}</span>
      </AbsoluteFill>
    </Scene>
  );
};
