import type { ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { ramp } from "../timeline";

/** Une scène dans sa fenêtre : elle monte en fondu, puis s'efface juste avant la suivante. */
export const Scene: React.FC<{ f: number; from: number; to: number; fadeIn?: number; fadeOut?: number; children: ReactNode }> = ({ f, from, to, fadeIn = 12, fadeOut = 10, children }) => {
  if (f < from - 1 || f > to) return null;
  const a = ramp(f, from, from + fadeIn);
  const b = fadeOut ? 1 - ramp(f, to - fadeOut, to) : 1;
  return (
    <AbsoluteFill style={{ opacity: Math.min(a, b), transform: `translateY(${(1 - a) * 24 - (1 - b) * 16}px)` }}>{children}</AbsoluteFill>
  );
};
