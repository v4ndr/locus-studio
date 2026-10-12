# Intégration locus-core

Le studio consomme `locus-core` comme unique backend clinique. Ce document
dit ce qu'il en lit aujourd'hui, comment, et ce qu'il attend de core demain.
Source de vérité du contrat : `locus-core/query/contracts/*.py`,
`query/api/*.py`, `query/services/stream.py`.

## 1. Les trois modes

| Mode | Env | Routes | Notes |
|---|---|---|---|
| `simulation` | pas de `LOCUS_CORE_URL` | aucune | `src/locus/simulation.ts` : 6 thèmes (diabète, HTA, cystite, angine, FA, dépression), 3 spécialités, 2 unités logiques |
| `keyless` | `LOCUS_CORE_URL` sans clé | `POST /console/retrieve` (streame NDJSON), `GET /console/drugs/specialite/{cis}`, `GET /console/drugs/rubric/{id}` | pas de trace, pas de crédits, pas de `logic/compute` (absent de la console → simulé) ; core doit tourner avec `MCP_OAUTH_ENABLED=false` sinon 302 → `/login` |
| `core` | `LOCUS_CORE_URL` + `LOCUS_API_KEY` | `/v2/retrieve/stream`, `/v2/drugs/*`, `/v2/logic/compute`, `/v2/sources`, `/v2/feedback` | bearer `lsk_` + `X-Locus-User-Ref: studio` |

La clé ne franchit jamais le navigateur : tout passe par le BFF (`src/app/api/locus/*`).

## 2. Ce que le studio envoie

`POST /api/locus/retrieve` (BFF) reçoit `{ query, patientId?, history?, mode? }`
et construit la requête core :

```json
{
  "query": "…",
  "patient_ehr": "<projection du dossier, voir §3>",
  "history": [{ "question": "…", "answer_short": "…", "precisions": [] }],
  "mode": "rapide" | "approfondi",
  "app_version": "0.1.0", "app_platform": "web", "app_surface": "studio"
}
```

Le studio n'utilise pas encore `orchestrate`, `slot_answers`, `logic_answers`,
`sources` / `exclude_sources` (exposés dans le contrat, pas dans l'UI).

## 3. La projection `patient_ehr`

Core n'accepte aujourd'hui qu'un texte libre comme contexte patient.
`src/locus/ehr.ts` le construit **depuis le dossier structuré**, jamais à la
main :

```
Femme, 74 ans.
Problèmes actifs : Diabète de type 2 (depuis 2017) ; Hypertension artérielle (depuis 2014) ; Fibrillation atriale paroxystique (depuis 2024).
Antécédents : Prothèse totale de hanche droite.
Antécédents familiaux : Diabète de type 2 et AVC (mère).
Mode de vie : Tabac sevré depuis 1998 (20 PA).
Allergies : Pénicillines (Urticaire généralisée (1989)).
Traitement en cours : metformine 1000 mg 1 cp matin et soir ; ramipril 5 mg … ; apixaban 5 mg … 
ALD : Diabète de type 2, Fibrillation atriale.
Dernières mesures : TA 153/90 mmHg, poids 71 kg, IMC 27.7, DFG 48 mL/min.
Dernière biologie (2026-10-13) : HbA1c 8.1 % (haut), Glycémie à jeun 1.52 g/L (haut), …
```

L'onglet « Ce que Locus voit » du dossier affiche cette projection telle
qu'elle part. Quand core acceptera un contexte structuré, cette fonction
devient un mapping ; rien d'autre ne change.

## 4. Ce que le navigateur reçoit

Le BFF rediffuse le NDJSON de core en ne gardant que des étapes « produit » :

| core | studio |
|---|---|
| `progress {etape}` | `progress` (cadres / lecture / ambiguïtés / formulation) |
| `query_maker {reformulated}` | `reflexion "Je reformule : …"` |
| `reflexion {titre}` | `reflexion` |
| `retrieval {docs, chunks}` | `retrieval` |
| `answer {answer}` | `answer` |
| `done {payload}` | `done { PublicRetrieve }` |
| `error` | `error` |

`PublicRetrieve` (`src/locus/contract.ts`) ne porte que : `traceId`,
`coreVersion`, `reformulated`, `ehrSummary`, `ehrAdditions`, `answer` (les
identifiants de règles `(16hex)` retirés), `answerShort`, `docs`, `chunks`,
`rcp`, `drugs` (dci, atc, spécialité de référence), `via`. **Pas de `mkus`,
`elicitations`, `orchestration`, `deliberation`.**

## 5. `ehr_additions` → proposition

Quand core renvoie `ehr_additions` (« Grossesse en cours »), le panneau Sol
propose d'inscrire le fait au dossier : une `Proposal` d'action
`creer-enregistrement`, au niveau 1 (le praticien tranche). C'est le premier
pont entre le dialogue et le dossier structuré.

## 6. Le registre des capacités

`src/locus/capabilities.ts` — affiché sur `/locus`.

| id | statut | aujourd'hui | demain (route proposée) |
|---|---|---|---|
| retrieve | **live** | `/v2/retrieve/stream` + `patient_ehr` | contexte structuré |
| ehr-additions | **live** | champ `ehr_additions` | — |
| rcp | **live** | `/v2/drugs/specialites/{cis}`, `/v2/drugs/rubrics/{id}` | — |
| logic | **live** | `/v2/logic/compute` | équivalent keyless dans `/console` |
| briefing | compose | règles studio (échéances, plans de soins) + retrieve ciblé | `POST /v2/briefing` |
| lap | compose | dossier × rubriques 4.3 / 4.5 | `POST /v2/prescriptions/check` |
| scribe | projetée | transcriptions scriptées (`src/data/consultations.ts`) | `POST /v2/scribe` |
| document | projetée | lectures dans le jeu de données (`AgentReading`) | `POST /v2/documents/analyze` |
| prescription | projetée | brouillons dans le jeu de données | `POST /v2/prescriptions/draft` |
| letter | projetée | brouillons | `POST /v2/letters/draft` |
| triage | projetée | `Message.triage` | `POST /v2/inbox/triage` |
| actions | projetée | le studio exécute les propositions validées ; politique d'autonomie locale | `POST /v2/actions` |
| summary | projetée | `LivingSummary` | `POST /v2/summary` |

## 7. Spécification des capacités projetées

Toutes reçoivent le **même contexte** : le dossier (ou sa projection) et la
politique d'autonomie. Toutes renvoient des **`Proposal`** (jamais des
écritures directes) et des **citations** vers le corpus Locus, les RCP ou les
enregistrements du dossier.

