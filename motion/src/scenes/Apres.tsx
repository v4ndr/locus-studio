import { AbsoluteFill } from "remotion";
import { CABINET_ENTETE, type Action, type Story } from "../story";
import { C, FONT, SHADOW, SHADOW_ACCENT } from "../theme";
import { FPS } from "../theme";
import { mix, pop, ramp, timeline, typed } from "../timeline";
import { Avatar, Check, Chevron, Cursor, K, Kbd, Wordmark } from "../ui/kit";
import { suivre } from "../ui/path";
import { Scene } from "../ui/Scene";

/*
 * « Après » : l'écran de consultation de Locus Studio, reconstruit avec ses
 * jetons (`NoteEditor` puis `ComposeCard`). Le médecin écrit sa note comme
 * d'habitude ; « Générer les actions » lance l'agent ; le médecin ouvre le
 * premier document et fait défiler les trois au clavier (le carrousel de
 * relecture), puis valide. Le chrono démarre au clic sur « Générer » et
 * s'arrête à la validation.
 *
 * L'interface est dessinée à sa taille réelle (662 px de large) puis mise à
 * l'échelle : les positions ci-dessous sont en pixels d'interface.
 */

const ECHELLE = 1.45;
/** Les clics du médecin côté Studio : « Générer », ouvrir le premier document, « Valider ». */
export const CLICS_APRES = 3;
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
  const { from, to } = timeline(s).apres;
  const G = from + K0.generer;
  const V = G + s.secondes * FPS;
  const etape = (k: number) => G + 8 + k * 22;
  const pret = etape(s.etapes.length - 1);
  const actionAt = (i: number) => pret + 4 + i * 12;
  /* Le carrousel : ouvert d'un clic sur la première ligne, → pour passer au suivant, esc pour fermer. */
  const C0 = actionAt(s.actions.length - 1) + 12;
  const PAS = 30;
  const passe = (k: number) => C0 + k * PAS - 8;
  const ferme = C0 + s.actions.length * PAS - 4;
  const relu = (i: number) => C0 + 7 + i * PAS;
  const pos = s.actions.reduce((p, _, k) => (k === 0 ? 0 : p + ramp(f, passe(k), passe(k) + 9)), 0);
  const carrousel = f >= C0 && f < ferme + 10 ? Math.min(ramp(f, C0, C0 + 8), 1 - ramp(f, ferme, ferme + 8)) : 0;
  const touche = s.actions.findIndex((_, k) => k > 0 && f >= passe(k) - 2 && f < passe(k) + 5) > 0 ? "→" : f >= ferme - 2 && f < ferme + 5 ? "esc" : null;

  const note = typed(s.note, f, from + K0.note, 70);
  const ecrit = note.length < s.note.length && f >= from + K0.note;
  const lance = f >= G;
  const signe = f >= V + 2;
  const chrono = lance ? Math.min(s.secondes, (f - G) / FPS) : 0;
  const nEtape = s.etapes.filter((_, k) => f >= etape(k)).length;
  const carte = pop(f, G + 2, { damping: 18, stiffness: 200 });

  const cur = suivre(f, { x: 470, y: 520 }, [
    { x: PAD + 92, y: Y.btn + 21, at: G },
    { x: 300, y: rowY(0) + 26, at: C0 },
    { x: PAD + 18 + 62, y: CARD.btns + 21, at: V },
  ]);
  const survol = f >= C0 - 8 && f < C0 + 4 ? 0 : -1;
  const fenetre = pop(f, from + 2, { damping: 20 });

  return (
    <Scene f={f} from={from} to={to}>
      <AbsoluteFill>
        <div style={{ position: "absolute", left: 60, right: 60, top: 70, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <K size={22} color={C.accent}>Demain</K>
            <span style={{ fontSize: 36, fontWeight: 500, letterSpacing: "-.02em" }}>Une note, une validation</span>
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
                    <K color={C.accent}>{f >= pret ? `${s.actions.length} actions à valider` : "locus · agent"}</K>
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

          {carrousel > 0 && <Carrousel s={s} f={f} pos={pos} relu={relu} opacite={carrousel} touche={touche} />}
          <div style={{ opacity: 1 - carrousel }}><Cursor x={cur.x} y={cur.y} press={cur.press} ripple={cur.ripple} scale={0.85} /></div>
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

const DOC_W = 420;
const DOC_H = 400;
const ECART = 450;

/** Le carrousel de relecture : les documents tels qu'ils partiront, l'un après l'autre. */
const Carrousel: React.FC<{ s: Story; f: number; pos: number; relu: (i: number) => number; opacite: number; touche: string | null }> = ({ s, f, pos, relu, opacite, touche }) => (
  <div style={{ position: "absolute", inset: 0, zIndex: 20, opacity: opacite }}>
    <div style={{ position: "absolute", inset: 0, background: "rgba(17,17,17,.38)" }} />
    {s.actions.map((a, k) => {
      const d = k - pos;
      if (Math.abs(d) > 1.6) return null;
      const centre = 1 - Math.min(1, Math.abs(d));
      return (
        <div key={a.code} style={{ position: "absolute", left: IW / 2 - DOC_W / 2 + d * ECART, top: 92, width: DOC_W, height: DOC_H, transform: `scale(${mix(0.86, 1, centre) * mix(0.96, 1, opacite)})`, opacity: mix(0.55, 1, centre) }}>
          <Feuille s={s} a={a} relu={f >= relu(k)} />
        </div>
      );
    })}
    <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", top: 92 + DOC_H + 22, display: "flex", justifyContent: "center", alignItems: "center", gap: 10, color: "#F2F1EC", fontSize: 13, background: "rgba(17,17,17,.72)", borderRadius: 999, padding: "8px 16px", whiteSpace: "nowrap" }}>
      {s.actions.map((_, k) => <span key={k} style={{ width: 7, height: 7, borderRadius: 99, background: Math.round(pos) === k ? "#FFF" : "rgba(255,255,255,.4)" }} />)}
      <span style={{ marginLeft: 10, display: "flex", alignItems: "center", gap: 6 }}>
        <Touche on={touche === "→"}>→</Touche> suivant · <Touche on={touche === "esc"}>esc</Touche> fermer
      </span>
    </div>
  </div>
);

const Touche: React.FC<{ on: boolean; children: React.ReactNode }> = ({ on, children }) => (
  <span style={{ fontFamily: FONT.mono, fontSize: 11, padding: "2px 7px", borderRadius: 5, border: "1px solid rgba(255,255,255,.5)", background: on ? "#FFF" : "transparent", color: on ? C.ink : "#F2F1EC", transform: `translateY(${on ? 1 : 0}px)` }}>{children}</span>
);

/** Une feuille : en-tête du cabinet, patient, le document, l'ordonnance numérique. */
const Feuille: React.FC<{ s: Story; a: Action; relu: boolean }> = ({ s, a, relu }) => (
  <div style={{ position: "relative", width: "100%", height: "100%", background: C.paper, borderRadius: 10, boxShadow: "0 20px 50px rgba(0,0,0,.25)", padding: "26px 30px", display: "flex", flexDirection: "column", gap: 16, color: C.ink }}>
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted2 }}>
      <span>{CABINET_ENTETE}</span>
      <span>15/10/2026</span>
    </div>
    <div style={{ fontSize: 12, color: C.muted2 }}>{s.patient.nom} · {s.patient.meta.split(" · ")[0]}</div>
    <div style={{ borderTop: `1px solid ${C.line2}`, paddingTop: 16, display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontFamily: FONT.mono, display: "flex", height: 24, minWidth: 30, alignItems: "center", justifyContent: "center", borderRadius: 6, background: C.soft, padding: "0 4px", fontSize: 10, color: C.ink3 }}>{a.code}</span>
      <span style={{ fontSize: 16, fontWeight: 600 }}>{a.doc.entete}</span>
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {a.doc.lignes.map((l, i) => <span key={l} style={{ fontSize: i === 0 ? 15 : 14, fontWeight: i === 0 ? 500 : 400, lineHeight: 1.45, color: i === 0 ? C.ink : C.ink2 }}>{l}</span>)}
    </div>
    <span style={{ flex: 1 }} />
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Qr />
        <span style={{ fontSize: 10, color: C.muted2, lineHeight: 1.4 }}>Ordonnance numérique<br />{a.destination}</span>
      </div>
      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, color: C.ok, background: C.okSoft, borderRadius: 999, padding: "5px 11px", opacity: relu ? 1 : 0, transform: `scale(${relu ? 1 : 0.8})` }}>
        <Check size={12} w={2.6} /> relu
      </span>
    </div>
  </div>
);

/** Un QR de fantaisie, déterministe. */
const Qr: React.FC = () => (
  <svg width={44} height={44} viewBox="0 0 11 11">
    {Array.from({ length: 121 }, (_, i) => {
      const x = i % 11, y = Math.floor(i / 11);
      const coin = (x < 3 && y < 3) || (x > 7 && y < 3) || (x < 3 && y > 7);
      const on = coin ? !(x % 10 === 1 && y % 10 === 1) && !(x === 9 && y === 1) : (x * 7 + y * 13 + x * y) % 3 === 0;
      return on ? <rect key={i} x={x} y={y} width={1} height={1} fill={C.ink} /> : null;
    })}
  </svg>
);
