import { Composition } from "remotion";
import { Rencontre } from "./Rencontre";
import { RENCONTRE, type Story } from "./story";
import { ANGINE, COHORTE, FROTTIS, INDICATEURS } from "./stories";
import { FPS, H, W } from "./theme";
import { timeline } from "./timeline";

/** Les motions des scripts v2 du 16/10/2026 (`stories.ts`). */
const AUTRES: [string, Story][] = [
  ["Angine", ANGINE],
  ["Frottis", FROTTIS],
  ["Cohorte", COHORTE],
  ["Indicateurs", INDICATEURS],
];

/**
 * Les motions de Studio. Une story = une composition ; le format 4:5 est celui
 * du fil LinkedIn (le plus haut qu'il affiche sans rogner).
 */
export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Rencontre" component={Rencontre} durationInFrames={timeline(RENCONTRE).duree} fps={FPS} width={W} height={H} defaultProps={{ story: RENCONTRE }} />
    {AUTRES.map(([id, story]) => (
      <Composition key={id} id={id} component={Rencontre} durationInFrames={timeline(story).duree} fps={FPS} width={W} height={H} defaultProps={{ story }} />
    ))}
  </>
);
