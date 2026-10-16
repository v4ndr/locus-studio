import "@fontsource/geist-sans/400.css";
import "@fontsource/geist-sans/500.css";
import "@fontsource/geist-sans/600.css";
import "@fontsource/geist-sans/700.css";
import "@fontsource/geist-mono/400.css";
import "@fontsource/geist-mono/500.css";

/**
 * Les jetons de Locus Studio, recopiés de `src/app/globals.css` (thème clair) :
 * clair, calme, une encre, un bleu. Si l'app change de palette, on change ici.
 */
export const C = {
  bg: "#FBFBFA",
  paper: "#FFFFFF",
  ink: "#111111",
  ink2: "#33332F",
  ink3: "#44443F",
  muted: "#55554F",
  muted2: "#6B6B66",
  muted3: "#73736D",
  line: "#E3E2DC",
  line2: "#ECEBE6",
  line3: "#E8E7E1",
  line4: "#EFEEE9",
  hover: "#F2F1EC",
  soft: "#F0EFEA",
  accent: "#1A4DFF",
  accentSoft: "#E4E9FF",
  accentSoft2: "#F2F4FF",
  accentLine: "#D7DEFF",
  ok: "#1F6B3A",
  okSoft: "#E6F4EA",
  warn: "#A35400",
  rec: "#D93A2B",
  recText: "#B3261E",
  recSoft: "#FDECEA",
  grayDot: "#C7C6BF",
} as const;

export const SHADOW = "0 1px 0 rgba(0,0,0,.02), 0 8px 24px rgba(17,17,17,.06)";
export const SHADOW_ACCENT = "0 8px 24px rgba(26,77,255,.08)";

export const FONT = {
  sans: "'Geist Sans', 'Geist', system-ui, sans-serif",
  mono: "'Geist Mono', ui-monospace, monospace",
} as const;

export const FPS = 30;
/** 4:5, le format qui prend le plus de place dans le fil LinkedIn. */
export const W = 1080;
export const H = 1350;
