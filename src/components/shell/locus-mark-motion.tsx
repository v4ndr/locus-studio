import type * as React from "react";

/**
 * La marque Locus en mouvement, pour l'entrée : les points s'allument du
 * centre vers le bout des branches, en boucle lente, et la marque tourne à
 * peine. Rien d'interactif ; sous `prefers-reduced-motion`, elle est fixe.
 * Géométrie reprise de `./locus-mark.tsx` ; `--rang` va du centre (0) au
 * bout de la branche (4). Chaque point est dans son `<g>` : l'animation
 * (`transform` CSS) écraserait sinon l'attribut `transform` qui le place.
 */
export function LocusMarkMotion({ size = 160, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 335 330" fill="currentColor" aria-hidden="true" className={["locus-motion", className].filter(Boolean).join(" ")}>
    <g style={{ "--rang": 4 } as React.CSSProperties}><ellipse cx="167" cy="16.5" rx="16" ry="16.5" /></g>
    <g style={{ "--rang": 3 } as React.CSSProperties}><circle cx="167" cy="63" r="12" /></g>
    <g style={{ "--rang": 2 } as React.CSSProperties}><circle cx="167" cy="104" r="8" /></g>
    <g style={{ "--rang": 2 } as React.CSSProperties}><circle cx="217" cy="47" r="8" /></g>
    <g style={{ "--rang": 2 } as React.CSSProperties}><circle cx="119" cy="46" r="8" /></g>
    <g style={{ "--rang": 0 } as React.CSSProperties}><circle cx="167.5" cy="139.5" r="4.5" /></g>
    <g style={{ "--rang": 1 } as React.CSSProperties}><circle cx="134.5" cy="83.5" r="5.5" /></g>
    <g style={{ "--rang": 1 } as React.CSSProperties}><circle cx="201.5" cy="83.5" r="5.5" /></g>
    <g style={{ "--rang": 0 } as React.CSSProperties}><circle cx="147.5" cy="115.5" r="3.5" /></g>
    <g style={{ "--rang": 0 } as React.CSSProperties}><circle cx="187.5" cy="115.5" r="3.5" /></g>
    <g style={{ "--rang": 4 } as React.CSSProperties}><ellipse cx="315.337" cy="164.466" rx="16" ry="16.5" transform="rotate(-12 315.337 164.466)" /></g>
    <g style={{ "--rang": 3 } as React.CSSProperties}><circle cx="268.839" cy="164.466" r="12" transform="rotate(-12 268.839 164.466)" /></g>
    <g style={{ "--rang": 2 } as React.CSSProperties}><circle cx="227.839" cy="164.466" r="8" transform="rotate(-12 227.839 164.466)" /></g>
    <g style={{ "--rang": 0 } as React.CSSProperties}><circle cx="192.337" cy="164.966" r="4.5" transform="rotate(-12 192.337 164.966)" /></g>
    <g style={{ "--rang": 4 } as React.CSSProperties}><ellipse cx="16" cy="16.5" rx="16" ry="16.5" transform="matrix(-0.978148 -0.207912 -0.207912 0.978148 38.1617 151.653)" /></g>
    <g style={{ "--rang": 3 } as React.CSSProperties}><circle cx="12" cy="12" r="12" transform="matrix(-0.978148 -0.207912 -0.207912 0.978148 79.8121 155.223)" /></g>
    <g style={{ "--rang": 2 } as React.CSSProperties}><circle cx="8" cy="8" r="8" transform="matrix(-0.978148 -0.207912 -0.207912 0.978148 116.067 158.304)" /></g>
    <g style={{ "--rang": 0 } as React.CSSProperties}><circle cx="4.5" cy="4.5" r="4.5" transform="matrix(-0.978148 -0.207912 -0.207912 0.978148 147.418 161.5)" /></g>
    <g style={{ "--rang": 4 } as React.CSSProperties}><ellipse cx="272.513" cy="60.2568" rx="16" ry="16.5" transform="rotate(-57 272.513 60.2568)" /></g>
    <g style={{ "--rang": 3 } as React.CSSProperties}><circle cx="239.633" cy="93.1362" r="12" transform="rotate(-57 239.633 93.1362)" /></g>
    <g style={{ "--rang": 2 } as React.CSSProperties}><circle cx="210.642" cy="122.127" r="8" transform="rotate(-57 210.642 122.127)" /></g>
    <g style={{ "--rang": 2 } as React.CSSProperties}><circle cx="286.303" cy="117.177" r="8" transform="rotate(-57 286.303 117.177)" /></g>
    <g style={{ "--rang": 0 } as React.CSSProperties}><circle cx="185.892" cy="147.585" r="4.5" transform="rotate(-57 185.892 147.585)" /></g>
    <g style={{ "--rang": 1 } as React.CSSProperties}><circle cx="249.532" cy="132.028" r="5.5" transform="rotate(-57 249.532 132.028)" /></g>
    <g style={{ "--rang": 0 } as React.CSSProperties}><circle cx="217.005" cy="144.756" r="3.5" transform="rotate(-57 217.005 144.756)" /></g>
    <g style={{ "--rang": 4 } as React.CSSProperties}><ellipse cx="16" cy="16.5" rx="16" ry="16.5" transform="matrix(-0.544639 -0.838671 -0.838671 0.544639 85.1089 63.689)" /></g>
    <g style={{ "--rang": 3 } as React.CSSProperties}><circle cx="12" cy="12" r="12" transform="matrix(-0.544639 -0.838671 -0.838671 0.544639 112.036 95.6646)" /></g>
    <g style={{ "--rang": 2 } as React.CSSProperties}><circle cx="8" cy="8" r="8" transform="matrix(-0.544639 -0.838671 -0.838671 0.544639 135.494 123.479)" /></g>
    <g style={{ "--rang": 2 } as React.CSSProperties}><circle cx="8" cy="8" r="8" transform="matrix(-0.544639 -0.838671 -0.838671 0.544639 59.8333 118.529)" /></g>
    <g style={{ "--rang": 0 } as React.CSSProperties}><circle cx="4.5" cy="4.5" r="4.5" transform="matrix(-0.544639 -0.838671 -0.838671 0.544639 155.402 147.908)" /></g>
    <g style={{ "--rang": 1 } as React.CSSProperties}><circle cx="5.5" cy="5.5" r="5.5" transform="matrix(-0.544639 -0.838671 -0.838671 0.544639 93.146 132.645)" /></g>
    <g style={{ "--rang": 0 } as React.CSSProperties}><circle cx="3.5" cy="3.5" r="3.5" transform="matrix(-0.544639 -0.838671 -0.838671 0.544639 122.906 144.785)" /></g>
    <g style={{ "--rang": 4 } as React.CSSProperties}><ellipse cx="16" cy="16.5" rx="16" ry="16.5" transform="matrix(1 0 0 -1 151.3 329.81)" /></g>
    <g style={{ "--rang": 3 } as React.CSSProperties}><circle cx="12" cy="12" r="12" transform="matrix(1 0 0 -1 155.3 278.81)" /></g>
    <g style={{ "--rang": 2 } as React.CSSProperties}><circle cx="8" cy="8" r="8" transform="matrix(1 0 0 -1 159.3 233.81)" /></g>
    <g style={{ "--rang": 2 } as React.CSSProperties}><circle cx="8" cy="8" r="8" transform="matrix(1 0 0 -1 209.3 290.81)" /></g>
    <g style={{ "--rang": 2 } as React.CSSProperties}><circle cx="8" cy="8" r="8" transform="matrix(1 0 0 -1 111.3 291.81)" /></g>
    <g style={{ "--rang": 0 } as React.CSSProperties}><circle cx="4.5" cy="4.5" r="4.5" transform="matrix(1 0 0 -1 163.3 194.81)" /></g>
    <g style={{ "--rang": 1 } as React.CSSProperties}><circle cx="5.5" cy="5.5" r="5.5" transform="matrix(1 0 0 -1 129.3 251.81)" /></g>
    <g style={{ "--rang": 1 } as React.CSSProperties}><circle cx="5.5" cy="5.5" r="5.5" transform="matrix(1 0 0 -1 196.3 251.81)" /></g>
    <g style={{ "--rang": 0 } as React.CSSProperties}><circle cx="3.5" cy="3.5" r="3.5" transform="matrix(1 0 0 -1 144.3 217.81)" /></g>
    <g style={{ "--rang": 0 } as React.CSSProperties}><circle cx="3.5" cy="3.5" r="3.5" transform="matrix(1 0 0 -1 184.3 217.81)" /></g>
    <g style={{ "--rang": 4 } as React.CSSProperties}><ellipse cx="16" cy="16.5" rx="16" ry="16.5" transform="matrix(0.544639 0.838671 0.838671 -0.544639 250.26 265.121)" /></g>
    <g style={{ "--rang": 3 } as React.CSSProperties}><circle cx="12" cy="12" r="12" transform="matrix(0.544639 0.838671 0.838671 -0.544639 223.333 233.145)" /></g>
    <g style={{ "--rang": 2 } as React.CSSProperties}><circle cx="8" cy="8" r="8" transform="matrix(0.544639 0.838671 0.838671 -0.544639 199.875 205.331)" /></g>
    <g style={{ "--rang": 2 } as React.CSSProperties}><circle cx="8" cy="8" r="8" transform="matrix(0.544639 0.838671 0.838671 -0.544639 275.536 210.28)" /></g>
    <g style={{ "--rang": 0 } as React.CSSProperties}><circle cx="4.5" cy="4.5" r="4.5" transform="matrix(0.544639 0.838671 0.838671 -0.544639 179.967 180.902)" /></g>
    <g style={{ "--rang": 1 } as React.CSSProperties}><circle cx="5.5" cy="5.5" r="5.5" transform="matrix(0.544639 0.838671 0.838671 -0.544639 242.223 196.165)" /></g>
    <g style={{ "--rang": 0 } as React.CSSProperties}><circle cx="3.5" cy="3.5" r="3.5" transform="matrix(0.544639 0.838671 0.838671 -0.544639 212.463 184.025)" /></g>
    <g style={{ "--rang": 4 } as React.CSSProperties}><ellipse cx="62.8563" cy="270.553" rx="16" ry="16.5" transform="rotate(123 62.8563 270.553)" /></g>
    <g style={{ "--rang": 3 } as React.CSSProperties}><circle cx="95.7359" cy="237.673" r="12" transform="rotate(123 95.7359 237.673)" /></g>
    <g style={{ "--rang": 2 } as React.CSSProperties}><circle cx="124.727" cy="208.683" r="8" transform="rotate(123 124.727 208.683)" /></g>
    <g style={{ "--rang": 2 } as React.CSSProperties}><circle cx="49.0665" cy="213.633" r="8" transform="rotate(123 49.0665 213.633)" /></g>
    <g style={{ "--rang": 0 } as React.CSSProperties}><circle cx="149.477" cy="183.225" r="4.5" transform="rotate(123 149.477 183.225)" /></g>
    <g style={{ "--rang": 1 } as React.CSSProperties}><circle cx="85.8375" cy="198.782" r="5.5" transform="rotate(123 85.8375 198.782)" /></g>
    <g style={{ "--rang": 0 } as React.CSSProperties}><circle cx="118.364" cy="186.054" r="3.5" transform="rotate(123 118.364 186.054)" /></g>
    </svg>
  );
}
