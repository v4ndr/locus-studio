import type { Dict } from "./config";

/** L'accueil des sandbox (`/[lang]/console`), derrière le mur : quatre cartes, puis l'intégration. */
const fr = {
  meta: { title: "Locus Studio", description: "Le sandbox Locus : quatre espaces sur patients fictifs." },
  eyebrow: "Sandbox · patients fictifs",
  title: { a: "Locus", b: "Studio" },
  sandbox: "Les quatre sandbox",
  /** Quelques mots par carte, pas plus. */
  cards: {
    lgcNatif: "Pensé avec Locus",
    integration: "Dans votre logiciel",
    chatbot: "Avec et sans Locus",
    scribe: "De la dictée à la décision",
  },
  integrate: {
    eyebrow: "Intégrer",
    title: { a: "Intégrer", b: "Locus" },
    docs: "Lire la documentation",
    access: "Clé API · accès MCP",
    subject: "Clé API et accès MCP Locus",
  },
};

const en: typeof fr = {
  meta: { title: "Locus Studio", description: "The Locus sandbox: four spaces on fictional patients." },
  eyebrow: "Sandbox · fictional patients",
  title: { a: "Locus", b: "Studio" },
  sandbox: "The four sandboxes",
  cards: {
    lgcNatif: "Built with Locus",
    integration: "Inside your software",
    chatbot: "With and without Locus",
    scribe: "From dictation to decision",
  },
  integrate: {
    eyebrow: "Integrate",
    title: { a: "Integrate", b: "Locus" },
    docs: "Read the documentation",
    access: "API key · MCP access",
    subject: "Locus API key and MCP access",
  },
};

export const home: Dict<typeof fr> = { fr, en };
export type HomeDict = typeof fr;
