import type { Dict } from "./config";

/** La console (`/[lang]/console`), derrière le mur : reprise de Main.dc.html. */
const fr = {
  meta: { title: "Locus Studio", description: "Le sandbox Locus : quatre espaces sur patients fictifs." },
  title: "Locus Studio",
  docs: "Documentation",
  sandbox: { title: "Sandbox", note: "En direct, sur patients fictifs" },
  cards: {
    lgcNatif: { text: "Un dossier patient pensé dès le départ avec Locus.", chips: ["Dossier patient", "Actions", "Ordonnances"], cta: "Essayer le futur du LGC" },
    integration: { text: "Les briques Locus dans un logiciel médical existant.", chips: ["Briques", "Sans code", "Appel API"], cta: "Brancher Locus sur votre LGC" },
    chatbot: { text: "Votre chatbot, avec et sans Locus, sur la même question.", chips: ["Côte à côte", "Sources citées"], cta: "Comparer avec et sans Locus" },
    scribe: { text: "La consultation dictée devient synthèse, puis recommandations.", chips: ["Dictée", "Synthèse", "Aide à la décision"], cta: "Passer de la dictée à la décision" },
  },
  updates: {
    title: "Nouveautés",
    items: [
      { date: "oct. 2026", title: "Tout en direct", text: "Les quatre sandbox appellent Locus à chaque geste." },
      { date: "oct. 2026", title: "Version anglaise", text: "Toute la plateforme en EN, avec le contexte français." },
      { date: "oct. 2026", title: "Sources ANSM", text: "Les documents ANSM rejoignent le corpus." },
    ],
  },
  resources: {
    sources: { text: "Le corpus de recommandations françaises interrogé par Locus.", cta: "Parcourir les sources" },
    docs: { text: "Intégrer Locus dans un logiciel, un chatbot ou un scribe.", cta: "Lire le guide d'intégration" },
    keys: { text: "Remises par l'équipe Locus à votre organisation.", cta: "Voir le format" },
  },
};

const en: typeof fr = {
  meta: { title: "Locus Studio", description: "The Locus sandbox: four spaces on fictional patients." },
  title: "Locus Studio",
  docs: "Documentation",
  sandbox: { title: "Sandbox", note: "Live, on fictional patients" },
  cards: {
    lgcNatif: { text: "A patient record designed with Locus from the start.", chips: ["Patient record", "Actions", "Prescriptions"], cta: "Try the future of the EHR" },
    integration: { text: "Locus blocks inside existing medical software.", chips: ["Blocks", "No code", "API call"], cta: "Plug Locus into your EHR" },
    chatbot: { text: "Your chatbot, with and without Locus, on the same question.", chips: ["Side by side", "Cited sources"], cta: "Compare with and without Locus" },
    scribe: { text: "A dictated visit becomes a summary, then recommendations.", chips: ["Dictation", "Summary", "Decision support"], cta: "Go from dictation to decision" },
  },
  updates: {
    title: "Updates",
    items: [
      { date: "Oct 2026", title: "Everything live", text: "The four sandboxes call Locus on every action." },
      { date: "Oct 2026", title: "English version", text: "The whole platform in EN, with the French context." },
      { date: "Oct 2026", title: "ANSM sources", text: "ANSM documents join the corpus." },
    ],
  },
  resources: {
    sources: { text: "The corpus of French guidelines Locus queries.", cta: "Browse sources" },
    docs: { text: "Integrate Locus in software, a chatbot or a scribe.", cta: "Read the integration guide" },
    keys: { text: "Issued to your organisation by the Locus team.", cta: "See the format" },
  },
};

export const home: Dict<typeof fr> = { fr, en };
export type HomeDict = typeof fr;
