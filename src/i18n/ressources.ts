import type { Dict } from "./config";

/** Un champ de requête ou de réponse, tel que la documentation le liste. */
export interface DocField { name: string; type?: string; desc: string; required?: boolean }

/** Un endpoint servi par locus-core : chemin réel, sans alias. */
export interface DocEndpoint {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  /** `any` : clé `lsk_` ou jeton de session ; `key` : clé seulement ; `none` : public. */
  auth: "any" | "key" | "none";
  /** Ce qu'un client en fait, pour la vue d'ensemble. */
  use: string;
  summary: string;
  where?: "body" | "path" | "query";
  params?: DocField[];
  returns?: DocField[];
  errors?: string;
}

export interface DocGroup { id: "answer" | "drugs" | "logic" | "sources" | "feedback" | "history" | "widget"; lead: string; endpoints: DocEndpoint[] }

/**
 * Zone ressources : `/[lang]/sources`, `/[lang]/documentation`, `/[lang]/cles-api`.
 * N'affiche que des faits vérifiés dans locus-core (`openapi.json` et les
 * routeurs `query/api/*.py` de `main`) : les chemins tels que core les sert,
 * sans alias ni route annoncée. Aucun chiffre de corpus, aucune route
 * interne (console, laboratoire, ops), aucun détail de pipeline.
 */
