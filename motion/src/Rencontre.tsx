import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Apres } from "./scenes/Apres";
import { Avant } from "./scenes/Avant";
import { Compare, Hook, Outro, Plan, Transition } from "./scenes/Recit";
import type { Story } from "./story";
import { C, FONT } from "./theme";

/** Le motion « A versus B » d'une rencontre : le récit, le LGC d'aujourd'hui, le rembobinage, Locus Studio, le chiffre, le message. */
export const Rencontre: React.FC<{ story: Story }> = ({ story }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: FONT.sans, color: C.ink, WebkitFontSmoothing: "antialiased" }}>
      <Hook f={f} s={story} />
      <Plan f={f} s={story} />
      <Avant f={f} s={story} />
      <Transition f={f} s={story} />
      <Apres f={f} s={story} />
      <Compare f={f} s={story} />
      <Outro f={f} s={story} />
    </AbsoluteFill>
  );
};
