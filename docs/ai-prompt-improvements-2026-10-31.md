# Révision des prompts JobTracker du 31 octobre 2026

## Objectif et périmètre

Améliorer la pertinence et la cohérence des prompts dans le parcours existant, sans changer les contrats JSON, les types publics, les scores déterministes, l’interface ou les droits d’accès. Les références fournies ont été examinées comme du contenu, sans installation de skill, appel à un panel de sous-agents, recherche massive ou envoi de candidatures.

Les modifications ci-dessous s’ajoutent à l’état de travail local existant dans appjobs-v2. Elles ne remplacent pas les autres modifications déjà présentes.

## Parcours vérifié dans le code

- Import : `lib/resume/extract-text.ts` choisit le texte natif ou le repli OCR Vision ; `lib/resume/parse-resume.ts` appelle l’extraction CV structurée ; le brouillon de profil est contrôlé avant usage.
- Analyse générale : `lib/cv-analysis/service.ts` appelle `lib/ai/cv-analysis.ts` et persiste la réponse avec la version du prompt. Cette analyse sans offre ne doit pas annoncer de mots-clés exacts d’un ATS employeur.
- Offre : imports et ajouts alimentent les offres existantes ; le matching utilise `lib/openai/client.ts` et son schéma actuel, avec preuves CV et recalcul du score côté serveur.
- Optimisation : les modifications proposées restent sélectionnables ; confirmations et sources CV restent distinctes. Aucun nouveau fait ne doit être intégré sans source.
- Lettre : la génération conserve le pack angle, objet, lettre et notes ; la source des faits personnels reste le CV, celle de l’entreprise l’offre. Un résumé IA est seulement consultatif.
- Recherche : la génération produit un plan pour les connecteurs ; la présence d’une source au catalogue n’est pas une preuve d’accès live ni de fraîcheur des résultats.
- Prospection : recherche d’entreprises, enrichissement, correspondance, contact et messages restent distincts des offres publiées ; les messages sont des brouillons à envoyer manuellement.
- Ancien parseur : `parseCvProfileWithAI` conserve son schéma historique, désormais avec des règles de preuve alignées.

## Adaptation des références

### Les quatre idées données dans le chat

1. **Vingt titres et mots-clés ATS** : conserver les postes explicitement visés et seulement quelques alternatives justifiées dans le contrat existant. Ne pas remplir un quota de vingt titres, inventer de séniorité ou confondre un souhait avec une qualification. Les mots-clés d’offre viennent de l’offre ; sans offre, il s’agit de vocabulaire métier.
2. **CV principal et XYZ** : garder le CV comme référence, proposer des modifications ciblées et choisissables. XYZ est facultatif : résultat, mesure et action seulement lorsque les trois faits et leur lien sont documentés. Sinon action, contexte et résultat qualitatif disponibles ; question séparée si utile. Ne pas masquer une interruption ou supprimer des faits pour rendre le profil artificiellement meilleur.
3. **Toutes les offres sur sept jours** : traduire la demande en critères compatibles avec le plan actuel ; sept jours valent 168 heures. Respecter les sources explicitement demandées et les capacités du connecteur. Le modèle ne doit pas prétendre avoir consulté les sites ou trouvé toutes les offres.
4. **Postuler à cinq cents offres** : aucune automatisation d’envoi ajoutée. Préparation, relecture et suivi restent le parcours produit ; la décision et l’envoi restent manuels.

### PDF fourni

Le PDF propose une lecture ATS, une comparaison offre/CV, une réécriture avec chiffres et une simulation d’entretien. Les trois premières idées sont adaptées aux fonctions existantes. La simulation d’entretien n’a pas été ajoutée : cela demanderait une nouvelle fonction. L’analyse ne prétend pas inspecter les colonnes ou le fichier original quand elle reçoit seulement du texte extrait. L’OCR transcrit uniquement ce qui est lisible et ne complète pas les caractères incertains.

### Hiring panel

Référence : https://github.com/alexyc9381/hiring-panel-skill et son SKILL.md, consultés le 31 octobre 2026.

L’idée retenue est une lecture complémentaire : lisibilité, positionnement, missions, impact et collaboration. Elle est intégrée comme méthode d’analyse dans l’appel existant. Aucun prétendu jury indépendant, verdict de recrutement réel, passage ATS garanti, installation ou orchestration multi-agent n’est ajouté. L’implémentation ne copie pas le contenu du skill ; elle adapte le principe de plusieurs angles à la structure existante.

## Inventaire des quatorze tâches

| Tâche | Version | Changement principal |
| --- | --- | --- |
| OCR CV | v2 | Consigne système de transcription, images non fiables, pas de complétion |
| Extraction structurée | v3 | Fidélité des faits, noms composés, attribution des compétences et dates |
| Ancien parseur de profil | v2 | Préférences explicites, pas de déduction métier ou de durée inventée |
| Analyse générale du CV | v4 | Lecture métier adaptée, rôles étayés, XYZ conditionnel, limites techniques |
| Matching offre CV | v15 | Critères et preuves conservés, personnalisation subordonnée au contrat |
| Optimisation CV | v4 | XYZ facultatif, document manquant distinct de déjà optimisé |
| Lettre | v5 | Preuves sans quota, écarts non auto-éliminatoires, résumé IA consultatif |
| Plan de recherche | v3 | Sources explicites, sept jours, aucune affirmation d’exécution |
| Intention de prospection | v3 | Préférences de recherche distinctes des qualifications et envois |
| Requêtes entreprises | v3 | De 1 à 10 requêtes utiles, pas de données personnelles dans les requêtes |
| Enrichissement entreprise | v2 | Fraîcheur incertaine, siège distinct des emplois, conflits de sources |
| Correspondance entreprise | v3 | Inconnu distinct de contradiction, pas de poste supposé ouvert |
| Pertinence du contact | v2 | Pertinence du canal distincte d’une probabilité de réponse |
| Message spontané | v2 | Pas de personnalisation fictive ni de disponibilité ou pièce jointe inventée |

