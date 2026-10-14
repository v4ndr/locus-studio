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
écrit une nouvelle `Story` (le patient, sa phrase en entrant, ce que le
médecin sait devoir faire, les écrans et champs du LGC, la note, les actions
composées, le chrono) et on l'enregistre comme composition dans
`src/Root.tsx`. Le nombre de clics se calcule depuis les écrans (`clicsAvant`).

Première story : **`Rencontre`** — un artisan hypertendu vient pour son
renouvellement et parle de fourmillements nocturnes dans les deux mains
(réunion du 14/10/2026). Renouvellement 3 mois, ENMG des deux membres
supérieurs, orthèses nocturnes : 25 clics contre 8 secondes.

Patients **fictifs uniquement** : le cas réel de la réunion a reçu une identité
inventée. Le contenu médical est à relire avant diffusion, et les visuels
Studio sont à montrer à AlmaPro avant publication.

## Le récit

| Temps | Frames | Ce qu'on voit |
|---|---|---|
| hook | 0–165 | l'heure, le patient, sa phrase tapée |
| plan | 165–285 | les trois choses que le médecin sait devoir faire |
| avant | 285–615 | le LGC : trois écrans, chaque champ coûte un clic, le compteur tourne ; en bas, le patient continue de parler |
| après | 615–1035 | Studio : la note, « Générer les actions », l'agent compose, le médecin relit et signe ; le chrono s'arrête à la signature |
| compare | 1035–1155 | 25 clics barrés, 8 secondes |
| outro | 1155–1320 | le message, la constellation, « Démonstrateur · patient fictif » |

Les fenêtres vivent dans `src/timeline.ts` ; les instants fins de chaque
scène en tête de leur fichier (`src/scenes/`).

## Commandes

Le paquet est **à part de l'app** (son propre `package.json` et son lockfile,
exclu du `tsconfig` racine et de Vercel par `.vercelignore`) : Remotion
épingle ses dépendances, il ne doit pas toucher à celles de Next.

```bash
cd motion
pnpm install
pnpm studio      # prévisualiser et scrubber
pnpm render      # → out/rencontre-4x5.mp4
pnpm still       # une image (frame 700), pour vérifier
pnpm typecheck
```

Remotion télécharge son propre Chrome headless. Pour utiliser un binaire
déjà présent : `REMOTION_CHROME=/chemin/vers/headless_shell`.

Pas de musique : la vidéo est pensée pour la lecture muette du fil. Les
conventions (fenêtres, `ramp`/`pop`, `Scene`, curseur) suivent
`apps/promo` du repo locus-app.