### `POST /v2/documents/analyze`
Entrée : `{ patient_ehr, document: { type, titre, auteur, date, texte } }`.
Sortie : `AgentReading` — `resume`, `faitsExtraits[]` (problem / medication /
measure / rdv / allergy, chacun avec le passage source), `pointsAttention[]`
(chacun sourcé : reco ou RCP via retrieve), `urgence`, `confidence` ; et
`proposals[]`.

### `POST /v2/scribe`
Entrée : `{ patient_ehr, transcript: TranscriptTurn[], partial: bool }`.
Sortie en streaming : des **phrases** `{ section, text, from: [turnIndex] }`
(la provenance par phrase est obligatoire), des `codes[]` (DRC / CISP-2 /
CIM-10), et des `proposals[]` au fil de l'eau (ordonnance, courrier, arrêt,
rdv, codage/acte). Pas de note sans provenance.

### `POST /v2/prescriptions/draft` et `/check`
`draft` : `{ patient_ehr, intention: "renouvellement" | "nouveau", indication,
lignes_souhaitees? }` → `PrescriptionLine[]` avec `alertes[]` (type, niveau,
message, rubrique RCP). `check` : `{ patient_ehr, lignes }` → `alertes[]` —
interactions, contre-indications, allergies, adaptation rénale, grossesse,
redondance — chacune avec la rubrique 4.3 / 4.4 / 4.5 / 4.6 qui la fonde.

### `POST /v2/letters/draft`
`{ patient_ehr, type, destinataire, motif, elements: recordIds[] }` →
`{ titre, corps (markdown), piecesJointes }`. Le corps n'invente rien : chaque
fait vient d'un enregistrement cité.

### `POST /v2/inbox/triage`
`{ patient_ehr, message, consentement: "aucune" | "logistique" | "clinique-valide" | "clinique" }`
→ `{ intention, urgence, resume, autonomePossible, reponse? }`. `autonomePossible`
est vrai seulement si la réponse tient dans le périmètre du consentement.

### `POST /v2/summary`
`{ dossier }` → `LivingSummary` + `changementsDepuis[]`.

### `POST /v2/actions`
`{ proposal, decision }` → exécution côté core des effets qu'il porte (inscrire
un fait, poser un rappel), journalisée. Les effets « monde » (FSE, DMP,
MSSanté, ordonnance numérique) restent au LGC.

## 8. Écarts constatés dans core (utiles au porteur)

- `/console/logic/compute` n'existe pas ; le client de locus-app le vise en
  keyless. Le studio simule dans ce cas.
- Le flux ne streame pas la réponse token par token : `answer` arrive d'un
  bloc, puis `done` la répète. Le studio affiche `answer` dès réception.
- `query_maker` porte `rubric_codes`, non typé côté TS de locus-app.
