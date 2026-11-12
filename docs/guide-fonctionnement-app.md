# Comment fonctionne JobTracker

Ce guide décrit le comportement observé dans les routes, composants et API actuels. Il complète le parcours produit de [`product.md`](./product.md) sans le remplacer. Les fonctions signalées **actives** sont accessibles dans l’application; les fonctions **expérimentales** peuvent dépendre de données locales, d’un connecteur ou d’une clé IA; les fonctions **prévues** ne sont pas une promesse d’implémentation.

## Parcours candidat actuel

```text
Connexion / import du CV → revue du profil → import ou recherche d’offres
→ filtre / sélection → analyse et Correspondance → lettre préparée
→ candidature suivie ou prospection d’entreprise
```

Les lettres et messages sont préparés dans JobTracker : le candidat les relit, les copie et les envoie lui-même.

Le panneau de diagnostic des prompts est réservé au développement local. Les versions hébergées ne conservent pas ces traces et n’affichent pas le panneau.

Sur la version hébergée, connecte-toi avec l’adresse e-mail et le mot de passe du compte Supabase créé par l’administrateur. La déconnexion conserve l’avancement de l’onboarding.

## 1. Onboarding, CV et profil — **actif**

**Départ.** `/login?cv=1` importe ou colle le CV. `/onboarding` redirige vers cette étape; `/onboarding/profile` et `/onboarding/profileupdate` rendent tous deux `components/onboarding/profile-page.tsx`, puis `CandidateProfileForm`.

**Fonctionnement.** Après un CV présent, `/api/onboarding` laisse accéder à la revue : informations personnelles, emploi recherché, expériences, compétences, formations et autres ressources. Le formulaire charge/enregistre le profil via les routes `app/api/profile/*`; l’import PDF passe par `/api/profile/import-cv`, le CV texte et les données structurées par `/api/profile`. Le bouton « Continuer sans tout remplir » garde la progression possible avec des champs incomplets.

**Conservation.** Le texte source est conservé dans `cv_contexts`; le profil structuré et ses listes dans les tables/propriétés de profil. Les extractions/revues de CV sont des résultats persistés, pas seulement des aperçus client.

**Cas limites.** Sans CV, la garde redirige vers `/login?cv=1`; un chargement affiche un squelette; une erreur de garde n’empêche pas l’affichage du formulaire. Les validations restent propres à chaque champ et l’enregistrement informe l’utilisateur de son résultat.

**À préserver.** Les deux routes doivent rester identiques, les onglets accessibles au clavier, tous les champs atteignables sur mobile et le pied d’actions ne doit rien masquer. Ne transforme pas un champ optionnel en prérequis sans décision produit.

## 2. Import, recherche et tableau d’offres — **actif**

**Départ.** `/jobs`, `TrackedJobsPage` : « Importer mes offres », « Coller une offre », outils de développement locaux et synchronisation. Les imports utilisent `/api/import-jobs`, `/api/import-jobs/preview`, `/api/import-jobs/json` et `/api/import-jobs/sample`; les offres sont lues/mises à jour via `/api/jobs` et `/api/jobs/[id]`.

**Fonctionnement.** CSV/Excel/JSON et texte collé sont normalisés avant insertion. Une URL/titre invalide est signalé par le parcours d’import; les doublons utilisateur sont ignorés. La page propose une vue cartes ou suivi, les filtres texte/source/lieu/contrat/statut/salaire/Correspondance, une sélection par case à cocher et des actions groupées. Sur mobile, la recherche reste visible, « Afficher les filtres » déplie Lieu et Statut, et les filtres secondaires restent derrière « Plus de filtres ». La carte affiche entreprise, lieu, métadonnées neutres et le statut dans le sélecteur de pied; le titre est limité à deux lignes.

**Coller une offre.** Le navigateur envoie le texte et le lien facultatif en JSON. Le serveur retire les éléments de navigation et de pied de page, lit l’en-tête des annonces Welcome to the Jungle reconnues et peut extraire les autres annonces avec l’IA. Il vérifie les champs extraits dans le texte. Le texte original reste dans `raw_data`. Une date relative sans référence absolue ne devient pas une date de publication.

Un JSON invalide ou un titre ambigu est refusé : aucun repli sur la première ligne du collage. Les qualifications détaillées priment sur les badges d’ancienneté; « Télétravail fréquent » est normalisé en hybride. Les imports fichier conservent leur parcours.

**Corriger une fiche existante.** Dans `/jobs/[id]`, « Corriger l’offre » réutilise le dialogue de collage. « Prévisualiser la correction » ne sauvegarde rien : vérifie titre, entreprise, lieu, contrat, télétravail, salaire, expérience, date et description nettoyée, puis « Valider la correction ». Le serveur vérifie l’utilisateur et la version de la fiche, ainsi qu’un aperçu signé et limité à dix minutes. Statut, notes, lettres, sélection et suivi ne sont pas remplacés. L’ancienne analyse reste lisible mais porte un avertissement « à actualiser ». Réimporter la même URL ne corrige pas une fiche : la déduplication reste active.

