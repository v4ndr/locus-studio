import type { CSSProperties, ReactNode } from "react";
import { Img, staticFile } from "remotion";
import { C, FONT } from "../theme";

/** Le libellé en capitales mono de Studio (`.k`). */
export const K: React.FC<{ children: ReactNode; color?: string; size?: number; style?: CSSProperties }> = ({ children, color = C.muted2, size = 11, style }) => (
  <span style={{ fontFamily: FONT.mono, fontSize: size, letterSpacing: ".06em", textTransform: "uppercase", color, ...style }}>{children}</span>
);

/** Une touche (`.kbd`). */
export const Kbd: React.FC<{ children: ReactNode; dark?: boolean }> = ({ children, dark }) => (
  <span
    style={{
      fontFamily: FONT.mono,
      fontSize: 11,
      border: `1px solid ${dark ? "#3A3A37" : C.line}`,
      borderRadius: 5,
      padding: "2px 6px",
      color: dark ? "#F2F1EC" : C.muted,
      background: dark ? "#2A2A28" : C.paper,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);

export const Avatar: React.FC<{ initials: string; size?: number }> = ({ initials, size = 38 }) => (
  <span
    style={{
      display: "flex",
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
      width: size,
      height: size,
      borderRadius: 999,
      background: C.accentSoft,
      color: C.accent,
      fontWeight: 600,
      fontSize: size * 0.36,
    }}
  >
    {initials}
  </span>
);

/** Le wordmark de Studio : « locus/studio », locus en gras. */
export const Wordmark: React.FC<{ size?: number }> = ({ size = 17 }) => (
  <span style={{ fontSize: size, letterSpacing: "-.02em", color: C.ink }}>
    <b style={{ fontWeight: 700 }}>locus</b>
    <span style={{ color: C.muted2 }}>/</span>studio
  </span>
);

/** La constellation Locus (`public/locus-mark-black.svg`, la même que l'OG de Studio). */
export const Mark: React.FC<{ size: number; style?: CSSProperties }> = ({ size, style }) => (
  <Img src={staticFile("locus-mark-black.svg")} style={{ width: size, height: size * (330 / 335), ...style }} />
);

export const Check: React.FC<{ size?: number; color?: string; w?: number }> = ({ size = 14, color = "currentColor", w = 2.5 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const Chevron: React.FC = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.muted3} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

/**
 * Le curseur, avec l'onde d'un clic. `press` va de 0 à 1 pendant le clic
 * (le curseur s'enfonce), `ripple` de 0 à 1 juste après.
 */
export const Cursor: React.FC<{ x: number; y: number; press?: number; ripple?: number; scale?: number }> = ({ x, y, press = 0, ripple = 0, scale = 1 }) => (
  <div style={{ position: "absolute", left: x, top: y, pointerEvents: "none", zIndex: 50 }}>
    {ripple > 0 && ripple < 1 && (
      <div
        style={{
          position: "absolute",
          left: -22 * scale,
          top: -22 * scale,
          width: 44 * scale,
          height: 44 * scale,
          borderRadius: 999,
          border: `${2 * scale}px solid ${C.accent}`,
          opacity: 1 - ripple,
          transform: `scale(${0.4 + ripple * 0.9})`,
        }}
      />
    )}
    <svg
      width={26 * scale}
      height={30 * scale}
      viewBox="0 0 26 30"
      style={{ transform: `scale(${1 - press * 0.14})`, transformOrigin: "2px 2px", filter: "drop-shadow(0 2px 3px rgba(0,0,0,.25))" }}
    >
      <path d="M2 2 L2 24 L8 18.5 L12 27.5 L16 25.8 L12.2 17 L20 17 Z" fill={C.ink} stroke="#fff" strokeWidth={1.6} strokeLinejoin="round" />
    </svg>
  </div>
);
