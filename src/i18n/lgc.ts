import type { Dict } from "./config";

/** Zone intégration LGC (`/[lang]/integration-lgc`) : MédiCab 7 et ses briques. Rempli par la PR « Intégration LGC ». */
const fr = {
  meta: { title: "Intégration LGC", description: "Les briques Locus dans un logiciel médical existant." },
};

const en: typeof fr = {
  meta: { title: "EHR integration", description: "Locus blocks inside existing medical software." },
};

export const lgc: Dict<typeof fr> = { fr, en };
export type LgcDict = typeof fr;