**Conservation.** `jobs` garde les données normalisées, le statut, la sélection, l’analyse, la lettre et les informations importées; les filtres et la vue sont principalement de l’état client. La déduplication est par utilisateur et URL. Sans lien, le collage utilise une URL interne calculée à partir du texte nettoyé pour reconnaître une nouvelle tentative identique.

**Cas limites.** États de chargement, liste vide, filtres sans résultat, import partiellement valide et synchronisation ont un retour visible. Une sélection est modifiable sans déclencher l’ouverture de carte; la carte reste utilisable si une description ou un score manque.

**À préserver.** Import manuel, filtres, sélection, cases et actions groupées ne doivent pas disparaître lors d’un changement visuel. Le statut est explicite; le score de **Correspondance** est un pourcentage distinct, jamais un substitut au statut.

## 3. Analyse ATS et Correspondance offre/CV — **actif avec IA**

**Départ.** Depuis une carte Offre ou `/jobs/[id]`, « Comparer à mon CV » appelle `/api/analyze-job`. Les réponses de clarification utilisent `/api/analyze-job/answer` et `/api/analyze-job/confirm`. Le détail assemble `components/jobs/analysis/*` et le laboratoire de détail.

**Fonctionnement.** Le serveur charge le CV et le texte de l’offre, analyse les critères et conserve score, raisons, manques, critères et suggestions. L’écran sépare :

- les **faits du CV** vérifiables;
- les **réponses du candidat** aux clarifications;
- les **suggestions** de reformulation ou d’amélioration;
- les éléments **inconnus** qui doivent être confirmés;
- les **contradictions** ou propositions non vérifiables, qui ne doivent pas devenir des faits.

**Conservation.** L’analyse et les réponses utiles sont attachées à l’offre; les suggestions de CV peuvent être appliquées seulement après les garde-fous de citations/faits documentés dans `lib/jobs/*`.

Les critères évalués sont la source commune du résumé, des forces, des écarts et des compteurs, y compris pour une analyse historique possédant ces critères. Une synthèse libre ancienne ne peut pas promouvoir un critère « Mentionné » ou « Non documenté » en acquis démontré. Les citations du CV sont vérifiées comme passages continus (typographie normalisée); des mots dispersés ou une durée d’expérience non démontrée ne suffisent pas. Sans critères, l’analyse historique reste consultable sans inventer de nouveaux acquis.

Une reformulation sans source CV vérifiable, ou ajoutant une expérience réglementaire/IA, devient une question sans texte prêt à appliquer. Les confirmations du candidat restent identifiées séparément des citations du CV. Dans « Précise ton expérience », l’erreur de sélection apparaît seulement après validation sans réponse; « Plus tard » n’enregistre aucune réponse et « Je ne sais pas » conserve le point à préciser.

**Cas limites.** Sans CV ou sans description exploitable, l’interface doit expliquer le prérequis plutôt qu’inventer un score. Les analyses en attente, en cours et en erreur ont un état de progression. Une réponse « inconnue » reste inconnue, pas un refus ni une compétence.

**À préserver.** Les données IA restent serveur, aucune expérience n’est inventée et la Correspondance doit rester expliquée par un nombre, un texte et des critères — pas seulement une couleur.

## 4. Lettres et optimisation CV — **actif avec IA**

**Départ.** Depuis `/jobs`, les actions unitaires/groupées appellent `/api/generate-cover-letter` ou `/api/generate-cover-letter/batch`; le détail offre aussi l’optimisation via `/api/jobs/[id]/optimize*` et `/profile-ai/optimize`.

**Fonctionnement.** Une lettre est construite à partir du CV et de l’offre; elle est affichée dans une modal avant utilisation. Dans l’onglet « Candidature », les actions sont séquencées : « Préparer une lettre » (ou « Régénérer »), « Relire et copier », puis « J’ai envoyé ma candidature ». Cette dernière ouvre une confirmation car JobTracker ne peut pas vérifier l’envoi; elle met seulement le statut à jour. L’optimisation prépare des propositions, dont les modifications à confirmer restent séparées des propositions sûres. Les cartes « Bientôt — API à brancher » ont été retirées.

**Conservation.** Les lettres sont enregistrées sur l’offre et dans l’historique `cover_letters`; le statut d’offre peut évoluer vers `cover_generated`. Les propositions d’optimisation et leurs confirmations suivent les routes d’optimisation associées à l’offre.

**Cas limites.** Sans CV, clé/configuration IA ou offre suffisante, l’action renvoie un message sans créer de contenu fictif. Un batch peut réussir partiellement et doit restituer succès/échecs.

**À préserver.** La sélection d’offres alimente le batch; la génération ne doit jamais envoyer la lettre automatiquement ni effacer une lettre existante sans action explicite.

## 5. Suivi des candidatures — **actif**

**Départ.** `/applications`, avec création manuelle, pipeline et tableau. Données via `GET`, `POST` et `PATCH /api/applications`.

**Fonctionnement.** Le candidat crée ou met à jour une candidature, change son statut, ajoute notes et dates, puis l’affiche en colonnes ou tableau. Les statuts incluent notamment « À candidater », « Candidaté », entretiens, étude de cas, offre, refus et accepté.

