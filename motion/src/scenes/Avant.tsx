import { AbsoluteFill } from "remotion";
import type { EcranAvant, Story } from "../story";
import { clicsEcran } from "../story";
import { C, FONT } from "../theme";
import { T, pop, ramp } from "../timeline";
import { Avatar, Cursor, K } from "../ui/kit";
import { suivre, type Clic } from "../ui/path";
import { Scene } from "../ui/Scene";

/*
 * « Avant » : un LGC générique, dense et gris — volontairement aucun logiciel
 * réel. Trois écrans, un par document ; chaque champ coûte un clic (deux
 * quand il faut ouvrir une liste), le compteur tourne. En bas, le patient
 * continue de parler : le médecin tient la conversation et le clavier.
 */

const WIN = { x: 60, y: 200, w: 960, h: 760 };
const MENUS = ["Fichier", "Patient", "Consultation", "Prescription", "Examens", "Courriers", "Outils", "?"];
const MENU_X = (i: number) => WIN.x + 20 + MENUS.slice(0, i).reduce((n, m) => n + m.length * 11 + 34, 0);
const MODAL = { x: WIN.x + 150, y: WIN.y + 140, w: 760, h: 560 };
const ROW = (j: number) => MODAL.y + 96 + j * 92;
const INPUT = { x: MODAL.x + 300, w: 420, h: 48 };
const BOUTON = { x: MODAL.x + MODAL.w - 300, y: MODAL.y + MODAL.h - 82, w: 270, h: 54 };
const OPTIONS = 3;
const optionY = (j: number, k: number) => ROW(j) + INPUT.h + 4 + k * 40;

type Plan = { clics: Clic[]; /** frame où chaque champ reçoit sa valeur, où sa liste s'ouvre */ champ: { ouvre?: number; rempli: number }[]; ouvre: number; bouton: number };

/** Les clics d'un écran, posés régulièrement dans sa fenêtre. */
function planEcran(e: EcranAvant, debut: number, fin: number): Plan {
  const n = clicsEcran(e);
  const pas = (fin - debut) / (n - 1);
  const at = (i: number) => Math.round(debut + i * pas);
  const clics: Clic[] = [];
  const menuIdx = MENUS.findIndex((m) => e.menu.startsWith(m));
  let i = 0;
  clics.push({ x: MENU_X(menuIdx < 0 ? 3 : menuIdx) + 40, y: WIN.y + 62, at: at(i++) });
  const champ = e.champs.map((c, j) => {
    const cx = INPUT.x + INPUT.w - 60;
    const cy = ROW(j) + INPUT.h / 2;
    if ((c.clics ?? 1) >= 2) {
      const ouvre = at(i);
      clics.push({ x: cx, y: cy, at: at(i++) });
      for (let k = 2; k < (c.clics ?? 1); k++) clics.push({ x: cx, y: cy, at: at(i++) });
      const rempli = at(i);
      clics.push({ x: INPUT.x + 140, y: optionY(j, 1) + 18, at: at(i++) });
      return { ouvre, rempli };
    }
    const rempli = at(i);
    clics.push({ x: cx, y: cy, at: at(i++) });
    return { rempli };
  });
  const bouton = at(i);
  clics.push({ x: BOUTON.x + BOUTON.w / 2, y: BOUTON.y + BOUTON.h / 2, at: at(i++) });
  return { clics, champ, ouvre: clics[0].at + 5, bouton };
}

const Barre: React.FC<{ w: number; c?: string }> = ({ w, c = "#E4E4E4" }) => <div style={{ width: w, height: 12, borderRadius: 3, background: c }} />;