const fr = {
  sources: {
    meta: { title: "Sources", description: "Les recommandations et référentiels français que Locus interroge et cite." },
    title: "Sources",
    lead: "Locus répond à partir de recommandations françaises publiées par des autorités de santé, et cite les documents qu'il mobilise.",
    corpusTitle: "Corpus",
    corpusNote: "En français",
    publishers: [
      {
        id: "HAS",
        name: "Haute Autorité de Santé",
        kind: "Recommandations",
        text: "Les publications de la HAS destinées aux professionnels de santé.",
        items: ["Recommandations de bonnes pratiques", "Guides maladies chroniques (ALD)", "Recommandations vaccinales", "Recommandations en santé publique"],
        filter: true,
      },
      {
        id: "ANSM",
        name: "Base de données publique des médicaments",
        kind: "Médicaments",
        text: "Les résumés des caractéristiques du produit (RCP) des spécialités, issus du référentiel de l'ANSM.",
        items: ["Posologies", "Contre-indications", "Interactions", "Mises en garde"],
        filter: false,
      },
    ],
    filterYes: "Filtrable avec `sources`",
    filterNo: "Toujours consulté",
    idLabel: "Identifiant",
    howTitle: "Dans une réponse",
    how: [
      { title: "Chaque document est cité", text: "La réponse liste les documents mobilisés : titre, année de la recommandation, éditeur et lien vers le document." },
      { title: "Le périmètre se choisit", text: "Les champs `sources` et `exclude_sources` restreignent une question à certains éditeurs. La réponse rappelle le périmètre réellement appliqué dans `source_scope`." },
      { title: "Les médicaments restent visibles", text: "Les RCP ne dépendent d'aucun éditeur de recommandations : restreindre le corpus ne masque jamais une contre-indication." },
    ],
    listTitle: "La liste qui fait foi",
    listText: "Les identifiants acceptés par votre clé se lisent sur `GET /v2/sources`, avec le nombre de documents courants de chaque éditeur.",
    docsCta: "Lire la documentation",
  },
  docs: {
    meta: { title: "Documentation", description: "Les endpoints que l'API Locus sert aujourd'hui : question clinique, médicaments, scores, sources, retours, historique, widget." },
    title: "Documentation",
    lead: "Les endpoints que l'API Locus sert aujourd'hui, regroupés par usage. Chaque chemin est celui de l'API, sans alias.",
    toc: "Sur cette page",
    copy: "Copier",
    copied: "Copié",
    sections: {
      auth: "Authentification",
      user: "Compte utilisateur",
      overview: "Vue d'ensemble",
      answer: "Question clinique",
      drugs: "Médicaments et RCP",
      logic: "Scores et arbres",
      sources: "Catalogue des sources",
      feedback: "Retours et usage",
      history: "Historique des fils",
      widget: "Widget intégré",
      workflows: "Workflows",
      errors: "Erreurs",
    },
    auth: {
      p1: "Chaque requête porte une clé API en jeton bearer. Une clé a la forme `lsk_<slug>_<aléatoire>`, vaut pour toute votre organisation et reste côté serveur : jamais dans le navigateur, ni dans une application distribuée.",
      p2: "Pour un navigateur intégré à votre logiciel, votre serveur échange la clé contre un jeton de session lié à un compte (`POST /v2/session-token`). Le jeton se présente de la même façon, en bearer, et expire.",
      p3: "`GET /v2/whoami` rend ce que le crédentiel présenté affirme : `client_id`, `client_slug`, `user_ref`, `auth` (`key` ou `session`) et `scope`. C'est le premier appel à faire devant un 401.",
      baseUrl: "URL de base",
      keysCta: "Obtenir une clé",
    },
    user: {
      p1: "L'en-tête `X-Locus-User-Ref` nomme le compte utilisateur, tel que votre logiciel l'identifie. Envoyez un identifiant opaque et stable, de 1 à 200 caractères, jamais un nom ni une adresse e-mail.",
      p2: "Avec une clé, il rattache l'usage à chaque compte. Il est requis sur l'historique des fils, et sur les questions quand le décompte de crédits par compte est actif sur votre clé. Avec un jeton de session, le compte vient du jeton et l'en-tête est ignoré.",
    },
    overview: {
      use: "Usage",
      endpoint: "Endpoint",
      access: "Accès",
    },
    access: {
      short: { any: "Clé ou jeton", key: "Clé seulement", none: "Public" },
      long: { any: "Clé `lsk_` ou jeton de session", key: "Clé `lsk_` seulement, refusée à un jeton de session", none: "Sans authentification" },
    },
    params: {
      name: "Champ",
      type: "Type",
      desc: "Rôle",
      required: "requis",
      where: { body: "Corps JSON", path: "Paramètres de chemin", query: "Paramètres d'URL" },
      returns: "Réponse",
      errors: "Erreurs propres",
      headers: "En-têtes",
    },
    groups: [
      {
        id: "answer",
        lead: "Une question clinique, éventuellement confrontée au dossier d'un patient, et la réponse sourcée. Deux formes du même appel : en flux, ou en un seul JSON.",
        endpoints: [
          {
            method: "POST", path: "/v2/retrieve/stream", auth: "any", use: "Poser une question clinique, en flux",
            summary: "Diffuse la réponse en NDJSON : une ligne JSON par étape terminée, puis une ligne finale qui porte la réponse complète. Le statut HTTP est 200 dès la première ligne : une erreur survenue pendant le flux arrive comme ligne finale `error`.",
            where: "body",
            params: [
              { name: "query", type: "string", desc: "La question, en langage naturel.", required: true },
              { name: "mode", type: "\"rapide\" | \"approfondi\"", desc: "`rapide` : réponse directe. `approfondi` : raisonnement approfondi, s'il est ouvert sur votre clé ; sinon la question part en `rapide`. Absent : le défaut du serveur." },
              { name: "patient_ehr", type: "string", desc: "Le dossier patient en texte libre, pseudonymisé. La réponse est alors confrontée au patient." },
              { name: "history", type: "array", desc: "Les tours précédents du fil, du plus ancien au plus récent : `question`, `answer_short`, `precisions`. Ils qualifient la nouvelle question ; une réponse passée ne fait jamais source." },
              { name: "sources", type: "string[]", desc: "Ne retenir que ces éditeurs, par identifiant (`GET /v2/sources`), de 1 à 32. Absent : tout le corpus. Une liste vide est refusée." },
              { name: "exclude_sources", type: "string[]", desc: "Écarter ces éditeurs, appliqué après `sources`." },
              { name: "conversation_id", type: "string", desc: "Le fil auquel la question appartient, tel que vous le nommez (64 caractères au plus). Journalisé pour la relecture ; le contexte, lui, voyage dans `history`." },
              { name: "app_surface", type: "string", desc: "D'où la question est posée : `app`, `embed`, `console` ou votre propre libellé (32 caractères au plus)." },
              { name: "app_platform", type: "string", desc: "`web`, `ios` ou `android`." },
              { name: "app_version", type: "string", desc: "La version publiée de votre logiciel." },
              { name: "app_build", type: "string", desc: "Le build exact (SHA court, numéro de build natif), pour rejouer un retour." },
            ],
            errors: "`402 CREDITS_EXHAUSTED` et `400 CREDITS_USER_REF_REQUIRED` avant toute diffusion. Une source inconnue arrive en ligne finale `error`, avec `code: \"UNKNOWN_SOURCE\"` et `known_sources`.",
          },
          {
            method: "POST", path: "/v2/retrieve", auth: "any", use: "Poser une question clinique, en un seul JSON",
            summary: "Le même corps et la même réponse, rendue en une fois. L'en-tête `Accept` choisit le format : `application/json` (défaut), `text/markdown` ou `text/html`. Les erreurs arrivent avec leur statut HTTP.",
            errors: "`400 UNKNOWN_SOURCE` (avec `known_sources`), `400 EMPTY_SOURCE_SCOPE`, `402 CREDITS_EXHAUSTED`, `502 ANSWER_UNAVAILABLE`, `503 GRAPH_UNAVAILABLE`.",
          },
        ],
      },
      {
        id: "drugs",
        lead: "Les cartes `drugs` d'une réponse portent des rubriques de RCP tronquées, et listent les autres spécialités sans leur RCP. Ces deux routes chargent le texte entier, à l'ouverture.",
        endpoints: [
          {
            method: "GET", path: "/v2/drugs/rubrics/{rubric_id}", auth: "any", use: "Lire une rubrique de RCP en entier",
            summary: "Le texte intégral d'une rubrique, jamais résumé (`truncated: false`).",
            where: "path",
            params: [{ name: "rubric_id", type: "string", desc: "L'identifiant de la rubrique, tel que rendu dans `drugs[].reference.rubrics[].id`.", required: true }],
            returns: [
              { name: "code", type: "string", desc: "Le numéro de rubrique : `4.1`, `4.3`, `5.1`…" },
              { name: "label", type: "string", desc: "L'intitulé de la rubrique." },
              { name: "text", type: "string", desc: "Le texte entier." },
              { name: "blocks", type: "array", desc: "La rubrique découpée en prose et en tableaux, quand elle contient un tableau." },
            ],
            errors: "`404 RUBRIC_NOT_FOUND`.",
          },
          {
            method: "GET", path: "/v2/drugs/specialites/{cis}", auth: "any", use: "Charger une spécialité et son RCP",
            summary: "Une spécialité et ses rubriques de RCP, chargées à la demande.",
            where: "path",
            params: [{ name: "cis", type: "string", desc: "Le code CIS, tel que rendu dans `drugs[].others[].cis`.", required: true }],
            returns: [
              { name: "cis, label", type: "string", desc: "Le code et le libellé de la spécialité." },
              { name: "forme, voie, dosage", type: "string", desc: "La forme, la voie et le dosage, quand le référentiel les porte." },
              { name: "atc", type: "string[]", desc: "Les codes ATC de la substance." },
              { name: "rubrics", type: "array", desc: "Les rubriques de RCP, de la même forme que ci-dessus." },
              { name: "unavailable_reason", type: "string", desc: "`rcp_indisponible` quand aucune rubrique n'est rattachée ; `rcp_external_url` dit alors où lire le RCP." },
            ],
            errors: "`404 SPECIALITE_NOT_FOUND`.",
          },
        ],
      },
      {
        id: "logic",
        lead: "Quand une réponse propose un score ou un arbre de décision (`elicitations`), les tours suivants (cocher une case, choisir une branche, changer un niveau) passent par cette route : l'unité est désignée par sa clé, sans nouvelle recherche ni rédaction. Le calcul est déterministe. Rien n'est tracé ni décompté.",
        endpoints: [
          {
            method: "POST", path: "/v2/logic/compute", auth: "any", use: "Calculer un score ou parcourir un arbre",
            summary: "Le résultat de l'unité pour les réponses données. `POST /v2/retrieve` reste la route quand la question change.",
            where: "body",
            params: [
              { name: "mku_key", type: "string", desc: "La clé de l'unité, telle que rendue dans `elicitations[].mku_key`.", required: true },
              { name: "answers", type: "object", desc: "Score : `{intitulé de question: modalité choisie}`. Arbre : `{id du nœud: condition choisie}`." },
              { name: "checked", type: "string[]", desc: "Score à cases : les libellés retenus." },
              { name: "level", type: "string", desc: "Échelle ordinale : le niveau choisi." },
              { name: "sources, exclude_sources", type: "string[]", desc: "Le même périmètre d'éditeurs que la question : ce que la réponse ne peut pas citer ne se calcule pas." },
            ],
            returns: [
              { name: "type", type: "string", desc: "`score` ou `tree`." },
              { name: "titre, url", type: "string", desc: "Le nom de l'unité et le document qui la porte." },
              { name: "computed", type: "object", desc: "`total`, `outcome` (l'interprétation de la source), `path` pour un arbre, `retained` (le détail du total). Un `outcome` nul avec `reason` rempli est une réponse : la source ne conclut pas pour ce total." },
              { name: "note", type: "string", desc: "Pourquoi l'unité n'est pas exécutable, le cas échéant." },
            ],
            errors: "`404 UNKNOWN_LOGIC_UNIT`, `400 UNKNOWN_SOURCE`.",
          },
        ],
      },
      {
        id: "sources",
        lead: "Les identifiants que `sources` et `exclude_sources` acceptent sur votre clé. La liste change à l'ingestion d'un nouveau corpus ; le serveur la garde une heure en cache.",
        endpoints: [
          {
            method: "GET", path: "/v2/sources", auth: "any", use: "Lister les éditeurs filtrables",
            summary: "Les éditeurs du corpus, triés par volume. Un éditeur sans document courant n'est pas listé.",
            returns: [
              { name: "id", type: "string", desc: "L'identifiant à passer dans `sources`, par exemple `HAS`." },
              { name: "name", type: "string", desc: "Le nom complet de l'éditeur." },
              { name: "docs", type: "number", desc: "Le nombre de documents courants." },
            ],
          },
        ],
      },
      {
        id: "feedback",
        lead: "Chaque réponse servie laisse une trace, désignée par son `trace_id`. Un retour utilisateur s'y attache, et votre consommation se lit sur l'ensemble des traces de votre organisation.",
        endpoints: [
          {
            method: "POST", path: "/v2/feedback", auth: "any", use: "Noter une réponse",
            summary: "Attache un pouce levé ou baissé à une réponse servie. Idempotent : un nouvel envoi remplace le vote.",
            where: "body",
            params: [
              { name: "trace_id", type: "string", desc: "Le `trace_id` de la réponse.", required: true },
              { name: "vote", type: "-1 | 0 | 1", desc: "`1` pouce levé, `-1` pouce baissé, `0` vote retiré.", required: true },
              { name: "note", type: "string", desc: "Motif libre, 2 000 caractères au plus." },
            ],
            returns: [{ name: "ok, trace_id, vote", type: "", desc: "Le vote enregistré." }],
            errors: "`404 TRACE_NOT_FOUND`, `503 TRACES_DISABLED`.",
          },
          {
            method: "GET", path: "/v2/usage", auth: "key", use: "Lire la consommation de l'organisation",
            summary: "Réponses servies, comptes actifs, latences et retours, sur une fenêtre glissante.",
            where: "query",
            params: [
              { name: "days", type: "number", desc: "La fenêtre, de 1 à 365 jours. 30 par défaut." },
              { name: "accounts", type: "number", desc: "Combien de comptes en tête de liste, de 0 à 100. 10 par défaut." },
            ],
            returns: [
              { name: "answers", type: "number", desc: "Les réponses servies sur la fenêtre." },
              { name: "accounts", type: "number", desc: "Les comptes distincts (`X-Locus-User-Ref`)." },
              { name: "latency_ms", type: "object", desc: "`p50` et `p95`." },
              { name: "feedback", type: "object", desc: "`up`, `down`, `rated`." },
              { name: "per_day", type: "array", desc: "`{day, answers}`, par date." },
              { name: "top_accounts", type: "array", desc: "Les comptes les plus actifs : `user_ref`, `answers`, `last_at`." },
              { name: "truncated", type: "boolean", desc: "`true` : fenêtre trop large pour un total exact, réduisez `days`." },
            ],
            errors: "`403 AUTH_KEY_REQUIRED`, `503 TRACES_DISABLED`.",
          },
        ],
      },
      {
        id: "history",
        lead: "Les fils de questions d'un compte, synchronisés entre ses appareils. Le `payload` est opaque : l'API le range et le rend sans le lire. Chaque requête reste dans le couple organisation et compte ; avec une clé, `X-Locus-User-Ref` est requis (`400 USER_REF_REQUIRED`).",
        endpoints: [
          {
            method: "GET", path: "/v2/conversations", auth: "any", use: "Lister les fils d'un compte",
            summary: "Les fils du compte, le plus récent en tête, sans leur contenu.",
            where: "query",
            params: [{ name: "since", type: "string", desc: "ISO-8601 : seulement ce qui a changé depuis, suppressions comprises (`deleted: true`)." }],
            returns: [{ name: "conversations", type: "array", desc: "`id`, `title`, `created_at`, `updated_at`, `has_patient_data`, `deleted`." }],
          },
          {
            method: "GET", path: "/v2/conversations/{conversation_id}", auth: "any", use: "Lire un fil",
            summary: "Un fil, avec son `payload`.",
            errors: "`404 CONVERSATION_NOT_FOUND`.",
          },
          {
            method: "PUT", path: "/v2/conversations/{conversation_id}", auth: "any", use: "Écrire un fil",
            summary: "Écrit le fil entier. Idempotent ; `updated_at` est posé par le serveur. Écrire dans un fil supprimé le rétablit.",
            where: "body",
            params: [
              { name: "title", type: "string", desc: "500 caractères au plus." },
              { name: "payload", type: "object", desc: "Le fil, dans la forme de votre logiciel." },
              { name: "has_patient_data", type: "boolean", desc: "Le fil porte-t-il un contexte clinique." },
              { name: "created_at", type: "string", desc: "La date de création connue de votre logiciel." },
            ],
          },
          {
            method: "DELETE", path: "/v2/conversations/{conversation_id}", auth: "any", use: "Supprimer un fil",
            summary: "Supprime un fil. Toujours `204`, même pour un fil déjà supprimé.",
          },
          {
            method: "DELETE", path: "/v2/conversations", auth: "any", use: "Effacer l'historique d'un compte",
            summary: "Efface tous les fils du compte et rend `{ok, deleted}`.",
          },
        ],
      },
      {
        id: "widget",
        lead: "Pour afficher le widget Locus dans votre logiciel : votre serveur émet un jeton par poste, et le widget lit sa configuration avec ce jeton.",
        endpoints: [
          {
            method: "POST", path: "/v2/session-token", auth: "key", use: "Émettre un jeton de session pour un poste",
            summary: "Échange la clé contre un jeton court, lié à un compte. Le renouvellement est le même appel, avant `exp`.",
            where: "body",
            params: [
              { name: "user_ref", type: "string", desc: "Le compte, tel que vous le nommez : un identifiant opaque, jamais un nom ni un patient.", required: true },
              { name: "scope", type: "string", desc: "Séparé par des espaces. Défaut : `retrieve feedback history drugs logic`." },
              { name: "ttl_seconds", type: "number", desc: "De 60 à 86 400. 12 h par défaut." },
            ],
            returns: [
              { name: "token", type: "string", desc: "Le jeton, à présenter en bearer." },
              { name: "exp", type: "number", desc: "Son expiration, en secondes Unix." },
              { name: "absolute_exp", type: "number", desc: "Le plafond que le renouvellement ne franchit pas : au-delà, un nouveau jeton." },
              { name: "scope", type: "string", desc: "Le scope accordé." },
            ],
            errors: "`403 AUTH_KEY_REQUIRED`.",
          },
          {
            method: "GET", path: "/v2/embed-config", auth: "any", use: "Lire la configuration du widget",
            summary: "Ce que le widget applique : `theme`, `features`, `labels`, `branding`, `preferences` et `client`. Une configuration absente rend les valeurs par défaut.",
          },
          {
            method: "PUT", path: "/v2/embed-config", auth: "key", use: "Écrire la configuration du widget",
            summary: "Remplace la configuration. Le corps est normalisé : une valeur illisible retombe sur le défaut, un champ inconnu est ignoré.",
            where: "body",
            params: [{ name: "theme, features, labels, branding", type: "object", desc: "Les quatre blocs de la configuration." }],
          },
          {
            method: "GET", path: "/v2/embed-config/public", auth: "none", use: "Lire le thème avant l'authentification",
            summary: "Le thème, les libellés et la marque, pour peindre le widget avant la poignée de main. Un client inconnu rend les défauts.",
            where: "query",
            params: [{ name: "client", type: "string", desc: "L'identifiant du client." }],
          },
          {
            method: "GET", path: "/v2/whoami", auth: "any", use: "Vérifier un crédentiel",
            summary: "Le client, le compte et la porte d'entrée du crédentiel présenté.",
          },
        ],
      },
    ] as DocGroup[],
    answer: {
      lines: [
        { step: "…", desc: "Une étape terminée. Affichez une progression, sans dépendre de la liste exacte des étapes." },
        { step: "done", desc: "Ligne finale. `payload` porte la réponse complète." },
        { step: "error", desc: "Ligne finale. `detail` dit ce qui a échoué ; `code` et `known_sources` l'accompagnent pour une source inconnue." },
      ],
      linesTitle: "Le flux NDJSON",
      linesLead: "Chaque ligne est un objet JSON complet, terminé par `\\n`, avec un champ `step`.",
      payloadTitle: "La réponse",
      payloadLead: "Dans la ligne `done` du flux, ou le corps de `/v2/retrieve`. La charge porte aussi des champs de diagnostic : ne vous appuyez que sur ceux-ci.",
      payload: [
        { name: "trace_id", desc: "L'identifiant de cette réponse, à renvoyer à `POST /v2/feedback`. Vide quand la journalisation est coupée : ne proposez alors pas de retour." },
        { name: "answer", desc: "La réponse rédigée, en Markdown, avec ses renvois aux documents." },
        { name: "answer_short", desc: "La conduite à tenir en une phrase." },
        { name: "docs", desc: "Les documents cités : `id`, `title`, `year` (année de la recommandation), `url`, `source_id`, `source_name`." },
        { name: "drugs", desc: "Une carte par molécule : `dci`, `atc`, `reference` (la spécialité de référence : `cis`, `label`, `rubrics` de RCP tronquées), `others` (les autres spécialités, sans RCP), `others_total`." },
        { name: "elicitations", desc: "Les scores et arbres que la réponse propose de remplir : `mku_key`, `type`, `titre`, `steps`, `computed`. La suite passe par `POST /v2/logic/compute`." },
        { name: "ehr_additions", desc: "Le fait clinique nouveau apporté par ce tour, à ajouter au dossier côté logiciel." },
        { name: "source_scope", desc: "Le périmètre appliqué, `{include, exclude}` en identifiants canoniques ; `null` pour tout le corpus." },
      ],
      headerRows: [
        { name: "Authorization", desc: "Bearer lsk_…", required: true },
        { name: "Content-Type", desc: "application/json", required: true },
        { name: "X-Locus-User-Ref", desc: "Identifiant opaque du compte. Requis quand le décompte par compte est actif sur votre clé.", required: false },
        { name: "Accept", desc: "`/v2/retrieve` : `application/json`, `text/markdown` ou `text/html`.", required: false },
      ],
      examplesTitle: "Exemples",
      buffer: "Un morceau réseau ne tombe pas sur une fin de ligne : gardez le reliquat du tampon jusqu'au prochain `\\n` avant de parser.",
    },
    examples: { curl: "cURL", ts: "TypeScript", question: "Kétoprofène chez un patient de 74 ans sous IEC et furosémide ?", ehr: "Homme, 74 ans. HTA sous ramipril 5 mg et furosémide 40 mg. DFG 52 mL/min.", progress: "avancée", logicKey: "<elicitations[].mku_key>", logicQuestion: "<intitulé de question>", logicChoice: "<modalité choisie>", account: "<identifiant du poste>" },
    workflows: {
      p1: "L'API n'a pas d'endpoint dédié aux workflows. Ce que montre Studio est composé côté logiciel, sur les endpoints ci-dessus.",
      p2: "Chaque question posée ainsi est une réponse tracée et décomptée comme les autres.",
      workflow: "Workflow",
      call: "Appels",
      rows: [
        { name: "Contrôle d'ordonnance, question clinique depuis le dossier", call: "`POST /v2/retrieve/stream`, avec une question rédigée par le logiciel et les données transmises en `patient_ehr`." },
        { name: "Synthèse du dossier", call: "Aucun appel : les données transmises sont remises en lignes par le logiciel, sans recommandation à citer." },
        { name: "Score ou arbre dans un formulaire", call: "`POST /v2/retrieve/stream` pour la question, puis `POST /v2/logic/compute` à chaque réponse du formulaire." },
        { name: "Compte rendu dicté, puis aide à la décision", call: "La transcription et la note restent dans votre logiciel ; l'aide à la décision est `POST /v2/retrieve/stream`, avec la note relue en `patient_ehr`." },
        { name: "Ordonnance préparée depuis une demande, dont le transport", call: "Votre logiciel rédige l'ordonnance ; la vérification clinique passe par `POST /v2/retrieve/stream`." },
      ],
    },
    errors: {
      p1: "Une erreur HTTP porte `{\"detail\": {\"code\": \"…\", \"message\": \"…\"}}`. Un corps mal formé reçoit un `422` de validation, sans `code`. Sur `/v2/retrieve/stream`, une erreur survenue après la première ligne arrive comme ligne finale `error`.",
      status: "Statut",
      code: "Code",
      meaning: "Signification",
      rows: [
        { status: "400", code: "UNKNOWN_SOURCE", meaning: "Un identifiant de `sources` ou `exclude_sources` est inconnu. `known_sources` liste ceux qui existent." },
        { status: "400", code: "EMPTY_SOURCE_SCOPE", meaning: "Toutes les sources incluses sont aussi exclues." },
        { status: "400", code: "CREDITS_USER_REF_REQUIRED", meaning: "`X-Locus-User-Ref` manque alors que le décompte par compte est actif." },
        { status: "400", code: "USER_REF_REQUIRED", meaning: "`X-Locus-User-Ref` manque sur l'historique des fils, avec une clé." },
        { status: "401", code: "AUTH_MISSING", meaning: "Aucun jeton bearer." },
        { status: "401", code: "AUTH_INVALID_FORMAT", meaning: "Le jeton n'est pas une clé `lsk_…`." },
        { status: "401", code: "AUTH_INVALID_KEY", meaning: "Clé inconnue ou révoquée." },
        { status: "401", code: "TOKEN_EXPIRED", meaning: "Jeton de session expiré : demandez-en un nouveau à votre serveur." },
        { status: "401", code: "TOKEN_ABSOLUTE_EXPIRED", meaning: "Jeton de session au-delà de son plafond : émettez-en un nouveau." },
        { status: "401", code: "TOKEN_INVALID", meaning: "Jeton de session illisible ou mal signé." },
        { status: "402", code: "CREDITS_EXHAUSTED", meaning: "Le compte n'a plus de crédit. Renvoyé avant toute diffusion." },
        { status: "403", code: "AUTH_CLIENT_INACTIVE", meaning: "Crédentiel valide, organisation désactivée." },
        { status: "403", code: "AUTH_KEY_REQUIRED", meaning: "Route réservée à la clé, appelée avec un jeton de session." },
        { status: "404", code: "UNKNOWN_LOGIC_UNIT", meaning: "Aucun score ni arbre ne porte cette clé dans le périmètre demandé." },
        { status: "404", code: "RUBRIC_NOT_FOUND, SPECIALITE_NOT_FOUND", meaning: "Rubrique ou code CIS inconnu." },
        { status: "404", code: "TRACE_NOT_FOUND, CONVERSATION_NOT_FOUND", meaning: "`trace_id` ou fil inconnu." },
        { status: "502", code: "ANSWER_UNAVAILABLE", meaning: "La réponse n'a pas pu être rédigée. Rien n'est décompté." },
        { status: "503", code: "GRAPH_UNAVAILABLE, RETRIEVAL_UNAVAILABLE", meaning: "Le corpus est momentanément indisponible. Réessayez." },
        { status: "503", code: "TRACES_DISABLED", meaning: "La journalisation est coupée sur cette instance : pas de retour ni d'usage." },
      ],
    },
  },
  keys: {
    meta: { title: "Clés API", description: "Les clés API Locus sont délivrées sur invitation." },
    title: "Clés API",
    lead: "Les clés sont remises par l'équipe Locus à votre organisation, après un échange sur votre intégration.",
    boxTitle: "Sur invitation",
    boxText: "Une clé appelle les mêmes services que Studio, depuis votre logiciel. Elle est rattachée à votre organisation et s'utilise côté serveur. Votre interlocuteur Locus vous la transmet.",
    docs: "Lire la documentation",
    stepsTitle: "Étapes",
    steps: [
      { title: "Tester dans Studio", text: "Essayez les quatre sandbox sur vos cas d'usage." },
      { title: "Recevoir la clé", text: "Après validation, la clé `lsk_…` est remise à votre organisation." },
      { title: "Premier appel", text: "Posez la clé côté serveur et appelez `POST /v2/retrieve/stream`." },
    ],
    formatTitle: "Format",
    formatText: "Une clé commence par `lsk_`, suivi de l'identifiant de votre organisation. Elle se transmet en jeton bearer.",
    sandboxNote: "Sans clé, Studio reste votre terrain d'essai, en direct sur patients fictifs.",
  },
};