**Conservation.** `applications` et son historique portent les données CRM durables. Les choix de vue sont d’état client.

**Cas limites.** Chargement, pipeline vide, création/édition et erreur API doivent rester lisibles. Les libellés de statut ne dépendent pas de la couleur.

**À préserver.** La cohérence entre le statut d’offre et celui présenté dans les candidatures; le suivi reste une action du candidat, pas un envoi automatisé.

## 6. Prospection d’entreprises — **actif, connecteur encore expérimental**

**Départ.** `/companies` (`CompanySearchPage`), détail `/companies/[id]`, API `app/api/companies/*`, `/api/searches/companies/parse` et `/api/searches/companies/run`.

**Fonctionnement.** Le candidat décrit une cible; l’intention est transformée en critères, les entreprises sont recherchées/enrichies, évaluées puis ajoutées à un pipeline. Le détail gère contacts et prépare un email/LinkedIn via `/api/companies/[id]/outreach`.

**Conservation.** Recherches, entreprises, contacts et messages de prospection sont persistés dans les tables dédiées. Les données de connecteur et l’enrichissement restent soumis à leur disponibilité.

**Cas limites.** Sans faits suffisants, le message ne doit pas inventer une information société ou une expérience candidat; les erreurs de connecteur/IA sont présentées comme telles. Le résultat peut être vide.

**À préserver.** Prospection spontanée et offres publiées restent deux parcours distincts; les messages sont préparés puis envoyés manuellement.

## 7. Recherche, sources et paramètres

### Recherche d’offres — **active, connecteurs variables**

**Départ.** `/research`, `ResearchPage`, `/api/research/plan`, `/api/research/run` et `/api/research/import`.

Elle prépare un plan de recherche et alimente les imports/connecteurs disponibles. Les résultats doivent rejoindre le modèle unique `jobs`; une absence de connecteur ou de résultat est un état normal, pas une fausse réussite.

### Sources et recherches suivies — **active, synchronisation dépendante de la source**

**Départ.** `/sources`, `/sources/[sourceId]`, APIs `/api/sources/*`, `/api/tracked-searches*` et `/api/sync/*`.

Les sources configurent des recherches sauvegardées et leurs exécutions. Certaines intégrations restent mockées ou configurées localement : ne les présenter ni comme du scraping universel ni comme une synchronisation garantie. Préserver l’isolation utilisateur, le comptage importé/doublon/ignoré et l’idempotence URL.

### Paramètres — **actif**

**Départ.** `/settings`, `GeneralSettingsForm`, `/api/settings`. Les réglages généraux sont accessibles à tout utilisateur; la création locale d’accès, les mots-clés ATS et le panneau de prompts sont réservés/conditionnés selon le code de la page.

**À préserver.** Les clés et prompts ne doivent pas être exposés côté client; ne confonds pas les réglages de démonstration locale avec une capacité offerte à tous les comptes.

## Données, sécurité et décisions ouvertes

- Les routes serveur utilisent l’utilisateur authentifié et Supabase/RLS pour isoler les données. Toute nouvelle requête doit suivre le même modèle.
- L’API OpenAI, les clés et les contrôles de véracité restent serveur. Les API et règles métier ne sont pas modifiées par une harmonisation d’interface.
- **Écart à confirmer :** l’ancienne documentation qualifiait Sources de placeholder et limitait le profil IA; les routes et composants actuels rendent ces surfaces accessibles. Leur niveau de connectivité réelle dépend cependant de la source/environnement.
- **Prévu :** automatisation planifiée universelle, connecteurs live généralisés et analyses de dashboard plus avancées restent des orientations, pas des garanties produit.

## Référence pour une modification

Avant de modifier une fonctionnalité, lis sa page, composant, API et les règles de [`AGENTS.md`](../AGENTS.md). Mets à jour ce guide lorsque le comportement observé, un prérequis, un état limite ou la persistance changent.

## Harmonisation des états principaux (audit UX)

- `/jobs/[id]` présente le décompte des critères démontrés et à préciser depuis les mêmes critères que la liste détaillée. La demande de l’offre, le texte documenté dans le CV et la réponse du candidat sont trois éléments distincts. Une réponse ne devient pas une citation du CV.
- `/applications` permet de modifier le statut depuis chaque carte et affiche la date d’entretien lorsqu’elle existe. Un chargement en erreur ne se présente pas comme une liste vide.
- `/research` concerne les offres publiées : selon la source, la recherche est live si le connecteur est configuré ou filtre la bibliothèque importée. `/companies` concerne la prospection d’entreprises. Les doublons visuels sont écartés par domaine/nom sans supprimer de données.
- `/profile-ai` met d’abord en avant deux recommandations avec leur preuve et une action; les sous-scores et mots-clés restent consultables dans les détails.
- L’inscription hébergée reste fermée jusqu’à validation de l’expéditeur et des modèles de confirmation Supabase. Après configuration de `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, Site URL et redirect `/auth/callback`, l’administrateur peut activer `ALLOW_HOSTED_SIGNUP=true`. Le formulaire démo n’est montré que si `SUPABASE_SERVICE_ROLE_KEY` permet de persister la demande.
