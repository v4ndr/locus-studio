# Manifeste, première version (15 prises de parti)

*Conservé pour mémoire. La deuxième version (sept ruptures) est dans `src/data/manifeste.ts` et sur `/manifeste`. Celle-ci décrivait un meilleur LGC ; l'autre décrit l'avenir.*

## 1. L'écran d'accueil est la journée préparée, pas l'agenda.

On n'ouvre pas un logiciel pour voir des créneaux. On l'ouvre pour savoir ce qui a changé, ce qui est dû, et ce qui attend une décision. L'agent a travaillé la nuit ; le matin, il rend compte.

**Dans le studio :** La page Journée : agenda à gauche, brief du patient sélectionné à droite, décisions à prendre en dessous.

**Vu ailleurs :** Heidi II « Home » (journée pré-chartée), Ambience Patient Summary, Epic Visit Topics, Granola Briefs.

## 2. Le dossier est un état continu ; la note est une vue.

La consultation n'est pas l'atome. L'atome est l'enregistrement, avec sa provenance. Le résumé vivant, la liste des problèmes, le traitement sont des projections de ce fil, maintenues par l'agent et validées par le médecin.

**Dans le studio :** Un seul type d'enveloppe pour tout (`BaseRecord`), un résumé vivant qui signale ce qui a changé depuis votre validation, un fil filtrable par provenance.

**Vu ailleurs :** healthcare.digital « the encounter is the atom is the problem », Ambience « highlight what changed », Hudes (KevinMD).

## 3. Review, not write.

L'unité de travail du médecin est le brouillon à signer, jamais la page blanche. Note, ordonnance, courrier, arrêt, réponse au patient, codage : tout arrive pré-fait, avec la justification et les sources. Il corrige ou signe.

**Dans le studio :** La `Proposal` : action, justification sourcée, charge (l'enregistrement complet), déclencheur, niveau d'autonomie. Partout la même carte.

**Vu ailleurs :** Dragon Copilot « Documents », Abridge lettres post-visite, Cursor/Devin (la PR comme unité), Attio « Agent drafts ».

## 4. La provenance est de première classe.

Quand la moitié du dossier est écrite par des agents, un dossier qui ne distingue pas « le médecin a dit », « l'agent a lu dans le courrier » et « le patient a déclaré » n'est plus lisible. Chaque enregistrement dit d'où il vient et qui l'a validé.

**Dans le studio :** `provenance.origin` (praticien / agent / patient / import / système), confiance, validation ; pastilles de couleur dans le fil ; « linked evidence » de la note vers la transcription.

**Vu ailleurs :** Abridge Linked Evidence, Corti provenance « boîte noire », affaire Pieces / Texas AG.

## 5. Trois niveaux d'autonomie, réglés par action, avec des verrous.

Observe, prépare, agit. L'administratif réversible peut être fait seul ; l'ordonnance et l'arrêt de travail ne montent jamais au-dessus de « prépare ». Une signature est une signature.

**Dans le studio :** La page Locus › Autonomie : la politique par type d'action, les verrous, et le niveau appliqué visible sur chaque proposition.

**Vu ailleurs :** Epic Penny (auto-code si confiance haute), Heidi « configurable friction », Oracle « queue suggested actions », incidents Instinct.

## 6. L'agent est un collègue nommé, délégué, jamais responsable.

Il a un prénom, une file de travail, un journal. On lui délègue ; on ne lui assigne pas. Il se déclare agent quand il écrit au patient. Et chaque rejet est une correction qu'il retient.

**Dans le studio :** Locus : file « à trancher », « fait », journal append-only ; signature « Locus, pour le Dr Laurent » dans les messages.

**Vu ailleurs :** Linear Agent Interaction Guidelines (« an agent cannot be held accountable »), Hippocratic « nurse orders AI agent ».

## 7. Inbox-first : l'ordre est l'urgence, pas l'heure.

Biologies, courriers, messages : tout est lu avant vous, résumé, extrait, trié. L'objectif n'est pas « inbox zéro », c'est que rien ne vous ait échappé et que chaque élément vienne avec ce qu'il faut en faire.

**Dans le studio :** La Réception : urgence proposée, lecture de l'agent (résumé, faits extraits, points d'attention), propositions attachées, réponse rédigée.

