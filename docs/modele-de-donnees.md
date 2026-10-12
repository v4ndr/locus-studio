# Le modèle de données du dossier

Fichier : `src/domain/types.ts`. Trois partis pris, puis les types.

## Partis pris

1. **Une enveloppe pour tout.** Allergie, courrier, proposition d'agent,
   message du patient : même `BaseRecord` (`id`, `patientId`, `kind`,
   `schema`, dates, `provenance`, `status`, `supersedes`). On ajoute un type
   sans casser les autres, on migre enregistrement par enregistrement, et on
   répond toujours à « qui a écrit ça, quand, et qui l'a validé ».
2. **La provenance est de première classe.** `origin` ∈ praticien / agent /
   patient / import / système ; `actor` (sol, insi, hprim, mssante…) ;
   `derivedFrom[]` (l'enregistrement d'où ça vient) ; `confidence` ;
   `validatedBy` / `validatedAt`. Dans le fil, la couleur de la pastille est la
   provenance.
3. **Le dossier est un fil, plus des vues.** Rien n'est écrasé : une
   modification crée une version (`supersedes`). Le résumé vivant, la liste
   des problèmes, le traitement courant sont des projections, tenues par
   l'agent, validées par le praticien (`LivingSummary.changementsDepuis`).

## Les types

| Kind | Ce que c'est | Codes / téléservices modélisés |
|---|---|---|
| `patient` | identité (INS : matricule, OID, 5 traits stricts, statut), nom d'usage, contact et canal préféré, couverture (régime, ALD, C2S, AMC, médecin traitant), vie, personne de confiance, **consentements** (MES, DMP, ce que l'agent peut dire au patient) | INS / INSi, ADRi, DMT |
| `problem` | problème ou antécédent : catégorie (médical, chirurgical, familial, gynéco-obstétrical, mode de vie, psycho-social), évolution (chronique / aigu / antécédent), `enAvant` (alimente le résumé) | CIM-10, CISP-2 |
| `allergy` | substance, type, réaction, sévérité, certitude | ATC (pour le LAP) |
| `medication` | DCI, spécialité, CIS, posologie, type (chronique / ponctuel / si besoin), prescripteur, ALD, dernier renouvellement + durée (→ échéance), observance | CIS (ANSM) |
| `vaccination` | valences, nom, date, lot, rappel prévu | note de vaccination DMP |
| `measure` | poids, taille, IMC, TA, FC, SpO₂, T°, glycémie capillaire, DFG… avec contexte (cabinet / automesure / connecté) | Mon Espace Santé (objets connectés) |
| `lab` | laboratoire, dates, résultats (`loinc`, valeur, unité, bornes, drapeau, précédent), **lecture de l'agent**, `vuLe` | CR-BIO CDA / HPRIM, LOINC |
| `document` | type (CR imagerie, hospitalisation, spécialiste, anapath…), auteur, canal (MSSanté, DMP, scan, patient), format, texte extrait, lecture de l'agent, `vuLe` | MSSanté, DMP, CDA |
| `encounter` | type (cabinet / télé / visite / téléphone / messagerie), **note structurée** (motifs, histoire, examen, conclusion, conduite, attentes du patient), codes (DRC / CISP-2 / CIM-10), actes NGAP + montants, facturation (FSE, tiers payant, transmission), transcription consentie | DRC, NGAP, SESAM-Vitale / FSE |
| `prescription` | type (médicament, biologie, imagerie, paramédical, transport, dispositif), lignes (DCI, CIS, LOINC, posologie, durée, renouvellement, ALD, NS), **alertes LAP** (type, niveau, message, rubrique RCP), signature, **ordonnance numérique** (identifiant, transmission, dispensation) | LAP, ordonnance numérique |
| `sick-leave` | dates, motif, temps partiel, sorties, télétransmission | AAT amelipro |
| `letter` | type (adressage, certificat, attestation, réponse, protocole ALD…), destinataire (MSSanté), corps markdown, envoi, signature | MSSanté, PSE |
| `care-plan` | plan de suivi d'un problème : objectifs (cible / actuel / atteint), items périodiques avec échéance et référence | indicateurs FMT / ROSP |
| `screening` | dépistages organisés (colorectal, sein, col) : état | CRCDC |
| `message` | canal (patient, MSSanté, interne, MES, SMS), fil, de / à, corps, **triage de l'agent** (intention, urgence, résumé, réponse proposée, autonomie possible) | MSSanté, messagerie patient |
| `appointment` | début, durée, type, motif, état, pris par (patient / secrétariat / praticien / **agent**), briefing lié | agenda |
| `proposal` | **l'unité de travail de l'agent** : action, titre, justification avec renvois, références, charge (brouillon complet ou patch), déclencheur, niveau d'autonomie, état, décision, trace Locus | — |
| `briefing` | avant une consultation : synthèse, depuis la dernière fois, échéances, questions, propositions pré-remplies | — |
| `summary` | le résumé vivant : en une ligne, synthèse, en ce moment, dernière validation, changements depuis | VSM |

Plus le **journal** (`JournalEntry`, append-only : acteur, action, détail,
enregistrement) et le **cabinet** (praticiens avec RPPS et nom de l'agent,
tarifs conventionnels, politique d'autonomie).

## Autonomie

```
0 — observe : l'agent signale, n'écrit rien              (décisions cliniques)
1 — prépare : l'agent rédige, le praticien valide         (le défaut)
2 — agit    : l'agent exécute et rend compte ; révocable  (administratif réversible)
```

`AutonomyPolicy.parAction` règle le niveau par type d'action ; `verrous`
liste ce qui ne monte jamais à 2 (ordonnance, arrêt de travail).

## Le jeu de données

Horloge fixe : **jeudi 15 octobre 2026, 8h05** (`src/data/clock.ts`), pour
que « il y a 3 jours » et les échéances soient stables.

Sept patients écrits à la main, avec un fil complet et une situation du jour :

| Patient | Situation |
|---|---|
| Marguerite Delacroix, 74 ans | DT2 + HTA + FA sous apixaban ; biologie reçue ce matin (HbA1c ↑, DFG ↓), CR cardio hier, fille aidante qui écrit ; consultation scriptée à 9h30 |
| Julien Garnier, 42 ans | lombalgie aiguë par messagerie à 6h40, arrêt demandé ; RDV pris par Locus ; consultation scriptée |
| Léa Moreau, 29 ans | asthme, test de grossesse positif hier, demande de Ventoline ; bilan T1 préparé |
| Jean-Pierre Vasseur, 67 ans | BPCO, dépression, CR pneumo (bithérapie, MP amiante), coloscopie plutôt que kit |
| Inès Perrin, 8 ans | angine fébrile, mère par messagerie ; ordonnance conditionnelle au TROD |
| Sophie Marchand, 54 ans | cystite récidivante par messagerie — l'agent peut presque tout faire ; mammographie en retard |
| Alain Roussel, 58 ans | HTA non contrôlée (automesures connectées), courrier du médecin du travail (SAOS suspecté) |

Douze patients secondaires (`src/data/patients/secondaires.ts`) décrits en
quelques lignes et dépliés par un générateur, pour peupler l'agenda, les
routines et la recherche — une patientèle française, avec ses minorités.
