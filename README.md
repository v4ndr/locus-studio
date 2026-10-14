# locus-studio — le LGC agentique

Un cabinet de médecine générale **AI-native**, construit comme un vrai produit
web, pour montrer l'avenir, adoptable ou non tout de suite : **il n'y a plus de
pages, il y a une rencontre et une commande**. Le médecin dit ; l'agent (qui s'appelle
Locus) compose ; le médecin signe. Projet de recherche ouvert, sans prétention
réglementaire — toutes les dépendances externes (SESAM-Vitale, INSi, MSSanté,
DMP, ordonnance numérique, LAP) sont **mockées** ; le backend clinique, lui,
est réel : **[locus-core](https://github.com/v4ndr/locus-core)**.

## Le parcours (`/`)

Clair, centré, une seule colonne, et sur chaque écran **une seule entrée** :
l'omni-saisie. Une rencontre se déroule en cinq temps, dans l'ordre du design :

| Temps | Route | Ce qu'on y fait |
|---|---|---|
| 0 · Qui voyez-vous ? | `/` | une recherche (`⌘K`), l'agenda du matin, rien d'autre |
| 1 · Overview | `/p/[id]` | le dossier en une phrase, trois choses à noter, le reste à un clic ; raccourcis préparés (RDV, mail, ordonnance) et questions à locus-core dans une carte à valider |
| 2 · Consultation | `/p/[id]/rencontre` | la dictée au micro (reconnaissance vocale du navigateur) ou simulée (le script du patient, `⌥ espace`) remplit un **transcript** ; à l'arrêt, une **passe de synthèse** en fait une note très courte (Claude, ou des règles à sec), que l'on corrige ; le transcript reste consultable, « Régénérer la note » repart de lui ; on peut aussi écrire ou coller la note directement ; `⌘⏎` génère les actions via le composer, « Signer » enregistre la note ; chrono saisie / composition / validation |
| 3 · Actions, scénario du design | `/p/[id]/actions` | les documents scriptés du patient, une question avant de signer (accessible depuis la consultation des patients scriptés) |
| 4 · Signature | `/p/[id]/signature` | la liste avec les destinations, l'aperçu papier, un geste (e-CPS) ; puis « rencontre clôturée » |
| 1b · Tout | `/p/[id]/documents` | tout le dossier en une table, filtrable ; chaque ligne s'ouvre |
| 1c · Un document | `/p/[id]/documents/[docId]` | la lecture de Locus d'abord, puis le document (résultats, lignes d'ordonnance, courrier, note de consultation), puis sa provenance ; `←` `→` pour passer au voisin |
| Les boîtes | `/inbox/courriers` · `/inbox/bio` · `/inbox/messages` | trois boîtes — en France le courrier, la biologie et les messages n'arrivent pas au même endroit — triées par Locus : à voir aujourd'hui, cette semaine, pour info. Les messages (patients, confrères, secrétariat, pharmacie) s'ouvrent en place, réponse déjà préparée |

Sur chaque écran : le wordmark ramène à l'accueil, la flèche (ou `esc`)
remonte d'un cran, `⌘K` prend le composer, et au focus le composer propose
des exemples de ce qu'on peut lui demander (ordo, rendez-vous, mail, courrier,
arrêt, question). Clair ou sombre, au choix, mémorisé.

## Le composer (`⌘K`)

Ce qu'on tape ne reçoit pas une réponse rédigée : il revient un **plan
d'actions**, typé sur les objets du LGC, à valider d'un geste (`⌘⏎`). Une
boucle d'agent côté serveur (`/api/compose`, NDJSON) donne à **Claude**
(`claude-sonnet-5-5`) la demande, l'écran et le dossier (la même projection
`patient_ehr` que locus-core reçoit), et des **outils** qui sont les actions du
logiciel : `proposer_ordonnance`, `proposer_rdv`, `proposer_message`,
`proposer_courrier`, `proposer_arret`, `inscrire_au_dossier`, `ouvrir`,
`lire_document`. **Locus (locus-core) est un outil parmi eux** (`locus_retrieve`) :
toute question clinique passe par lui, et sa réponse alimente la synthèse et les
actions qu'elle implique. Rien n'est écrit
ni envoyé par le serveur ; chaque action est une proposition, comme après la
dictée.

```bash
ANTHROPIC_API_KEY=sk-ant-…   # vide → composeur à règles : même plan, compréhension plus courte
```

