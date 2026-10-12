# Une rencontre, en cinq temps

Le studio se joue, il ne se visite pas. Le parcours suit le design :
**identifier → overview → saisir → actions → signer**, avec une seule entrée
(l'omni-saisie) en bas de chaque écran. Patiente du scénario : Claire Moreau,
46 ans, aide-soignante, épicondylite droite en arrêt depuis août.

## 0 · Qui voyez-vous ? (`/`)

Une question, une boîte de recherche, l'agenda du matin. `⌘K` ouvre la
palette ; `moreau cl` suffit : *Claire Moreau · 46 ans · née le 14/03/1980 ·
aide-soignante · INS qualifiée*, et en dessous une homonyme. « RDV 10:30 ·
motif agenda : renouvellement arrêt · scanner reçu · patiente reconnue depuis
l'agenda. » `⏎`.

## 1 · Overview (`/p/pat_cmoreau`)

Le dossier tient en une phrase : *Arrêt pour épicondylite droite jusqu'au
14/10. Le **scanner du coude est arrivé**. Douleurs des mains en bilan,
anti-CCP en attente.* Puis trois choses à noter (nouveau · dû · à savoir),
et le reste du dossier à un clic (« › Dossier », Documents 14, Ordonnances 5…).

En bas, l'omni-saisie et trois raccourcis que Locus a préparés : *Mail :
rappel prise de sang*, *Renouveler la Lévothyrox*, *RDV dans 3 semaines*.
Chacun rend une carte prête à valider (« agenda · créer », « Lun 2 nov ·
09:30 · 20 min », Réserver). Une question libre (« épicondylite résistante :
quelle prise en charge ? ») rend la réponse sourcée de locus-core dans la même
carte. `+ Consultation`.

## 2 · Saisie de la rencontre (`/p/pat_cmoreau/rencontre`)

Point rouge, « Dictée ». Le texte se dicte ; Locus surligne ce qu'il
comprend : *on fait la déclaration MP*, *Prolonge arrêt 3 semaines*, *Kiné 15
séances*, *Renouvelle Lévothyrox et paracétamol*, *adresser rhumato si
positif*, *rappel dTP*, *Revoir dans 3 sem*. Le compteur monte : « 7 actions
détectées ». `⌥ espace` met en pause. `Générer ⌘⏎`.

## 3 · Actions générées (`/p/pat_cmoreau/actions`)

« 7 documents prêts · 2 à regarder ». Une question d'abord : *Arrêt : vous
avez dit « sorties libres ». Sans restriction horaire ?* (Oui, libres ·
9-11 h et 14-16 h · Non autorisées.) Puis la liste : AT, MP (à relire,
tableau 57 RG), K, Rx (vérifié : AINS évités), VAC, RV, CR (en attente des
anti-CCP). Chaque ligne se déplie en champs. `Signer ⌘⏎`.

## 4 · Validation et signature (`/p/pat_cmoreau/signature`)

À gauche, six documents cochés avec leur destination (CPAM · télétransmis,
patiente · e-ordo, dossier · DMP) et deux en attente, en pointillé. À droite,
le document sélectionné tel qu'il sera signé (en-tête praticien, patiente,
corps, « Signature e-CPS »). En bas : *Pro Santé Connect · e-CPS connectée*,
**Signer et envoyer 6 documents** `⌘⏎`.

Puis : *Rencontre clôturée · 6 documents signés et envoyés · synthèse versée
au dossier · 2 suivis programmés · Patient suivant · Hugo Lefèvre* `⏎`.

## 2b · Documents (`/p/pat_cmoreau/documents`)

La table complète, filtrable par type, cherchable, avec l'omni-saisie en bas
(« Toutes les TSH depuis 2020 »).

---

Les autres patients du jour suivent le même parcours ; leur dictée n'est pas
scriptée (les documents générés viennent de ce que Locus avait préparé avant
la rencontre). Les écrans de la première version restent en vues héritées
(`/journee`, `/inbox`, `/patients`, `/agents`, `/routines`, `/locus`).