/** Le fond du LGC : barre de titre, menus, colonne du dossier, tableau dense. */
const Lgc: React.FC<{ menuActif: number }> = ({ menuActif }) => (
  <div style={{ position: "absolute", left: WIN.x, top: WIN.y, width: WIN.w, height: WIN.h, background: "#F4F4F4", border: "1px solid #CFCFCF", borderRadius: 10, overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,.10)", fontFamily: "Tahoma, 'Segoe UI', Arial, sans-serif" }}>
    <div style={{ height: 40, background: "#E6E6E6", borderBottom: "1px solid #CFCFCF", display: "flex", alignItems: "center", gap: 8, padding: "0 14px" }}>
      {["#E0605A", "#E3B341", "#62B456"].map((c) => <span key={c} style={{ width: 12, height: 12, borderRadius: 99, background: c }} />)}
      <span style={{ marginLeft: 16, fontSize: 15, color: "#555" }}>Logiciel médical · FOURNIER Gilles · 56 ans</span>
    </div>
    <div style={{ height: 44, background: "#FAFAFA", borderBottom: "1px solid #D8D8D8", display: "flex", alignItems: "center", padding: "0 6px" }}>
      {MENUS.map((m, i) => (
        <span key={m} style={{ padding: "6px 14px", margin: "0 3px", fontSize: 17, color: "#333", background: i === menuActif ? "#D6E2F5" : "transparent", borderRadius: 4 }}>{m}</span>
      ))}
    </div>
    <div style={{ display: "flex", height: WIN.h - 84 }}>
      <div style={{ width: 190, borderRight: "1px solid #D8D8D8", background: "#EFEFEF", padding: 14, display: "flex", flexDirection: "column", gap: 12, fontSize: 14, color: "#666" }}>
        {["Antécédents", "Allergies", "Traitements", "Biologie", "Imagerie", "Courriers", "Vaccins", "Dépistages", "INS", "DMP", "Facturation", "Historique"].map((t) => <span key={t}>▸ {t}</span>)}
      </div>
      <div style={{ flex: 1, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        {Array.from({ length: 22 }, (_, i) => (
          <div key={i} style={{ display: "flex", gap: 14 }}>
            <Barre w={80} c="#DADADA" />
            <Barre w={180 + ((i * 53) % 170)} />
            <Barre w={90 + ((i * 31) % 80)} />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const Modale: React.FC<{ e: EcranAvant; p: Plan; f: number }> = ({ e, p, f }) => {
  const a = pop(f, p.ouvre, { damping: 18, stiffness: 260 });
  const presse = f >= p.bouton && f < p.bouton + 5;
  return (
    <div style={{ position: "absolute", left: MODAL.x, top: MODAL.y, width: MODAL.w, height: MODAL.h, background: "#FCFCFC", border: "1px solid #B9B9B9", borderRadius: 6, boxShadow: "0 18px 50px rgba(0,0,0,.22)", transform: `scale(${0.94 + a * 0.06})`, opacity: a, fontFamily: "Tahoma, 'Segoe UI', Arial, sans-serif", color: "#222" }}>
      <div style={{ height: 52, background: "#E9E9E9", borderBottom: "1px solid #CFCFCF", display: "flex", alignItems: "center", padding: "0 22px", fontSize: 20, fontWeight: 700 }}>{e.titre}</div>
      {e.champs.map((c, j) => {
        const st = p.champ[j];
        const rempli = f >= st.rempli;
        const liste = st.ouvre !== undefined && f >= st.ouvre && !rempli;
        return (
          <div key={c.label} style={{ position: "absolute", left: 0, top: ROW(j) - MODAL.y, width: "100%" }}>
            <span style={{ position: "absolute", left: 30, top: 12, fontSize: 19, color: "#444" }}>{c.label}</span>
            <div style={{ position: "absolute", left: INPUT.x - MODAL.x, width: INPUT.w, height: INPUT.h, border: `1px solid ${liste ? "#6A8FD8" : "#BDBDBD"}`, background: "#fff", borderRadius: 3, display: "flex", alignItems: "center", padding: "0 14px", fontSize: 20, color: rempli ? "#111" : "#AAA" }}>
              {rempli ? c.valeur : "—"}
              <span style={{ marginLeft: "auto", fontSize: 14, color: "#888" }}>▼</span>
            </div>
            {liste && (
              <div style={{ position: "absolute", zIndex: 5, left: INPUT.x - MODAL.x, top: INPUT.h + 4, width: INPUT.w, background: "#fff", border: "1px solid #9FB4DE", boxShadow: "0 6px 16px rgba(0,0,0,.15)" }}>
                {Array.from({ length: OPTIONS }, (_, k) => (
                  <div key={k} style={{ height: 40, display: "flex", alignItems: "center", padding: "0 14px", fontSize: 18, background: k === 1 ? "#D6E2F5" : "#fff", color: "#222" }}>
                    {k === 1 ? c.valeur : <Barre w={140 + k * 60} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <div style={{ position: "absolute", left: BOUTON.x - MODAL.x, top: BOUTON.y - MODAL.y, width: BOUTON.w, height: BOUTON.h, background: presse ? "#C9D6EE" : "#E3E3E3", border: "1px solid #A9A9A9", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19 }}>{e.bouton}</div>
    </div>
  );
};

export const Avant: React.FC<{ f: number; s: Story }> = ({ f, s }) => {
  const { from, to } = T.avant;
  const n = s.avant.length;
  const D = (to - from) / n;
  const plans = s.avant.map((e, i) => planEcran(e, from + i * D + 16, from + (i + 1) * D - 12));
  const tous = plans.flatMap((p) => p.clics);
  const cur = suivre(f, { x: 820, y: 1100 }, tous);
  const i = Math.min(n - 1, Math.max(0, Math.floor((f - from) / D)));
  const p = plans[i];
  const e = s.avant[i];
  const menuIdx = f >= p.clics[0].at && f < p.ouvre + 4 ? MENUS.findIndex((m) => e.menu.startsWith(m)) : -1;
  const dernier = [...tous].reverse().find((c) => f >= c.at);
  const bump = dernier ? 1 + 0.18 * Math.max(0, 1 - (f - dernier.at) / 6) : 1;
  const bulle = pop(f, from + i * D + 10);
  return (
    <Scene f={f} from={from} to={to}>
      <AbsoluteFill>
        <div style={{ position: "absolute", left: 60, right: 60, top: 70, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <K size={22}>Aujourd'hui</K>
            <span style={{ fontSize: 36, fontWeight: 500, letterSpacing: "-.02em" }}>Dans le logiciel</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span style={{ fontFamily: FONT.mono, fontSize: 84, fontWeight: 500, color: C.recText, transform: `scale(${bump})`, transformOrigin: "right bottom", display: "inline-block", lineHeight: 1 }}>{cur.n}</span>
            <span style={{ fontSize: 30, color: C.muted2 }}>clics</span>
          </div>
        </div>
        <Lgc menuActif={menuIdx} />
        {f >= p.ouvre && <Modale e={e} p={p} f={f} />}
        <Cursor x={cur.x} y={cur.y} press={cur.press} ripple={cur.ripple} scale={1.3} />
        <div style={{ position: "absolute", left: 60, right: 60, top: WIN.y + WIN.h + 50, display: "flex", alignItems: "flex-start", gap: 20, opacity: bulle * (1 - ramp(f, from + (i + 1) * D - 8, from + (i + 1) * D)) }}>
          <Avatar initials={s.patient.initiales} size={60} />
          <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: "6px 22px 22px 22px", padding: "18px 26px", fontSize: 32, lineHeight: 1.3, color: C.ink2, transform: `translateY(${(1 - bulle) * 14}px)` }}>{s.pendant[i] ?? ""}</div>
        </div>
      </AbsoluteFill>
    </Scene>
  );
};
