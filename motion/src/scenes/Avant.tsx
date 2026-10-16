import { AbsoluteFill } from "remotion";
import { CLIC, CPS, compteurs, scenario, type Cible, type Evt, type Scenario } from "../avant";
import type { EcranAvant, Story } from "../story";
import { C, FONT } from "../theme";
import { pop, ramp, timeline } from "../timeline";
import { Avatar, Cursor, K } from "../ui/kit";
import { suivre, type Clic } from "../ui/path";
import { Scene } from "../ui/Scene";

/*
 * « Avant » : un LGC générique, dense et gris (aucun logiciel réel). Chaque
 * document suit le parcours habituel : menu, entrée du menu, puis chaque
 * champ, avec la recherche dans la base (on tape, une liste s'ouvre, on
 * choisit ; parfois l'abréviation ne donne rien et il faut retaper), une
 * alerte du LAP à fermer, les boutons de fin. En haut, les clics et les
 * frappes ; en bas, le patient continue de parler.
 */

const WIN = { x: 60, y: 210, w: 960, h: 760 };
const MENUS = ["Fichier", "Patient", "Consultation", "Prescription", "Examens", "Courriers", "Outils", "?"];
const MENU_X = (i: number) => WIN.x + 9 + MENUS.slice(0, i).reduce((n, m) => n + m.length * 9.4 + 34, 0);
const MENU_ITEM = (k: number) => WIN.y + 86 + k * 40;
const MODAL = { x: WIN.x + 120, y: WIN.y + 130, w: 800, h: 580 };
const ROW = (j: number) => MODAL.y + 90 + j * 104;
const INPUT = { x: MODAL.x + 250, w: 510, h: 48 };
const OPT_H = 40;
const optionY = (j: number, k: number) => ROW(j) + INPUT.h + 4 + k * OPT_H;
const BTN = { y: MODAL.y + MODAL.h - 78, h: 52, w: 240, gap: 16 };
const btnX = (n: number, b: number) => MODAL.x + MODAL.w - 30 - (n - b) * BTN.w - (n - 1 - b) * BTN.gap;
const ALERTE = { x: MODAL.x + 150, y: MODAL.y + 170, w: 500, h: 200 };
const POLICE = "Tahoma, 'Segoe UI', Arial, sans-serif";

const menuIdx = (e: EcranAvant) => Math.max(0, MENUS.indexOf(e.menu ?? ""));
const sousMenus = (e: EcranAvant) => {
  const autres: Record<string, string[]> = { Examens: ["Biologie", "Courrier", "Certificat"], Patient: ["Fiche", "Courrier", "Historique"], Outils: ["Statistiques", "Exports", "Paramètres"] };
  const [a, ...b] = autres[e.menu ?? ""] ?? ["Renouveler", "Courrier", "Certificat"];
  return [a, e.sousMenu ?? "", ...b];
};

function position(e: EcranAvant, c: Cible) {
  switch (c.k) {
    case "menu": return { x: MENU_X(menuIdx(e)) + 36, y: WIN.y + 62 };
    case "sousMenu": return { x: MENU_X(menuIdx(e)) + 110, y: MENU_ITEM(1) + 20 };
    case "champ": return { x: INPUT.x + 60, y: ROW(c.j) + INPUT.h / 2 };
    case "option": { const ch = e.champs[c.j]; return { x: INPUT.x + 170, y: optionY(c.j, Math.max(0, ch.options!.indexOf(ch.valeur))) + OPT_H / 2 }; }
    case "alerte": return { x: ALERTE.x + ALERTE.w - 80, y: ALERTE.y + ALERTE.h - 44 };
    case "bouton": return { x: btnX(e.boutons.length, c.b) + BTN.w / 2, y: BTN.y + BTN.h / 2 };
  }
}

type EtatChamp = { texte: string; valeur?: string; focus: boolean; liste: boolean; vide: boolean; selection: boolean; caret: boolean };

