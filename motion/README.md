# motion — les vidéos de Locus Studio

Des motions Remotion (1080×1350, 4:5, 30 i/s) pour les posts LinkedIn tirés de
cas de consultation, au format **« A versus B »** : la façon de faire
d'aujourd'hui dans un LGC, puis la même chose dans Locus Studio.

L'interface de Studio est **reconstruite** en React avec ses vrais jetons
(`src/theme.ts`, recopiés de `src/app/globals.css`) et les composants de la
consultation (`NoteEditor`, `ComposeCard`). Le « LGC d'aujourd'hui » est un
logiciel générique, gris et dense : aucun éditeur réel n'est représenté.

## Une story = des données

Le motion est une mise en scène de `src/story.ts`. Pour un nouveau post, on
écrit une nouvelle `Story` (le patient, sa phrase en entrant, les décisions du
médecin, les écrans et champs du LGC avec leurs saisies, la note, les actions
composées, le chrono) et on l'enregistre comme composition dans
`src/Root.tsx`. Le nombre de clics se calcule depuis les écrans (`clicsAvant`).

Première story : **`Rencontre`** — un artisan hypertendu vient pour son
renouvellement et parle de fourmillements nocturnes dans les deux mains
(réunion du 14/10/2026). Renouvellement 3 mois, ENMG des deux membres
supérieurs, orthèses nocturnes : 25 clics et une centaine de frappes contre
8 secondes.

Quatre stories de plus (`src/stories.ts`, scripts v2 du 16/10/2026), sur
les mêmes composants :

| Composition | Cas | Ce que montre « Demain » |
|---|---|---|
| `Angine` | aide à la décision : angine, TDR +, allergie aux pénicillines en texte libre que le LAP ne voit pas | l'encart d'aide à la décision dans la note, avec ses sources |
| `Frottis` | question sur un dossier : « De quand date le dernier frottis ? » | la réponse sourcée, puis l'aide à la décision (test HPV en retard) |
| `Cohorte` | question sur la patientèle, sans dossier ouvert : HbA1c en retard | la liste des patients, puis les envois groupés |
| `Indicateurs` | ROSP et Donum sur un seul écran | le tableau de bord à jauges, puis la relance |

Les options de `Story` qui le permettent : `mode: "question"` (le composer
⌘K au lieu de la note), `reponse`, `aide`, `tableau`, `jauges`, `lgcTitre`
(pas de dossier ouvert), `pendantQui`, `planTitre`, `apresTitre`, `motif`.
Côté LGC, un écran peut être un navigateur ou un tableur (`fenetre`,
`url`), et s'ouvrir sans passer par les menus (`menu` absent).

Patients **fictifs uniquement** : le cas réel de la réunion a reçu une identité
inventée. Le contenu médical est à relire avant diffusion, et les visuels
Studio sont à montrer à AlmaPro avant publication.

## Le récit

| Temps | Ce qu'on voit |
|---|---|
| hook | l'heure, le patient, sa phrase tapée |
| plan | les trois décisions du médecin |
| avant | le LGC : pour chaque document, menu puis entrée du menu, chaque champ (recherche dans la base au clavier, liste de résultats, abréviation qui ne donne rien et qu'il faut retaper), l'alerte du LAP, les boutons de fin ; clics et frappes comptés en haut, le patient qui parle en bas ; saisie accélérée ×2, indiqué à l'écran |
| transition | le bilan (25 clics, les frappes) se rembobine à zéro : « Même patient. Même décision. » |
| après | Studio : la note, « Générer les actions », l'agent compose ; le médecin ouvre le premier document et fait défiler les trois au clavier (carrousel de relecture), puis valide ; le chrono démarre à « Générer » et s'arrête à la validation |
| compare | 25 clics barrés, 8 secondes, le nombre de frappes |
| outro | le message, la constellation, « Démonstrateur · patient fictif » |

Les fenêtres sont calculées dans `src/timeline.ts`. La durée de « avant »
vient du scénario du LGC (`src/avant.ts`), qui transforme les écrans de la
story en événements datés (clics, saisies) : le curseur, les compteurs et
l'état des champs se lisent dedans. Les instants fins de la scène Studio
sont en tête de `src/scenes/Apres.tsx`.

## Commandes

Le paquet est **à part de l'app** (son propre `package.json` et son lockfile,
exclu du `tsconfig` racine et de Vercel par `.vercelignore`) : Remotion
épingle ses dépendances, il ne doit pas toucher à celles de Next.

```bash
cd motion
pnpm install
pnpm studio      # prévisualiser et scrubber
pnpm render      # → out/rencontre-4x5.mp4
pnpm render:tous # → out/<Composition>.mp4, les cinq motions
pnpm still       # une image (frame 700), pour vérifier
pnpm typecheck
```

Remotion télécharge son propre Chrome headless. Pour utiliser un binaire
déjà présent : `REMOTION_CHROME=/chemin/vers/headless_shell`.

Pas de musique : la vidéo est pensée pour la lecture muette du fil. Les
conventions (fenêtres, `ramp`/`pop`, `Scene`, curseur) suivent
`apps/promo` du repo locus-app.
