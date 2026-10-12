export interface Parti { titre: string; texte: string; studio: string; ailleurs: string }

/**
 * Le manifeste, deuxième version. La première décrivait un meilleur LGC :
 * une journée préparée, une boîte triée, un dossier à trois colonnes. C'était
 * encore un logiciel à écrans, et les éditeurs en place y arriveront dans
 * deux versions. Celle-ci décrit l'avenir, adoptable ou non tout de suite :
 * il n'y a plus d'écrans, il y a un fil et une commande.
 */
export const RUPTURES: Parti[] = [
  {
    titre: "Il n'y a plus de pages. Il y a un fil et une commande.",
    texte: "Un logiciel de cabinet, c'est aujourd'hui une collection d'écrans entre lesquels on circule : l'agenda, la boîte, le dossier, l'ordonnance, la facturation. L'avenir n'en a aucun. Il y a le fil du cabinet, où tout ce qui se passe s'inscrit dans le temps, tous patients confondus ; et une commande, Cmd+K, par laquelle tout entre : un nom, une question, une action, une consigne. On ne navigue plus. On dit.",
    studio: "L'écran unique : le fil au centre, le composer en bas, la scène à droite. Les anciens écrans restent accessibles en « vues héritées », pour la comparaison.",
    ailleurs: "Instinct : aucune nouvelle interface, un seul fil continu, pas de projets ni d'espaces. Dragon Copilot : « not locked into one interface ». Oracle Health : voice-first, « removing clicks ».",
  },
  {
    titre: "Le composer est conversationnel, mais il ne répond pas par du texte.",
    texte: "On parle au cabinet comme à un collègue : « renouvelle Delacroix et ajoute la dapagliflozine », « où en est son rein ? », « réponds à la mère d'Inès ». Mais la réponse n'est pas un paragraphe : c'est un objet signable ou une vue. Une ordonnance vérifiée, un courrier prêt, une courbe. Le clavier n'écrit jamais rien de clinique ; il commande. La souris signe.",
    studio: "Le composer reconnaît l'intention (patient, action, question, consigne) et la scène rend l'objet. Corriger se fait en parlant : « plutôt 3 mois », « retire la statine ».",
    ailleurs: "Cursor et Devin : l'unité de travail est le diff relu, pas le texte écrit. Granola : la note est le lieu du calcul, pas le chat. Attio : « Agent drafts ».",
  },
  {
    titre: "Les vues sont générées, pas dessinées.",
    texte: "« Mes diabétiques en retard » rend une table avec, par ligne, l'action prête. « Sa tension » rend une courbe avec les décisions qui l'ont jalonnée. « Ma matinée » rend l'ordre des décisions, pas l'ordre des heures. Aucune de ces vues n'existe comme écran : elles sont rendues depuis l'état du patient ou du cabinet, puis jetées. Le dossier n'est plus un lieu qu'on visite, c'est une mémoire qu'on interroge.",
    studio: "La scène : matinée, état d'un patient, courbe, table de patientèle, réponse sourcée, consultation en cours. Chacune est une projection du même jeu de données.",
    ailleurs: "Epic Ergo : « une interface qui se plie aux besoins du clinicien à l'instant t ». Hebbia Matrix : la grille est l'agent. healthcare.digital : un état patient continu dont la note est un document généré à la demande.",
  },
  {
    titre: "Le fil est le même pour le médecin, l'agent et le patient.",
    texte: "Le patient écrit à l'agent dans son fil ; le médecin voit ce qui le concerne dans le sien ; la consultation est un segment du fil à trois voix. L'agent répond seul à la logistique, prépare le clinique, et signe de son nom. La messagerie n'est pas une fonctionnalité. C'est le substrat.",
    studio: "Les messages des patients et les réponses de Locus sont des entrées du fil comme les autres ; la consultation s'y inscrit tour par tour ; « réponds » produit un message signable.",
    ailleurs: "Instinct : group chats, « trusted person network ». Epic Emmie et Art : le même agent côté patient et côté clinicien. Hippocratic : l'agent se commande comme un acte.",
  },
  {
    titre: "L'agent travaille entre deux messages, et le dit.",
    texte: "Il a un ordinateur. Il lit ce qui arrive, appelle le laboratoire, remplit amelipro, relance, prend rendez-vous, dépose au DMP, et rend compte dans le fil : en cours, en attente, fait, échoué. Le médecin n'ouvre pas le logiciel pour voir s'il y a du nouveau ; le fil le lui dit, au bon moment, avant la consultation et pas la veille au soir.",
    studio: "Les sessions de Locus : chaque signature déclenche un travail visible (transmission, dépôt, envoi), avec son état. Locus poste de lui-même avant un rendez-vous.",
    ailleurs: "Instinct : un ordinateur cloud persistant qui continue entre deux messages, et qui appelle. Heidi II : computer use sur les 4 à 6 systèmes d'un cabinet. Linear : sessions d'agent avec états visibles.",
  },
  {
    titre: "Le médecin programme son cabinet en phrases.",
    texte: "« Jamais d'antibiotique sans TROD chez l'enfant. » « Mes renouvellements sont bizone si ALD. » « Relance les HbA1c à six mois. » Ce ne sont pas des paramètres : ce sont des consignes, écrites dans le fil, versionnées, lisibles, appliquées partout, par l'agent, dès la prochaine proposition. Le logiciel est malléable.",
    studio: "« consigne : … » dans le composer. Les consignes sont listées, et le fil montre quand l'une d'elles s'applique.",
    ailleurs: "Canvas Studio : les cliniciens programment leurs workflows en langage naturel. Every : « the agent handles the how, developers only name the what ». Sierra Journeys : objectifs et garde-fous en prose.",
  },
  {
    titre: "Ce qui sort du cabinet se signe. Ce qui entre est une donnée, jamais une consigne.",
    texte: "L'agent a toute la latitude sur le réversible. Mais une ordonnance, un arrêt, un courrier, un message au patient partent avec un geste du médecin, toujours. Et ce qu'un patient, un laboratoire ou un confrère écrit est un fait à inscrire, jamais un ordre à exécuter. C'est la seule friction qu'on garde, et elle fait le produit.",
    studio: "Les verrous (ordonnance, arrêt) ; le bouton Signer ; Cmd+K peut arrêter Locus à tout moment ; les messages entrants n'ont aucun pouvoir sur les consignes.",
    ailleurs: "Les incidents Instinct la semaine du lancement (e-mail envoyé sans approbation, injection par e-mail). Linear : « an agent cannot be held accountable ». Corti : « safer autonomy », règles déterministes avant chaque action.",
  },
];

/** Compatibilité : la première version du manifeste reste lisible dans `docs/manifeste-v1.md`. */
export const PRISES_DE_PARTI = RUPTURES;
