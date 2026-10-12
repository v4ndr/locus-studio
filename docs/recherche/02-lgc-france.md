# Le marché français des LGC pour médecins généralistes (2025-2026)

*Intrants pour un LGC AI-natif. Recherche du 12 octobre 2026. Sources primaires privilégiées (ANS, Assurance Maladie, HAS, DREES, éditeurs) ; les chiffres secondaires (comparatifs, avis) sont signalés comme tels.*

---

## 0. Synthèse en 10 points

1. **Doctolib Médecin est devenu le premier LGC des généralistes** : 26,2 % des FSE télétransmises par des MG en juin 2026 (GIE SESAM-Vitale via [Clempo](https://www.clempo.fr/parts-de-marche-logiciels-medicaux/)), devant Weda (13,4 %), MédiStory (10,1 %), HelloDoc (7,6 %) et Stellair Integral/Olaqin (7,2 %). Parti de zéro vers 2020, Doctolib a pris 3 points au seul T2 2026.
2. **Le marché reste très fragmenté** : 133 éditeurs et 201 solutions selon le rapport IGAS/IGF d'août 2026 ([relais](https://application-sante-numerique.fr/blog/dmp-rapport-igas-sous-alimentation-medecins-liberaux/)) ; 45 LGC « médecin de ville » candidats au Ségur vague 2 ([liste](https://www.logicieldrsante.com/guides-pratiques/logiciels-references-segur-vague-2/)).
3. **Les plaintes récurrentes** : trop de clics, interfaces « Windows 95 », lenteur, téléservices (DMP/amelipro/MSSanté) peu fiables, dossier purement chronologique sans vue par problème, prix en hausse (Doctolib ≈ 135-149 €/mois hors options, Weda ≈ 110-159 €).
4. **Le dossier patient français** est structuré par la réglementation et la rémunération : INS qualifiée, antécédents, traitements, VSM, codage CIM-10/CISP-2/DRC, ALD, indicateurs de prévention du Forfait Médecin Traitant (FMT), FSE/SCOR.
5. **Ségur vague 2** (guichet LGC clos le 15 oct. 2025) : aucun LGC encore référencé en août 2026 ; preuves dues le 20 janv. 2027, financement SONS 100 % État.
6. **Dotation numérique (DONUM)** remplace le forfait structure au 1er janv. 2026 : point à 7 €, plafond 2 940 €/an, socle « téléservices » DCMT/PSE/FSE/AAT à 60 % (2026) → 80 % (2028) ([Orisha](https://healthcare.orisha.com/blog/professionnels-de-sante/medecin/la-donum-le-guide-pour-les-medecins-liberaux-en-2026/)).
7. **Usages socles encore faibles** : alimentation DMP moyenne 30,9 % chez les MG, ordonnance numérique utilisée par 29,3 % d'entre eux (IGAS/IGF 2026) ; 1,06 % des prescriptions exécutées en officine étaient numériques en février 2025 ([ARS HdF](https://www.hauts-de-france.ars.sante.fr/media/139703/download)).
8. **L'IA est déjà dans les LGC** : Doctolib « Assistant de consultation » (5 M de consultations assistées en oct. 2025, 79 € TTC/mois), Nabla (69 €/mois, intégré à Weda), Cegedim (Praxy.ai dans Maiia Médecin, assistant « Claude Bernard IA » gratuit depuis le 29 sept. 2026), CGM (deux assistants, janv. 2026), MédiStory (Loquii), HelloDoc (Synapse/MedGPT).
9. **Cadre IA** : HAS « premières clés d'usage de l'IA générative » (30 oct. 2025) ; guide HAS/CNIL « bon usage des SIA en contexte de soins » (consultation jusqu'au 16 avr. 2026). Le CNOM n'a pas publié de doctrine 2025-26 sur les scribes ; son livre blanc date de 2018.
10. **Démographie** : 101 000 MG au 1er janv. 2026 (DREES), ≈ 52 500 MG libéraux fin 2025 (Cnam), 46,2 h/semaine dont 36 h 30 avec les patients et ≈ 6 h de gestion/coordination, 4 800 actes/an, 18,7 min par consultation.

---

## 1. Les éditeurs, un par un

### 1.1 Parts de marché (mesurées en FSE télétransmises, GIE SESAM-Vitale)

| Rang MG (juin 2026) | Logiciel (éditeur) | Part |
|---|---|---|
| 1 | Doctolib Médecin (Doctolib) | 26,2 % |
| 2 | Weda (Vidal/Weda SAS) | 13,4 % |
| 3 | MédiStory (Prokov Éditions, groupe Equasens) | 10,1 % |
| 4 | HelloDoc (CompuGroup Medical) | 7,6 % |
| 5 | Stellair Integral (Olaqin, facturation couplée à un LGC tiers) | 7,2 % |

Source : [Clempo](https://www.clempo.fr/parts-de-marche-logiciels-medicaux/) ; variante mars 2026 chez [Tandem Health](https://tandemhealth.ai/fr/ressources/articles/systemes-de-dossiers-medicaux-les-plus-utilises-par-les-medecins-generalistes-francais) (Doctolib ≈ 23 %, Weda ≈ 14 %, MédiStory ≈ 10 %, HelloDoc ≈ 8 %, AxiSanté effondré de ≈ 16 % à < 0,2 %). Tous métiers confondus, les groupes dominants sont CGM (15,3 %), Cegedim Santé (13,7 %) et Doctolib (9,1 %). L'enquête URPS Île-de-France (mars 2024, 343 répondants, [PDF](https://www.urps-med-idf.org/wp-content/uploads/2024/07/Enquete-Segur-V3-2.pdf)) donnait : Weda 13 %, Doctolib 11 %, MédiStory 11 %, Crossway 11 %, AxiSanté 8 %, Médimust 8 %, HelloDoc 6 %, MLM 4 %, AlmaPro 3 %, DrSanté 3 %.

### 1.2 Fiches éditeurs

**Doctolib Médecin (Doctolib, SaaS, lancé 2021-22)** — Prix constatés 2026 : 135-149 € TTC/mois pour le logiciel, + VidalExpert 29 €, lecteur 29 €, téléconsultation 79 €, agenda Doctolib 129-139 € ; soit ≈ 270-285 €/mois sans l'agenda ([100 000 Médecins](https://www.100000medecins.org/solutions/logiciel-medical/doctolibmedecin), [Lonasanté](https://www.lonasante.com/doctolib/)). Interface : **quatre colonnes verticales** — informations administratives / historique des consultations / consultation en cours / ordonnances-courriers-résultats — jugée réussie mais exigeant un écran large. Lecture de la carte Vitale → récupération automatique de l'historique DMP ; dépôt des documents dans Mon espace santé ; messageries Apicrypt, Mailiz, MonSisra ; moteur de télétransmission maison, tiers payant intégral ; comptabilité quasi absente. LAP certifié HAS avec **VIDAL Expert**. Notes : 3,9/5 (82 avis), rédaction 3,7/5 « incontournable mais loin d'être parfait ». Plaintes : blocage des dossiers quand une consultation reste ouverte par un confrère, gestion des dépistages (frottis, mammographie, FIT) faible, documents scannés à ouvrir un à un, renouvellement d'ordonnances paramédicales à refaire, pas de séparation par problème, « beaucoup de clics ++ », « simple pour les patients simples, moins pour les polypathologiques », posologies en texte libre, commerciaux insistants, panne médiatisée été 2024. Points forts : ergonomie moderne, « a divisé mon temps de travail par trois » (grâce à l'IA). Dans l'enquête URPS, Doctolib était le seul LGC où une majorité jugeait les échanges plus fluides après Ségur (46 %) et 48 % déclaraient gagner du temps.

**Weda (Weda SAS, groupe Vidal, 100 % web)** — ≈ 110 €/mois (base) + Vidal 29 € + hotline 16 € + télétransmission VitalZen 30 € + mise en route ≈ 300 € + formation 400-800 € + interfaçage agenda Doctolib 20 € ([100 000 Médecins](https://www.100000medecins.org/solutions/logiciel-medical/weda)) ; d'autres comparatifs citent 100-159 €/mois. L'éditeur revendique 23 000 utilisateurs ([weda.fr](https://weda.fr/logiciel-medecin-generaliste)). Interface : dossier **linéaire et chronologique**, seulement les 10 dernières consultations affichées, moteur de recherche faible, masques de consultation puissants mais exigeant apprentissage ; LAP HAS avec **VIDAL Hoptimal**. Intégrations : SISRA, Medimail, Mailiz, Omnidoc (téléexpertise), dispositifs connectés, dictée/transcription IA (Nabla) et « plan de soins » signalant prévention/suivi. Notes : 3,0/5 (123 avis) — « ergonomie digne de Windows 95 », « extrêmement compliqué et dense », liaisons amelipro/DMP « catastrophiques », support inégal ; mais ROSP automatisée et interopérabilité reconnues.

**MédiStory 4 (Prokov Éditions / Equasens, Mac-iPad-iPhone)** — Achat de licence + mises à jour payantes ; premier LGC référencé Ségur (30 mai 2022) ; ≈ 13-15 000 utilisateurs. Barre latérale gauche, **synthèse « d'un coup d'œil »**, historique, recherche multicritère ; vocabulaire propriétaire (« rencontres »), mode hybride hors-ligne ; LAP HAS avec **Banque Claude Bernard** ; IA de résumé **Loquii**. Note 4,1/5 (94 avis) ([100 000 Médecins](https://www.100000medecins.org/solutions/logiciel-medical/medistory)) ; 89 % des utilisateurs URPS ont la MSSanté intégrée, le meilleur score.

**HelloDoc (Imagine Éditions → CompuGroup Medical)** — Licence 595-1 295 € + abonnement 58-85 €/mois. LAP HAS avec **Thériaque** ; module de prescription **Synapse Medicine + MedGPT (2026)**. Note **2,3/5** (60 avis) : lenteur même sur machines récentes, stabilité variable, zones de saisie redondantes, « pas d'ergonomie par problème », DMP lent et plantages, courriers Mailiz à rattacher manuellement, amelipro « daté et très lent » ([100 000 Médecins](https://www.100000medecins.org/solutions/logiciel-medical/hellodoc)). 0 % des utilisateurs URPS disaient gagner du temps après Ségur, 73 % en perdre.

**AxiSanté 5 (CGM)** — LAP HAS avec **VIDAL Expert** ; modules par spécialité. Note **2,4/5** : « plantages fréquents, parfois quotidiens », « logiciel obsolète que j'utilise depuis 25 ans » ([100 000 Médecins](https://www.100000medecins.org/solutions/logiciel-medical/axisante)). CGM pousse désormais **Libellia**, LGC 100 % web pour MG avec transcription vocale native, lancé 2025 à 89 €/mois ([La Fabrique du Net](https://www.lafabriquedunet.fr/logiciel/libellia)).

**Crossway (Cegedim Santé, local)** — < 100 €/mois avec BCB ; dossier en **timeline chronologique** ; VSM et ordonnances envoyés automatiquement au DMP ; LAP HAS **BCB**. Note 2,7/5, « complet, éprouvé mais vieillissant ». Cegedim édite aussi **MLM**, **Médiclick**, **Médimust** et **Maiia Médecin** (nouvelle génération, lancé 2025, assistant de consultation IA Praxy.ai intégré fin mars 2025, [communiqué](https://www.cegedim.fr/Communique/CegedimSante_PraxyAI_10032025.pdf)).

**AlmaPro (association ALMA, Windows + Cloud)** — Modèle associatif ≈ 70 €/mois tout compris ([100 000 Médecins](https://www.100000medecins.org/solutions/logiciel-medical/almapro)). Interface : **antécédents à gauche, consultations au centre, administratif/notes/ordonnance chronique à droite**, « écran très chargé ». Note 4,5/5 (57 avis) ; URPS : meilleurs taux de déploiement (91 % envoi MES, 91 % VSM, 100 % INS).

**éO (EIG)**, **Shaman**, **Mediboard**, **Stellair Integral (Olaqin, moteur de facturation couplé à des LGC tiers)**, outsiders : Odaiji (120 €/mois tout compris, moderne), DrSanté, Desmos, Semble, Citana — tous candidats vague 2.

### 1.3 Ce que les utilisateurs reprochent, transversalement

L'enquête URPS IDF (2024) synthétise : « réduire le nombre de clics », « corriger plus fréquemment les bugs », « impliquer les médecins de terrain dans l'ergonomie », « intégrer toutes les fonctionnalités directement dans le logiciel ». 57 % des médecins mis à jour Ségur disaient **perdre du temps** (66 % des MG), 13 % en gagner ; note d'intérêt du Ségur sur la pratique : 3,9/10. La vérification INS est vécue comme « lourde », « infernale », « pas mon rôle ». MSSanté : 72 % constatent ne pas recevoir certains documents, doublons, résultats illisibles « nécessitant plusieurs clics ». Mon espace santé : 85 verbatims négatifs contre 6 positifs (« bazar à l'intérieur », « documents introuvables »). Pro Santé Connect : déconnexions fréquentes. La grève des cabinets du 5 au 15 janvier 2026 a eu le DMP obligatoire pour cœur (« outil dépassé et bugué », « 30 secondes pour se connecter », un MG qui le consulte 10-15 fois/jour le trouve « encombré » et réclame une recherche assistée par IA) ([Caducée](https://www.caducee.net/actualite-medicale/16733/greve-des-medecins-liberaux-en-janvier-2026-le-dmp-au-coeur-de-la-colere.html)).

---

## 2. Anatomie d'un dossier médical de ville en 2026

**Identité.** L'**INS** = matricule (NIR ou NIA) + OID de l'autorité d'attribution + cinq traits stricts (nom de naissance, prénom(s) de naissance, date de naissance, sexe, code lieu de naissance COG) ([guide ANS](https://industriels.esante.gouv.fr/sites/default/files/media/document/INS_Guide_implementation_V2_0.pdf)). Statuts : « récupérée » (via INSi) puis « qualifiée » (vérification d'une pièce d'identité) — seule l'INS qualifiée autorise l'envoi au DMP. Ségur v2 impose d'appeler INSi via l'appli carte Vitale, puis la carte Vitale, puis les traits, et de tracer les motifs de non-qualification.

**Antécédents** médicaux, chirurgicaux, familiaux, gynéco-obstétricaux, **allergies/intolérances**, **traitements** (chroniques « habituels » vs ponctuels, avec date de fin), **vaccinations** (la « note de vaccination » DMP est un document *structuré* alimentant le carnet vaccinal numérique). Calendrier vaccinal 2026 (27 avril 2026) : pneumocoque étendu à tous les ≥ 65 ans (Prevenar 20/Capvaxive), grippe haute dose/adjuvantée ≥ 65 ans, rattrapage HPV jusqu'à 26 ans, cocooning coqueluche dès 5 ans après la dernière dose, ACWY et B obligatoires nourrissons ([Vidal](https://www.vidal.fr/actualites/37829-quelles-sont-les-nouveautes-du-calendrier-des-vacinations-2026.html)).

**Biologie.** Historiquement en HPRIM médecin 3.0, remplacé par le **CR-BIO en CDA R2 niveau 3** avec analyses codées **LOINC** reçu par MSSanté — spécification CI-SIS 2024.01 publiée le 14 avril 2026 ([ANS](https://esante.gouv.fr/volet-cr-bio-compte-rendu-dexamens-de-biologie-medicale)). Un mock crédible ingère donc des documents CDA contenant des observations LOINC avec valeur, unité, bornes, et affiche des courbes (HbA1c, créatinine/DFG, LDL, TSH…).

**Imagerie et comptes rendus** : CR d'imagerie, lettres de liaison de sortie (70 % déposées automatiquement au DMP par les hôpitaux), CR de spécialistes, reçus par MSSanté ou DMP, classés dans le dossier (Lifen automatise ce tri par ML).

**Courriers** : adressage spécialiste (avec motif, antécédents, traitements auto-insérés), certificats, **arrêts de travail via le téléservice AAT d'amelipro** (Cerfa sécurisé obligatoire sur papier depuis juin 2025 ; depuis le 24 mars 2026 le volet patient est déposé automatiquement au DMP) ([Caducée](https://www.caducee.net/actualite-medicale/16888/mon-espace-sante-et-dmp-en-2026-les-documents-amelipro-verses-automatiquement.html)), bons de transport, protocoles de soins **ALD électroniques** (PSE), DMT, certificats AT/MP.

**Consultation** : bloc libre ou masque « motif / examen / conclusion / conduite à tenir » (variante française du SOAP), constantes, et un **codage** optionnel : CIM-10, **CISP-2** (1 441 concepts, [fiche ANS](https://esante.gouv.fr/terminologie-cisp)) ou le **DRC de la SFMG** (278 résultats de consultation couvrant ≈ 95 % des situations de MG, alignés CIM-10). **SNOMED CT** : édition nationale annuelle, exposée sur le serveur multi-terminologies FHIR depuis février 2025 ([ANS](https://esante.gouv.fr/produits-services/cgts/snomed-ct)) — pas encore utilisée dans les LGC de ville.

**Volet de synthèse médicale (VSM)** : document CDA structuré (problèmes, traitements, allergies, antécédents, facteurs de risque) attendu au DMP.

**Suivi chronique et prévention.** Le **FMT** (1er janv. 2026) absorbe forfait patientèle et ROSP : socle par patient modulé âge/ALD + volet prévention **5 € par patient et par indicateur validé, 15 indicateurs** : vaccinations (grippe, Covid, pneumocoque, HPV), dépistages (diabète, maladie rénale chronique, cancers sein/colorectal/col), suivi biologique du diabète (HbA1c), examens dentaires… ([Caducée](https://www.caducee.net/actualite-medicale/16727/convention-medicale-2024-2029-la-grande-redistribution-des-forfaits-et-des-actes-au-1er-janvier-2026.html), [Quotidien du Médecin](https://www.lequotidiendumedecin.fr/liberal-soins-de-ville/forfait-medecin-traitant-le-teleservice-setoffe-de-nouveaux-indicateurs)). Un téléservice amelipro « Suivi prévention » (avril 2026) liste les patients non à jour — c'est exactement la donnée qu'un LGC de demain doit afficher nativement. Dépistages organisés : colorectal (50-74 ans, FIT tous les 2 ans), sein (50-74, mammographie tous les 2 ans), col (25-65, frottis/HPV), bilans de prévention aux âges clés (18-25, 45-50, 60-65, 70-75).

**Facturation 2026.** G = **30 €** (depuis le 22 déc. 2024) ; consultation longue **60 €** (≥ 80 ans, 1×/an) ; consultation de recours pédiatrique 60 € ; examens obligatoires < 2 ans 50 € ; point travail CCAM 0,47 € ([Egora](https://www.egora.fr/actus-pro/vie-conventionnelle/nouveau-forfait-medecin-traitant-consultation-longue-dotation)). La **FSE** SESAM-Vitale (lecture carte Vitale ou appli carte Vitale, ADRi pour les droits, NOEMIE pour les retours), le **tiers payant** (part AMO obligatoire ALD/C2S/maternité, part AMC optionnelle), et **SCOR** (numérisation des pièces justificatives transmises en lot avec les FSE) ferment la boucle.

---

## 3. La pile interop / réglementaire à mocker

**Ségur du numérique (vagues 1 & 2).** Vague 1 (2021-2024) : ≈ 2 Md€, 41 LGC référencés fin mai 2024, exigences = INS, alimentation DMP, MSSanté intégrée, Pro Santé Connect. **Vague 2** LGC médecin de ville : 45 candidats, aucun référencé au 10 août 2026 ; dépôt des preuves 20 janv. 2027. Contenu : INS automatisée (appli carte Vitale en premier), **alimentation automatique** du DMP et consultation intégrée des nouveaux documents sans quitter le LGC, unification des BAL MSSanté avec dédoublonnage, Pro Santé Connect unique, ordonnance numérique V3 (QR code), 19 examens obligatoires de l'enfant ([dispositif ANS](https://esante.gouv.fr/ens/segur-numerique-sante/vague-2/dispositif-lgc-couloir-medecin-ville)). Financement **SONS** : l'État paie l'éditeur.

**INS / téléservice INSi.** Service web (SOAP, authentification CPS/certificat structure) opéré par la Cnam : *recherche par carte Vitale* ou *par traits* → retourne matricule INS, OID et traits de référence, non modifiables localement ; *vérification* d'une INS existante. Le LGC stocke le statut (provisoire / récupérée / qualifiée), trace tous les accès.

**Pro Santé Connect / e-CPS.** Fournisseur d'identité **OpenID Connect** de l'ANS fédérant carte CPS et **e-CPS** ; obligatoire pour les services nationaux depuis le 1er janv. 2023 ; ≈ 465 000 e-CPS actives ([ANS](https://esante.gouv.fr/produits-services/pro-sante-connect)). Le LGC reçoit un `id_token` contenant RPPS, nom, profession, et un jeton pour appeler DMP/INSi/MSSanté.

**MSSanté.** Espace de confiance de messageries interopérables (SMTP/S-MIME sur domaines `*.mssante.fr`, annuaire national) : > 800 000 BAL, > 300 opérateurs, > 28 M de messages en mai 2025 ([ANS](https://esante.gouv.fr/strategie-nationale/mssante)). **Mailiz** = opérateur gratuit des Ordres ; **BAL organisationnelle** ; **MSSanté citoyenne** = envoi au patient via Mon espace santé (adresse `INS@patient.mssante.fr`). Messages transportant PDF ou **CDA** (CR-BIO, lettres de liaison) avec métadonnées IHE XDM.

**DMP / Mon espace santé.** Dépôt (transactions IHE XDS.b) de PDF/A, JPEG ou CDA structurés (VSM, note de vaccination, CR-BIO), classés par type ; alimentation sauf opposition, consultation avec consentement et matrice d'habilitation. Chiffres : 24-25 M de profils activés, 2,5 M de connexions patients/mois, ≈ 450 M de documents déposés sur 12 mois, ≈ 150 000 libéraux alimentent, > 1/3 des médecins consultent chaque mois ([ANS](https://esante.gouv.fr/actualites/des-usages-numeriques-en-sante-qui-montent-en-puissance-et-des-jalons-pour-2026)). L'obligation d'alimentation avec sanctions (LFSS 2026) a été **censurée par le Conseil constitutionnel** ; la ministre évoquait 2028. **Agenda de Mon espace santé** : agenda de *suivi* (examens obligatoires de l'enfant, bilans de prévention, vaccinations, rappels) — pas une prise de RDV.

**Ordonnance numérique (e-prescription).** Le LAP envoie la prescription structurée (prescripteur RPPS, INS patient, lignes CIP/UCD avec posologie structurée, biologie, actes paramédicaux, imagerie, DM) au téléservice Cnam, reçoit un **identifiant unique** rendu en **QR code** ; le pharmacien scanne, récupère la prescription, et renvoie les données de délivrance ([Ordre des pharmaciens](https://www.ordre.pharmacien.fr/les-communications/focus-sur/la-revue/tous-pharmaciens-la-revue-n-26-novembre-2024/quand-et-comment-s-impose-l-ordonnance-numerique)). Obligatoire en principe depuis le 31 déc. 2024 mais : 50 % des médecins équipés (sept. 2025), 20,5 M d'ordonnances numériques de MG fin 2024 (9,65 % de leurs prescriptions) ; 2026 = « année de généralisation » ([ANS doctrine](https://esante.gouv.fr/doctrine/ordonnance-numerique)). Agrément **CNDA** requis pour le LGC ; LAP certifié HAS obligatoire.

**SESAM-Vitale / FSE / appli carte Vitale.** Flux B2 de FSE signées par la CPS vers les CPAM, retours NOEMIE, lots SCOR. L'**appli carte Vitale** est activable par tous depuis le 18 nov. 2025, > 98 % des médecins ont un logiciel compatible, usage d'identification en ligne (téléconsultation) depuis l'arrêté du 10 févr. 2026 ([ameli](https://www.ameli.fr/medecin/actualites/l-appli-carte-vitale-est-desomais-disponible-pour-tous-les-patients)).

**amelipro / téléservices intégrés.** AAT (arrêt de travail), AT/MP, PSE (protocole ALD électronique), DMT (déclaration médecin traitant), DCMT, ADRi (droits), HRi (historique des remboursements), DSG (déclaration simplifiée de grossesse), PMT… La DONUM mesure la moyenne DCMT/PSE/FSE/AAT ([ameli](https://www.ameli.fr/medecin/exercice-liberal/facturation-remuneration/nouvelle-dotation-numerique-janvier-2026)).

**LAP certifié HAS.** 52 LAP ambulatoires certifiés, adossés à **VIDAL**, **Banque Claude Bernard**, **Thériaque** ou **Posos** ([HAS](https://www.has-sante.fr/jcms/c_672760/en/les-logiciels-d-aide-a-la-prescription-lap-en-medecine-ambulatoire-certifies)). Fonctions à mocker : recherche par DCI/spécialité, contrôle interactions/contre-indications/allergies/posologie selon âge-poids-DFG-grossesse, alertes graduées, prescription en DCI, génériques, durée, renouvellements, ALD/non-ALD (double ordonnance), stupéfiants.

**Terminologies et formats.** CIM-10, CISP-2, DRC, LOINC (biologie), CIP/UCD (médicaments), CCAM/NGAP (actes), SNOMED CT (émergent), documents **CDA R2** du CI-SIS (VSM, CR-BIO, lettre de liaison, note de vaccination) et FHIR R4.

---

## 4. L'IA dans les LGC (2025-2026)

**Doctolib « Assistant de consultation »** — commercialisé octobre 2024 ; enregistre la consultation, produit une note structurée, puis des **courriers générés depuis la synthèse** ; 79 € TTC/mois ([aide Doctolib](https://doctolib.zendesk.com/hc/fr/articles/36810731389460-Comment-m-abonner-%C3%A0-l-Assistant-de-consultation-autonome)). Adoption : « 5 millions de consultations assistées par l'IA en France » (oct. 2025), > 6 M fin 2025. Fiabilité revendiquée 95 %. Produits connexes : **Assistant téléphonique** (99 €/mois) et **Doctolib Parents** (2026).

**Nabla** — scribe ambiant lancé mars 2023 ; 69 €/mois pour un MG, > 85 000 cliniciens revendiqués en 2025, intégré nativement à **Weda** ; audio non conservé, HDS ([Maddyness](https://www.maddyness.com/2025/06/17/ia-nabla-leve-70-millions-de-dollars-pour-passer-la-vitesse-superieure-en-europe/)).

**Cegedim Santé** — **Praxy.ai** dans Maiia Médecin (mars 2025) ; **Vocca** pour l'accueil téléphonique (juin 2026) ; **« Assistant by Claude Bernard IA »** offert aux utilisateurs Maiia Médecin, MLM et Crossway depuis le 29 sept. 2026.

**CompuGroup Medical** — 21 janv. 2026 : « Assistant Téléphonique » et « Assistant de Consultation » ; « l'IA propose, le médecin dispose » ([CGM](https://www.cgm.com/fra_fr/magazine/articles/communique-de-presse/2026/compugroup-medical-france-deploie-deux-assistants-ia-pour-alleger-le-quotidien-des-cabinets-medicaux.html)).

**Autres** — MédiStory : **Loquii** ; HelloDoc : **Synapse Medicine** et **MedGPT** ; **Posos** + **Ordoclic** (moteur d'ordonnance numérique agréé CNDA, LAP certifié) ; **Lifen** : routage/classification ML des documents entrants ; **Ipso santé** : NLP maison qui vérifie 15 items de prévention dans les notes libres, « on a l'impression que le logiciel comprend ce qu'on veut faire » ([Egora](https://www.egora.fr/actus-pro/sante-numerique/ces-cabinets-de-medecine-generale-qui-utilisent-lintelligence)).

**Positions institutionnelles.** HAS, 30 oct. 2025, « Premières clés d'usage de l'IA générative en santé » : chaque contenu généré est « une proposition pouvant contenir des erreurs », usage « conscient, supervisé et raisonné », garder une pratique sans IA ([HAS](https://has-sante.fr/jcms/p_3703115/fr/premieres-clefs-d-usage-de-l-ia-generative-en-sante)). Guide HAS/CNIL « Accompagner le bon usage des SIA en contexte de soins » (2026) : fiche 7 information/consentement, fiche 8 décision automatisée et contrôle humain ([CNIL](https://www.cnil.fr/fr/ia-et-sante-la-has-et-la-cnil-lancent-une-consultation-publique-sur-un-projet-de-guide)). CNOM : livre blanc de janv. 2018 ; position sur l'enregistrement des consultations non actualisée publiquement.

---

## 5. Les chiffres clés pour calibrer les personas

- **Effectifs** : 242 200 médecins au 1er janv. 2026 dont **101 000 généralistes**, âge moyen 50,2 ans, 53 % de femmes ([DREES](https://drees.solidarites-sante.gouv.fr/communique-de-presse-jeux-de-donnees/jeux-de-donnees/260702-medecins-supplementaires-en-activite-en-france-au-1er-janvier-2026)) ; ≈ **52 500 MG libéraux** fin 2025, file active moyenne **1 992 patients** ([Cnam](https://www.assurance-maladie.ameli.fr/presse/2026-06-11-cp-observatoire-de-l-acces-aux-soins)).
- **Journée type** (DREES 2025-2026, [synthèse GPM](https://www.gpm.fr/temps-de-travail-medecin-generaliste/)) : 46,2 h/semaine ; 36 h 30 avec les patients ; ≈ **6 h de gestion de cabinet et coordination** ; ≈ 22-25 consultations par jour travaillé ; 18,7 min par consultation, 40 min par visite, 14 min en téléconsultation ; 53 % finissent après 20 h au moins une fois par semaine.
- **Équipement et usages numériques** (IGAS/IGF 2026, MG) : logiciel Ségur 87,8 % ; LAP certifié 89,6 % ; ordonnance numérique **29,3 %** ; alimentation DMP **30,9 %**.
- **Rémunération numérique** : DONUM max 2 940 €/an, FMT prévention 5 €/patient/indicateur payé en 2027, dernière ROSP versée en avril 2026.

---

## 6. Implications pour un LGC AI-natif (lecture des résultats)

1. **Le dossier par problème** manque partout (Doctolib, HelloDoc, Weda) : un modèle « problèmes actifs ↔ consultations ↔ traitements ↔ résultats » avec le DRC/CISP-2 comme pivot et CIM-10/SNOMED en sortie répond à la plainte n° 1 après le nombre de clics.
2. **L'ingestion est le vrai goulot** : CR-BIO CDA/LOINC, lettres de liaison, courriers MSSanté dédoublonnés, documents DMP — l'IA doit classer, extraire et *résumer* avant la consultation.
3. **Les téléservices doivent disparaître de l'écran** : INSi via appli carte Vitale, PSC sans reconnexion, FSE/SCOR/AAT/PSE en arrière-plan, avec un tableau de bord DONUM/FMT en temps réel (15 indicateurs de prévention).
4. **Le scribe est acquis, la confiance non** : afficher la provenance de chaque ligne générée, traçabilité du consentement, hébergement HDS, pas d'audio conservé, et un mode « sans IA ».
5. **Prix de référence** à battre : ≈ 135-285 €/mois chez Doctolib tout compris, ≈ 100-160 € chez Weda, ≈ 70 € chez AlmaPro, + 69-79 €/mois pour un scribe.
