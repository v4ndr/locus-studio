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
| 2 · Saisie | `/p/[id]/rencontre` | la dictée ; Locus surligne ce qu'il comprend et compte les actions |
| 3 · Actions | `/p/[id]/actions` | les documents générés, une question avant de signer |
| 4 · Signature | `/p/[id]/signature` | la liste avec les destinations, l'aperçu papier, un geste (e-CPS) ; puis « rencontre clôturée » |
| 2b · Documents | `/p/[id]/documents` | la table, filtrable |

Le scénario complet est dans [`docs/scenes.md`](docs/scenes.md) (patiente :
Claire Moreau). Les sept ruptures sont dans [`/manifeste`](src/data/manifeste.ts).
Les écrans de la première version restent en **vues héritées**
(`/journee`, `/inbox`, `/patients`, `/agents`, `/routines`, `/locus`).

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

## Les vues héritées

| Écran | Le parti pris qu'il incarne |
|---|---|
| **Journée** `/journee` | L'accueil est la journée *préparée* : agenda, brief par patient (ce qui a changé, ce qui est dû, quoi demander), décisions à prendre. Pas un calendrier. |
| **Réception** `/inbox` | Biologies, courriers, messages lus avant vous : urgence proposée, résumé, faits extraits, réponse rédigée. L'ordre est l'urgence, pas l'heure. |
| **Dossier** `/patients/[id]` | Trois colonnes : l'*état* du patient (résumé vivant, problèmes, traitement, mesures, suivi), le *fil* (tout, filtrable, avec la provenance en couleur), et *Locus* (propositions + question à Locus contextualisée par le dossier). Un onglet montre exactement ce que Locus « voit » (`patient_ehr`). |
| **Consultation** `/patients/[id]/consultation` | L'écoute ambiante jouée : la transcription défile, la note se structure (motif / histoire / examen / conclusion / CAT), chaque phrase renvoie au tour d'où elle vient, les propositions tombent (ordonnance vérifiée LAP, codage DRC, FSE, courrier). À la clôture : tout part. |
| **Locus** `/agents` | La file de travail de l'agent, ce qu'il a fait, la politique d'autonomie (observe / prépare / agit, avec verrous), le journal append-only. |
| **Routines** `/routines` | Des agents sur la patientèle entière : règles lisibles, calculées en direct (diabétiques sans HbA1c, dépistages, grippe, renouvellements). |
| **Locus** `/locus` | Le registre des capacités (servies / composées / projetées), l'état du backend, un bac à sable retrieve, une unité logique (CHA₂DS₂-VASc via `/v2/logic/compute`). |
| **Manifeste** `/manifeste` | Les quinze prises de parti. |

L'agent du cabinet s'appelle **Locus**. Il signe « Locus, pour le Dr Vandepitterie ».

---

## Structure

```
src/
├── studio/                types et projection serveur du parcours (accueil, vue patient, documents)
├── components/studio/     chrome (en-tête, omni-saisie, carte de résultat), home, dossier, rencontre, actions, signature, documents
├── domain/types.ts        le modèle du dossier — UNE enveloppe pour tout, provenance de 1re classe
├── data/                  le jeu de données : cabinet, horloge fixe (jeudi 15 oct. 2026), 19 patients
│   ├── patients/          8 patients « héros » écrits à la main (dont Claire Moreau, la patiente du design), 14 secondaires générés
│   ├── rencontres.ts      la dictée scriptée, les actions détectées, les documents générés, la question
│   ├── consultations.ts   les consultations scriptées (transcription → note → propositions)
│   └── manifeste.ts       les prises de parti
├── locus/                 l'intégration locus-core
│   ├── contract.ts        le sous-ensemble du contrat v2 que le studio lit
│   ├── client.server.ts   le client (serveur uniquement), 3 modes
│   ├── ehr.ts             la projection dossier → patient_ehr
│   ├── simulation.ts      le mode à sec
│   └── capabilities.ts    le registre : ce que core sert, ce que le studio compose, ce qui est projeté
├── app/                   Next 16 App Router — `/` et `/p/[id]/*` (le parcours), vues héritées, BFF (/api/locus/*)
├── components/            l'interface (Tailwind v4, lucide, aucun kit)
└── store/studio.tsx       l'état de session (décisions, vus, autonomie), persisté en localStorage
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
[`docs/integration-locus.md`](docs/integration-locus.md). L'écran `/locus`
dit honnêtement d'où vient chaque capacité.

Les règles (MKU) de Locus ne franchissent jamais le navigateur : le BFF retire
tout ce qui n'est pas document, extrait ou RCP.

---

## Ce que ce n'est pas

Pas un dispositif médical, pas un LAP certifié, pas un logiciel Ségur. Aucune
donnée réelle : les patients sont inventés, les RPPS, NIR et numéros
d'ordonnance sont factices. La sécurité et la conformité sont volontairement
hors sujet — c'est un projet de recherche sur les **usages**.