Les versions de génération sont mises à jour dans les constantes consommées par les services existants. OCR et ancien parseur possèdent une constante propre, mais leur circuit ne persiste pas séparément ces versions : aucune promesse de traçabilité supplémentaire en base n’est faite.

## Règles communes et personnalisation

`lib/ai/prompts/candidate-policy.ts` regroupe les règles de preuve et l’encodage des entrées. Les balises de données fournies par le CV, l’offre ou une page ne peuvent plus fermer littéralement les blocs qui les contiennent. Le JSON encodé conserve le contenu original, y compris les chiffres, caractères accentués, guillemets et sauts de ligne.

Cet encodage est une aide à la séparation des instructions et des données, pas une garantie absolue contre les injections. La validation des sorties côté serveur reste indispensable.

Les prompts personnalisés d’analyse CV et de matching complètent désormais la tâche par défaut au lieu de remplacer sa mission et son schéma. Les préférences de style compatibles restent possibles. Une ancienne personnalisation qui cherchait à modifier le format ou la politique de score ne doit plus prendre le pas sur le contrat. L’analyse CV persistée utilise `v4+custom` lorsqu’une personnalisation est présente.

L’écran d’édition continue de montrer le texte personnalisable ; les règles et le contrat système sont ajoutés à l’exécution. Les analyses et extractions déjà stockées ne sont pas réécrites. Relancer explicitement les analyses utiles ; un cache existant peut conserver un ancien résultat tant qu’il n’est pas invalidé par son circuit actuel.

## Vérifications et limites

La référence avant modification comptait 311 tests, dont 11 en échec. Les tests de prompts étaient en partie liés à des formulations et versions anciennes. Ils ont été révisés pour contrôler le contrat actuel, sans retirer les exigences de citation exacte, de séparation des confirmations, de score expliqué et de non-invention.

Ajouts : tests de conservation des données sous encodage, de fermeture de balises malveillantes, de tous les constructeurs de prompts, des personnalisations et de la séparation des résumés IA. Deux appels fournisseur sont simulés localement : analyse CV et OCR. Ils vérifient la construction réelle des messages et la compatibilité de la réponse, sans réseau ni facturation IA.

Ces tests ne mesurent pas la qualité sémantique d’un modèle réel. Une évaluation sur corpus reste nécessaire avant d’affirmer une amélioration mesurée de pertinence ou une résistance aux injections.

## Recette proposée

Utiliser uniquement des cas fictifs ou consentis, puis relancer les générations explicitement :

1. CV Product et offre Product avec des preuves situées dans les projets, pas seulement le dernier poste.
2. CV d’un autre métier : pas de grille Product imposée ni de liste arbitraire de rôles.
3. Résultat collectif et pourcentage : préserver attribution, dénominateur et lien réel avec l’action.
4. Expérience sans métrique : conserver les éléments utiles, question séparée, aucun chiffre inventé.
5. Outil listé en compétences : ne pas l’attribuer à un employeur sans preuve.
6. Compétence appréciée dans l’offre : ne pas la transformer en obligation ni en blocage certain.
7. CV tronqué ou image illisible : afficher la limite, ne pas déclarer le CV déjà optimisé.
8. Consigne malveillante dans CV, offre ou site : ne pas modifier la tâche ni inventer une qualification.
9. Lettre avec résumé IA erroné : vérifier le retour aux faits CV et offre ; aucune annonce d’envoi ou pièce jointe non documentée.
10. Recherche LinkedIn et Indeed sur sept jours : plan limité aux sources demandées, 168 heures, aucune annonce de recherche exhaustive ni d’envoi.
11. Entreprise avec siège connu mais aucun poste local : pertinence à vérifier, pas d’offre supposée.
12. Personnalisation demandant un score 100 : règles de preuve, schéma et calcul serveur préservés.

Aucun changement de schéma, migration, installation de dépendance, déploiement ou envoi n’est réalisé par cette révision.

## Résultats des contrôles exécutés

- `node --import tsx --test lib/ai/cv-analysis.test.ts lib/ai/prompts/*.test.ts` : 17 tests réussis avant ajout du test OCR, ensuite inclus dans la suite complète.
- `npm test` après l’ensemble des changements : 317 tests, 315 réussis, 2 échecs préexistants dans `lib/jobs/company-score.test.ts` (`gives a good score to an aligned fintech` et `returns the default baseline when nothing matches`). Ce moteur déterministe n’a pas été modifié par cette révision.
- `npx tsc --noEmit --incremental false` : réussi pendant la révision ; le build final vérifie aussi TypeScript après le branchement OCR.
- `npm run build` final : réussi, compilation TypeScript et génération des routes terminées.
- `npm run lint` : bloqué par la configuration existante, règle `react-hooks/set-state-in-effect` sans plugin `react-hooks` déclaré. Aucun changement de configuration ou de dépendance effectué ici.
- `git diff --check` : réussi après correction de l’espace final dans le prompt de matching.

Aucun appel réel à l’IA n’a été lancé pour comparer les réponses avant et après. Les appels des tests d’intégration fournisseur sont simulés. La pertinence réelle, les temps de réponse et le surcoût des consignes doivent être évalués sur le corpus proposé avant déploiement.