**Vu ailleurs :** Epic In Basket (1 M de brouillons/mois), AMA « inbox zero is the wrong goal », Lifen (classification).

## 8. Routines sur la patientèle, pas seulement sur le patient.

« Chaque dimanche, les diabétiques sans HbA1c depuis six mois. » Une règle en français, un moment, une action, une autonomie. L'agent passe sur tout le panel et rend compte. C'est aussi la mécanique du Forfait Médecin Traitant.

**Dans le studio :** La page Routines : cinq routines calculées en direct sur le jeu de données, et le champ pour en écrire une.

**Vu ailleurs :** Heidi Routines, Notion Custom Agents, Attio Workflows, téléservice amelipro « Suivi prévention ».

## 9. Les téléservices disparaissent de l'écran.

INS, FSE, SCOR, AAT, DMP, ordonnance numérique, MSSanté : ce sont des effets de bord de la clôture d'une consultation, pas des écrans. L'agent les exécute ; le médecin voit un reçu.

**Dans le studio :** À la clôture : codage proposé, FSE télétransmise, dépôts Mon Espace Santé listés. Tout est mocké ; les objets d'échange sont modélisés.

**Vu ailleurs :** Ségur vague 2 (alimentation automatique, PSC unique), plaintes URPS sur INSi et DMP, grève de janvier 2026.

## 10. La preuve est toujours à un clic.

Chaque affirmation de l'agent renvoie à une recommandation, un RCP, un document du dossier ou un tour de la transcription. Pas de confiance sans source.

**Dans le studio :** Renvois [n] partout, rubriques RCP via `/v2/drugs`, sources de locus-core dépliables sous chaque réponse.

**Vu ailleurs :** Locus (la traçabilité à la source est sa raison d'être), Abridge, OpenEvidence.

## 11. Un seul modèle d'actions pour l'UI, l'agent et l'API.

Ce que l'interface sait faire, l'agent sait le faire par la même capacité, avec les mêmes permissions et le même journal. Pas de « chat à côté » : le chat est une entrée parmi d'autres vers les mêmes actions.

**Dans le studio :** Le registre des capacités (`src/locus/capabilities.ts`) et la `Proposal` comme unité d'exécution ; le fil Locus produit des propositions, pas du texte.

**Vu ailleurs :** Builder.io « agent-native architecture », athenahealth MCP, Corti MCP/A2A.

## 12. La mémoire du cabinet est l'actif.

Préférences implicites, corrections, modèles de courriers, protocoles locaux : une correction n'est jamais refaite deux fois. Le logiciel apprend le cabinet.

**Dans le studio :** Projeté : les rejets sont tracés comme corrections ; la mémoire n'est pas encore modélisée.

**Vu ailleurs :** Heidi memory, Sierra Agent Data Platform, Attio Universal Context, Granola Recipes.

## 13. Le médecin programme son cabinet en français.

Pas de configuration, pas de formulaires : des routines et des consignes écrites comme on parle. Le logiciel est malléable.

**Dans le studio :** Le champ « Nouvelle routine » ; projeté dans locus-core.

**Vu ailleurs :** Canvas Studio, Epic Agent Factory, Harvey Agent Builder, Every « gardening over engineering ».

## 14. Le patient parle à l'agent, dans le périmètre que le médecin fixe.

La messagerie n'est plus une fonctionnalité, c'est l'entrée principale. L'agent trie, répond à la logistique seul, prépare le clinique, et prend rendez-vous. Le consentement du patient fixe jusqu'où il peut aller.

**Dans le studio :** `consentement.messagerieAgent` (aucune / logistique / clinique-validé / clinique) sur chaque patient ; rendez-vous pris par Locus marqués comme tels.

**Vu ailleurs :** Doctolib assistant téléphonique, Epic Emmie, Hippocratic AI, Instinct (l'agent joignable là où on est déjà).

## 15. Tout est mocké, rien n'est faux.

Sesam-Vitale, INSi, MSSanté, DMP, ordonnance numérique, LAP : les objets d'échange sont fidèles, les connecteurs sont des simulations. C'est un projet de recherche : il doit être vrai sur les usages, pas sur les certificats.

**Dans le studio :** Les types dans `src/domain/types.ts` ; aucune dépendance externe ; un backend réel optionnel (locus-core).

**Vu ailleurs :** Le choix inverse de tous les éditeurs référencés Ségur — et c'est le point.
