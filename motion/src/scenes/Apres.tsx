import { AbsoluteFill } from "remotion";
import type { Story } from "../story";
import { C, FONT, SHADOW, SHADOW_ACCENT } from "../theme";
import { FPS } from "../theme";
import { T, pop, ramp, typed } from "../timeline";
import { Avatar, Check, Chevron, Cursor, K, Kbd, Wordmark } from "../ui/kit";
import { suivre } from "../ui/path";
import { Scene } from "../ui/Scene";

/*
 * « Après » : l'écran de consultation de Locus Studio, reconstruit avec ses
 * jetons (`NoteEditor` puis `ComposeCard`). Le médecin écrit sa note comme
 * d'habitude ; « Générer les actions » lance l'agent ; le chrono démarre au
 * clic et s'arrête à la signature.
 *
 * L'interface est dessinée à sa taille réelle (662 px de large) puis mise à
 * l'échelle : les positions ci-dessous sont en pixels d'interface.
 */

const ECHELLE = 1.45;
const WIN = { x: 60, y: 210 };
const IW = 662;
const IH = 745;
const PAD = 22;
const Y = { tool: 80, note: 134, btn: 298, card: 354 };
const CARD = { head: Y.card + 16, synth: Y.card + 56, list: Y.card + 138, btns: Y.card + 314 };
const ROW_H = 52;
const rowY = (i: number) => CARD.list + 4 + i * ROW_H;

/** Les instants clés, à partir du début de la scène. */
const K0 = {
  note: 18,
  generer: 105,
} as const;

const fmt = (s: number, fini: boolean) => (fini ? `${Math.round(s)} s` : `${s.toFixed(1).replace(".", ",")} s`);

