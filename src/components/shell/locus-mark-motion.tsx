import { LOGO_DISCS, LOGO_VIEWBOX } from "./logo-discs";

/**
 * La marque Locus en mouvement, pour l'entrée : la même animation que le
 * loader des étapes de pensée de la bêta (`MarkBuilding` dans locus-app). Les
 * disques, triés par distance au centre, naissent un à un du centre vers
 * l'extérieur, la constellation se fige entière, puis se reconstruit. Rien
 * d'interactif ; sous `prefers-reduced-motion`, elle est fixe.
 */
export function LocusMarkMotion({ size = 160, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox={LOGO_VIEWBOX} fill="currentColor" aria-hidden="true" className={["locus-motion", className].filter(Boolean).join(" ")}>
      {LOGO_DISCS.map(([cx, cy, r], i) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} style={{ animationDelay: `${i * 22}ms` }} />
      ))}
    </svg>
  );
}
