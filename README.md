# locus-studio — le sandbox Locus

Locus Studio est le **sandbox B2B de Locus** : quatre espaces publics, sur
patients fictifs, en scénarios rejoués ; l'accès live est sur invitation.
Identité visuelle « Noir » (console, sombre par défaut), interface en
français et en anglais. Le backend clinique est réel :
**[locus-core](https://github.com/v4ndr/locus-core)**.

| Route | Contenu |
|---|---|
| `/[lang]` | accueil : les quatre outils à égalité, nouveautés, ressources |
| `/[lang]/lgc-natif/*` | **LGC natif IA** : le Studio historique (décrit ci-dessous), déplacé ici |
| `/[lang]/integration-lgc` | **Intégration LGC** (à venir) |
| `/[lang]/chatbot` | **Chatbot sourcé** (à venir) |
| `/[lang]/scribe` | **Scribe + aide à la décision** (à venir) |
| `/[lang]/acces` | demande d'accès et connexion (à venir) |

`[lang]` vaut `fr` ou `en` ; les slugs sont les mêmes dans les deux langues.
`/` redirige selon le cookie de la bascule FR/EN, puis `Accept-Language`
(défaut `fr`). Les anciennes URL (`/p/*`, `/inbox/*`, `/nouveau`, `/d/*`)
redirigent en 308 vers `/[lang]/lgc-natif/…` (`src/proxy.ts`).

## La coque et l'identité

- **Jetons** : `src/app/globals.css`, repris de `identite/tokens.css` aux noms
  shadcn/ui (`--background`, `--foreground`, `--card`, `--muted`,
  `--primary`, `--border`, `--ring`, `--sidebar`, `--brand`…), mappés dans
  `@theme` (Tailwind v4 : `bg-background`, `text-muted-foreground`,
  `border-border`…). Sombre par défaut ; clair via `data-mode="light"` sur
  `<html>`, mémorisé en `localStorage` (`ls-mode`) et appliqué avant le
  premier rendu (`src/components/shell/theme.tsx`). Teal (`--brand`) réservé
  aux états actifs. Les anciens jetons du Studio (`ink`, `paper`, `line`,
  `dim`, `agent`…) sont réalignés sur ces jetons.
- **Coque** : `src/components/shell/` — `app-shell.tsx` (sidebar de 248 px,
  tiroir sous 820 px, barre mobile avec le bandeau sandbox, ⌘K),
  `command-palette.tsx`, `graph-background.tsx` (le fond en graphe),
  `page-inner.tsx` (`PageInner`, `PageHead` : la colonne de 1120 px),
  `coming-soon.tsx`, `locus-mark.tsx`, `tool-icons.ts`, `theme.tsx`.
- **Composants de base** : `src/components/ui/` — `button.tsx` (`Button`,
  `ButtonLink`, `buttonClass`), `card.tsx` (`Card`, `CardBody`, `CardIcon`,
  `CardTitle`, `CardText`, `CardAction`, `CardFooter`, `Box`), `badge.tsx`
  (`Badge`, `StatusDot`), `input.tsx` (`Input`, `Textarea`, `Select`,
  `Field`), `switch.tsx`, `segmented.tsx`, `tooltip.tsx`, `kbd.tsx`. Icônes
  `lucide-react` en 16 px.
- **Dictionnaires** : `src/i18n/`, un fichier par zone (`common`, `home`,
  `acces`, `chatbot`, `lgc`, `scribe`, `studio`), chacun `{ fr, en }` où
  l'anglais a le type du français. Côté serveur : `home[lang].title` ; côté
  client : `const lang = useLang()` (`src/i18n/lang.tsx`). Les routes et les
  noms des outils : `src/i18n/routes.ts` (`route(lang, "chatbot")`) et
  `common[lang].tools`. Seule l'interface est traduite : patients, documents
  et corpus restent en français.
- **Zones** : les composants de chaque espace vivent dans `src/sandbox/<zone>/`
  (`home`, `acces`, `integration-lgc`, `chatbot`, `scribe`).

## LGC natif IA : le parcours (`/[lang]/lgc-natif`)

Un cabinet de médecine générale **AI-native** : **il n'y a plus de pages, il
y a une rencontre et une commande**. Le médecin dit ; l'agent (qui s'appelle
Locus) compose ; le médecin signe. Toutes les dépendances externes
(SESAM-Vitale, INSi, MSSanté, DMP, ordonnance numérique, LAP) sont
**mockées**. Les chemins ci-dessous sont relatifs à `/[lang]/lgc-natif` ;
`src/components/studio/nav.tsx` traduit les liens historiques du Studio.

