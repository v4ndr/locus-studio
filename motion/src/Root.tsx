import { Composition } from "remotion";
import { Rencontre } from "./Rencontre";
import { RENCONTRE } from "./story";
import { FPS, H, W } from "./theme";
import { DURATION } from "./timeline";

/**
 * Les motions de Studio. Une story = une composition ; le format 4:5 est celui
 * du fil LinkedIn (le plus haut qu'il affiche sans rogner).
 */
export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Rencontre" component={Rencontre} durationInFrames={DURATION} fps={FPS} width={W} height={H} defaultProps={{ story: RENCONTRE }} />
  </>
);