/** L'état de chaque champ d'un écran à l'instant `f`, relu dans le scénario. */
function etatChamps(e: EcranAvant, sc: Scenario, f: number): EtatChamp[] {
  const clics = sc.evts.filter((v): v is Extract<Evt, { t: "clic" }> => v.t === "clic");
  const saisies = sc.evts.filter((v): v is Extract<Evt, { t: "saisie" }> => v.t === "saisie");
  const entree = (j: number) => clics.find((c) => c.cible.k === "champ" && c.cible.j === j)!.at;
  const choix = (j: number) => clics.find((c) => c.cible.k === "option" && c.cible.j === j)?.at;
  return e.champs.map((ch, j) => {
    const a = entree(j);
    const suivant = j + 1 < e.champs.length ? entree(j + 1) : Infinity;
    const focus = f >= a && f < suivant;
    const st: EtatChamp = { texte: "", focus, liste: false, vide: false, selection: false, caret: false };
    if (f < a) return st;
    const mes = saisies.filter((s) => s.j === j);
    const active = [...mes].reverse().find((s) => f >= s.from);
    if (active) {
      st.texte = active.texte.slice(0, Math.floor(((f - active.from) / 30) * CPS));
      st.caret = focus && f < active.to + 2;
      if (active.efface !== undefined && f >= active.to) { st.vide = true; st.selection = f >= active.efface - 5; st.caret = false; }
    }
    const derniere = mes[mes.length - 1];
    const o = choix(j);
    if (ch.options) {
      const ouvre = derniere ? derniere.to : a;
      st.liste = f >= ouvre && (o === undefined || f < o + 2);
      if (o !== undefined && f >= o) { st.valeur = ch.valeur; st.liste = f < o + 2; }
    } else if (!derniere) st.valeur = ch.valeur;
    else if (f >= derniere.to) st.valeur = ch.valeur;
    return st;
  });
}

const Barre: React.FC<{ w: number; c?: string }> = ({ w, c = "#E4E4E4" }) => <div style={{ width: w, height: 12, borderRadius: 3, background: c }} />;