Clair, centré, une seule colonne, et sur chaque écran **une seule entrée** :
l'omni-saisie. Une rencontre se déroule en cinq temps, dans l'ordre du design :

| Temps | Route | Ce qu'on y fait |
|---|---|---|
| 0 · Qui voyez-vous ? | `/` | une recherche (`⌘K`), l'agenda du matin, rien d'autre |
| 1 · Overview | `/p/[id]` | le dossier en une phrase, trois choses à noter, le reste à un clic ; raccourcis préparés (RDV, mail, ordonnance) et questions à locus-core dans une carte à valider |
| 2 · Consultation | `/p/[id]/rencontre` | la dictée au micro (reconnaissance vocale du navigateur) ou simulée (le script du patient, `⌥ espace`) remplit un **transcript** ; à l'arrêt, une **passe de synthèse** en fait une note très courte (le modèle, ou des règles à sec), que l'on corrige ; le transcript reste consultable, « Régénérer la note » repart de lui ; on peut aussi écrire ou coller la note directement ; `⌘⏎` génère les actions via le composer, « Signer » enregistre la note |
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
boucle d'agent côté serveur (`/api/compose`, NDJSON) donne à un **modèle
frontière** (côté serveur uniquement, jamais nommé dans l'interface) la demande, l'écran et le dossier (la même projection
`patient_ehr` que locus-core reçoit), et des **outils** qui sont les actions du
logiciel : `proposer_ordonnance`, `proposer_rdv`, `proposer_message`,
`proposer_courrier`, `proposer_arret`, `inscrire_au_dossier`, `ouvrir`,
`lire_document`. **Locus (locus-core) est un outil parmi eux** (`locus_retrieve`) :
toute question clinique passe par lui, et sa réponse alimente la synthèse et les
actions qu'elle implique. Rien n'est écrit
ni envoyé par le serveur ; chaque action est une proposition, comme après la
dictée.

```bash
ANTHROPIC_API_KEY=…   # vide → composeur à règles : même plan, compréhension plus courte
```

Le code : `src/locus/compose/` (contrat, contexte, outils, boucle, règles) et
`src/components/studio/compose.tsx` (la carte du plan).

## Le cabinet local : tester en conditions réelles (masqué du sandbox public)

Le sandbox public n'affiche plus d'entrée vers ces écrans (outils de test
personnels) ; ils restent joignables par leur URL, et seront réservés aux
comptes connectés avec la PR « Accès ».

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
où.

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

Toutes les variables sont décrites dans `.env.example` : core
(`LOCUS_CORE_URL`, `LOCUS_API_KEY`), composer (`ANTHROPIC_API_KEY`), routes
live (`STUDIO_LIVE_TOKEN`, `STUDIO_LIVE_LOCK`, `STUDIO_RATE_LIMIT_PER_HOUR`,
`STUDIO_REPLAY_RATE_LIMIT_PER_HOUR`, `UPSTASH_REDIS_REST_URL`,
`UPSTASH_REDIS_REST_TOKEN`, `STUDIO_MKU_ALLOWLIST`) et URL publique
(`NEXT_PUBLIC_SITE_URL`, pour les metadata et `hreflang`).

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

### Routes live et scénarios rejoués

Les routes qui peuvent dépenser un appel de modèle ou des crédits Locus
(`/api/compose`, `/api/note`, `/api/locus/*`) passent par
`src/lib/server/guard.ts` :

- **En production** (`VERCEL_ENV=production`, ou `NODE_ENV=production` hors
  Vercel), elles répondent **403** sauf avec l'en-tête `x-studio-live-token`
  égal à `STUDIO_LIVE_TOKEN`. Les previews Vercel et `next dev` restent
  ouverts ; `STUDIO_LIVE_LOCK=1|0` force le verrou.
- **Scénario rejoué** : sur ce 403, le navigateur (`src/lib/live.ts`) renvoie
  la requête avec `x-studio-replay: 1` ; la route répond avec les règles et
  Locus simulé, sans aucun appel externe.
- **Rate limit par IP** (hors `next dev`) : 20 requêtes live par heure, 200
  rejouées. En mémoire de l'instance, ou Upstash Redis (REST) si
  `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` sont posés.
  L'adresse vient de `x-real-ip` sur Vercel (posé par la plateforme), et du
  dernier maillon de `x-forwarded-for` ailleurs : un `next start` exposé
  sans reverse proxy laisse le client choisir son adresse.
- `maxDuration` à 60 s ; `/api/locus/logic` n'accepte que des `mku_key` en
  liste blanche ; `/api/locus/status` renvoie `{ ok }` seulement en
  production ; `/api/note` refuse un NIR ou une date de naissance complète.

---

L'agent du cabinet s'appelle **Locus**. Il signe « Locus, pour le Dr Vandepitterie ».

---

## Structure

```
src/
├── studio/                types et projection serveur du parcours (accueil, vue patient, document, boîtes)
├── components/studio/     chrome, home, dossier, rencontre, actions, signature, documents, document, inbox, compose (la carte du plan), note (l'éditeur), local (patient sans carte Vitale, cabinet local)
├── domain/types.ts        le modèle du dossier — UNE enveloppe pour tout, provenance de 1re classe
├── data/                  le jeu de données : cabinet, horloge fixe (jeudi 15 oct. 2026), 22 patients
│   ├── patients/          8 patients « héros » écrits à la main (dont Claire Moreau, la patiente du design), 14 autres décrits dans seeds.ts et construits par secondaires.ts
│   ├── rencontres.ts      la dictée scriptée, les actions détectées, les documents générés, la question
│   └── manifeste.ts       les prises de parti
├── locus/                 l'intégration locus-core
│   ├── compose/           le composer ⌘K : un modèle + les outils du LGC, Locus en outil ; composeur à règles sans clé
│   ├── contract.ts        le sous-ensemble du contrat v2 que le studio lit
│   ├── client.server.ts   le client (serveur uniquement), 3 modes
│   ├── ehr.ts             la projection dossier → patient_ehr
│   ├── simulation.ts      le mode à sec
│   └── capabilities.ts    le registre : ce que core sert, ce que le studio compose, ce qui est projeté
├── app/                   Next 16 App Router — `[lang]/` (accueil, zones, `lgc-natif/` : `p/[id]/*`, `inbox/[box]`, `d/`, `nouveau`), BFF (`api/`)
├── proxy.ts               préfixe de langue (Accept-Language, cookie) et redirections 308 des anciennes URL
├── i18n/                  dictionnaires typés, un fichier par zone ; routes et noms des outils
├── components/shell/      la coque Noir : AppShell, sidebar, palette ⌘K, fond en graphe, thème
├── components/ui/         composants de base (Button, Card, Badge, Input, Switch, Tooltip…)
├── sandbox/<zone>/        les composants de chaque espace (home, acces, integration-lgc, chatbot, scribe)
├── lib/server/guard.ts    le garde des routes live (verrou de production, rate limit, liste blanche, données réelles)
├── store/rencontre.tsx    l'état de session (réponses, signatures), persisté en localStorage
└── store/cabinet.tsx      le cabinet local : patients créés sans carte Vitale, notes, export JSON
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