export const Apres: React.FC<{ f: number; s: Story }> = ({ f, s }) => {
  const { from, to } = T.apres;
  const G = from + K0.generer;
  const V = G + s.secondes * FPS;
  const etape = (k: number) => G + 8 + k * 22;
  const pret = etape(s.etapes.length - 1);
  const actionAt = (i: number) => pret + 4 + i * 12;
  const relu = (i: number) => actionAt(s.actions.length - 1) + 30 + i * 24;

  const note = typed(s.note, f, from + K0.note, 70);
  const ecrit = note.length < s.note.length && f >= from + K0.note;
  const lance = f >= G;
  const signe = f >= V + 2;
  const chrono = lance ? Math.min(s.secondes, (f - G) / FPS) : 0;
  const nEtape = s.etapes.filter((_, k) => f >= etape(k)).length;
  const carte = pop(f, G + 2, { damping: 18, stiffness: 200 });

  const cur = suivre(f, { x: 470, y: 520 }, [
    { x: PAD + 92, y: Y.btn + 21, at: G },
    ...s.actions.map((_, i) => ({ x: 420, y: rowY(i) + 26, at: relu(i) })),
    { x: PAD + 18 + 62, y: CARD.btns + 21, at: V },
  ]);
  const survol = s.actions.findIndex((_, i) => f >= relu(i) - 6 && f < relu(i) + 18);
  const fenetre = pop(f, from + 2, { damping: 20 });

  return (
    <Scene f={f} from={from} to={to}>
      <AbsoluteFill>
        <div style={{ position: "absolute", left: 60, right: 60, top: 70, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <K size={22} color={C.accent}>Avec Locus</K>
            <span style={{ fontSize: 36, fontWeight: 500, letterSpacing: "-.02em" }}>Une note, puis signer</span>
          </div>
          <span style={{ fontFamily: FONT.mono, fontSize: 84, fontWeight: 500, lineHeight: 1, color: lance ? C.accent : C.grayDot }}>{fmt(chrono, signe)}</span>
        </div>

        <div
          style={{
            position: "absolute",
            left: WIN.x,
            top: WIN.y,
            width: IW,
            height: IH,
            transform: `scale(${ECHELLE * (0.97 + 0.03 * fenetre)})`,
            transformOrigin: "top left",
            opacity: fenetre,
            background: C.bg,
            border: `1px solid ${C.line}`,
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: SHADOW,
            color: C.ink,
            fontSize: 14,
          }}
        >
          {/* L'en-tête de Studio : wordmark, le patient au centre, le praticien. */}
          <div style={{ height: 58, display: "flex", alignItems: "center", padding: "0 22px", borderBottom: `1px solid ${C.line2}`, background: C.bg }}>
            <div style={{ flex: 1 }}><Wordmark /></div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, border: `1px solid ${C.line}`, background: C.paper, borderRadius: 999, padding: "5px 14px 5px 6px" }}>
              <Avatar initials={s.patient.initiales} size={26} />
              <span style={{ fontSize: 14, fontWeight: 500 }}>{s.patient.nom}</span>
              <span style={{ fontSize: 13, color: C.muted2 }}>{s.patient.meta}</span>
            </div>
            <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
              <span style={{ display: "flex", width: 30, height: 30, alignItems: "center", justifyContent: "center", borderRadius: 999, background: C.ink, color: C.paper, fontSize: 11, fontWeight: 500 }}>RV</span>
            </div>
          </div>

          {/* La barre de la consultation. */}
          <div style={{ position: "absolute", left: PAD, right: PAD, top: Y.tool, height: 40, display: "flex", alignItems: "center", gap: 10 }}>
            {["Dicter", "Structure"].map((t, i) => (
              <span key={t} style={{ display: "flex", alignItems: "center", gap: 8, height: 38, padding: "0 14px", borderRadius: 999, border: `1px solid ${C.line}`, background: C.paper, fontSize: 14 }}>
                {i === 0 && <span style={{ width: 8, height: 8, borderRadius: 99, background: C.grayDot }} />}
                {t}
              </span>
            ))}
            <span style={{ flex: 1 }} />
            <span style={{ height: 38, width: 190, display: "flex", alignItems: "center", padding: "0 12px", borderRadius: 8, border: `1px solid ${C.line}`, background: C.paper, fontSize: 14 }}>Renouvellement</span>
            <span style={{ fontFamily: FONT.mono, fontSize: 11, color: C.muted2 }}>Consultation</span>
          </div>

          {/* La note, telle que le médecin l'écrit. */}
          <div style={{ position: "absolute", left: PAD, right: PAD, top: Y.note, height: 150, borderRadius: 14, border: `1px solid ${C.line}`, background: C.paper, padding: "14px 20px", fontSize: 16, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {note || <span style={{ color: C.muted3 }}>Dictez, collez la sortie d'un scribe, ou écrivez.</span>}
            {ecrit && <span style={{ display: "inline-block", width: 2, height: 19, background: C.accent, verticalAlign: -4, marginLeft: 2 }} />}
          </div>

          {/* Générer. */}
          <div style={{ position: "absolute", left: PAD, right: PAD, top: Y.btn, height: 42, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8, height: 42, padding: "0 16px", borderRadius: 10, fontSize: 14, background: lance ? C.paper : C.ink, color: lance ? C.ink : C.paper, border: lance ? `1px solid ${C.line}` : "none" }}>
              {lance ? "Régénérer les actions" : "Générer les actions"} {!lance && <Kbd dark>⌘⏎</Kbd>}
            </span>
            <span style={{ height: 42, display: "flex", alignItems: "center", padding: "0 12px", borderRadius: 10, border: `1px solid ${C.line}`, background: C.paper, fontSize: 14 }}>+ Ajouter</span>
            <span style={{ fontSize: 12, color: C.muted2 }}>{s.patient.nom}</span>
          </div>

          {/* La carte du composer : l'agent travaille, puis le plan à valider, puis signé. */}
          {lance && (
            <div
              style={{
                position: "absolute",
                left: PAD,
                right: PAD,
                top: Y.card,
                padding: "16px 18px",
                borderRadius: 14,
                background: C.paper,
                border: `1px solid ${signe ? C.line : C.accentLine}`,
                boxShadow: signe ? SHADOW : SHADOW_ACCENT,
                opacity: carte,
                transform: `translateY(${(1 - carte) * 12}px)`,
                minHeight: 360,
              }}
            >
              {signe ? (
                <Signe s={s} f={f} V={V} />
              ) : (
                <>
                  <div style={{ height: 28, display: "flex", alignItems: "center", gap: 10 }}>
                    <K color={C.accent}>{f >= pret ? `${s.actions.length} actions à valider` : "locus · composer"}</K>
                    {f < pret && <span style={{ fontSize: 13, color: C.muted2 }}>« {s.note.replace(/\s+/g, " ").slice(0, 46)}… »</span>}
                  </div>
                  <div style={{ position: "absolute", left: 18, right: 18, top: CARD.synth - Y.card, height: 74 }}>
                    {f < pret ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: C.muted2 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 99, background: C.accent, opacity: 0.5 + 0.5 * Math.sin(f / 3) }} />
                        {s.etapes[Math.max(0, nEtape - 1)]}
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, opacity: ramp(f, pret, pret + 8) }}>{s.synthese}</p>
                    )}
                  </div>
                  <div style={{ position: "absolute", left: 18, right: 18, top: CARD.list - Y.card, display: "flex", flexDirection: "column", gap: 0, padding: 4, borderRadius: 12, border: `1px solid ${C.line3}`, background: C.bg, minHeight: s.actions.length * ROW_H + 8, opacity: f >= pret ? 1 : 0.5 }}>
                    {s.actions.map((a, i) => {
                      const v = pop(f, actionAt(i), { damping: 16, stiffness: 220 });
                      if (f < actionAt(i)) return <div key={a.code} style={{ height: ROW_H }} />;
                      return (
                        <div key={a.code} style={{ height: ROW_H, display: "flex", alignItems: "center", gap: 10, padding: "0 12px 0 8px", borderRadius: 8, background: survol === i ? C.hover : "transparent", opacity: v, transform: `translateY(${(1 - v) * 8}px)` }}>
                          <span style={{ display: "flex", width: 18, height: 18, alignItems: "center", justifyContent: "center", borderRadius: 5, background: C.ink }}><Check size={12} color={C.paper} w={3} /></span>
                          <span style={{ fontFamily: FONT.mono, display: "flex", height: 24, minWidth: 28, alignItems: "center", justifyContent: "center", borderRadius: 6, background: C.soft, padding: "0 4px", fontSize: 10, color: C.ink3 }}>{a.code}</span>
                          <span style={{ display: "flex", minWidth: 0, flex: 1, flexDirection: "column" }}>
                            <span style={{ fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.titre}</span>
                            <span style={{ fontSize: 12, color: C.muted2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.ligne}</span>
                          </span>
                          <span style={{ fontSize: 11, color: f >= relu(i) ? C.ok : C.warn, whiteSpace: "nowrap" }}>{f >= relu(i) ? "relu" : "à relire"}</span>
                          <Chevron />
                        </div>
                      );
                    })}
                  </div>
                  {f >= pret && (
                    <div style={{ position: "absolute", left: 18, right: 18, top: CARD.btns - Y.card, height: 42, display: "flex", alignItems: "center", gap: 8, opacity: ramp(f, actionAt(s.actions.length - 1), actionAt(s.actions.length - 1) + 8) }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 8, height: 42, padding: "0 16px", borderRadius: 10, background: C.ink, color: C.paper, fontSize: 14, transform: `scale(${f >= V - 3 ? 0.96 : 1})` }}>
                        Valider les {s.actions.length} <Kbd dark>⌘⏎</Kbd>
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", fontSize: 14, color: C.muted2 }}>Annuler <Kbd>esc</Kbd></span>
                      <span style={{ flex: 1 }} />
                      <span style={{ fontFamily: FONT.mono, fontSize: 11, color: C.muted2 }}>agent · locus ×1</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <Cursor x={cur.x} y={cur.y} press={cur.press} ripple={cur.ripple} scale={0.85} />
        </div>
      </AbsoluteFill>
    </Scene>
  );
};

/** La carte une fois signée : ce qui est parti, et où. */
const Signe: React.FC<{ s: Story; f: number; V: number }> = ({ s, f, V }) => {
  const a = pop(f, V + 2, { damping: 14 });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ display: "flex", width: 26, height: 26, alignItems: "center", justifyContent: "center", borderRadius: 999, background: C.okSoft, color: C.ok, transform: `scale(${0.6 + 0.4 * a})` }}><Check size={14} w={2.6} /></span>
        <span style={{ fontSize: 15, fontWeight: 500 }}>{s.actions.length} actions signées · envoyées et inscrites au dossier</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {s.actions.map((x, i) => (
          <div key={x.code} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 56, borderTop: i ? `1px solid ${C.line4}` : "none", padding: "6px 4px", opacity: ramp(f, V + 4 + i * 5, V + 12 + i * 5) }}>
            <span style={{ fontFamily: FONT.mono, display: "flex", height: 24, minWidth: 28, alignItems: "center", justifyContent: "center", borderRadius: 6, background: C.soft, padding: "0 4px", fontSize: 10, color: C.ink3 }}>{x.code}</span>
            <span style={{ display: "flex", minWidth: 0, flex: 1, flexDirection: "column" }}>
              <span style={{ fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.titre}</span>
              <span style={{ fontSize: 12, color: C.ok }}>Envoyé · {x.destination}</span>
            </span>
            <Chevron />
          </div>
        ))}
      </div>
    </div>
  );
};