/** Le fond du LGC : barre de titre, menus, colonne du dossier, tableau dense. */
const Lgc: React.FC<{ s: Story; menuActif: number }> = ({ s, menuActif }) => (
  <div style={{ position: "absolute", left: WIN.x, top: WIN.y, width: WIN.w, height: WIN.h, background: "#F4F4F4", border: "1px solid #CFCFCF", borderRadius: 10, overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,.10)", fontFamily: POLICE }}>
    <div style={{ height: 40, background: "#E6E6E6", borderBottom: "1px solid #CFCFCF", display: "flex", alignItems: "center", gap: 8, padding: "0 14px" }}>
      {["#E0605A", "#E3B341", "#62B456"].map((c) => <span key={c} style={{ width: 12, height: 12, borderRadius: 99, background: c }} />)}
      <span style={{ marginLeft: 16, fontSize: 15, color: "#555" }}>Logiciel médical · {s.lgcTitre ?? `${s.patient.prenomNom} · ${s.patient.meta.split(" · ")[0]}`}</span>
    </div>
    <div style={{ height: 44, background: "#FAFAFA", borderBottom: "1px solid #D8D8D8", display: "flex", alignItems: "center", padding: "0 6px" }}>
      {MENUS.map((m, i) => (
        <span key={m} style={{ padding: "6px 14px", margin: "0 3px", fontSize: 16, color: "#333", background: i === menuActif ? "#D6E2F5" : "transparent", borderRadius: 4 }}>{m}</span>
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

const MenuDeroulant: React.FC<{ e: EcranAvant; survol: boolean }> = ({ e, survol }) => (
  <div style={{ position: "absolute", left: MENU_X(menuIdx(e)), top: WIN.y + 82, width: 260, background: "#FFF", border: "1px solid #B9B9B9", boxShadow: "0 8px 22px rgba(0,0,0,.18)", fontFamily: POLICE, padding: "4px 0", zIndex: 4 }}>
    {sousMenus(e).map((m, k) => (
      <div key={m} style={{ height: 40, display: "flex", alignItems: "center", padding: "0 16px", fontSize: 17, color: "#222", background: k === 1 && survol ? "#D6E2F5" : "transparent" }}>{m}</div>
    ))}
  </div>
);

/**
 * La barre de la fenêtre : le titre d'un écran du LGC ; ou, pour un navigateur
 * et un tableur, l'adresse ou le fichier, avec le titre de la page en dessous.
 */
const Chrome: React.FC<{ e: EcranAvant }> = ({ e }) => {
  if (!e.fenetre || e.fenetre === "lgc") {
    return <div style={{ height: 52, background: "#E9E9E9", borderBottom: "1px solid #CFCFCF", display: "flex", alignItems: "center", padding: "0 22px", fontSize: 20, fontWeight: 700 }}>{e.titre}</div>;
  }
  const web = e.fenetre === "web";
  return (
    <>
      <div style={{ height: 52, background: web ? "#DEE1E6" : "#1E6E42", borderBottom: "1px solid #C4C7CC", display: "flex", alignItems: "center", gap: 12, padding: "0 14px", borderRadius: "6px 6px 0 0" }}>
        {web ? (
          <>
            <span style={{ fontSize: 18, color: "#666" }}>←  →  ⟳</span>
            <span style={{ flex: 1, height: 34, borderRadius: 999, background: "#FFF", display: "flex", alignItems: "center", gap: 8, padding: "0 16px", fontSize: 16, color: "#333", overflow: "hidden", whiteSpace: "nowrap" }}>
              <span style={{ color: "#888" }}>🔒</span>{e.url}
            </span>
          </>
        ) : (
          <>
            <span style={{ width: 22, height: 22, borderRadius: 4, background: "#FFF", color: "#1E6E42", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>X</span>
            <span style={{ fontSize: 17, color: "#FFF" }}>Tableur · {e.url}</span>
          </>
        )}
      </div>
      <div style={{ position: "absolute", left: 26, top: 60, fontSize: 17, fontWeight: 700, color: "#333" }}>{e.titre}</div>
    </>
  );
};

const Modale: React.FC<{ e: EcranAvant; sc: Scenario; f: number; ouvre: number }> = ({ e, sc, f, ouvre }) => {
  const a = pop(f, ouvre, { damping: 18, stiffness: 260 });
  const etats = etatChamps(e, sc, f);
  const clics = sc.evts.filter((v): v is Extract<Evt, { t: "clic" }> => v.t === "clic");
  const alerteClic = clics.find((c) => c.cible.k === "alerte");
  const alerteOuverte = alerteClic && f >= alerteClic.at - CLIC - 6 && f < alerteClic.at + 2;
  const presse = (b: number) => clics.some((c) => c.cible.k === "bouton" && c.cible.b === b && f >= c.at - 2 && f < c.at + 4);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: a, transform: `scale(${0.95 + a * 0.05})`, transformOrigin: `${MODAL.x + MODAL.w / 2}px ${MODAL.y + MODAL.h / 2}px` }}>
      <div style={{ position: "absolute", left: MODAL.x, top: MODAL.y, width: MODAL.w, height: MODAL.h, background: "#FCFCFC", border: "1px solid #B9B9B9", borderRadius: 6, boxShadow: "0 18px 50px rgba(0,0,0,.22)", fontFamily: POLICE, color: "#222" }}>
        <Chrome e={e} />
        {e.champs.map((c, j) => {
          const st = etats[j];
          const affiche = st.valeur ?? st.texte;
          return (
            <div key={c.label} style={{ position: "absolute", left: 0, top: ROW(j) - MODAL.y, width: "100%", zIndex: st.liste || st.vide ? 5 : 1 }}>
              <span style={{ position: "absolute", left: 26, top: 13, fontSize: 17, color: "#444", width: 210 }}>{c.label}</span>
              <div style={{ position: "absolute", left: INPUT.x - MODAL.x, width: INPUT.w, height: INPUT.h, border: `${st.focus ? 2 : 1}px solid ${st.focus ? "#6A8FD8" : "#BDBDBD"}`, background: "#fff", borderRadius: 3, display: "flex", alignItems: "center", padding: "0 12px", fontSize: 18, color: "#111", overflow: "hidden", whiteSpace: "nowrap" }}>
                <span style={{ background: st.selection ? "#B5CCF5" : "transparent" }}>{affiche}</span>
                {st.caret && <span style={{ display: "inline-block", width: 2, height: 22, background: "#111", marginLeft: 1 }} />}
                {!affiche && !st.caret && <span style={{ color: "#AAA" }}>—</span>}
                {c.options && <span style={{ marginLeft: "auto", fontSize: 13, color: "#888" }}>▼</span>}
              </div>
              {st.vide && (
                <div style={{ position: "absolute", left: INPUT.x - MODAL.x, top: INPUT.h + 4, width: INPUT.w, background: "#fff", border: "1px solid #9FB4DE", boxShadow: "0 6px 16px rgba(0,0,0,.15)", height: OPT_H, display: "flex", alignItems: "center", padding: "0 14px", fontSize: 16, fontStyle: "italic", color: "#888" }}>Aucun résultat pour « {st.texte} »</div>
              )}
              {st.liste && c.options && (
                <div style={{ position: "absolute", left: INPUT.x - MODAL.x, top: INPUT.h + 4, width: INPUT.w, background: "#fff", border: "1px solid #9FB4DE", boxShadow: "0 6px 16px rgba(0,0,0,.15)" }}>
                  {c.options.map((o) => (
                    <div key={o} style={{ height: OPT_H, display: "flex", alignItems: "center", padding: "0 14px", fontSize: 17, background: o === c.valeur && st.valeur ? "#D6E2F5" : "#fff", color: "#222" }}>{o}</div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {e.boutons.map((b, i) => (
          <div key={b} style={{ position: "absolute", left: btnX(e.boutons.length, i) - MODAL.x, top: BTN.y - MODAL.y, width: BTN.w, height: BTN.h, background: presse(i) ? "#C9D6EE" : "#E3E3E3", border: "1px solid #A9A9A9", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{b}</div>
        ))}
      </div>
      {alerteOuverte && e.alerte && (
        <div style={{ position: "absolute", left: ALERTE.x, top: ALERTE.y, width: ALERTE.w, height: ALERTE.h, background: "#FFFDF4", border: "1px solid #B9A96A", borderRadius: 6, boxShadow: "0 18px 40px rgba(0,0,0,.25)", fontFamily: POLICE, zIndex: 10 }}>
          <div style={{ height: 46, background: "#F3E9B8", display: "flex", alignItems: "center", padding: "0 18px", fontSize: 18, fontWeight: 700, color: "#5A4A00" }}>⚠ {e.alerte.titre}</div>
          <div style={{ padding: "18px 18px", fontSize: 17, color: "#333" }}>{e.alerte.texte}</div>
          <div style={{ position: "absolute", right: 24, bottom: 22, width: 110, height: 44, background: "#E3E3E3", border: "1px solid #A9A9A9", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>{e.alerte.bouton}</div>
        </div>
      )}
    </div>
  );
};

export const Avant: React.FC<{ f: number; s: Story }> = ({ f, s }) => {
  const { from, to } = timeline(s).avant;
  const scs = scenario(s, from);
  const clics: Clic[] = scs.flatMap((sc, i) => sc.evts.flatMap((ev) => (ev.t === "clic" ? [{ ...position(s.avant[i], ev.cible), at: ev.at }] : [])));
  const cur = suivre(f, { x: 820, y: 1140 }, clics);
  const { clics: nClics, frappes } = compteurs(scs, f);
  const i = Math.max(0, scs.findIndex((sc, k) => f < (scs[k + 1]?.debut ?? Infinity)));
  const sc = scs[i];
  const e = s.avant[i];
  const cl = sc.evts.filter((v): v is Extract<Evt, { t: "clic" }> => v.t === "clic");
  const [cMenu, cSous] = cl;
  const menuOuvert = !!e.menu && f >= cMenu.at && f < cSous.at + 3;
  const ouvre = e.menu ? cSous.at + 3 : sc.debut + 4;
  const dernier = [...clics].reverse().find((c) => f >= c.at);
  const bump = dernier ? 1 + 0.16 * Math.max(0, 1 - (f - dernier.at) / 6) : 1;
  const bulle = pop(f, sc.debut + 14);
  const finBulle = sc.fin + 4;
  return (
    <Scene f={f} from={from} to={to}>
      <AbsoluteFill>
        <div style={{ position: "absolute", left: 60, right: 60, top: 70, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <K size={22}>Aujourd'hui</K>
            <span style={{ fontSize: 36, fontWeight: 500, letterSpacing: "-.02em" }}>Logiciel actuel</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span style={{ fontFamily: FONT.mono, fontSize: 84, fontWeight: 500, color: C.recText, transform: `scale(${bump})`, transformOrigin: "right bottom", display: "inline-block", lineHeight: 1 }}>{nClics}</span>
              <span style={{ fontSize: 30, color: C.muted2 }}>clics</span>
            </div>
            <span style={{ fontFamily: FONT.mono, fontSize: 22, color: C.muted2 }}>{frappes} frappes</span>
          </div>
        </div>
        <Lgc s={s} menuActif={menuOuvert ? menuIdx(e) : -1} />
        {menuOuvert && <MenuDeroulant e={e} survol={f >= cSous.at - 6} />}
        {f >= ouvre && <Modale e={e} sc={sc} f={f} ouvre={ouvre} />}
        <Cursor x={cur.x} y={cur.y} press={cur.press} ripple={cur.ripple} scale={1.3} />
        <span style={{ position: "absolute", right: 64, top: WIN.y + WIN.h + 12, fontFamily: FONT.mono, fontSize: 16, color: C.muted3 }}>saisie accélérée ×2</span>
        <div style={{ position: "absolute", left: 60, right: 60, top: WIN.y + WIN.h + 56, display: "flex", alignItems: "flex-start", gap: 20, opacity: bulle * (1 - ramp(f, finBulle - 8, finBulle)) }}>
          <Avatar initials={s.pendantQui ?? s.patient.initiales} size={60} />
          <div style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: "6px 22px 22px 22px", padding: "18px 26px", fontSize: 32, lineHeight: 1.3, color: C.ink2, transform: `translateY(${(1 - bulle) * 14}px)` }}>{s.pendant[i] ?? ""}</div>
        </div>
      </AbsoluteFill>
    </Scene>
  );
};
