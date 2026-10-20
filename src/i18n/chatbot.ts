import type { Dict } from "./config";

/** Zone chatbot sourcé (`/[lang]/chatbot`). Rempli par la PR « Chatbot ». */
const fr = {
  meta: { title: "Chatbot sourcé", description: "Votre chatbot, avec et sans Locus, sur la même question." },
};

const en: typeof fr = {
  meta: { title: "Grounded chatbot", description: "Your chatbot, with and without Locus, on the same question." },
};

export const chatbot: Dict<typeof fr> = { fr, en };
export type ChatbotDict = typeof fr;