const en: typeof fr = {
  sources: {
    meta: { title: "Sources", description: "The French guidelines and references Locus queries and cites." },
    title: "Sources",
    lead: "Locus answers from French guidelines published by health authorities, and cites the documents it relies on.",
    corpusTitle: "Corpus",
    corpusNote: "In French",
    publishers: [
      {
        id: "HAS",
        name: "Haute Autorité de Santé",
        kind: "Guidelines",
        text: "The French National Authority for Health's publications for healthcare professionals.",
        items: ["Clinical practice guidelines", "Chronic disease guides (ALD)", "Vaccination guidelines", "Public health guidelines"],
        filter: true,
      },
      {
        id: "ANSM",
        name: "Base de données publique des médicaments",
        kind: "Medicines",
        text: "Summaries of product characteristics (SmPC) of medicinal products, from the French medicines agency (ANSM) reference.",
        items: ["Dosage", "Contraindications", "Interactions", "Warnings"],
        filter: false,
      },
    ],
    filterYes: "Filterable with `sources`",
    filterNo: "Always consulted",
    idLabel: "Identifier",
    howTitle: "In an answer",
    how: [
      { title: "Every document is cited", text: "The answer lists the documents it used: title, guideline year, publisher and a link to the document." },
      { title: "You choose the scope", text: "The `sources` and `exclude_sources` fields restrict a question to some publishers. The answer states the scope actually applied in `source_scope`." },
      { title: "Medicines stay visible", text: "SmPCs do not depend on any guideline publisher: restricting the corpus never hides a contraindication." },
    ],
    listTitle: "The authoritative list",
    listText: "The identifiers your key accepts are returned by `GET /v2/sources`, with each publisher's number of current documents.",
    docsCta: "Read the documentation",
  },
  docs: {
    meta: { title: "Documentation", description: "The endpoints the Locus API serves today: clinical question, medicines, scores, sources, feedback, history, widget." },
    title: "Documentation",
    lead: "The endpoints the Locus API serves today, grouped by use. Every path is the API's own, with no alias.",
    toc: "On this page",
    copy: "Copy",
    copied: "Copied",
    sections: {
      auth: "Authentication",
      user: "User account",
      overview: "Overview",
      answer: "Clinical question",
      drugs: "Medicines and SmPC",
      logic: "Scores and trees",
      sources: "Source catalogue",
      feedback: "Feedback and usage",
      history: "Thread history",
      widget: "Embedded widget",
      workflows: "Workflows",
      errors: "Errors",
    },
    auth: {
      p1: "Every request carries an API key as a bearer token. A key looks like `lsk_<slug>_<random>`, covers your whole organisation and stays on your server: never in the browser, nor in a distributed app.",
      p2: "For a browser embedded in your software, your server exchanges the key for a session token tied to one account (`POST /v2/session-token`). The token is sent the same way, as a bearer, and expires.",
      p3: "`GET /v2/whoami` returns what the presented credential asserts: `client_id`, `client_slug`, `user_ref`, `auth` (`key` or `session`) and `scope`. It is the first call to make when facing a 401.",
      baseUrl: "Base URL",
      keysCta: "Get a key",
    },
    user: {
      p1: "The `X-Locus-User-Ref` header names the user account, as your software identifies it. Send an opaque, stable identifier of 1 to 200 characters, never a name or an email address.",
      p2: "With a key, it ties usage to each account. It is required on thread history, and on questions when per-account credit metering is active on your key. With a session token, the account comes from the token and the header is ignored.",
    },
    overview: {
      use: "Use",
      endpoint: "Endpoint",
      access: "Access",
    },
    access: {
      short: { any: "Key or token", key: "Key only", none: "Public" },
      long: { any: "`lsk_` key or session token", key: "`lsk_` key only, refused to a session token", none: "No authentication" },
    },
    params: {
      name: "Field",
      type: "Type",
      desc: "Purpose",
      required: "required",
      where: { body: "JSON body", path: "Path parameters", query: "Query parameters" },
      returns: "Response",
      errors: "Specific errors",
      headers: "Headers",
    },
    groups: [
      {
        id: "answer",
        lead: "A clinical question, optionally checked against a patient record, and the sourced answer. Two forms of the same call: streamed, or as a single JSON.",
        endpoints: [
          {
            method: "POST", path: "/v2/retrieve/stream", auth: "any", use: "Ask a clinical question, streamed",
            summary: "Streams the answer as NDJSON: one JSON line per completed step, then a final line carrying the full answer. The HTTP status is 200 from the first line: an error during the stream arrives as a final `error` line.",
            where: "body",
            params: [
              { name: "query", type: "string", desc: "The question, in natural language.", required: true },
              { name: "mode", type: "\"rapide\" | \"approfondi\"", desc: "`rapide`: direct answer. `approfondi`: in-depth reasoning, if it is open on your key; otherwise the question runs as `rapide`. Omitted: the server default." },
              { name: "patient_ehr", type: "string", desc: "The patient record as free text, pseudonymised. The answer is then checked against the patient." },
              { name: "history", type: "array", desc: "Previous turns of the thread, oldest first: `question`, `answer_short`, `precisions`. They qualify the new question; a past answer is never used as a source." },
              { name: "sources", type: "string[]", desc: "Keep only these publishers, by identifier (`GET /v2/sources`), 1 to 32. Omitted: the whole corpus. An empty list is rejected." },
              { name: "exclude_sources", type: "string[]", desc: "Leave out these publishers, applied after `sources`." },
              { name: "conversation_id", type: "string", desc: "The thread the question belongs to, as you name it (64 characters at most). Logged for review; the context itself travels in `history`." },
              { name: "app_surface", type: "string", desc: "Where the question is asked: `app`, `embed`, `console` or your own label (32 characters at most)." },
              { name: "app_platform", type: "string", desc: "`web`, `ios` or `android`." },
              { name: "app_version", type: "string", desc: "The released version of your software." },
              { name: "app_build", type: "string", desc: "The exact build (short SHA, native build number), to replay a report." },
            ],
            errors: "`402 CREDITS_EXHAUSTED` and `400 CREDITS_USER_REF_REQUIRED` before any streaming. An unknown source arrives as a final `error` line, with `code: \"UNKNOWN_SOURCE\"` and `known_sources`.",
          },
          {
            method: "POST", path: "/v2/retrieve", auth: "any", use: "Ask a clinical question, as one JSON",
            summary: "The same body and the same answer, returned at once. The `Accept` header picks the format: `application/json` (default), `text/markdown` or `text/html`. Errors come with their HTTP status.",
            errors: "`400 UNKNOWN_SOURCE` (with `known_sources`), `400 EMPTY_SOURCE_SCOPE`, `402 CREDITS_EXHAUSTED`, `502 ANSWER_UNAVAILABLE`, `503 GRAPH_UNAVAILABLE`.",
          },
        ],
      },
      {
        id: "drugs",
        lead: "The `drugs` cards of an answer carry truncated SmPC sections, and list the other products without their SmPC. These two routes load the full text, on opening.",
        endpoints: [
          {
            method: "GET", path: "/v2/drugs/rubrics/{rubric_id}", auth: "any", use: "Read a full SmPC section",
            summary: "The full text of one section, never summarised (`truncated: false`).",
            where: "path",
            params: [{ name: "rubric_id", type: "string", desc: "The section identifier, as returned in `drugs[].reference.rubrics[].id`.", required: true }],
            returns: [
              { name: "code", type: "string", desc: "The section number: `4.1`, `4.3`, `5.1`…" },
              { name: "label", type: "string", desc: "The section title." },
              { name: "text", type: "string", desc: "The full text." },
              { name: "blocks", type: "array", desc: "The section split into prose and tables, when it contains a table." },
            ],
            errors: "`404 RUBRIC_NOT_FOUND`.",
          },
          {
            method: "GET", path: "/v2/drugs/specialites/{cis}", auth: "any", use: "Load a product and its SmPC",
            summary: "A medicinal product and its SmPC sections, loaded on demand.",
            where: "path",
            params: [{ name: "cis", type: "string", desc: "The CIS code, as returned in `drugs[].others[].cis`.", required: true }],
            returns: [
              { name: "cis, label", type: "string", desc: "The product's code and label." },
              { name: "forme, voie, dosage", type: "string", desc: "Form, route and strength, when the reference carries them." },
              { name: "atc", type: "string[]", desc: "The substance's ATC codes." },
              { name: "rubrics", type: "array", desc: "The SmPC sections, in the same shape as above." },
              { name: "unavailable_reason", type: "string", desc: "`rcp_indisponible` when no section is attached; `rcp_external_url` then says where to read the SmPC." },
            ],
            errors: "`404 SPECIALITE_NOT_FOUND`.",
          },
        ],
      },
      {
        id: "logic",
        lead: "When an answer offers a score or a decision tree (`elicitations`), the following turns (ticking a box, choosing a branch, changing a level) go through this route: the unit is named by its key, with no new search or drafting. The computation is deterministic. Nothing is traced or metered.",
        endpoints: [
          {
            method: "POST", path: "/v2/logic/compute", auth: "any", use: "Compute a score or walk a tree",
            summary: "The unit's result for the given answers. `POST /v2/retrieve` remains the route when the question changes.",
            where: "body",
            params: [
              { name: "mku_key", type: "string", desc: "The unit's key, as returned in `elicitations[].mku_key`.", required: true },
              { name: "answers", type: "object", desc: "Score: `{question label: chosen option}`. Tree: `{node id: chosen condition}`." },
              { name: "checked", type: "string[]", desc: "Checkbox score: the selected labels." },
              { name: "level", type: "string", desc: "Ordinal scale: the chosen level." },
              { name: "sources, exclude_sources", type: "string[]", desc: "The same publisher scope as the question: what the answer cannot cite cannot be computed." },
            ],
            returns: [
              { name: "type", type: "string", desc: "`score` or `tree`." },
              { name: "titre, url", type: "string", desc: "The unit's name and the document that carries it." },
              { name: "computed", type: "object", desc: "`total`, `outcome` (the source's interpretation), `path` for a tree, `retained` (the breakdown of the total). A null `outcome` with a filled `reason` is an answer: the source draws no conclusion for this total." },
              { name: "note", type: "string", desc: "Why the unit cannot be executed, if so." },
            ],
            errors: "`404 UNKNOWN_LOGIC_UNIT`, `400 UNKNOWN_SOURCE`.",
          },
        ],
      },
      {
        id: "sources",
        lead: "The identifiers `sources` and `exclude_sources` accept on your key. The list changes when a new corpus is ingested; the server caches it for one hour.",
        endpoints: [
          {
            method: "GET", path: "/v2/sources", auth: "any", use: "List the filterable publishers",
            summary: "The corpus publishers, sorted by volume. A publisher with no current document is not listed.",
            returns: [
              { name: "id", type: "string", desc: "The identifier to pass in `sources`, for example `HAS`." },
              { name: "name", type: "string", desc: "The publisher's full name." },
              { name: "docs", type: "number", desc: "The number of current documents." },
            ],
          },
        ],
      },
      {
        id: "feedback",
        lead: "Every served answer leaves a trace, named by its `trace_id`. User feedback attaches to it, and your usage is read across all your organisation's traces.",
        endpoints: [
          {
            method: "POST", path: "/v2/feedback", auth: "any", use: "Rate an answer",
            summary: "Attaches a thumbs up or down to a served answer. Idempotent: sending again replaces the vote.",
            where: "body",
            params: [
              { name: "trace_id", type: "string", desc: "The answer's `trace_id`.", required: true },
              { name: "vote", type: "-1 | 0 | 1", desc: "`1` thumbs up, `-1` thumbs down, `0` vote withdrawn.", required: true },
              { name: "note", type: "string", desc: "Free-text reason, 2,000 characters at most." },
            ],
            returns: [{ name: "ok, trace_id, vote", type: "", desc: "The recorded vote." }],
            errors: "`404 TRACE_NOT_FOUND`, `503 TRACES_DISABLED`.",
          },
          {
            method: "GET", path: "/v2/usage", auth: "key", use: "Read the organisation's usage",
            summary: "Served answers, active accounts, latencies and feedback, over a sliding window.",
            where: "query",
            params: [
              { name: "days", type: "number", desc: "The window, 1 to 365 days. 30 by default." },
              { name: "accounts", type: "number", desc: "How many accounts at the top of the list, 0 to 100. 10 by default." },
            ],
            returns: [
              { name: "answers", type: "number", desc: "Answers served over the window." },
              { name: "accounts", type: "number", desc: "Distinct accounts (`X-Locus-User-Ref`)." },
              { name: "latency_ms", type: "object", desc: "`p50` and `p95`." },
              { name: "feedback", type: "object", desc: "`up`, `down`, `rated`." },
              { name: "per_day", type: "array", desc: "`{day, answers}`, by date." },
              { name: "top_accounts", type: "array", desc: "The most active accounts: `user_ref`, `answers`, `last_at`." },
              { name: "truncated", type: "boolean", desc: "`true`: window too wide for an exact total, reduce `days`." },
            ],
            errors: "`403 AUTH_KEY_REQUIRED`, `503 TRACES_DISABLED`.",
          },
        ],
      },
      {
        id: "history",
        lead: "An account's question threads, synced across its devices. The `payload` is opaque: the API stores and returns it without reading it. Every request stays within the organisation and account pair; with a key, `X-Locus-User-Ref` is required (`400 USER_REF_REQUIRED`).",
        endpoints: [
          {
            method: "GET", path: "/v2/conversations", auth: "any", use: "List an account's threads",
            summary: "The account's threads, most recent first, without their content.",
            where: "query",
            params: [{ name: "since", type: "string", desc: "ISO-8601: only what changed since, deletions included (`deleted: true`)." }],
            returns: [{ name: "conversations", type: "array", desc: "`id`, `title`, `created_at`, `updated_at`, `has_patient_data`, `deleted`." }],
          },
          {
            method: "GET", path: "/v2/conversations/{conversation_id}", auth: "any", use: "Read a thread",
            summary: "One thread, with its `payload`.",
            errors: "`404 CONVERSATION_NOT_FOUND`.",
          },
          {
            method: "PUT", path: "/v2/conversations/{conversation_id}", auth: "any", use: "Write a thread",
            summary: "Writes the whole thread. Idempotent; `updated_at` is set by the server. Writing to a deleted thread restores it.",
            where: "body",
            params: [
              { name: "title", type: "string", desc: "500 characters at most." },
              { name: "payload", type: "object", desc: "The thread, in your software's shape." },
              { name: "has_patient_data", type: "boolean", desc: "Whether the thread carries clinical context." },
              { name: "created_at", type: "string", desc: "The creation date known to your software." },
            ],
          },
          {
            method: "DELETE", path: "/v2/conversations/{conversation_id}", auth: "any", use: "Delete a thread",
            summary: "Deletes a thread. Always `204`, even for a thread already deleted.",
          },
          {
            method: "DELETE", path: "/v2/conversations", auth: "any", use: "Erase an account's history",
            summary: "Erases all the account's threads and returns `{ok, deleted}`.",
          },
        ],
      },
      {
        id: "widget",
        lead: "To show the Locus widget inside your software: your server issues one token per workstation, and the widget reads its configuration with that token.",
        endpoints: [
          {
            method: "POST", path: "/v2/session-token", auth: "key", use: "Issue a session token for a workstation",
            summary: "Exchanges the key for a short-lived token tied to one account. Renewal is the same call, before `exp`.",
            where: "body",
            params: [
              { name: "user_ref", type: "string", desc: "The account, as you name it: an opaque identifier, never a name or a patient.", required: true },
              { name: "scope", type: "string", desc: "Space-separated. Default: `retrieve feedback history drugs logic`." },
              { name: "ttl_seconds", type: "number", desc: "60 to 86,400. 12 h by default." },
            ],
            returns: [
              { name: "token", type: "string", desc: "The token, sent as a bearer." },
              { name: "exp", type: "number", desc: "Its expiry, in Unix seconds." },
              { name: "absolute_exp", type: "number", desc: "The ceiling renewal never crosses: beyond it, a new token." },
              { name: "scope", type: "string", desc: "The granted scope." },
            ],
            errors: "`403 AUTH_KEY_REQUIRED`.",
          },
          {
            method: "GET", path: "/v2/embed-config", auth: "any", use: "Read the widget configuration",
            summary: "What the widget applies: `theme`, `features`, `labels`, `branding`, `preferences` and `client`. A missing configuration returns the defaults.",
          },
          {
            method: "PUT", path: "/v2/embed-config", auth: "key", use: "Write the widget configuration",
            summary: "Replaces the configuration. The body is normalised: an unreadable value falls back to the default, an unknown field is ignored.",
            where: "body",
            params: [{ name: "theme, features, labels, branding", type: "object", desc: "The four blocks of the configuration." }],
          },
          {
            method: "GET", path: "/v2/embed-config/public", auth: "none", use: "Read the theme before authentication",
            summary: "Theme, labels and branding, to paint the widget before the handshake. An unknown client returns the defaults.",
            where: "query",
            params: [{ name: "client", type: "string", desc: "The client identifier." }],
          },
          {
            method: "GET", path: "/v2/whoami", auth: "any", use: "Check a credential",
            summary: "The client, the account and the entry point of the presented credential.",
          },
        ],
      },
    ] as DocGroup[],
    answer: {
      lines: [
        { step: "…", desc: "A completed step. Show progress without relying on the exact list of steps." },
        { step: "done", desc: "Final line. `payload` carries the full answer." },
        { step: "error", desc: "Final line. `detail` says what failed; `code` and `known_sources` come with it for an unknown source." },
      ],
      linesTitle: "The NDJSON stream",
      linesLead: "Each line is a complete JSON object ending with `\\n`, with a `step` field.",
      payloadTitle: "The answer",
      payloadLead: "In the stream's `done` line, or the body of `/v2/retrieve`. The payload also carries diagnostic fields: rely only on these.",
      payload: [
        { name: "trace_id", desc: "This answer's identifier, to send to `POST /v2/feedback`. Empty when logging is off: do not offer feedback then." },
        { name: "answer", desc: "The written answer, in Markdown, with its references to documents." },
        { name: "answer_short", desc: "What to do, in one sentence." },
        { name: "docs", desc: "The cited documents: `id`, `title`, `year` (guideline year), `url`, `source_id`, `source_name`." },
        { name: "drugs", desc: "One card per molecule: `dci`, `atc`, `reference` (the reference product: `cis`, `label`, truncated SmPC `rubrics`), `others` (other products, without SmPC), `others_total`." },
        { name: "elicitations", desc: "The scores and trees the answer offers to fill in: `mku_key`, `type`, `titre`, `steps`, `computed`. What follows goes through `POST /v2/logic/compute`." },
        { name: "ehr_additions", desc: "The new clinical fact this turn brings, to add to the record on your side." },
        { name: "source_scope", desc: "The scope applied, `{include, exclude}` as canonical identifiers; `null` for the whole corpus." },
      ],
      headerRows: [
        { name: "Authorization", desc: "Bearer lsk_…", required: true },
        { name: "Content-Type", desc: "application/json", required: true },
        { name: "X-Locus-User-Ref", desc: "Opaque account identifier. Required when per-account metering is active on your key.", required: false },
        { name: "Accept", desc: "`/v2/retrieve`: `application/json`, `text/markdown` or `text/html`.", required: false },
      ],
      examplesTitle: "Examples",
      buffer: "A network chunk does not end on a line break: keep the buffer remainder until the next `\\n` before parsing.",
    },
    examples: { curl: "cURL", ts: "TypeScript", question: "Kétoprofène chez un patient de 74 ans sous IEC et furosémide ?", ehr: "Homme, 74 ans. HTA sous ramipril 5 mg et furosémide 40 mg. DFG 52 mL/min.", progress: "progress", logicKey: "<elicitations[].mku_key>", logicQuestion: "<question label>", logicChoice: "<chosen option>", account: "<workstation id>" },
    workflows: {
      p1: "The API has no endpoint dedicated to workflows. What Studio shows is composed in the software, on the endpoints above.",
      p2: "Each question asked this way is an answer traced and metered like any other.",
      workflow: "Workflow",
      call: "Calls",
      rows: [
        { name: "Prescription check, clinical question from the record", call: "`POST /v2/retrieve/stream`, with a question written by the software and the shared data in `patient_ehr`." },
        { name: "Record summary", call: "No call: the software lays out the shared data, with no guideline to cite." },
        { name: "Score or tree in a form", call: "`POST /v2/retrieve/stream` for the question, then `POST /v2/logic/compute` for each form answer." },
        { name: "Dictated report, then decision support", call: "Transcription and the note stay in your software; decision support is `POST /v2/retrieve/stream`, with the reviewed note in `patient_ehr`." },
        { name: "Prescription prepared from a request, transport included", call: "Your software drafts the prescription; the clinical check goes through `POST /v2/retrieve/stream`." },
      ],
    },
    errors: {
      p1: "An HTTP error carries `{\"detail\": {\"code\": \"…\", \"message\": \"…\"}}`. A malformed body gets a validation `422`, without `code`. On `/v2/retrieve/stream`, an error after the first line arrives as a final `error` line.",
      status: "Status",
      code: "Code",
      meaning: "Meaning",
      rows: [
        { status: "400", code: "UNKNOWN_SOURCE", meaning: "An identifier in `sources` or `exclude_sources` is unknown. `known_sources` lists the existing ones." },
        { status: "400", code: "EMPTY_SOURCE_SCOPE", meaning: "Every included source is also excluded." },
        { status: "400", code: "CREDITS_USER_REF_REQUIRED", meaning: "`X-Locus-User-Ref` is missing while per-account metering is active." },
        { status: "400", code: "USER_REF_REQUIRED", meaning: "`X-Locus-User-Ref` is missing on thread history, with a key." },
        { status: "401", code: "AUTH_MISSING", meaning: "No bearer token." },
        { status: "401", code: "AUTH_INVALID_FORMAT", meaning: "The token is not an `lsk_…` key." },
        { status: "401", code: "AUTH_INVALID_KEY", meaning: "Unknown or revoked key." },
        { status: "401", code: "TOKEN_EXPIRED", meaning: "Session token expired: ask your server for a new one." },
        { status: "401", code: "TOKEN_ABSOLUTE_EXPIRED", meaning: "Session token past its ceiling: issue a new one." },
        { status: "401", code: "TOKEN_INVALID", meaning: "Unreadable or badly signed session token." },
        { status: "402", code: "CREDITS_EXHAUSTED", meaning: "The account has no credit left. Returned before any streaming." },
        { status: "403", code: "AUTH_CLIENT_INACTIVE", meaning: "Valid credential, organisation disabled." },
        { status: "403", code: "AUTH_KEY_REQUIRED", meaning: "Key-only route, called with a session token." },
        { status: "404", code: "UNKNOWN_LOGIC_UNIT", meaning: "No score or tree has this key within the requested scope." },
        { status: "404", code: "RUBRIC_NOT_FOUND, SPECIALITE_NOT_FOUND", meaning: "Unknown section or CIS code." },
        { status: "404", code: "TRACE_NOT_FOUND, CONVERSATION_NOT_FOUND", meaning: "Unknown `trace_id` or thread." },
        { status: "502", code: "ANSWER_UNAVAILABLE", meaning: "The answer could not be written. Nothing is metered." },
        { status: "503", code: "GRAPH_UNAVAILABLE, RETRIEVAL_UNAVAILABLE", meaning: "The corpus is temporarily unavailable. Retry." },
        { status: "503", code: "TRACES_DISABLED", meaning: "Logging is off on this instance: no feedback or usage." },
      ],
    },
  },
  keys: {
    meta: { title: "API keys", description: "Locus API keys are issued by invitation." },
    title: "API keys",
    lead: "Keys are issued to your organisation by the Locus team, after a conversation about your integration.",
    boxTitle: "By invitation",
    boxText: "A key calls the same services as Studio, from your software. It belongs to your organisation and is used server-side. Your Locus contact sends it to you.",
    docs: "Read the documentation",
    stepsTitle: "Steps",
    steps: [
      { title: "Test in Studio", text: "Try the four sandboxes on your use cases." },
      { title: "Receive the key", text: "Once approved, the `lsk_…` key is issued to your organisation." },
      { title: "First call", text: "Keep the key server-side and call `POST /v2/retrieve/stream`." },
    ],
    formatTitle: "Format",
    formatText: "A key starts with `lsk_`, followed by your organisation's identifier. It is sent as a bearer token.",
    sandboxNote: "Without a key, Studio remains your testing ground, live on fictional patients.",
  },
};

export const ressources: Dict<typeof fr> = { fr, en };
export type RessourcesDict = typeof fr;