Le code : `src/locus/compose/` (contrat, contexte, outils, boucle, règles) et
`src/components/studio/compose.tsx` (la carte du plan).

## Le cabinet local : tester en conditions réelles

Pour une journée de consultation avec de faux noms, sans carte Vitale et sans
base : les dossiers créés vivent dans le navigateur (localStorage) et
s'exportent en JSON.

| Route | Ce qu'on y fait |
|---|---|
| `/nouveau` | créer un dossier : identité déclarative, antécédents, allergies, traitements (une ligne chacun) |
| `/d` | le cabinet local : la liste, export / import JSON |
| `/d/[id]` | le dossier : overview, fiche modifiable, les notes, le composer ; **+ Consultation** ouvre le même éditeur |

La **note** s'écrit ou se dicte (ou on colle la sortie d'un scribe), puis
`⌘⏎` la **décline en actions** : ce qu'elle prescrit devient ordonnance, arrêt,
courrier, rendez-vous, message — à signer d'un geste ; ce qu'elle révèle pour
la fiche (un antécédent, une allergie, un traitement de fond) devient « Ajouter
au dossier ». La conclusion reste dans la note : rien n'est « versé » nulle part.
« + Ajouter » complète le plan à la main (ordonnance, examen, arrêt, courrier…),
et « + Consultation » ouvre aussi, sans note, une ordonnance ou un arrêt seul. Chaque action se **modifie** en place (titre, champs, « marquer
relu ») ou se **retire** ; si la note change, « Régénérer » recompose. La
consultation est un **brouillon persistant** : quitter l'écran ne perd rien,
le dossier affiche « N actions à valider · Reprendre », l'accueil liste les
consultations en cours. À la signature, le compte rendu dit ce qui est parti
où. Un **chrono** mesure la saisie, la composition et la validation (il
s'arrête quand l'onglet n'est plus visible).

Une note signée se **modifie en place** (« Modifier » dans le dossier) : ses
documents reviennent dans l'éditeur, chacun s'ouvre tel qu'il a été rendu et
envoyé (en-tête, patient, corps, signature e-CPS), se corrige dans un
formulaire léger avec le papier à côté, et « Enregistrer » **renvoie ce qui a
changé** puis revient au dossier — le reste est marqué inchangé. La modification a son propre
brouillon : ouvrir « Modifier » n'écrase jamais une consultation en cours.

Le **garde-fou allergie** compare chaque ligne d'ordonnance aux allergies du
dossier par classe (pénicillines ↔ amoxicilline, AINS ↔ ibuprofène…) et par
nom ; l'alerte suit le document (ligne, panneau, mobile) et le garde « à
relire » tant qu'elle existe. Les règles du composeur à sec lisent la
**conduite à tenir** d'une note structurée (pas l'anamnèse), respectent les
négations (« sorties non autorisées », « pas de courrier ») et prennent le
motif d'un arrêt dans la conclusion, jamais dans un antécédent. Le composer reçoit le dossier local avec la demande
(le serveur n'a pas de base) et le projette comme un `patient_ehr`.

Le scénario complet est dans [`docs/scenes.md`](docs/scenes.md) (patiente :
Claire Moreau). Les sept ruptures sont dans [`src/data/manifeste.ts`](src/data/manifeste.ts).
Les 22 dossiers sont tous écrits à la même profondeur : antécédents, traitements,
biologies, documents avec leur texte, consultations, briefing, propositions,
rencontre scriptée, messages.

## Démarrer

```bash
pnpm install
pnpm dev            # http://localhost:3000 — tout fonctionne à sec (mode simulation)
```

Pour brancher le vrai retrieving :

```bash
cp .env.example .env.local
# LOCUS_CORE_URL=http://localhost:8000   (+ LOCUS_API_KEY=lsk_… ou core en Sandbox)
```

| Mode | Déclenché par | Ce qui se passe |
|---|---|---|
| `simulation` | pas de `LOCUS_CORE_URL` | l'agent répond depuis une base locale (6 thèmes), même forme que core |
| `keyless` | URL sans clé | la Sandbox `/console/retrieve` de core (même retrieving, pas de trace) |
| `core` | URL + `LOCUS_API_KEY` | `/v2/*`, la vraie API, avec traces et feedback |

Scripts : `dev`, `build`, `start`, `typecheck`, `test`.

---

L'agent du cabinet s'appelle **Locus**. Il signe « Locus, pour le Dr Vandepitterie ».

---

## Structure

```
src/
├── studio/                types et projection serveur du parcours (accueil, vue patient, document, boîtes)
├── components/studio/     chrome, home, dossier, rencontre, actions, signature, documents, document, inbox, compose (la carte du plan), note (l'éditeur + chrono), local (patient sans carte Vitale, cabinet local)
├── domain/types.ts        le modèle du dossier — UNE enveloppe pour tout, provenance de 1re classe
├── data/                  le jeu de données : cabinet, horloge fixe (jeudi 15 oct. 2026), 22 patients
│   ├── patients/          8 patients « héros » écrits à la main (dont Claire Moreau, la patiente du design), 14 autres décrits dans seeds.ts et construits par secondaires.ts
│   ├── rencontres.ts      la dictée scriptée, les actions détectées, les documents générés, la question
│   └── manifeste.ts       les prises de parti
├── locus/                 l'intégration locus-core
│   ├── compose/           le composer ⌘K : Claude + les outils du LGC, Locus en outil ; composeur à règles sans clé
│   ├── contract.ts        le sous-ensemble du contrat v2 que le studio lit
│   ├── client.server.ts   le client (serveur uniquement), 3 modes
│   ├── ehr.ts             la projection dossier → patient_ehr
│   ├── simulation.ts      le mode à sec
│   └── capabilities.ts    le registre : ce que core sert, ce que le studio compose, ce qui est projeté
├── app/                   Next 16 App Router — `/`, `/p/[id]/*`, `/inbox/[box]`, BFF (/api/locus/*, /api/compose)
├── components/            l'interface (Tailwind v4, Geist, aucun kit)
├── store/rencontre.tsx    l'état de session (réponses, signatures), persisté en localStorage
└── store/cabinet.tsx      le cabinet local : patients créés sans carte Vitale, notes, chrono, export JSON
docs/
├── scenes.md              la rencontre en cinq temps, écran par écran
├── manifeste-v1.md        la première version du manifeste (un meilleur LGC), conservée
├── integration-locus.md   le contrat, les modes, les capacités projetées avec leur spec
├── modele-de-donnees.md   le dossier, enregistrement par enregistrement
└── recherche/             agentic healthcare (monde) · LGC français (marché, dossier, interop, IA)
```

**Pas de base de données.** Le jeu de données est du TypeScript ; ce qui change
pendant une session (une proposition validée, un message vu, un niveau
d'autonomie) vit côté client. C'est voulu : une maquette qu'on clone et qui
tourne, pas une infrastructure.

---

## Le modèle, en trois phrases

Tout est un **enregistrement** (`BaseRecord`) : identifiant, patient, type,
**provenance** (praticien / agent / patient / import / système, avec confiance
et validation), statut (actif / proposé / brouillon / résolu…), version de
schéma. Le dossier est un **fil** append-only de ces enregistrements, et le
résumé vivant, les problèmes, le traitement sont des **projections** tenues par
l'agent et validées par le praticien. L'unité de travail de l'agent est la
**`Proposal`** : une action, une justification sourcée, la charge (l'enregistrement
complet qu'il propose), le déclencheur, le niveau d'autonomie — et c'est la
même carte partout dans l'interface.

Détail : [`docs/modele-de-donnees.md`](docs/modele-de-donnees.md).

---

## Locus partout

Le studio n'a qu'un backend : locus-core. Ce qui est **servi** aujourd'hui —
retrieve contextualisé (`patient_ehr`), RCP par CIS, unités logiques,
`ehr_additions` qui redeviennent des propositions d'inscription au dossier —
est branché. Ce qui est **composé** (briefing, vérification LAP) l'est à partir
de ces briques. Ce qui est **projeté** (scribe, lecture de documents,
ordonnance, courrier, triage, actions, résumé vivant) est simulé dans le jeu
de données et spécifié pour core dans
[`docs/integration-locus.md`](docs/integration-locus.md), qui dit honnêtement
d'où vient chaque capacité.

Les règles (MKU) de Locus ne franchissent jamais le navigateur : le BFF retire
tout ce qui n'est pas document, extrait ou RCP.

---

## Ce que ce n'est pas

Pas un dispositif médical, pas un LAP certifié, pas un logiciel Ségur. Aucune
donnée réelle : les patients sont inventés, les RPPS, NIR et numéros
d'ordonnance sont factices. La sécurité et la conformité sont volontairement
hors sujet — c'est un projet de recherche sur les **usages**.
