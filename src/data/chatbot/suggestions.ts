import type { Lang } from "@/i18n/config";

/**
 * Les questions suggérées du chatbot sourcé : un clic pose la question
 * complète, en direct, aux deux colonnes. Patients fictifs. Rien n'est
 * rejoué : la réponse est celle que les deux chatbots rendent à l'instant.
 */

export interface Suggestion {
  id: string;
  /** Le libellé court de la pastille. */
  label: Record<Lang, string>;
  /** La question envoyée. */
  question: Record<Lang, string>;
}

export const SUGGESTIONS: Suggestion[] = [
  {
    id: "ketoprofene",
    label: { fr: "Kétoprofène sous IEC et furosémide à 74 ans ?", en: "Ketoprofen with an ACE inhibitor and furosemide at 74?" },
    question: {
      fr: "Patient de 74 ans sous ramipril et furosémide, lombalgie aiguë depuis 3 jours. Je peux lui prescrire du kétoprofène ?",
      en: "74-year-old patient on ramipril and furosemide, acute low back pain for 3 days. Can I prescribe ketoprofen?",
    },
  },
  {
    id: "ldl-infarctus",
    label: { fr: "Cible de LDL-c après un infarctus ?", en: "LDL-c target after a myocardial infarction?" },
    question: {
      fr: "Patient de 58 ans, infarctus du myocarde il y a deux mois. Quelle cible de LDL-c viser, et comment l'atteindre ?",
      en: "58-year-old patient, myocardial infarction two months ago. Which LDL-c target, and how to reach it?",
    },
  },
  {
    id: "angine-allergie",
    label: { fr: "Angine et allergie à la pénicilline : quel antibiotique ?", en: "Sore throat with penicillin allergy: which antibiotic?" },
    question: {
      fr: "Femme de 32 ans, angine depuis 2 jours, se dit allergique à la pénicilline. Quel antibiotique prescrire ?",
      en: "32-year-old woman, sore throat for 2 days, reports a penicillin allergy. Which antibiotic should I prescribe?",
    },
  },
];
